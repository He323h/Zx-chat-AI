export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { message, category } = req.body ?? {};
  if (!message) return res.status(400).json({ error: "No message" });

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY_1;
  if (!key) return res.status(500).json({ error: "No key" });

  const prompts = {
    vocabulary: "Give 5 English words with Hindi meaning and example sentence.",
    actor: "Give 10 English sentences with Hindi translation.",
    default: "You are Sarah, a friendly English teacher. Reply in 2-3 sentences. If user writes Hindi, help them say it in English."
  };

  const prompt = prompts[category] || prompts.default;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        system_instruction: {parts: [{text: prompt}]},
        contents: [{role: "user", parts: [{text: message}]}]
      })
    }
  );

  const data = await r.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) return res.status(500).json({ error: "No reply" });
  
  return res.json({ message: reply });
}
