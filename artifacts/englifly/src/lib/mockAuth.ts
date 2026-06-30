const KEY = "englifly_mock_user";

// Test account email for Indus App Store reviewers
const DEMO_EMAIL = "test@englifly.com";

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

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
  // Only seed if data isn't already there (don't overwrite on every login)
  if (localStorage.getItem("ef_demo_seeded") === "1") return;

  const today = new Date().toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  // Streak: 7-day streak (silver badge), last active yesterday so it updates on today's login
  localStorage.setItem("ef_streak_v1", JSON.stringify({
    lastActiveDate: daysAgo(1),
    currentStreak: 7,
    longestStreak: 12,
  }));

  // Weekly practice history (last 7 days with realistic values)
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

  // Today's session stats (start fresh so user can see it count up)
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
      { time: "08:40 AM", type: "vocab", topic: "Business English"        },
    ],
    sessionStartMs: Date.now(),
  }));

  // Mark seeded so we don't overwrite on next login
  localStorage.setItem("ef_demo_seeded", "1");
}
