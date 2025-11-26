import { epubService, type Chapter } from "../services/epub";
import { codeifier, type CodeLineData } from "../services/codeifier";
import { storageService, type BookData } from "../services/storage";
import { tick } from "svelte";

export interface ReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  currentCode: CodeLineData[];
  fontSize: number;
  wordWrap: boolean;
  chapterScrollProgress: number;
  isLoading: boolean;
}

class BookStore {
  // Global state for all books
  availableBooks = $state<BookData[]>([]);

  // Multiple reading sessions (tabs)
  readingSessions = $state<ReadingSession[]>([]);
  activeSessionId = $state<string | null>(null);

  // Split view state
  isSplitView = $state(false);
  leftSessionId = $state<string | null>(null);
  rightSessionId = $state<string | null>(null);

  // Computed properties for backward compatibility
  get bookLoaded() {
    return this.readingSessions.length > 0;
  }

  get metadata() {
    const activeSession = this.getActiveSession();
    return activeSession
      ? { title: activeSession.bookTitle, creator: activeSession.bookAuthor }
      : null;
  }

  get chapters() {
    const activeSession = this.getActiveSession();
    return activeSession?.chapters || [];
  }

  get currentChapter() {
    const activeSession = this.getActiveSession();
    return activeSession?.currentChapter || null;
  }

  get currentCode() {
    const activeSession = this.getActiveSession();
    return activeSession?.currentCode || [];
  }

  get isLoading() {
    const activeSession = this.getActiveSession();
    return activeSession?.isLoading || false;
  }

  get fontSize() {
    const activeSession = this.getActiveSession();
    return activeSession?.fontSize || 14;
  }

  get wordWrap() {
    const activeSession = this.getActiveSession();
    return activeSession?.wordWrap ?? true;
  }

  get chapterScrollProgress() {
    const activeSession = this.getActiveSession();
    return activeSession?.chapterScrollProgress || 0;
  }

  get currentBookId() {
    const activeSession = this.getActiveSession();
    return activeSession?.bookId || null;
  }

  get sessionsCount() {
    return this.readingSessions.length;
  }

  get overallBookProgress() {
    const activeSession = this.getActiveSession();
    if (!activeSession || !activeSession.currentChapter) return 0;

    const book = this.availableBooks.find((b) => b.id === activeSession.bookId);
    if (!book) return 0;

    const chapters = activeSession.chapters;
    const currentChapterIndex = chapters.findIndex(
      (c) => c.id === activeSession.currentChapter!.id
    );

    if (currentChapterIndex === -1) return 0;

    const completedChapters = currentChapterIndex;
    const currentChapterProgress =
      book.chapterProgress[activeSession.currentChapter.id] || 0;

    const totalProgress =
      (completedChapters + currentChapterProgress) / chapters.length;
    return Math.round(totalProgress * 100);
  }

  getSessionChapterProgress(sessionId: string): number {
    const session = this.readingSessions.find((s) => s.id === sessionId);
    if (!session || !session.currentChapter) return 0;
    return session.chapterScrollProgress;
  }

  getSessionBookProgress(sessionId: string): number {
    const session = this.readingSessions.find((s) => s.id === sessionId);
    if (!session || !session.currentChapter) return 0;

    const book = this.availableBooks.find((b) => b.id === session.bookId);
    if (!book) return 0;

    const chapters = session.chapters;
    const currentChapterIndex = chapters.findIndex(
      (c) => c.id === session.currentChapter!.id
    );

    if (currentChapterIndex === -1) return 0;

    const completedChapters = currentChapterIndex;
    const currentChapterProgress =
      book.chapterProgress[session.currentChapter.id] || 0;

    const totalProgress =
      (completedChapters + currentChapterProgress) / chapters.length;
    return Math.round(totalProgress * 100);
  }

  private getActiveSession(): ReadingSession | null {
    return (
      this.readingSessions.find((s) => s.id === this.activeSessionId) || null
    );
  }

  constructor() {
    // Load available books from localStorage
    this.availableBooks = storageService.getAllBooks();

    // Auto-load last read book as first session
    if (this.availableBooks.length > 0) {
      const lastBook = this.availableBooks.sort(
        (a, b) => b.lastRead - a.lastRead
      )[0];
      this.createSessionFromBook(lastBook.id);
    }
  }

  increaseFontSize() {
    const session = this.getActiveSession();
    if (session) {
      session.fontSize = Math.min(session.fontSize + 2, 32);
    }
  }

  decreaseFontSize() {
    const session = this.getActiveSession();
    if (session) {
      session.fontSize = Math.max(session.fontSize - 2, 10);
    }
  }

  toggleWordWrap() {
    const session = this.getActiveSession();
    if (session) {
      session.wordWrap = !session.wordWrap;
    }
  }

  updateScrollProgress(progress: number) {
    const session = this.getActiveSession();
    if (session && session.currentChapter) {
      session.chapterScrollProgress = Math.round(progress * 100);

      // If user has scrolled to near the end (95%+), mark chapter as complete
      const finalProgress = progress >= 0.95 ? 1.0 : progress;

      storageService.updateChapterProgress(
        session.bookId,
        session.currentChapter.id,
        finalProgress
      );
    }
  }

  updateScrollProgressForSession(sessionId: string, progress: number) {
    const session = this.readingSessions.find((s) => s.id === sessionId);
    if (session && session.currentChapter) {
      session.chapterScrollProgress = Math.round(progress * 100);

      // If user has scrolled to near the end (95%+), mark chapter as complete
      const finalProgress = progress >= 0.95 ? 1.0 : progress;

      storageService.updateChapterProgress(
        session.bookId,
        session.currentChapter.id,
        finalProgress
      );
    }
  }

  // Session management methods
  createSessionFromBook(bookId: string): string {
    const book = this.availableBooks.find((b) => b.id === bookId);
    if (!book) return "";

    const sessionId = `session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const session: ReadingSession = {
      id: sessionId,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      chapters: [], // Will be loaded in loadSessionBook
      currentChapter: null,
      currentCode: [],
      fontSize: 14,
      wordWrap: true,
      chapterScrollProgress: 0,
      isLoading: false,
    };

    this.readingSessions.push(session);

    // Always make this session active when created from book selection
    this.activeSessionId = sessionId;

    // Load the book content for this session
    this.loadSessionBook(sessionId);

    return sessionId;
  }

  switchToSession(sessionId: string) {
    if (this.readingSessions.find((s) => s.id === sessionId)) {
      this.activeSessionId = sessionId;
    }
  }

  closeSession(sessionId: string) {
    const index = this.readingSessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return;

    // If closing active session, switch to another one
    if (this.activeSessionId === sessionId) {
      if (this.readingSessions.length > 1) {
        const newActiveIndex = index === 0 ? 1 : index - 1;
        this.activeSessionId = this.readingSessions[newActiveIndex].id;
      } else {
        this.activeSessionId = null;
      }
    }

    // Remove from split view if present
    if (this.leftSessionId === sessionId) this.leftSessionId = null;
    if (this.rightSessionId === sessionId) this.rightSessionId = null;

    this.readingSessions.splice(index, 1);

    // Disable split view if we don't have enough sessions
    if (this.readingSessions.length < 2) {
      this.isSplitView = false;
    }
  }

  toggleSplitView() {
    if (this.readingSessions.length < 2) return;

    this.isSplitView = !this.isSplitView;

    if (this.isSplitView) {
      // Set up split view with current session on left
      this.leftSessionId = this.activeSessionId;
      // Find another session for right side
      const otherSession = this.readingSessions.find(
        (s) => s.id !== this.activeSessionId
      );
      this.rightSessionId = otherSession?.id || null;
    } else {
      this.leftSessionId = null;
      this.rightSessionId = null;
    }
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  async loadEpub(file: File) {
    try {
      const buffer = await file.arrayBuffer();

      // Check file size and warn about large files
      const fileSizeMB = buffer.byteLength / (1024 * 1024);
      if (fileSizeMB > 5) {
        console.warn(
          `Large EPUB file detected: ${fileSizeMB.toFixed(
            1
          )}MB. May not save to localStorage.`
        );
        // Could add user notification here in the future
      }

      await epubService.loadBook(buffer);

      const meta = epubService.getMetadata();

      // Generate book ID from title
      const bookId = this.generateBookId(meta.title);

      // Convert ArrayBuffer to base64 for storage
      const base64 = this.arrayBufferToBase64(buffer);

      // Get chapters
      const chapters = await epubService.getChapters();

      // Calculate word counts for all chapters (optimized - process in batches)
      const chapterWordCounts: Record<string, number> = {};
      let totalWords = 0;

      // Process chapters in batches of 3 to avoid blocking the UI
      const batchSize = 3;
      for (let i = 0; i < chapters.length; i += batchSize) {
        const batch = chapters.slice(i, i + batchSize);
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
        epubSize: buffer.byteLength,
        isLargeFile: false, // Will be set by storage service if needed
        currentChapterId: null,
        chapterProgress: {},
        chapterWordCounts,
        totalWords,
        lastRead: Date.now(),
      };

      storageService.saveBook(bookData);
      this.availableBooks = storageService.getAllBooks();

      // Create a new session for this book
      const sessionId = this.createSessionFromBook(bookId);
      const newSession = this.readingSessions.find((s) => s.id === sessionId);
      if (newSession) {
        // Set chapters directly in the session
        newSession.chapters = chapters;
      }
      this.switchToSession(sessionId);

      // Load first chapter or last read chapter
      const savedBook = storageService.getBook(bookId);
      if (savedBook?.currentChapterId) {
        const chapter = chapters.find(
          (c) => c.id === savedBook.currentChapterId
        );
        if (chapter) {
          await this.selectChapterForSession(sessionId, chapter);
        } else if (chapters.length > 0) {
          await this.selectChapterForSession(sessionId, chapters[0]);
        }
      } else if (chapters.length > 0) {
        await this.selectChapterForSession(sessionId, chapters[0]);
      }
    } catch (e) {
      console.error("Failed to load book", e);
    }
  }

  async loadSessionBook(sessionId: string) {
    const session = this.readingSessions.find((s) => s.id === sessionId);
    if (!session) return;

    const book = this.availableBooks.find((b) => b.id === session.bookId);
    if (!book) return;

    session.isLoading = true;
    try {
      // Convert base64 back to ArrayBuffer
      const epubData = book.epubData;
      if (!epubData) {
        throw new Error("EPUB data not available");
      }
      const buffer = this.base64ToArrayBuffer(epubData);
      await epubService.loadBook(buffer);

      // Get chapters - either from session or load them
      let chapters = session.chapters;
      if (chapters.length === 0) {
        chapters = await epubService.getChapters();
        session.chapters = chapters;
      }

      // If word counts don't exist (old data), calculate them
      if (!book.chapterWordCounts || !book.totalWords) {
        const chapterWordCounts: Record<string, number> = {};
        let totalWords = 0;

        for (const chapter of chapters) {
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
        const chapter = chapters.find((c) => c.id === book.currentChapterId);
        if (chapter) {
          await this.selectChapterForSession(sessionId, chapter);
        } else if (chapters.length > 0) {
          await this.selectChapterForSession(sessionId, chapters[0]);
        } else {
          // No chapters available, stop loading
          session.isLoading = false;
        }
      } else if (chapters.length > 0) {
        await this.selectChapterForSession(sessionId, chapters[0]);
      } else {
        // No chapters available, stop loading
        session.isLoading = false;
      }
    } catch (e) {
      console.error("Failed to load book for session", e);
      // Ensure loading is stopped on error
      const errorSession = this.readingSessions.find((s) => s.id === sessionId);
      if (errorSession) {
        errorSession.isLoading = false;
      }
    }
  }

  deleteBook(bookId: string) {
    storageService.deleteBook(bookId);
    this.availableBooks = storageService.getAllBooks();

    // Close all sessions for this book
    const sessionsToClose = this.readingSessions.filter(
      (s) => s.bookId === bookId
    );
    sessionsToClose.forEach((session) => {
      this.closeSession(session.id);
    });
  }

  async selectChapter(chapter: Chapter) {
    // For backward compatibility, use active session
    const activeSession = this.getActiveSession();
    if (activeSession) {
      await this.selectChapterForSession(activeSession.id, chapter);
    }
  }

  async selectChapterForSession(sessionId: string, chapter: Chapter) {
    try {
      const session = this.readingSessions.find((s) => s.id === sessionId);
      if (!session) return;

      // Mark previous chapter as complete if it exists
      if (session.currentChapter && session.currentChapter.id !== chapter.id) {
        storageService.updateChapterProgress(
          session.bookId,
          session.currentChapter.id,
          1.0 // Mark as 100% complete
        );
      }

      // Update all session properties at once to minimize reactive updates
      Object.assign(session, {
        currentChapter: chapter,
        isLoading: true,
        currentCode: [
          {
            ln: 1,
            content:
              '<span class="text-vscode-comment">// Loading chapter...</span>',
          },
        ],
      });

      // Allow Svelte to process the reactive updates
      await tick();

      // Always ensure we have some content, even if loading fails
      session.currentCode = [
        {
          ln: 1,
          content:
            '<span class="text-vscode-comment">// Loading chapter...</span>',
        },
      ];

      codeifier.reset();
      storageService.updateCurrentChapter(session.bookId, chapter.id);

      // Load the book content first (since epubService is shared)
      const bookData = this.availableBooks.find((b) => b.id === session.bookId);
      if (bookData && bookData.epubData) {
        const buffer = this.base64ToArrayBuffer(bookData.epubData);
        await epubService.loadBook(buffer);
      }

      const text = await epubService.getChapterText(chapter.href);

      if (text && text.trim()) {
        try {
          // Allow Svelte to process any pending updates before setting content
          await tick();

          // Create a new array to ensure proper reactivity
          const newCode = [...codeifier.transform(text)];

          // Get progress book for scroll progress
          const progressBook = storageService.getBook(session.bookId);

          console.log(
            "About to update currentCode with:",
            newCode.length,
            "lines"
          );
          console.log("Sample content:", newCode.slice(0, 2));

          // Update session properties together
          Object.assign(session, {
            currentCode: newCode,
            chapterScrollProgress: progressBook
              ? Math.round(progressBook.chapterProgress[chapter.id] || 0)
              : 0,
            isLoading: false, // Mark loading as complete
          });

          console.log(
            "Session updated, currentCode is now:",
            session.currentCode?.length,
            "lines"
          );

          // Allow Svelte to process the reactive updates
          await tick();
        } catch (transformError) {
          console.error("Failed to transform text to code:", transformError);
          Object.assign(session, {
            currentCode: [
              {
                ln: 1,
                content:
                  '<span class="text-vscode-comment">// Failed to process chapter content</span>',
              },
            ],
            chapterScrollProgress: 0,
            isLoading: false, // Mark loading as complete even on error
          });
        }
      } else {
        // Provide a fallback message if chapter content is empty
        Object.assign(session, {
          currentCode: [
            {
              ln: 1,
              content:
                '<span class="text-vscode-comment">// Chapter content is empty or could not be loaded</span>',
            },
          ],
          chapterScrollProgress: 0,
          isLoading: false, // Mark loading as complete
        });
      }
    } catch (e) {
      console.error("Failed to load chapter for session", e);
      // Find session again in case of error
      const errorSession = this.readingSessions.find((s) => s.id === sessionId);
      if (errorSession) {
        Object.assign(errorSession, {
          currentCode: [
            {
              ln: 1,
              content:
                '<span class="text-vscode-comment">// Failed to load chapter content</span>',
            },
          ],
          chapterScrollProgress: 0,
          isLoading: false,
        });
      }
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
