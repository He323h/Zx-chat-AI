const KEY = "englifly_mock_user";
const RATE_KEY = "englifly_login_attempts";

// Test account email for Indus App Store reviewers
const DEMO_EMAIL = "test@englifly.com";

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

// ─── Brute-force protection ───────────────────────────────────────────────────
// Max 5 failed attempts per 15 minutes per browser.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateRecord { count: number; windowStart: number }

function getRateRecord(): RateRecord {
  try {
    const raw = sessionStorage.getItem(RATE_KEY);
    return raw ? (JSON.parse(raw) as RateRecord) : { count: 0, windowStart: Date.now() };
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

function saveRateRecord(r: RateRecord) {
  try { sessionStorage.setItem(RATE_KEY, JSON.stringify(r)); } catch {}
}

export function checkLoginAllowed(): { allowed: boolean; waitMinutes: number } {
  const rec = getRateRecord();
  const now = Date.now();
  if (now - rec.windowStart > WINDOW_MS) {
    // Window expired — reset
    saveRateRecord({ count: 0, windowStart: now });
    return { allowed: true, waitMinutes: 0 };
  }
  if (rec.count >= MAX_ATTEMPTS) {
    const waitMs = WINDOW_MS - (now - rec.windowStart);
    return { allowed: false, waitMinutes: Math.ceil(waitMs / 60000) };
  }
  return { allowed: true, waitMinutes: 0 };
}

export function recordFailedAttempt() {
  const rec = getRateRecord();
  const now = Date.now();
  if (now - rec.windowStart > WINDOW_MS) {
    saveRateRecord({ count: 1, windowStart: now });
  } else {
    saveRateRecord({ count: rec.count + 1, windowStart: rec.windowStart });
  }
}

export function resetRateRecord() {
  try { sessionStorage.removeItem(RATE_KEY); } catch {}
}

// ─── Password strength ────────────────────────────────────────────────────────
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must have at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must have at least one number.";
  return null; // valid
}

// ─── Mock sign-in / sign-up ───────────────────────────────────────────────────
export function mockSignIn(email: string, _password: string): MockUser {
  const user: MockUser = {
    uid: "demo_" + btoa(email).replace(/=/g, ""),
    email,
    displayName: email === DEMO_EMAIL ? "Demo User" : email.split("@")[0],
  };
  localStorage.setItem(KEY, JSON.stringify(user));
  if (email === DEMO_EMAIL) {
    seedDemoData();
  }
  resetRateRecord();
  return user;
}

export function mockSignUp(email: string, _password: string): MockUser {
  return mockSignIn(email, _password);
}

export function mockSignOut() {
  localStorage.removeItem(KEY);
}

export function getMockUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

/** Pre-populates localStorage with realistic demo data so reviewers see a
 *  fully-used account rather than an empty app. */
function seedDemoData() {
  if (localStorage.getItem("ef_demo_seeded") === "1") return;

  const today = new Date().toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  localStorage.setItem("ef_streak_v1", JSON.stringify({
    lastActiveDate: daysAgo(1),
    currentStreak: 7,
    longestStreak: 12,
  }));

  const history: Record<string, { mins: number; msgs: number }> = {
    [daysAgo(6)]: { mins: 12, msgs: 8 },
    [daysAgo(5)]: { mins: 18, msgs: 14 },
    [daysAgo(4)]: { mins: 9,  msgs: 6  },
    [daysAgo(3)]: { mins: 22, msgs: 19 },
    [daysAgo(2)]: { mins: 15, msgs: 11 },
    [daysAgo(1)]: { mins: 27, msgs: 21 },
    [today]:      { mins: 0,  msgs: 0  },
  };
  localStorage.setItem("ef_weekly_history", JSON.stringify(history));

  localStorage.setItem("ef_daily_stats_v3", JSON.stringify({
    date: today,
    sessions: 0,
    msgs: 0,
    corrections: 0,
    voiceMins: 0,
    voiceSessions: 0,
    minutesPracticed: 0,
    topics: [],
    activity: [
      { time: "09:15 AM", type: "chat",  topic: "Job Interview Practice" },
      { time: "08:40 AM", type: "vocab", topic: "Business English" },
    ],
    sessionStartMs: Date.now(),
  }));

  localStorage.setItem("ef_demo_seeded", "1");
}
