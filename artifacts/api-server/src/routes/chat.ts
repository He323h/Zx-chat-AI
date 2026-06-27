import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPT =
  "You are a friendly English tutor. Always reply in simple clear English. Help user practice English conversation.";

const OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "mistralai/mistral-7b-instruct:free";

function getOpenRouterKeys(): string[] {
  return [
    process.env["VITE_OPENROUTER_API_KEY_1"] ?? "",
    process.env["VITE_OPENROUTER_API_KEY_2"] ?? "",
  ].filter(Boolean);
}

async function callOpenRouter(
  apiKey: string,
  history: { role: string; content: string }[],
  message: string
): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(errText), { status: res.status });
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty response from OpenRouter");
  return text.trim();
}

router.post("/chat", async (req, res) => {
  const { message, history } = req.body as {
    message: string;
    category?: string;
    history: { role: string; content: string }[];
  };

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const keys = getOpenRouterKeys();
  if (keys.length === 0) {
    res.status(500).json({ error: "OpenRouter API key not configured. Please add VITE_OPENROUTER_API_KEY_1 in Secrets." });
    return;
  }

  let lastError: Error | null = null;

  for (const key of keys) {
    try {
      const reply = await callOpenRouter(key, history ?? [], message);
      res.json({ message: reply });
      return;
    } catch (err: any) {
      lastError = err;
    }
  }

  res.status(502).json({ error: lastError?.message ?? "All OpenRouter keys exhausted." });
});

export default router;
