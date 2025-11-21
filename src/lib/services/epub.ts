import ePub, { type Book } from 'epubjs';

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
      items.forEach(item => {
        chapters.push({
          id: item.id,
          label: item.label.trim() || 'Untitled',
          href: item.href
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
    if (!this.book) return '';
    
    // Create a hidden container
    const container = document.createElement('div');
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    container.style.top = '-10000px';
    document.body.appendChild(container);
    
    try {
      // Create a rendition
      const rendition = this.book.renderTo(container, { width: '100%', height: '100%' });
      await rendition.display(href);
      
      // Get contents
      // We might need to wait a bit or access the manager
      // @ts-ignore
      const contents = rendition.getContents();
      if (contents && (contents as any).length > 0) {
        const doc = (contents as any)[0].document;
        return doc.body.innerText || doc.documentElement.textContent || '';
      }
      
      // Fallback: try to access the iframe directly if contents is empty
      const iframe = container.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
         return iframe.contentDocument.body.innerText || '';
      }

      return '';
    } catch (e) {
      console.error("Failed to render chapter", e);
      return '';
    } finally {
      // Cleanup
      try {
        document.body.removeChild(container);
      } catch (e) {
        // Ignore
      }
    }
  }
}

export const epubService = new EpubService();
