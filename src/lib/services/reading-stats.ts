export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: number;
  endTime?: number;
  duration: number; // in milliseconds
  wordsRead: number;
  chaptersRead: string[];
  date: string; // YYYY-MM-DD format
}

export interface ReadingStats {
  totalTime: number; // total reading time in milliseconds
  totalWords: number;
  averageWPM: number;
  sessionsCount: number;
  streakDays: number;
  lastReadDate: string;
  dailyStats: Record<
    string,
    {
      time: number;
      words: number;
      sessions: number;
    }
  >;
  weeklyStats: Record<
    string,
    {
      time: number;
      words: number;
      sessions: number;
    }
  >;
  bookStats: Record<
    string,
    {
      time: number;
      words: number;
      sessions: number;
      lastRead: number;
    }
  >;
}

export interface BookMetrics {
  bookId: string;
  estimatedTime: number; // estimated reading time in milliseconds
  difficulty: "easy" | "medium" | "hard";
  averageWPM: number;
  totalWords: number;
  chaptersCount: number;
  progress: number; // 0-100
}

export class ReadingStatsService {
  private readonly SESSIONS_KEY = "stealth-reader-sessions";
  private readonly STATS_KEY = "stealth-reader-stats";
  private readonly METRICS_KEY = "stealth-reader-metrics";

  private currentSession: ReadingSession | null = null;
  private sessionStartTime: number = 0;

  constructor() {
    this.initializeStats();
  }

  // Initialize stats if they don't exist
  private initializeStats(): void {
    const stats = this.getStats();
    if (!stats) {
      const initialStats: ReadingStats = {
        totalTime: 0,
        totalWords: 0,
        averageWPM: 0,
        sessionsCount: 0,
        streakDays: 0,
        lastReadDate: "",
        dailyStats: {},
        weeklyStats: {},
        bookStats: {},
      };
      this.saveStats(initialStats);
    }
  }

  // Timer management
  startReading(
    bookId: string,
    wordsRead: number = 0,
    chaptersRead: string[] = []
  ): void {
    if (this.currentSession) {
      this.endReading(); // End any existing session
    }

    const now = Date.now();
    const today = this.getDateString(now);

    this.currentSession = {
      id: `session-${now}-${Math.random().toString(36).substr(2, 9)}`,
      bookId,
      startTime: now,
      duration: 0,
      wordsRead,
      chaptersRead,
      date: today,
    };

    this.sessionStartTime = now;
  }

  endReading(): ReadingSession | null {
    if (!this.currentSession) return null;

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = now - this.sessionStartTime;

    // Save session
    this.saveSession(this.currentSession);

    // Update stats
    this.updateStats(this.currentSession);

    const completedSession = { ...this.currentSession };
    this.currentSession = null;
    this.sessionStartTime = 0;

    return completedSession;
  }

  getCurrentSession(): ReadingSession | null {
    return this.currentSession;
  }

  isReading(): boolean {
    return this.currentSession !== null;
  }

  // Get reading time for current session
  getCurrentReadingTime(): number {
    if (!this.currentSession || this.sessionStartTime === 0) return 0;
    return Date.now() - this.sessionStartTime;
  }

  // Session management
  private saveSession(session: ReadingSession): void {
    try {
      const sessions = this.getSessions();
      sessions.push(session);

      // Keep only last 1000 sessions to prevent localStorage bloat
      if (sessions.length > 1000) {
        sessions.splice(0, sessions.length - 1000);
      }

      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save reading session", e);
    }
  }

  getSessions(): ReadingSession[] {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load reading sessions", e);
      return [];
    }
  }

  // Stats management
  private updateStats(session: ReadingSession): void {
    const stats = this.getStats();
    if (!stats) return;

    // Update totals
    stats.totalTime += session.duration;
    stats.totalWords += session.wordsRead;
    stats.sessionsCount += 1;

    // Update WPM
    if (stats.totalTime > 0) {
      stats.averageWPM = Math.round(
        (stats.totalWords * 60000) / stats.totalTime
      ); // words per minute
    }

    // Update daily stats
    const dayKey = session.date;
    if (!stats.dailyStats[dayKey]) {
      stats.dailyStats[dayKey] = { time: 0, words: 0, sessions: 0 };
    }
    stats.dailyStats[dayKey].time += session.duration;
    stats.dailyStats[dayKey].words += session.wordsRead;
    stats.dailyStats[dayKey].sessions += 1;

    // Update weekly stats
    const weekKey = this.getWeekString(new Date(session.startTime));
    if (!stats.weeklyStats[weekKey]) {
      stats.weeklyStats[weekKey] = { time: 0, words: 0, sessions: 0 };
    }
    stats.weeklyStats[weekKey].time += session.duration;
    stats.weeklyStats[weekKey].words += session.wordsRead;
    stats.weeklyStats[weekKey].sessions += 1;

    // Update book stats
    if (!stats.bookStats[session.bookId]) {
      stats.bookStats[session.bookId] = {
        time: 0,
        words: 0,
        sessions: 0,
        lastRead: 0,
      };
    }
    stats.bookStats[session.bookId].time += session.duration;
    stats.bookStats[session.bookId].words += session.wordsRead;
    stats.bookStats[session.bookId].sessions += 1;
    stats.bookStats[session.bookId].lastRead = session.startTime;

    // Update streak
    stats.lastReadDate = session.date;
    stats.streakDays = this.calculateStreak();

    this.saveStats(stats);
  }

  getStats(): ReadingStats | null {
    try {
      const data = localStorage.getItem(this.STATS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Failed to load reading stats", e);
      return null;
    }
  }

  private saveStats(stats: ReadingStats): void {
    try {
      localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error("Failed to save reading stats", e);
    }
  }

  // Book metrics
  calculateBookMetrics(
    bookId: string,
    totalWords: number,
    chaptersCount: number,
    progress: number
  ): BookMetrics {
    const stats = this.getStats();
    const bookStats = stats?.bookStats[bookId];

    let averageWPM = 200; // Default WPM
    if (bookStats && bookStats.time > 0) {
      averageWPM = Math.round((bookStats.words * 60000) / bookStats.time);
    }

    // Estimate reading time based on words and average WPM
    const estimatedTime = (totalWords * 60000) / averageWPM; // milliseconds

    // Calculate difficulty based on words per chapter and average WPM
    let difficulty: "easy" | "medium" | "hard" = "medium";
    const wordsPerChapter = totalWords / chaptersCount;
    const adjustedWPM = averageWPM * (progress / 100); // Account for reading progress

    if (adjustedWPM > 250 || wordsPerChapter < 1000) {
      difficulty = "easy";
    } else if (adjustedWPM < 150 || wordsPerChapter > 3000) {
      difficulty = "hard";
    }

    return {
      bookId,
      estimatedTime,
      difficulty,
      averageWPM,
      totalWords,
      chaptersCount,
      progress,
    };
  }

  // Utility methods
  private getDateString(timestamp: number): string {
    return new Date(timestamp).toISOString().split("T")[0];
  }

  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const weekNum = this.getWeekNumber(date);
    return `${year}-W${weekNum.toString().padStart(2, "0")}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private calculateStreak(): number {
    const stats = this.getStats();
    if (!stats) return 0;

    const sessions = this.getSessions();
    if (sessions.length === 0) return 0;

    // Get unique reading days, sorted descending
    const readingDays = [...new Set(sessions.map((s) => s.date))]
      .sort()
      .reverse();

    let streak = 0;
    const today = this.getDateString(Date.now());

    // Check if read today or yesterday
    const lastReadDate = new Date(stats.lastReadDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.getDateString(yesterday.getTime());

    if (stats.lastReadDate !== today && stats.lastReadDate !== yesterdayStr) {
      return 0; // No recent reading
    }

    // Count consecutive days
    let checkDate = new Date(stats.lastReadDate);
    while (readingDays.includes(this.getDateString(checkDate.getTime()))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  // Get reading time for a specific period
  getReadingTimeForPeriod(startDate: Date, endDate: Date): number {
    const sessions = this.getSessions();
    return sessions
      .filter((session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startDate && sessionDate <= endDate;
      })
      .reduce((total, session) => total + session.duration, 0);
  }

  // Get daily reading data for heatmap
  getDailyReadingData(
    days: number = 365
  ): Array<{ date: string; value: number }> {
    const sessions = this.getSessions();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyData: Record<string, number> = {};

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = this.getDateString(date.getTime());
      dailyData[dateStr] = 0;
    }

    // Fill with actual reading time (in minutes)
    sessions.forEach((session) => {
      if (session.date in dailyData) {
        dailyData[session.date] += Math.round(session.duration / (1000 * 60)); // minutes
      }
    });

    return Object.entries(dailyData).map(([date, value]) => ({ date, value }));
  }

  // Get weekly progress data
  getWeeklyProgress(
    weeks: number = 52
  ): Array<{ week: string; time: number; words: number }> {
    const stats = this.getStats();
    if (!stats) return [];

    const weeksData: Array<{ week: string; time: number; words: number }> = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - i * 7);
      const weekKey = this.getWeekString(weekDate);

      const weekStats = stats.weeklyStats[weekKey] || {
        time: 0,
        words: 0,
        sessions: 0,
      };
      weeksData.push({
        week: weekKey,
        time: Math.round(weekStats.time / (1000 * 60)), // minutes
        words: weekStats.words,
      });
    }

    return weeksData;
  }

  // Format time duration with seconds
  formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  // Format time duration in HH:MM:SS format
  formatDurationDetailed(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  // Get today's reading time
  getTodayReadingTime(): number {
    const today = this.getDateString(Date.now());
    const sessions = this.getSessions();
    return sessions
      .filter((session) => session.date === today)
      .reduce((total, session) => total + session.duration, 0);
  }

  // Get this week's reading time
  getWeekReadingTime(): number {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    return this.getReadingTimeForPeriod(startOfWeek, now);
  }
}

export const readingStatsService = new ReadingStatsService();
