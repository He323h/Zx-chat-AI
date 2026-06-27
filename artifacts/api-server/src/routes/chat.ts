import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPTS: Record<string, string> = {
  travel:
    "You are a friendly English tutor helping with Travel English. Correct mistakes kindly and naturally. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  interview:
    "You are a friendly English tutor doing mock job interview practice. Correct grammar gently. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  school:
    "You are a friendly English tutor helping with Daily Speaking. Correct mistakes kindly. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  casual:
    "You are a friendly English conversation partner and tutor. Correct mistakes naturally and encouragingly. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  vocabulary:
    "You are a friendly English vocabulary tutor. Teach words in context with examples. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  actor:
    "You are a friendly acting English coach. Give lines and feedback encouragingly. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
};

// Gemini keys in priority order — KEY_1 first, KEY_2 as fallback
const GEMINI_KEYS: string[] = [
  process.env["GEMINI_API_KEY_1"] ?? "",
  process.env["GEMINI_API_KEY_2"] ?? "",
].filter(Boolean);

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: { role: string; content: string }[],
  message: string
): Promise<string> {
  // Build Gemini contents array — map assistant → model role
  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(errText), { status: res.status });
  }

  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return text.trim();
}

router.post("/chat", async (req, res) => {
  const { message, category, history } = req.body as {
    message: string;
    category: string;
    history: { role: string; content: string }[];
  };

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  if (GEMINI_KEYS.length === 0) {
    res.status(500).json({ error: "Gemini API keys not configured on server." });
    return;
  }

  const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;
  let lastError: Error | null = null;

  for (const key of GEMINI_KEYS) {
    try {
      const reply = await callGemini(key, systemPrompt, history ?? [], message);
      res.json({ message: reply });
      return;
    } catch (err: any) {
      lastError = err;
      // 429 quota / rate-limit → try next key
      // Other errors → also try next key as a best-effort
    }
  }

  res.status(502).json({ error: lastError?.message ?? "All Gemini keys exhausted." });
});

export default router;
