import ePub, { type Book } from "epubjs";

export interface Chapter {
  id: string;
  label: string;
  href: string;
}

export class EpubService {
  private book: Book | null = null;

  async loadBook(data: ArrayBuffer): Promise<void> {
    this.book = ePub(data);
    await this.book.ready;
  }

  getMetadata() {
    return (this.book as any)?.package.metadata;
  }

  async getChapters(): Promise<Chapter[]> {
    if (!this.book) return [];

    // Flatten the toc
    const toc = await this.book.loaded.navigation;
    const chapters: Chapter[] = [];

    const traverse = (items: any[]) => {
      items.forEach((item) => {
        chapters.push({
          id: item.id,
          label: item.label.trim() || "Untitled",
          href: item.href,
        });
        if (item.subitems && item.subitems.length > 0) {
          traverse(item.subitems);
        }
      });
    };

    traverse(toc.toc);
    return chapters;
  }

  async getChapterText(href: string): Promise<string> {
    if (!this.book) return "";

    // Get all spine items to determine chapter boundaries
    const spineItems = await this.getSpineItems();
    const chapterIndex = spineItems.findIndex((item) => item.href === href);

    if (chapterIndex === -1) {
      // Fallback to original method if href not found in spine
      return this.getSingleFileText(href);
    }

    // Determine the range of files for this chapter
    const startIndex = chapterIndex;
    const endIndex = this.findNextChapterIndex(spineItems, startIndex);

    // Extract text from all files in this chapter range
    const chapterTexts: string[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      const text = await this.getSingleFileText(spineItems[i].href);
      if (text.trim()) {
        chapterTexts.push(text);
      }
    }

    return chapterTexts.join("\n\n");
  }

  private async getSpineItems(): Promise<Array<{ href: string; id: string }>> {
    if (!this.book) return [];

    try {
      // Get spine items from the package manifest
      // @ts-ignore
      const manifest = this.book.package?.manifest || {};
      // @ts-ignore
      const spine = this.book.package?.spine || [];

      // Create a map of spine items with their hrefs
      const spineItems: Array<{ href: string; id: string }> = [];
      spine.forEach((item: any) => {
        const manifestItem = manifest[item.idref];
        if (manifestItem) {
          spineItems.push({
            href: manifestItem.href,
            id: item.idref,
          });
        }
      });

      return spineItems;
    } catch (e) {
      console.error("Failed to get spine items", e);
      return [];
    }
  }

  private findNextChapterIndex(
    spineItems: Array<{ href: string; id: string }>,
    startIndex: number
  ): number {
    // Get chapters to find the next chapter start
    // This is a simple heuristic: find the next item that likely starts a new chapter
    const chapters = this.getCachedChapters();

    for (let i = startIndex + 1; i < spineItems.length; i++) {
      const spineItem = spineItems[i];
      // Check if this spine item matches a chapter href
      const isChapterStart = chapters.some(
        (chapter) => chapter.href === spineItem.href
      );
      if (isChapterStart) {
        return i;
      }
    }

    // If no next chapter found, include all remaining items
    return spineItems.length;
  }

  private getCachedChapters(): Chapter[] {
    // This is a simple cache to avoid re-fetching chapters
    // In a real implementation, you'd want to store this properly
    if (!this._cachedChapters) {
      // We need to get chapters synchronously or cache them
      // For now, we'll use the toc navigation if available
      try {
        // @ts-ignore
        const toc = this.book?.loaded?.navigation?.toc || [];
        this._cachedChapters = this.flattenToc(toc);
      } catch (e) {
        this._cachedChapters = [];
      }
    }
    return this._cachedChapters;
  }

  private _cachedChapters: Chapter[] = [];

  private flattenToc(items: any[]): Chapter[] {
    const chapters: Chapter[] = [];
    const traverse = (items: any[]) => {
      items.forEach((item) => {
        chapters.push({
          id: item.id,
          label: item.label.trim() || "Untitled",
          href: item.href,
        });
        if (item.subitems && item.subitems.length > 0) {
          traverse(item.subitems);
        }
      });
    };
    traverse(items);
    return chapters;
  }

  private async getSingleFileText(href: string): Promise<string> {
    if (!this.book) return "";

    try {
      // Try to get content directly without DOM rendering (much faster)
      // @ts-ignore - epubjs internal API
      const section = this.book.spine.get(href);
      if (section && section.document) {
        return this.extractTextContent(section.document);
      }

      // Fallback: try to load the section
      // @ts-ignore
      if (section && section.load) {
        await section.load();
        if (section.document) {
          return this.extractTextContent(section.document);
        }
      }

      // Last resort: use DOM rendering (slower)
      return this.getSingleFileTextDOM(href);
    } catch (e) {
      console.error("Failed to get file text directly, falling back to DOM", e);
      return this.getSingleFileTextDOM(href);
    }
  }

  private async getSingleFileTextDOM(href: string): Promise<string> {
    if (!this.book) return "";

    // Create a hidden container (fallback method - slower)
    const container = document.createElement("div");
    container.style.visibility = "hidden";
    container.style.position = "absolute";
    container.style.top = "-10000px";
    document.body.appendChild(container);

    try {
      // Create a rendition
      const rendition = this.book.renderTo(container, {
        width: "100%",
        height: "100%",
      });
      await rendition.display(href);

      // Get contents
      // @ts-ignore
      const contents = rendition.getContents();
      if (contents && (contents as any).length > 0) {
        const doc = (contents as any)[0].document;
        return this.extractTextContent(doc);
      }

      // Fallback: try to access the iframe directly if contents is empty
      const iframe = container.querySelector("iframe");
      if (iframe && iframe.contentDocument) {
        return this.extractTextContent(iframe.contentDocument);
      }

      return "";
    } catch (e) {
      console.error("Failed to render file", e);
      return "";
    } finally {
      // Cleanup
      try {
        document.body.removeChild(container);
      } catch (e) {
        // Ignore
      }
    }
  }

  private extractTextContent(doc: Document): string {
    // Remove script and style elements
    const scripts = doc.querySelectorAll("script, style");
    scripts.forEach((script) => script.remove());

    // Try to extract text by paragraphs to preserve structure
    const paragraphs = doc.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6");
    const textParts: string[] = [];

    for (const para of paragraphs) {
      const text = para.textContent?.trim();
      if (text && text.length > 10) {
        // Only include substantial paragraphs
        textParts.push(text);
      }
    }

    // If no paragraphs found, fall back to body text
    if (textParts.length === 0) {
      const body = doc.body || doc.documentElement;
      let text = body.textContent || body.innerText || "";

      text = text
        // Normalize line breaks
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Clean up multiple spaces and tabs
        .replace(/[ \t]+/g, " ")
        // Normalize paragraph breaks
        .replace(/\n\s*\n\s*/g, "\n\n")
        // Remove leading/trailing whitespace from each line and filter empty lines
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");

      return text.trim();
    }

    // Join paragraphs with triple newlines to clearly separate them
    return textParts.join("\n\n\n");
  }
}

export const epubService = new EpubService();
