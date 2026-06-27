const SYSTEM_PROMPTS = {
  travel:     "You are an English tutor helping with Travel English. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  interview:  "You are an English tutor doing mock job interview practice. Correct grammar. Keep replies to 2-3 sentences.",
  school:     "You are an English tutor helping with Daily Speaking. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  casual:     "You are a friendly English conversation partner. Correct mistakes naturally. Keep replies to 2-3 sentences.",
  vocabulary: "You are an English vocabulary tutor. Teach words in context. Keep replies to 2-3 sentences.",
  actor:      "You are an acting English coach. Give lines and feedback. Keep replies to 2-3 sentences.",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const OPENAI_KEY =
    process.env["OPENAI_API_KEY"] ??
    process.env["VITE_OPENAI_API_KEY"] ??
    "";

  if (!OPENAI_KEY) {
    return res.status(500).json({
      error: "OpenAI API key not configured. Add OPENAI_API_KEY to Vercel environment variables.",
    });
  }

  const { message, category, history } = req.body ?? {};

  if (!message) return res.status(400).json({ error: "message is required" });

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
          ...(Array.isArray(history) ? history : []),
          { role: "user", content: message },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.json({ message: data.choices[0].message.content.trim() });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
}
