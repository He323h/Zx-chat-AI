const KEY = "ef_daily_stats_v3";
const HISTORY_KEY = "ef_weekly_history";

export interface ActivityEntry {
  time: string;
  type: "chat" | "voice" | "vocab" | "actor" | "quiz" | "practice" | "roadmap";
  topic: string;
}

export interface DailyStats {
  date: string;
  sessions: number;
  msgs: number;
  corrections: number;
  voiceMins: number;
  voiceSessions: number;
  minutesPracticed: number;
  topics: string[];
  correctAnswers: number;
  totalAnswers: number;
  activity: ActivityEntry[];
  sessionStartMs: number;
}

export interface WeekDay {
  date: string;
  label: string;
  mins: number;
  msgs: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function blank(): DailyStats {
  return {
    date: todayStr(),
    sessions: 0,
    msgs: 0,
    corrections: 0,
    voiceMins: 0,
    voiceSessions: 0,
    minutesPracticed: 0,
    topics: [],
    correctAnswers: 0,
    totalAnswers: 0,
    activity: [],
    sessionStartMs: Date.now(),
  };
}

function load(): DailyStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed: DailyStats = JSON.parse(raw);
    if (parsed.date !== todayStr()) return blank();
    return { ...blank(), ...parsed };
  } catch {
    return blank();
  }
}

function save(stats: DailyStats): void {
  // Also persist to weekly history
  saveToHistory(stats);
  localStorage.setItem(KEY, JSON.stringify(stats));
  // Notify listeners
  window.dispatchEvent(new CustomEvent("ef:stats-updated"));
}

function saveToHistory(stats: DailyStats): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: Record<string, { mins: number; msgs: number }> = raw ? JSON.parse(raw) : {};
    history[stats.date] = {
      mins: stats.minutesPracticed,
      msgs: stats.msgs,
    };
    // Keep last 30 days only
    const keys = Object.keys(history).sort().slice(-30);
    const trimmed: Record<string, { mins: number; msgs: number }> = {};
    keys.forEach(k => { trimmed[k] = history[k]; });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getStats(): DailyStats {
  const s = load();
  if (s.sessionStartMs) {
    const elapsed = Math.floor((Date.now() - s.sessionStartMs) / 60000);
    if (elapsed > s.minutesPracticed) {
      s.minutesPracticed = elapsed;
      save(s);
    }
  }
  return s;
}

export function getAccuracy(): number | null {
  const s = load();
  if (s.totalAnswers > 0) return Math.round((s.correctAnswers / s.totalAnswers) * 100);
  if (s.msgs === 0) return null;
  return Math.max(0, Math.round(100 - (s.corrections / s.msgs) * 100));
}

export function recordAnswer(isCorrect: boolean): void {
  const s = load();
  s.totalAnswers += 1;
  if (isCorrect) s.correctAnswers += 1;
  save(s);
}

export function incrementSessions(): void {
  const s = load();
  s.sessions += 1;
  s.sessionStartMs = Date.now();
  save(s);
}

export function incrementMsgs(): void {
  const s = load();
  s.msgs += 1;
  // Auto-update practice time from session start
  if (s.sessionStartMs) {
    const elapsed = Math.floor((Date.now() - s.sessionStartMs) / 60000);
    s.minutesPracticed = Math.max(s.minutesPracticed, elapsed);
  }
  save(s);
}

export function incrementCorrections(): void {
  const s = load();
  s.corrections += 1;
  save(s);
}

export function incrementVoiceMins(mins: number): void {
  const s = load();
  s.voiceMins += mins;
  s.minutesPracticed = Math.max(s.minutesPracticed, s.voiceMins);
  save(s);
}

export function incrementVoiceSessions(): void {
  const s = load();
  s.voiceSessions += 1;
  save(s);
}

export function addMinutesPracticed(mins: number): void {
  const s = load();
  s.minutesPracticed += mins;
  save(s);
}

export function addTopic(topic: string): void {
  const s = load();
  if (!s.topics.includes(topic)) {
    s.topics = [...s.topics, topic];
  }
  save(s);
}

export function logActivity(type: ActivityEntry["type"], topic: string): void {
  const s = load();
  const now = new Date();
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  s.activity = [{ time, type, topic }, ...s.activity].slice(0, 20);
  save(s);
}

export function getWeekHistory(): WeekDay[] {
  const history: Record<string, { mins: number; msgs: number }> = (() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();

  const days: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Aaj" : d.toLocaleDateString("en-IN", { weekday: "short" });
    const data = history[dateStr] ?? { mins: 0, msgs: 0 };
    days.push({ date: dateStr, label, mins: data.mins, msgs: data.msgs });
  }
  return days;
}

export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export function midnightCountdown(): string {
  const ms = msUntilMidnight();
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
