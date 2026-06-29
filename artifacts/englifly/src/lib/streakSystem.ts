const STREAK_KEY = "ef_streak_v1";

export interface StreakData {
  lastActiveDate: string;
  currentStreak: number;
  longestStreak: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function load(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastActiveDate: "", currentStreak: 0, longestStreak: 0 };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { lastActiveDate: "", currentStreak: 0, longestStreak: 0 };
  }
}

function save(data: StreakData): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("ef:streak-updated"));
}

export function updateStreak(): StreakData {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const data = load();

  if (data.lastActiveDate === today) {
    return data;
  }

  let newStreak: number;
  if (data.lastActiveDate === yesterday) {
    newStreak = data.currentStreak + 1;
  } else if (!data.lastActiveDate) {
    newStreak = 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(data.longestStreak, newStreak);
  const updated: StreakData = {
    lastActiveDate: today,
    currentStreak: newStreak,
    longestStreak: newLongest,
  };
  save(updated);
  return updated;
}

export function getStreak(): StreakData {
  return load();
}

export type BadgeTier = "bronze" | "silver" | "gold";

export function getBadgeTier(streak: number): BadgeTier {
  if (streak >= 15) return "gold";
  if (streak >= 7) return "silver";
  return "bronze";
}

export function getProgressToNextTier(streak: number): { progress: number; max: number; next: BadgeTier | null } {
  if (streak >= 15) return { progress: streak, max: streak, next: null };
  if (streak >= 7) return { progress: streak - 7, max: 8, next: "gold" };
  return { progress: streak, max: 7, next: "silver" };
}
