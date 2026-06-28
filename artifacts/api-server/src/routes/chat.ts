import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const { message, history } = req.body as {
    message: string;
    history?: { role: string; content: string }[];
  };

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const messages = [
    { role: "system", content: "You are a friendly English tutor. Reply in simple English." },
    ...(history ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
        }),
      });

      const data = await response.json() as {
        choices?: { message: { content: string } }[];
        error?: { message: string };
      };

      if (response.ok && !data.error) {
        const reply = data.choices?.[0]?.message?.content ?? "";
        if (reply) {
          res.json({ message: reply });
          return;
        }
      }
      console.warn(`[chat] OpenAI failed: ${data.error?.message ?? `HTTP ${response.status}`}`);
    } catch (e) {
      console.warn("[chat] OpenAI error:", e);
    }
  }

  const openrouterKeys = [
    process.env["OPENROUTER_API_KEY_1"],
    process.env["OPENROUTER_API_KEY_2"],
    process.env["VITE_OPENROUTER_API_KEY_1"],
    process.env["VITE_OPENROUTER_API_KEY_2"],
  ].filter(Boolean) as string[];

  for (const key of openrouterKeys) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct:free",
          messages,
        }),
      });

      const data = await response.json() as {
        choices?: { message: { content: string } }[];
        error?: { message: string };
      };

      if (!response.ok || data.error) {
        throw new Error(data.error?.message ?? `HTTP ${response.status}`);
      }

      const reply = data.choices?.[0]?.message?.content ?? "";
      if (!reply) throw new Error("Empty response");

      res.json({ message: reply });
      return;
    } catch {
      continue;
    }
  }

  res.status(500).json({ error: "No AI provider available. Please configure OPENAI_API_KEY or OPENROUTER_API_KEY_1." });
});

export default router;
