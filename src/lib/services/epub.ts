import ePub, { type Book } from "epubjs";

export interface Chapter {
  id: string;
  label: string;
  href: string;
}

export interface SearchResult {
  chapterId: string;
  chapterTitle: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
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

    try {
      // Get all spine items to determine chapter boundaries
      const spineItems = await this.getSpineItems();
      const chapterIndex = spineItems.findIndex((item) => item.href === href);

      if (chapterIndex === -1) {
        // Fallback: just get the text for this specific href
        return await this.getSingleFileText(href);
      }

      // Try to find the next chapter based on TOC
      const chapters = await this.getChapters();
      let endIndex = spineItems.length; // Default to end of book

      for (let i = chapterIndex + 1; i < spineItems.length; i++) {
        const spineItem = spineItems[i];
        // Check if this spine item matches a chapter href
        const isChapterStart = chapters.some(
          (chapter) => chapter.href === spineItem.href
        );
        if (isChapterStart) {
          endIndex = i;
          break;
        }
      }

      // Extract text from this chapter's files
      const chapterTexts: string[] = [];
      for (let i = chapterIndex; i < endIndex; i++) {
        try {
          const text = await this.getSingleFileText(spineItems[i].href);
          if (text.trim()) {
            chapterTexts.push(text);
          }
        } catch (e) {
          console.warn(`Failed to get text for spine item ${i}:`, e);
          // Continue with other files
        }
      }

      return chapterTexts.join(" ");
    } catch (e) {
      console.error("Failed to get chapter text:", e);
      // Fallback to single file extraction
      try {
        return await this.getSingleFileText(href);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        return "";
      }
    }
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

  private async findChapterEndIndex(
    spineItems: Array<{ href: string; id: string }>,
    startIndex: number
  ): Promise<number> {
    const chapters = this.getCachedChapters();

    // First, try to find the next chapter based on TOC
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

    // If TOC doesn't help, analyze content to find natural chapter boundaries
    // Start analyzing from the current chapter file to accumulate content
    let totalContentLength = 0;
    const maxContentLength = 1; // Force exactly 1 file per chapter to prevent duplication
    const maxAdditionalFiles = 3; // Maximum additional files beyond the starting one

    // Always include at least the starting file
    try {
      const startFileText = await this.getSingleFileText(
        spineItems[startIndex].href
      );
      totalContentLength += startFileText.length;
    } catch (e) {
      return startIndex + 1; // Just include the start file
    }

    // Now check additional files
    for (
      let i = startIndex + 1;
      i < Math.min(startIndex + 1 + maxAdditionalFiles, spineItems.length);
      i++
    ) {
      try {
        const text = await this.getSingleFileText(spineItems[i].href);

        // Check if this file looks like a chapter start
        if (this.looksLikeChapterStart(text.trim())) {
          return i; // Stop before this file
        }

        // Add this file to the chapter
        totalContentLength += text.length;

        // If we've accumulated too much content, stop after this file
        if (totalContentLength > maxContentLength) {
          return i + 1;
        }
      } catch (e) {
        return i; // Stop before the problematic file
      }
    }

    // Definitive solution: each chapter gets exactly 1 file
    return startIndex + 1;
  }

  private looksLikeChapterStart(text: string): boolean {
    if (!text || text.length < 10) return false;

    const firstLine = text.split("\n")[0].trim();

    // Look for chapter-like patterns
    const chapterPatterns = [
      /^\d+\s*[.:-]*\s*[A-Z]/, // "1. Chapter" or "1: Chapter" or "1 - Chapter"
      /^[IVXLCDM]+\s*[.:-]*\s*[A-Z]/i, // Roman numerals "I. Chapter"
      /^Capítulo\s+\d+/i, // "Capítulo 1"
      /^Chapter\s+\d+/i, // "Chapter 1"
      /^Parte\s+\d+/i, // "Parte 1"
      /^Part\s+\d+/i, // "Part 1"
      /^[A-Z][A-Z\s]{10,}$/, // ALL CAPS titles longer than 10 chars
    ];

    return chapterPatterns.some((pattern) => pattern.test(firstLine));
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
    // Remove script elements
    const scripts = doc.querySelectorAll("script");
    scripts.forEach((script) => script.remove());

    // Process images - convert to text representation with src info
    const images = doc.querySelectorAll("img");
    images.forEach((img) => {
      const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
      const alt = img.getAttribute("alt") || "Imagem";
      const title = img.getAttribute("title") || alt;

      // Create a placeholder that includes both description and src
      const placeholder = `\n[IMAGEM:${src ? `|${src}` : ""}|${title || alt}]`;
      img.replaceWith(placeholder);
    });

    // Keep style elements for now (they might be needed for layout)

    // Extract text content preserving some structure
    const body = doc.body || doc.documentElement;
    let text = body.textContent || body.innerText || "";

    // Clean up whitespace but preserve paragraph breaks
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();

    return text;
  }

  async searchInBook(query: string): Promise<SearchResult[]> {
    if (!this.book || !query.trim()) return [];

    const results: SearchResult[] = [];
    const chapters = await this.getChapters();

    // Process chapters in batches to avoid blocking UI
    const batchSize = 5;
    for (let i = 0; i < chapters.length; i += batchSize) {
      const batch = chapters.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chapter) => {
        try {
          const text = await this.getChapterText(chapter.href);
          const chapterResults = this.searchInText(text, query, chapter);
          results.push(...chapterResults);
        } catch (e) {
          console.warn(`Failed to search in chapter ${chapter.label}:`, e);
        }
      });

      await Promise.all(batchPromises);

      // Allow UI to update between batches
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return results;
  }

  private searchInText(
    text: string,
    query: string,
    chapter: Chapter
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const lines = text.split("\n");
    const searchTerm = query.toLowerCase();

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      const matchIndex = lowerLine.indexOf(searchTerm);

      if (matchIndex !== -1) {
        results.push({
          chapterId: chapter.id,
          chapterTitle: chapter.label,
          lineNumber: index + 1, // 1-based line numbers
          lineContent: line.trim(),
          matchStart: matchIndex,
          matchEnd: matchIndex + query.length,
        });
      }
    });

    return results;
  }
}

export const epubService = new EpubService();
