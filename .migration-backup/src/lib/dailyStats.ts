const KEY = "ef_daily_stats_v2";

interface DailyStats {
  date: string;
  sessions: number;
  msgs: number;
  corrections: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): DailyStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed: DailyStats = JSON.parse(raw);
    if (parsed.date !== todayStr()) return blank();
    return parsed;
  } catch {
    return blank();
  }
}

function blank(): DailyStats {
  return { date: todayStr(), sessions: 0, msgs: 0, corrections: 0 };
}

function save(stats: DailyStats): void {
  localStorage.setItem(KEY, JSON.stringify(stats));
}

export function getStats(): DailyStats {
  return load();
}

export function incrementSessions(): void {
  const s = load();
  s.sessions += 1;
  save(s);
}

export function incrementMsgs(): void {
  const s = load();
  s.msgs += 1;
  save(s);
}

export function incrementCorrections(): void {
  const s = load();
  s.corrections += 1;
  save(s);
}

export function getAccuracy(): number | null {
  const s = load();
  if (s.msgs === 0) return null;
  return Math.max(0, Math.round(100 - (s.corrections / s.msgs) * 100));
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
