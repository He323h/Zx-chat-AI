// Local API stubs — replaces @workspace/api-client-react for Vercel deployment
// AI chat calls OpenAI directly from browser using VITE_OPENAI_API_KEY

import { useMutation, useQuery } from "@tanstack/react-query";

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? "";

// ─── Query Keys ───────────────────────────────────────────────
export function getGetUserProfileQueryKey(p: { uid: string }) {
  return ["userProfile", p.uid];
}
export function getGetTodayUsageQueryKey(p: { uid: string }) {
  return ["todayUsage", p.uid];
}

// ─── User Profile (localStorage) ─────────────────────────────
function loadProfile(uid: string) {
  try {
    const raw = localStorage.getItem(`ef_profile_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveProfile(uid: string, data: object) {
  const existing = loadProfile(uid) ?? {};
  localStorage.setItem(`ef_profile_${uid}`, JSON.stringify({ ...existing, ...data }));
}

export function useGetUserProfile(params: { uid: string }, opts?: { query?: { enabled?: boolean; queryKey?: unknown[] } }) {
  return useQuery({
    queryKey: getGetUserProfileQueryKey(params),
    enabled: opts?.query?.enabled !== false && !!params.uid,
    queryFn: async () => {
      const p = loadProfile(params.uid);
      return p ?? {
        uid: params.uid,
        englishLevel: localStorage.getItem("ef_level") ?? "Medium",
        subscription: "trial",
        streak: 0,
        trialEndsAt: null,
      };
    },
  });
}

// ─── Today's Usage (localStorage) ────────────────────────────
function getTodayKey(uid: string) {
  const d = new Date().toISOString().slice(0, 10);
  return `ef_usage_${uid}_${d}`;
}
function getUsedMinutes(uid: string) {
  return parseInt(localStorage.getItem(getTodayKey(uid)) ?? "0", 10);
}
function getDailyLimit(uid: string): number {
  const p = loadProfile(uid);
  const sub = p?.subscription ?? "trial";
  if (sub === "pro") return 240;
  if (sub === "basic") return 60;
  return 15;
}

export function useGetTodayUsage(params: { uid: string }, opts?: { query?: { enabled?: boolean; queryKey?: unknown[] } }) {
  return useQuery({
    queryKey: getGetTodayUsageQueryKey(params),
    enabled: opts?.query?.enabled !== false && !!params.uid,
    queryFn: async () => {
      const used = getUsedMinutes(params.uid);
      const limit = getDailyLimit(params.uid);
      const remaining = Math.max(0, limit - used);
      return {
        usedMinutes: used,
        remainingMinutes: remaining === 0 ? 0 : remaining,
        limitReached: remaining <= 0,
        dailyLimit: limit,
      };
    },
    refetchInterval: 60000,
  });
}

export function useTrackUsage() {
  return useMutation({
    mutationFn: async (args: { data: { uid: string; minutes: number } }) => {
      const { uid, minutes } = args.data;
      const key = getTodayKey(uid);
      const used = getUsedMinutes(uid) + minutes;
      localStorage.setItem(key, String(used));
      return { ok: true };
    },
  });
}

// ─── Update Level ─────────────────────────────────────────────
export function useUpdateLevel() {
  return useMutation({
    mutationFn: async (args: { data: { uid: string; englishLevel: string } }) => {
      const { uid, englishLevel } = args.data;
      localStorage.setItem("ef_level", englishLevel);
      saveProfile(uid, { englishLevel });
      return { ok: true };
    },
  });
}

// ─── Complete Onboarding ──────────────────────────────────────
export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: async (args: { data: { uid: string; email: string } }) => {
      saveProfile(args.data.uid, { onboarded: true, email: args.data.email, subscription: "trial" });
      return { ok: true };
    },
  });
}

// ─── Send Message (OpenAI direct) ─────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
  travel:     "You are an English tutor helping with Travel English. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  interview:  "You are an English tutor doing mock job interview practice. Correct grammar. Keep replies to 2-3 sentences.",
  school:     "You are an English tutor helping with Daily Speaking. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  casual:     "You are a friendly English conversation partner. Correct mistakes naturally. Keep replies to 2-3 sentences.",
  vocabulary: "You are an English vocabulary tutor. Teach words in context. Keep replies to 2-3 sentences.",
  actor:      "You are an acting English coach. Give lines and feedback. Keep replies to 2-3 sentences.",
};

export function useSendMessage() {
  return useMutation({
    mutationFn: async (args: {
      data: {
        uid: string;
        message: string;
        category: string;
        history: { role: string; content: string }[];
      };
    }) => {
      const { message, category, history } = args.data;
      const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;

      if (!OPENAI_KEY) {
        return { message: "⚠️ OpenAI API key missing. Add VITE_OPENAI_API_KEY to your .env file." };
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
      const data = await res.json();
      return { message: data.choices[0].message.content.trim() };
    },
  });
}
