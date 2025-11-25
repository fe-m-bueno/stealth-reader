import { epubService, type Chapter } from "../services/epub";
import { codeifier, type CodeLineData } from "../services/codeifier";
import { storageService, type BookData } from "../services/storage";

class BookStore {
  bookLoaded = $state(false);
  metadata = $state<{ title: string; creator: string } | null>(null);
  chapters = $state<Chapter[]>([]);
  currentChapter = $state<Chapter | null>(null);
  currentCode = $state<CodeLineData[]>([]);
  isLoading = $state(false);
  fontSize = $state(14);
  wordWrap = $state(true);

  // Progress tracking
  currentBookId = $state<string | null>(null);
  chapterScrollProgress = $state(0); // 0-100
  overallBookProgress = $state(0); // 0-100

  // Multiple books
  availableBooks = $state<BookData[]>([]);

  constructor() {
    // Load available books from localStorage
    this.availableBooks = storageService.getAllBooks();

    // Auto-load last read book
    if (this.availableBooks.length > 0) {
      const lastBook = this.availableBooks.sort(
        (a, b) => b.lastRead - a.lastRead
      )[0];
      this.loadBookFromStorage(lastBook.id);
    }
  }

  increaseFontSize() {
    this.fontSize = Math.min(this.fontSize + 2, 32);
  }

  decreaseFontSize() {
    this.fontSize = Math.max(this.fontSize - 2, 10);
  }

  toggleWordWrap() {
    this.wordWrap = !this.wordWrap;
  }

  updateScrollProgress(progress: number) {
    this.chapterScrollProgress = Math.round(progress * 100);

    if (this.currentBookId && this.currentChapter) {
      // If user has scrolled to near the end (95%+), mark chapter as complete
      const finalProgress = progress >= 0.95 ? 1.0 : progress;

      storageService.updateChapterProgress(
        this.currentBookId,
        this.currentChapter.id,
        finalProgress
      );
    }

    this.calculateOverallProgress();
  }

  private calculateOverallProgress() {
    if (!this.currentBookId || this.chapters.length === 0) {
      this.overallBookProgress = 0;
      return;
    }

    const book = storageService.getBook(this.currentBookId);
    if (!book) {
      this.overallBookProgress = 0;
      return;
    }

    // Find current chapter index
    const currentChapterIndex = this.currentChapter
      ? this.chapters.findIndex((c) => c.id === this.currentChapter!.id)
      : -1;

    if (currentChapterIndex === -1) {
      this.overallBookProgress = 0;
      return;
    }

    // Calculate progress: chapters before current are 100% complete
    // Current chapter uses scroll progress
    const completedChapters = currentChapterIndex;
    const currentChapterProgress =
      book.chapterProgress[this.currentChapter!.id] || 0;

    const totalProgress =
      (completedChapters + currentChapterProgress) / this.chapters.length;
    this.overallBookProgress = Math.round(totalProgress * 100);
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  async loadEpub(file: File) {
    this.isLoading = true;
    try {
      const buffer = await file.arrayBuffer();
      await epubService.loadBook(buffer);

      const meta = epubService.getMetadata();
      this.metadata = {
        title: meta.title,
        creator: meta.creator,
      };

      // Get chapters first (fast operation)
      this.chapters = await epubService.getChapters();
      this.bookLoaded = true;

      // Generate book ID from title
      const bookId = this.generateBookId(meta.title);
      this.currentBookId = bookId;

      // Convert ArrayBuffer to base64 for storage
      const base64 = this.arrayBufferToBase64(buffer);

      // Calculate word counts for all chapters (optimized - process in batches)
      const chapterWordCounts: Record<string, number> = {};
      let totalWords = 0;

      // Process chapters in batches of 3 to avoid blocking the UI
      const batchSize = 3;
      for (let i = 0; i < this.chapters.length; i += batchSize) {
        const batch = this.chapters.slice(i, i + batchSize);
        const batchPromises = batch.map(async (chapter) => {
          const text = await epubService.getChapterText(chapter.href);
          const wordCount = this.countWords(text);
          return { chapterId: chapter.id, wordCount };
        });

        const batchResults = await Promise.all(batchPromises);
        for (const result of batchResults) {
          chapterWordCounts[result.chapterId] = result.wordCount;
          totalWords += result.wordCount;
        }

        // Allow UI to update between batches
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Save to localStorage
      const bookData: BookData = {
        id: bookId,
        title: meta.title,
        author: meta.creator,
        epubData: base64,
        currentChapterId: null,
        chapterProgress: {},
        chapterWordCounts,
        totalWords,
        lastRead: Date.now(),
      };

      storageService.saveBook(bookData);
      this.availableBooks = storageService.getAllBooks();

      // Load first chapter or last read chapter
      const savedBook = storageService.getBook(bookId);
      if (savedBook?.currentChapterId) {
        const chapter = this.chapters.find(
          (c) => c.id === savedBook.currentChapterId
        );
        if (chapter) {
          await this.selectChapter(chapter);
        } else if (this.chapters.length > 0) {
          await this.selectChapter(this.chapters[0]);
        }
      } else if (this.chapters.length > 0) {
        await this.selectChapter(this.chapters[0]);
      }
    } catch (e) {
      console.error("Failed to load book", e);
    } finally {
      this.isLoading = false;
    }
  }

  async loadBookFromStorage(bookId: string) {
    const book = storageService.getBook(bookId);
    if (!book) return;

    this.isLoading = true;
    try {
      // Convert base64 back to ArrayBuffer
      const buffer = this.base64ToArrayBuffer(book.epubData);
      await epubService.loadBook(buffer);

      this.metadata = {
        title: book.title,
        creator: book.author,
      };

      this.chapters = await epubService.getChapters();
      this.bookLoaded = true;
      this.currentBookId = bookId;

      // If word counts don't exist (old data), calculate them
      if (!book.chapterWordCounts || !book.totalWords) {
        const chapterWordCounts: Record<string, number> = {};
        let totalWords = 0;

        for (const chapter of this.chapters) {
          const text = await epubService.getChapterText(chapter.href);
          const wordCount = this.countWords(text);
          chapterWordCounts[chapter.id] = wordCount;
          totalWords += wordCount;
        }

        book.chapterWordCounts = chapterWordCounts;
        book.totalWords = totalWords;
        storageService.saveBook(book);
      }

      // Load last read chapter
      if (book.currentChapterId) {
        const chapter = this.chapters.find(
          (c) => c.id === book.currentChapterId
        );
        if (chapter) {
          await this.selectChapter(chapter);
        } else if (this.chapters.length > 0) {
          await this.selectChapter(this.chapters[0]);
        }
      } else if (this.chapters.length > 0) {
        await this.selectChapter(this.chapters[0]);
      }
    } catch (e) {
      console.error("Failed to load book from storage", e);
    } finally {
      this.isLoading = false;
    }
  }

  deleteBook(bookId: string) {
    storageService.deleteBook(bookId);
    this.availableBooks = storageService.getAllBooks();

    if (this.currentBookId === bookId) {
      this.bookLoaded = false;
      this.metadata = null;
      this.chapters = [];
      this.currentChapter = null;
      this.currentCode = [];
      this.currentBookId = null;
      this.chapterScrollProgress = 0;
      this.overallBookProgress = 0;
    }
  }

  async selectChapter(chapter: Chapter) {
    // Mark previous chapter as complete if it exists
    if (
      this.currentBookId &&
      this.currentChapter &&
      this.currentChapter.id !== chapter.id
    ) {
      storageService.updateChapterProgress(
        this.currentBookId,
        this.currentChapter.id,
        1.0 // Mark as 100% complete
      );
    }

    this.currentChapter = chapter;
    this.isLoading = true;
    codeifier.reset();

    if (this.currentBookId) {
      storageService.updateCurrentChapter(this.currentBookId, chapter.id);
    }

    try {
      const text = await epubService.getChapterText(chapter.href);
      this.currentCode = codeifier.transform(text);

      // Restore scroll progress
      if (this.currentBookId) {
        const book = storageService.getBook(this.currentBookId);
        if (book) {
          const progress = book.chapterProgress[chapter.id] || 0;
          this.chapterScrollProgress = Math.round(progress * 100);
        }
      }

      this.calculateOverallProgress();
    } catch (e) {
      console.error("Failed to load chapter", e);
    } finally {
      this.isLoading = false;
    }
  }

  private generateBookId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const bookStore = new BookStore();
