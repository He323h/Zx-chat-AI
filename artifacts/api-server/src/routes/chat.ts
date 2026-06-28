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

  const keys = [
    process.env["VITE_OPENROUTER_API_KEY_1"],
    process.env["VITE_OPENROUTER_API_KEY_2"],
  ].filter(Boolean) as string[];

  console.log(`[chat] keys found: ${keys.length}, message length: ${message.length}`);

  for (const key of keys) {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
              { role: "system", content: "You are a friendly English tutor. Reply in simple English." },
              ...(history ?? []).map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
              })),
              { role: "user", content: message },
            ],
          }),
        }
      );

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

  res.status(500).json({ error: "All keys failed" });
});

export default router;
