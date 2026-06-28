const SYSTEM_PROMPTS = {
  english: "You are a friendly English conversation partner named ZX. Have natural, engaging conversations. Gently correct grammar mistakes with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences.",
  casual: "You are a friendly English conversation partner named ZX. Have natural, engaging conversations. Gently correct grammar mistakes. Keep replies to 2-3 sentences.",
  travel: "You are a friendly English tutor helping with Travel English. Correct mistakes kindly and naturally. Keep replies to 2-3 sentences.",
  interview: "You are a friendly English tutor doing mock job interview practice. Correct grammar gently. Keep replies to 2-3 sentences.",
  school: "You are a friendly English tutor helping with Daily Speaking. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  vocabulary: `You are an English vocabulary teacher. Give exactly 5 words with Hindi meaning and example.`,
  actor: `You are an English speaking coach. Give exactly 10 natural English sentences with Hindi translation.`,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, category, history } = req.body ?? {};
  if (!message) return res.status(400).json({ error: "message is required" });

  const keys = [
    process.env["OPENROUTER_API_KEY_1"],
    process.env["OPENROUTER_API_KEY_2"],
    process.env["VITE_OPENROUTER_API_KEY_1"],
    process.env["VITE_OPENROUTER_API_KEY_2"],
  ].filter(Boolean);

  if (keys.length === 0) {
    return res.status(500).json({ error: "No API keys found" });
  }

  const models = [
    "openrouter/owl-alpha",
    "google/gemma-3-4b-it:free",
    "qwen/qwen3-8b:free",
  ];

  const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;
  const maxTokens = category === "vocabulary" ? 500 : category === "actor" ? 700 : 200;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  for (const key of keys) {
    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://zx-chat-ai.vercel.app",
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${response.status}`);

        const reply = data.choices?.[0]?.message?.content ?? "";
        if (!reply) throw new Error("Empty response");

        console.log("Success with model:", model);
        return res.json({ message: reply });
      } catch (e) {
        console.log(`Failed model ${model}:`, e.message);
        continue;
      }
    }
  }

  return res.status(500).json({ error: "All models failed" });
}
