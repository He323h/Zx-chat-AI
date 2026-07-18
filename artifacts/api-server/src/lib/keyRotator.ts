/**
 * keyRotator.ts
 *
 * Priority order:
 *   Cerebras Key 1 → Cerebras Key 2 → Groq Key 1 → Groq Key 2
 *
 * A key is marked exhausted when the provider returns HTTP 429.
 * All exhausted keys reset at midnight (server local time) every 24 hours.
 * Non-429 errors (5xx, network) are logged but do NOT exhaust the key so
 * transient failures don't permanently remove a key from the pool.
 */

import { logger } from "./logger.js";

// ── Pool definition ────────────────────────────────────────────────────────────

interface PoolEntry {
  /** Environment-variable name that holds the API key */
  envKey: string;
  /** Display label for logs */
  label: string;
  /** OpenAI-compatible base URL (no trailing slash) */
  baseUrl: string;
  /** Model identifier sent to the provider */
  model: string;
}

const KEY_POOL: readonly PoolEntry[] = [
  {
    envKey:  "CEREBRAS_KEY_1",
    label:   "Cerebras-1",
    baseUrl: "https://api.cerebras.ai/v1",
    model:   "llama-3.3-70b",
  },
  {
    envKey:  "CEREBRAS_KEY_2",
    label:   "Cerebras-2",
    baseUrl: "https://api.cerebras.ai/v1",
    model:   "llama-3.3-70b",
  },
  {
    envKey:  "GROQ_KEY_1",
    label:   "Groq-1",
    baseUrl: "https://api.groq.com/openai/v1",
    model:   "llama-3.3-70b-versatile",
  },
  {
    envKey:  "GROQ_KEY_2",
    label:   "Groq-2",
    baseUrl: "https://api.groq.com/openai/v1",
    model:   "llama-3.3-70b-versatile",
  },
] as const;

// ── Exhaustion tracking ────────────────────────────────────────────────────────

/** Keys that have hit their rate limit and must be skipped until midnight reset */
const exhausted = new Set<string>();

function msUntilNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // next calendar midnight, server local time
  return midnight.getTime() - now.getTime();
}

function scheduleReset(): void {
  const delay = msUntilNextMidnight();
  const resetAt = new Date(Date.now() + delay).toISOString();
  logger.info({ resetAt }, "[keyRotator] Next exhaustion reset scheduled");

  setTimeout(() => {
    const count = exhausted.size;
    exhausted.clear();
    logger.info({ clearedKeys: count }, "[keyRotator] Midnight reset — all keys restored");
    scheduleReset(); // reschedule for the following midnight
  }, delay).unref(); // .unref() so the timer doesn't keep the process alive
}

scheduleReset();

// ── OpenAI-compatible response shape ──────────────────────────────────────────

interface ChatCompletionResponse {
  choices?: { message: { content: string } }[];
  error?:   { message: string };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface RotatorMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

export interface RotatorResult {
  reply:    string;
  usedKey:  string; // label of the key that succeeded
}

/**
 * Try each key in priority order, skipping exhausted ones.
 * Returns the first successful reply, or null if all keys fail / are exhausted.
 */
export async function callWithRotation(
  messages:    RotatorMessage[],
  maxTokens:   number,
  temperature = 0.7,
): Promise<RotatorResult | null> {
  for (const entry of KEY_POOL) {
    // Skip keys with no value configured
    const apiKey = process.env[entry.envKey];
    if (!apiKey) {
      logger.debug({ key: entry.label }, "[keyRotator] Env var not set, skipping");
      continue;
    }

    // Skip keys already rate-limited today
    if (exhausted.has(entry.envKey)) {
      logger.debug({ key: entry.label }, "[keyRotator] Key exhausted today, skipping");
      continue;
    }

    try {
      const response = await fetch(`${entry.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:       entry.model,
          messages,
          max_tokens:  maxTokens,
          temperature,
        }),
      });

      // ── Rate limited → exhaust this key, try the next one ─────────────────
      if (response.status === 429) {
        exhausted.add(entry.envKey);
        logger.warn(
          { key: entry.label, exhaustedCount: exhausted.size, totalKeys: KEY_POOL.length },
          "[keyRotator] Rate-limited — key exhausted, rotating to next",
        );
        continue;
      }

      // ── Parse response ────────────────────────────────────────────────────
      const data = await response.json() as ChatCompletionResponse;

      if (response.ok && !data.error) {
        const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
        if (reply) {
          logger.info({ key: entry.label }, "[keyRotator] Success");
          return { reply, usedKey: entry.label };
        }
        logger.warn({ key: entry.label, status: response.status }, "[keyRotator] Empty reply, trying next key");
        continue;
      }

      // ── Non-429 error (5xx, auth, etc.) — log but don't exhaust ──────────
      logger.warn(
        { key: entry.label, status: response.status, error: data.error?.message },
        "[keyRotator] Provider error (not rate-limit) — skipping this key",
      );

    } catch (err) {
      // Network / timeout errors — don't exhaust the key
      logger.warn({ key: entry.label, err }, "[keyRotator] Fetch error — skipping this key");
    }
  }

  logger.error(
    { exhausted: [...exhausted] },
    "[keyRotator] All rotation keys failed or exhausted",
  );
  return null;
}

/** Expose current exhaustion state (useful for a health/status endpoint) */
export function getRotatorStatus(): {
  pool: { label: string; configured: boolean; exhausted: boolean }[];
  nextResetMs: number;
} {
  return {
    pool: KEY_POOL.map((e) => ({
      label:      e.label,
      configured: Boolean(process.env[e.envKey]),
      exhausted:  exhausted.has(e.envKey),
    })),
    nextResetMs: msUntilNextMidnight(),
  };
}
