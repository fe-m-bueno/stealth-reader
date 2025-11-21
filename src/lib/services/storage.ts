export interface BookData {
  id: string;
  title: string;
  author: string;
  epubData: string; // base64 encoded
  currentChapterId: string | null;
  chapterProgress: Record<string, number>; // chapterId -> scroll percentage
  chapterWordCounts: Record<string, number>; // chapterId -> word count
  totalWords: number;
  lastRead: number; // timestamp
}

export class StorageService {
  private readonly STORAGE_KEY = 'stealth-reader-books';

  getAllBooks(): BookData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load books from localStorage', e);
      return [];
    }
  }

  getBook(id: string): BookData | null {
    const books = this.getAllBooks();
    return books.find(b => b.id === id) || null;
  }

  saveBook(book: BookData): void {
    try {
      const books = this.getAllBooks();
      const index = books.findIndex(b => b.id === book.id);
      
      if (index >= 0) {
        books[index] = book;
      } else {
        books.push(book);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.error('Failed to save book to localStorage', e);
    }
  }

  deleteBook(id: string): void {
    try {
      const books = this.getAllBooks();
      const filtered = books.filter(b => b.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete book from localStorage', e);
    }
  }

  updateChapterProgress(bookId: string, chapterId: string, progress: number): void {
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
}

export const storageService = new StorageService();
