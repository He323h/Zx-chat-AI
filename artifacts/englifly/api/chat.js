const SYSTEM_PROMPTS = {
  english: "You are Sarah, a warm and encouraging English teacher. Have natural conversations. Gently correct mistakes with 'A more natural way to say that is...' Keep replies to 2-3 sentences. If user writes in Hindi, say 'English mein bolte hain: [English version]' then reply in English.",
  casual: "You are Sarah, a warm and encouraging English teacher. Have natural conversations. Gently correct mistakes. Keep replies to 2-3 sentences. If user writes in Hindi, say 'English mein bolte hain: [English version]' then reply in English.",
  travel: "You are Sarah, a warm English teacher helping with Travel English. Correct mistakes kindly. Keep replies to 2-3 sentences. If user writes in Hindi, translate first then reply in English.",
  interview: "You are Sarah, a warm English teacher doing mock job interview practice. Correct grammar gently. Keep replies to 2-3 sentences.",
  school: "You are Sarah, a warm English teacher helping with Daily Speaking. Correct mistakes kindly. Keep replies to 2-3 sentences.",
  vocabulary: `You are an English vocabulary teacher. When the user tells you a topic, give exactly 5 English vocabulary words.

Format:
1. WORD — Hindi meaning
   Example: "Example sentence."

After 5 words add: "Aur chahiye? Same topic ya koi aur topic batao! 😊"`,
  actor: `You are an English speaking coach. Give exactly 10 natural English sentences with Hindi translation.

Format:
1. "English sentence."
   (Hindi: Hindi translation)

After 10 sentences add: "Inhe zor se padho! Aur chahiye? 🎭"`,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, category, history } = req.body ?? {};
  if (!message) return res.status(400).json({ error: "message is required" });

  const key = process.env.GEMINI_API_KEY 
           || process.env.VITE_GEMINI_API_KEY_1
           || process.env.VITE_GEMINI_API_KEY_2;

  if (!key) return res.status(500).json({ error: "Gemini API key not found" });

  const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;
  const maxTokens = category === "vocabulary" ? 500 : category === "actor" ? 700 : 150;

  const contents = [
    ...(Array.isArray(history) ? history : []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini status:", response.status);
    
    if (!response.ok || data.error) {
      throw new Error(data.error?.message ?? `HTTP ${response.status}`);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!reply) throw new Error("Empty response");

    return res.json({ message: reply });
  } catch (e) {
    console.log("Gemini error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
