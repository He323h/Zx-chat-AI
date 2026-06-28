const SYSTEM_PROMPTS = {
  english:
    "You are a friendly English conversation partner named ZX. Have natural, engaging conversations. Gently correct grammar mistakes with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences.",
  casual:
    "You are a friendly English conversation partner named ZX. Have natural, engaging conversations. Gently correct grammar mistakes. Keep replies to 2-3 sentences.",
  travel:
    "You are a friendly English tutor helping with Travel English. Correct mistakes kindly and naturally. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  interview:
    "You are a friendly English tutor doing mock job interview practice. Correct grammar gently. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  school:
    "You are a friendly English tutor helping with Daily Speaking. Correct mistakes kindly. Keep replies to 2-3 sentences. If the user writes in Hindi, respond in simple English with a Hindi explanation where helpful.",
  vocabulary: `You are an English vocabulary teacher. When the user tells you a topic or category, give exactly 5 English vocabulary words relevant to that topic.

Use this exact format for each word:
1. WORD — Hindi meaning
   Example: "Example sentence using the word."

2. WORD — Hindi meaning
   Example: "Example sentence using the word."

(and so on for all 5 words)

After giving the 5 words, add on a new line: "Aur chahiye? Same topic ke liye ya koi aur topic batao! 😊"

Rules:
- Always give exactly 5 words
- Hindi meaning should be short (1-4 words)
- Examples should be simple, everyday sentences
- Words should be practical and useful`,

  actor: `You are an English script writer and speaking coach. When the user describes a situation, give exactly 10 natural English sentences they can practice speaking aloud.

Use this exact format:
1. "English sentence here."
   (Hindi: Hindi translation yahan)

2. "English sentence here."
   (Hindi: Hindi translation yahan)

(and so on for all 10 sentences)

After giving 10 sentences, add: "Inhe zor se padho! Aur chahiye? Same situation ya koi aur situation batao 🎭"

Rules:
- Always give exactly 10 sentences
- Use simple, natural spoken English (not formal/textbook style)
- Sentences should sound natural when spoken aloud
- Hindi translation should be accurate and conversational`,
};

const MAX_TOKENS = {
  vocabulary: 500,
  actor: 700,
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

  console.log("Keys found:", keys.length, "| Message:", message?.slice(0, 60));

  if (keys.length === 0) {
    return res.status(500).json({
      error: "OpenRouter API keys not configured. Add OPENROUTER_API_KEY_1 to Vercel environment variables.",
    });
  }

  const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;
  const maxTokens = MAX_TOKENS[category] ?? 200;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  for (const key of keys) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://zx-chat-ai.vercel.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.2-3b-instruct:free",
          messages,
          max_tokens: maxTokens,
        }),
      });

      const data = await response.json();
      console.log("OpenRouter status:", response.status, "| error:", data.error?.message ?? "none");

      if (!response.ok || data.error) {
        throw new Error(data.error?.message ?? `HTTP ${response.status}`);
      }

      const reply = data.choices?.[0]?.message?.content ?? "";
      if (!reply) throw new Error("Empty response from OpenRouter");

      return res.json({ message: reply });
    } catch (e) {
      console.log("Key failed:", e.message);
    }
  }

  return res.status(500).json({ error: "All keys failed" });
}
