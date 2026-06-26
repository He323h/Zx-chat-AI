import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPTS: Record<string, string> = {
  travel:     "You are an English tutor helping with Travel English. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  interview:  "You are an English tutor doing mock job interview practice. Correct grammar. Keep replies to 2-3 sentences.",
  school:     "You are an English tutor helping with Daily Speaking. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  casual:     "You are a friendly English conversation partner. Correct mistakes naturally. Keep replies to 2-3 sentences.",
  vocabulary: "You are an English vocabulary tutor. Teach words in context. Keep replies to 2-3 sentences.",
  actor:      "You are an acting English coach. Give lines and feedback. Keep replies to 2-3 sentences.",
};

router.post("/chat", async (req, res) => {
  const { message, category, history } = req.body as {
    message: string;
    category: string;
    history: { role: string; content: string }[];
  };

  const OPENAI_KEY = process.env["VITE_OPENAI_API_KEY"] ?? process.env["OPENAI_API_KEY"] ?? "";

  if (!OPENAI_KEY) {
    res.status(500).json({ error: "OpenAI API key not configured on server." });
    return;
  }

  const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history ?? []),
          { role: "user", content: message },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: errText });
      return;
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    res.json({ message: data.choices[0].message.content.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

export default router;
