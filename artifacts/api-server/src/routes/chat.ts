import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPTS: Record<string, string> = {
  travel: "You are a friendly English conversation partner named ZX helping someone practice Travel English. Have natural conversations about travel, airports, hotels, and directions. Gently correct grammar with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences max.",
  interview: "You are a friendly English interview coach named ZX. Conduct realistic mock job interviews. Ask one question at a time. Give brief feedback after each answer. Keep replies to 2-3 sentences max.",
  school: "You are a friendly English conversation partner named ZX for daily speaking practice. Talk about everyday topics. Gently correct grammar with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences max.",
  casual: "You are a friendly English conversation partner named ZX. Have natural, engaging conversations. Gently correct grammar mistakes with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences max.",
  vocabulary: "You are an English vocabulary teacher named ZX. When given a topic, provide exactly 5 useful English words with Hindi meanings. Format: WORD — Hindi meaning. Example: 'Example sentence.' After 5 words, say: 'Aur chahiye? Same topic ya koi aur topic batao!'",
  actor: "You are an English speaking coach named ZX. Give the user short scripts and sentences to practice speaking aloud. Provide Hindi translation in parentheses. Encourage and correct pronunciation tips briefly.",
};

router.post("/chat", async (req, res) => {
  const { message, category, history } = req.body as {
    message: string;
    category?: string;
    history?: { role: string; content: string }[];
  };

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const systemPrompt = SYSTEM_PROMPTS[category ?? "casual"] ?? SYSTEM_PROMPTS.casual;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).slice(-10).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  // 1. Try Replit AI Integration (OpenAI via proxy) — fastest
  const replitBase = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const replitKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (replitBase && replitKey) {
    try {
      const response = await fetch(`${replitBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${replitKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: category === "vocabulary" ? 500 : category === "actor" ? 600 : 150,
          temperature: 0.7,
        }),
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
      console.warn("[chat] Replit AI integration error:", e);
    }
  }

  // 2. Try OPENAI_API_KEY
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 150, temperature: 0.7 }),
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
      console.warn("[chat] OpenAI error:", e);
    }
  }

  // 3. Try Gemini via Replit AI Integration
  const geminiBase = process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"];
  const geminiKey = process.env["AI_INTEGRATIONS_GEMINI_API_KEY"];
  if (geminiBase && geminiKey) {
    try {
      const response = await fetch(`${geminiBase}/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${geminiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages,
          max_tokens: 150,
          temperature: 0.7,
        }),
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
      console.warn("[chat] Gemini error:", e);
    }
  }

  // 4. Try OpenRouter free keys
  const openrouterKeys = [
    process.env["OPENROUTER_API_KEY_1"],
    process.env["OPENROUTER_API_KEY_2"],
  ].filter(Boolean) as string[];

  for (const key of openrouterKeys) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "mistralai/mistral-7b-instruct:free", messages, max_tokens: 150 }),
      });
      const data = await response.json() as {
        choices?: { message: { content: string } }[];
        error?: { message: string };
      };
      if (response.ok && !data.error) {
        const reply = data.choices?.[0]?.message?.content ?? "";
        if (reply) { res.json({ message: reply }); return; }
      }
    } catch { continue; }
  }

  res.status(503).json({ error: "AI service unavailable. Please add an API key in Settings." });
});

export default router;
