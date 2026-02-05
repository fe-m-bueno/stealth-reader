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

  /**
   * Separa um href em baseHref (caminho do arquivo) e fragment (ID do anchor)
   * Exemplo: "Text/part0007.xhtml#capitulo2" -> { baseHref: "Text/part0007.xhtml", fragment: "capitulo2" }
   */
  private parseHref(href: string): { baseHref: string; fragment: string | null } {
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return { baseHref: href, fragment: null };
    return {
      baseHref: href.substring(0, hashIndex),
      fragment: href.substring(hashIndex + 1),
    };
  }

  /**
   * Carrega o DOM do documento XHTML via epubjs, sem fragmento
   */
  private async loadSectionDocument(baseHref: string): Promise<Document | null> {
    if (!this.book) return null;

    try {
      // @ts-ignore - epubjs internal API
      const section = this.book.spine.get(baseHref);
      if (!section) return null;

      // Se o documento já está carregado, retorna diretamente
      if (section.document) return section.document;

      // Tenta carregar a seção
      if (section.load) {
        await section.load(this.book.load.bind(this.book));
        return section.document || null;
      }

      return null;
    } catch (e) {
      console.error(`Failed to load section document for ${baseHref}:`, e);
      return null;
    }
  }

  /**
   * Extrai texto do DOM entre dois fragmentos (anchors) identificados por IDs
   * @param doc - Documento HTML/XHTML
   * @param startId - ID do anchor onde o capítulo começa (null = início do documento)
   * @param endId - ID do anchor onde o capítulo termina (null = fim do documento)
   */
  private extractTextBetweenFragments(
    doc: Document,
    startId: string | null,
    endId: string | null
  ): string {
    // Clona o documento para não modificar o original
    const clonedDoc = doc.cloneNode(true) as Document;
    const clonedBody = clonedDoc.body || clonedDoc.documentElement;

    // Função auxiliar para encontrar um elemento por ID
    const findElementById = (id: string): Element | null => {
      let element = clonedDoc.getElementById(id);
      if (!element) {
        element = clonedDoc.querySelector(`[id="${id}"]`);
      }
      return element;
    };

    // Função auxiliar para encontrar o elemento pai que é filho direto de um container específico
    const findDirectChild = (element: Element, container: Element): Element | null => {
      let current: Element | null = element;
      while (current && current !== container) {
        const parent: Element | null = current.parentElement;
        if (parent === container) {
          return current;
        }
        current = parent;
      }
      return null;
    };

    // Encontra os elementos de início e fim
    let startElement: Element | null = null;
    let endElement: Element | null = null;
    
    if (startId) {
      startElement = findElementById(startId);
    }

    if (endId) {
      endElement = findElementById(endId);
    }

    // Encontra o container comum (div que contém ambos os elementos)
    let commonContainer: Element = clonedBody;
    
    if (startElement) {
      // Sobe do startElement até encontrar um container que seja filho direto do body
      let current: Element | null = startElement;
      while (current && current !== clonedBody) {
        if (current.parentElement === clonedBody) {
          commonContainer = current;
          break;
        }
        current = current.parentElement;
      }
    }
    
    if (endElement && commonContainer === clonedBody) {
      // Se não encontrou pelo startElement, tenta pelo endElement
      let current: Element | null = endElement;
      while (current && current !== clonedBody) {
        if (current.parentElement === clonedBody) {
          commonContainer = current;
          break;
        }
        current = current.parentElement;
      }
    }
    
    // Encontra os nós diretos dentro do container comum
    let startNode: Element | null = null;
    let endNode: Element | null = null;
    
    if (startElement) {
      startNode = findDirectChild(startElement, commonContainer);
      if (!startNode && startElement.parentElement === commonContainer) {
        startNode = startElement;
      }
    }
    
    if (endElement) {
      endNode = findDirectChild(endElement, commonContainer);
      if (!endNode && endElement.parentElement === commonContainer) {
        endNode = endElement;
      }
    }
    
    // Remove tudo antes do startNode
    if (startNode) {
      let sibling = startNode.previousElementSibling;
      while (sibling) {
        const toRemove = sibling;
        sibling = sibling.previousElementSibling;
        commonContainer.removeChild(toRemove);
      }
    }
    
    // Remove o endNode e tudo depois dele
    if (endNode) {
      let toRemove: Element | null = endNode;
      while (toRemove) {
        const next: Element | null = toRemove.nextElementSibling;
        commonContainer.removeChild(toRemove);
        toRemove = next;
      }
    }

    // Extrai o texto do DOM modificado
    return this.extractTextContent(clonedDoc);
  }

  /**
   * Encontra o primeiro anchor de capítulo no documento
   * Procura por elementos com ID que parecem ser anchors de capítulo
   */
  private findFirstChapterAnchor(doc: Document): string | null {
    // Padrões comuns para IDs de capítulos
    const chapterIdPatterns = [
      /^capitulo\d+$/i,
      /^chapter\d+$/i,
      /^ch\d+$/i,
      /^cap\d+$/i,
    ];

    // Procura por todos os elementos com ID
    const allElements = doc.querySelectorAll("[id]");
    
    // Ordena por ordem de aparição no DOM
    const elementsArray = Array.from(allElements);
    
    for (const element of elementsArray) {
      const id = element.getAttribute("id");
      if (id && chapterIdPatterns.some(pattern => pattern.test(id))) {
        return id;
      }
    }

    return null;
  }

  async getChapterText(href: string): Promise<string> {
    if (!this.book) return "";

    try {
      // Parse o href para obter baseHref e fragment
      const { baseHref, fragment } = this.parseHref(href);

      // Obter lista de capítulos do TOC
      const chapters = await this.getChapters();
      
      // Encontrar o índice do capítulo atual
      const currentChapterIndex = chapters.findIndex(
        (chapter) => chapter.href === href
      );

      if (currentChapterIndex === -1) {
        // Capítulo não encontrado no TOC, fallback para arquivo inteiro
        console.warn(`Chapter not found in TOC for href: ${href}`);
        return await this.getSingleFileText(baseHref);
      }

      // Determinar o fragmento de início e fim
      let startFragment: string | null = fragment;
      let endFragment: string | null = null;
      
      // Verificar se o próximo capítulo no TOC aponta para o mesmo arquivo
      if (currentChapterIndex + 1 < chapters.length) {
        const nextChapter = chapters[currentChapterIndex + 1];
        const nextParsed = this.parseHref(nextChapter.href);
        
        // Se o próximo capítulo está no mesmo arquivo, usa seu fragment como fim
        if (nextParsed.baseHref === baseHref) {
          endFragment = nextParsed.fragment;
        }
      }
      
      // Se não há fragmento no href, mas há um próximo capítulo no mesmo arquivo,
      // então este capítulo começa no primeiro anchor do arquivo
      if (!startFragment) {
        // Se ainda não encontrou fragmento, retorna arquivo inteiro (capítulo único no arquivo)
        if (!endFragment) {
          return await this.getSingleFileText(baseHref);
        }
      }

      // Carregar o Document via loadSectionDocument
      const doc = await this.loadSectionDocument(baseHref);
      
      // Se não há startFragment mas há endFragment, procura o primeiro anchor no documento carregado
      if (!startFragment && endFragment && doc) {
        startFragment = this.findFirstChapterAnchor(doc);
        
        // Se ainda não encontrou, retorna arquivo inteiro
        if (!startFragment) {
          return await this.getSingleFileText(baseHref);
        }
      }
      
      if (!doc) {
        // Fallback se não conseguir carregar o documento
        console.warn(`Failed to load document for ${baseHref}, falling back to full file`);
        return await this.getSingleFileText(baseHref);
      }

      // Extrair texto entre os fragmentos
      return this.extractTextBetweenFragments(doc, startFragment, endFragment);
    } catch (e) {
      console.error("Failed to get chapter text:", e);
      // Fallback to single file extraction
      try {
        const { baseHref } = this.parseHref(href);
        return await this.getSingleFileText(baseHref);
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


  private async getSingleFileText(href: string): Promise<string> {
    if (!this.book) return "";

    try {
      // Remove fragment se houver (para carregar o arquivo completo)
      const { baseHref } = this.parseHref(href);
      
      // Usa loadSectionDocument para obter o DOM
      const doc = await this.loadSectionDocument(baseHref);
      
      if (doc) {
        return this.extractTextContent(doc);
      }

      // Fallback: use DOM rendering (slower)
      return this.getSingleFileTextDOM(baseHref);
    } catch (e) {
      console.error("Failed to get file text directly, falling back to DOM", e);
      const { baseHref } = this.parseHref(href);
      return this.getSingleFileTextDOM(baseHref);
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
