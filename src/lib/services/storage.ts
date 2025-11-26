export interface BookData {
  id: string;
  title: string;
  author: string;
  epubData?: string; // base64 encoded - optional for large files
  epubSize: number; // size in bytes
  isLargeFile: boolean; // true if file is too large for localStorage
  currentChapterId: string | null;
  chapterProgress: Record<string, number>; // chapterId -> scroll percentage
  chapterWordCounts: Record<string, number>; // chapterId -> word count
  totalWords: number;
  lastRead: number; // timestamp
}

export class StorageService {
  private readonly STORAGE_KEY = "stealth-reader-books";
  private readonly MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit (conservative)
  private largeFilesCache = new Map<string, ArrayBuffer>(); // In-memory cache for large files

  getAllBooks(): BookData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load books from localStorage", e);
      return [];
    }
  }

  getBook(id: string): BookData | null {
    const books = this.getAllBooks();
    const book = books.find((b) => b.id === id);

    if (book && book.isLargeFile) {
      // Restore epubData from memory cache
      const cachedData = this.largeFilesCache.get(id);
      if (cachedData) {
        book.epubData = this.arrayBufferToBase64(cachedData);
      }
    }

    return book || null;
  }

  saveBook(book: BookData): void {
    try {
      // Check if this is a large file that needs special handling
      if (book.epubData && book.epubSize > this.MAX_STORAGE_SIZE) {
        console.log(
          `Book "${book.title}" is too large (${this.formatBytes(
            book.epubSize
          )}), using memory cache`
        );
        book.isLargeFile = true;

        // Remove epubData from storage but keep in memory cache
        const epubData = book.epubData;
        delete book.epubData;

        // Store in memory cache
        this.largeFilesCache.set(book.id, this.base64ToArrayBuffer(epubData));
      } else {
        book.isLargeFile = false;
      }

      const books = this.getAllBooks();
      const index = books.findIndex((b) => b.id === book.id);

      if (index >= 0) {
        books[index] = book;
      } else {
        books.push(book);
      }

      // Try to save with compression if it's too large
      let booksJson = JSON.stringify(books);
      if (booksJson.length > this.MAX_STORAGE_SIZE) {
        console.log("Books data too large, attempting compression...");
        // For now, just log the issue - could implement compression later
        console.warn(`Books data size: ${this.formatBytes(booksJson.length)}`);
      }

      localStorage.setItem(this.STORAGE_KEY, booksJson);
    } catch (e) {
      console.error("Failed to save book to localStorage", e);

      // If localStorage is full, try to free up space
      if (e instanceof Error && e.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded, attempting cleanup...");
        this.attemptStorageCleanup();
      }
    }
  }

  deleteBook(id: string): void {
    try {
      const books = this.getAllBooks();
      const filtered = books.filter((b) => b.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to delete book from localStorage", e);
    }
  }

  updateChapterProgress(
    bookId: string,
    chapterId: string,
    progress: number
  ): void {
    const book = this.getBook(bookId);
    if (book) {
      book.chapterProgress[chapterId] = progress;
      book.lastRead = Date.now();
      this.saveBook(book);
    }
  }

  updateCurrentChapter(bookId: string, chapterId: string): void {
    const book = this.getBook(bookId);
    if (book) {
      book.currentChapterId = chapterId;
      book.lastRead = Date.now();
      this.saveBook(book);
    }
  }

  // Utility methods for handling large files and storage limits
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  private attemptStorageCleanup(): void {
    try {
      const books = this.getAllBooks();

      // Remove old/unused books to free up space
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentBooks = books.filter((book) => book.lastRead > oneWeekAgo);

      if (recentBooks.length < books.length) {
        console.log(
          `Removing ${
            books.length - recentBooks.length
          } old books to free space`
        );
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentBooks));

        // Clear memory cache for removed books
        const removedBookIds = books
          .filter((book) => !recentBooks.some((rb) => rb.id === book.id))
          .map((book) => book.id);

        removedBookIds.forEach((id) => this.largeFilesCache.delete(id));
      }
    } catch (e) {
      console.error("Failed to cleanup storage", e);
    }
  }

  // Method to check storage usage
  getStorageUsage(): { used: number; available: number; percentage: number } {
    try {
      const books = this.getAllBooks();
      const booksJson = JSON.stringify(books);
      const used = booksJson.length;

      // Estimate available space (rough approximation)
      const available = this.MAX_STORAGE_SIZE - used;
      const percentage = (used / this.MAX_STORAGE_SIZE) * 100;

      return { used, available, percentage };
    } catch (e) {
      return { used: 0, available: this.MAX_STORAGE_SIZE, percentage: 0 };
    }
  }
}

export const storageService = new StorageService();
