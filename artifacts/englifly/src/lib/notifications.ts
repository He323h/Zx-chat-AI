const PERM_KEY = "ef_notifications_enabled";
const LAST_PRACTICE_KEY = "ef_last_practice_ts";
const LAST_REMINDED_KEY = "ef_last_reminded_date";

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationEnabled(): boolean {
  return localStorage.getItem(PERM_KEY) === "true";
}

export function setNotificationEnabled(val: boolean): void {
  localStorage.setItem(PERM_KEY, val ? "true" : "false");
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === "granted") {
    setNotificationEnabled(true);
    return true;
  }
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  if (result === "granted") {
    setNotificationEnabled(true);
    return true;
  }
  return false;
}

export function recordPracticeNow(): void {
  localStorage.setItem(LAST_PRACTICE_KEY, String(Date.now()));
}

function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function practicedToday(): boolean {
  const ts = localStorage.getItem(LAST_PRACTICE_KEY);
  if (!ts) return false;
  const date = new Date(parseInt(ts)).toISOString().slice(0, 10);
  return date === getTodayDateStr();
}

function alreadyRemindedToday(): boolean {
  return localStorage.getItem(LAST_REMINDED_KEY) === getTodayDateStr();
}

function markRemindedToday(): void {
  localStorage.setItem(LAST_REMINDED_KEY, getTodayDateStr());
}

export function showReminderIfNeeded(): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!getNotificationEnabled()) return;
  if (practicedToday()) return;
  if (alreadyRemindedToday()) return;

  markRemindedToday();

  const messages = [
    { title: "🎯 Time to practice English!", body: "You haven't practiced today. Just 5 minutes can make a big difference!" },
    { title: "📚 Your English streak is waiting!", body: "Open EngliFly and keep your streak alive today." },
    { title: "💬 A quick chat will do!", body: "Even a 3-minute stranger chat counts as today's practice!" },
    { title: "🔥 Don't break your streak!", body: "Practice English today — your tutor is ready for you." },
  ];

  const pick = messages[Math.floor(Math.random() * messages.length)];

  try {
    const notif = new Notification(pick.title, {
      body: pick.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "daily-reminder",
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    setTimeout(() => notif.close(), 8000);
  } catch {}
}

export function showNotification(title: string, body: string): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const notif = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "zx-chat",
    });
    setTimeout(() => notif.close(), 5000);
  } catch {}
}
