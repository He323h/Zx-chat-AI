import { Router, type IRouter } from "express";
import { chatRateLimit } from "../middleware/rateLimits.js";
import { callWithRotation } from "../lib/keyRotator.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// Maximum message length accepted — prevents prompt-stuffing attacks
const MAX_MESSAGE_LENGTH = 1500;
const MAX_HISTORY_ITEMS = 10;

// Server-side system prompts only — clients cannot override these.
// Removing the custom systemPrompt parameter from the API prevents
// prompt-injection attacks where a malicious client sends arbitrary instructions.
const SYSTEM_PROMPTS: Record<string, string> = {
  teacher:   "You are a helpful AI English teacher named English Tutor - AI Powered. Explain concepts clearly, give examples, and encourage learners.",
  travel:    "You are a friendly English conversation partner from English Tutor - AI Powered helping someone practice Travel English. Have natural conversations about travel, airports, hotels, and directions. Gently correct grammar with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences max.",
  interview: "You are a friendly English interview coach from English Tutor - AI Powered. Conduct realistic mock job interviews. Ask one question at a time. Give brief feedback after each answer. Keep replies to 2-3 sentences max.",
  school:    "You are a friendly English conversation partner from English Tutor - AI Powered for daily speaking practice. Talk about everyday topics. Gently correct grammar with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences max.",
  casual:    "You are a friendly English conversation partner from English Tutor - AI Powered. Have natural, engaging conversations. Gently correct grammar mistakes with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences max.",
  vocabulary:"You are an English vocabulary teacher from English Tutor - AI Powered. When given a topic, provide exactly 5 useful English words with Hindi meanings. Format: WORD — Hindi meaning. Example: 'Example sentence.' After 5 words, say: 'Aur chahiye? Same topic ya koi aur topic batao!'",
  actor:     "You are an English speaking coach from English Tutor - AI Powered. Give the user short scripts and sentences to practice speaking aloud. Provide Hindi translation in parentheses. Encourage and correct pronunciation tips briefly.",
};

router.post("/chat", chatRateLimit, async (req, res) => {
  const { message, category, history } = req.body as {
    message: unknown;
    category?: unknown;
    history?: unknown;
  };

  // ── Input validation ──────────────────────────────────────────────────────
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `message must be under ${MAX_MESSAGE_LENGTH} characters` });
    return;
  }

  const categoryKey = typeof category === "string" ? category : "casual";
  const systemPrompt = SYSTEM_PROMPTS[categoryKey] ?? SYSTEM_PROMPTS.casual;

  // Sanitise history — only accept well-formed entries, drop everything else
  const safeHistory: { role: "user" | "assistant"; content: string }[] = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-MAX_HISTORY_ITEMS)) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).content === "string" &&
        ((item as Record<string, unknown>).role === "user" ||
          (item as Record<string, unknown>).role === "assistant")
      ) {
        safeHistory.push({
          role: (item as { role: "user" | "assistant" }).role,
          content: String((item as { content: string }).content).slice(0, MAX_MESSAGE_LENGTH),
        });
      }
    }
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...safeHistory,
    { role: "user", content: message.trim() },
  ];

  const maxTokens =
    categoryKey === "vocabulary" ? 500 : categoryKey === "actor" ? 600 : 150;

  // ── 1. Cerebras / Groq rotation (priority chain) ───────────────────────────
  const rotated = await callWithRotation(messages, maxTokens);
  if (rotated) {
    logger.info({ usedKey: rotated.usedKey }, "[chat] Served by rotation pool");
    res.json({ message: rotated.reply });
    return;
  }

  // ── 2. Fallback: Replit AI Integration (OpenAI proxy) ─────────────────────
  const replitBase = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const replitKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (replitBase && replitKey) {
    try {
      const response = await fetch(`${replitBase}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${replitKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: maxTokens, temperature: 0.7 }),
      });
      const data = await response.json() as {
        choices?: { message: { content: string } }[];
        error?: { message: string };
      };
      if (response.ok && !data.error) {
        const reply = data.choices?.[0]?.message?.content ?? "";
        if (reply) { res.json({ message: reply }); return; }
      }
    } catch (e) {
      logger.warn({ err: e }, "[chat] Replit AI fallback error");
    }
  }

  // ── 3. Fallback: OpenAI ────────────────────────────────────────────────────
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: maxTokens, temperature: 0.7 }),
      });
      const data = await response.json() as {
        choices?: { message: { content: string } }[];
        error?: { message: string };
      };
      if (response.ok && !data.error) {
        const reply = data.choices?.[0]?.message?.content ?? "";
        if (reply) { res.json({ message: reply }); return; }
      }
    } catch (e) {
      logger.warn({ err: e }, "[chat] OpenAI fallback error");
    }
  }

  // ── 4. Fallback: Gemini ────────────────────────────────────────────────────
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) {
    try {
      const geminiMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiMessages,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
          }),
        },
      );
      const data = await response.json() as {
        candidates?: { content: { parts: { text: string }[] } }[];
        error?: { message: string };
      };
      if (response.ok && !data.error) {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (reply) { res.json({ message: reply }); return; }
      }
    } catch (e) {
      logger.warn({ err: e }, "[chat] Gemini fallback error");
    }
  }

  res.status(503).json({ error: "AI service unavailable — all keys exhausted or unconfigured." });
});

export default router;
