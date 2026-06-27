const SYSTEM_PROMPTS = {
  english:
    "You are a friendly English conversation partner named ZX. Have natural, engaging conversations. Gently correct grammar mistakes with 'By the way, a more natural way to say that is...' Keep replies to 2-3 sentences.",
  casual:
    "You are a friendly English conversation partner named ZX. Have natural, engaging conversations. Gently correct grammar mistakes. Keep replies to 2-3 sentences.",
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
  const maxTokens = MAX_TOKENS[category] ?? 150;

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
        max_tokens: maxTokens,
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
