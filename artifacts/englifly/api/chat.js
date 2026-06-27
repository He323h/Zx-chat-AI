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

const GEMINI_KEYS = [
  process.env["GEMINI_API_KEY_1"] ?? "",
  process.env["GEMINI_API_KEY_2"] ?? "",
].filter(Boolean);

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(apiKey, systemPrompt, history, message, maxTokens) {
  const contents = [
    ...(Array.isArray(history) ? history : []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(errText), { status: res.status });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return text.trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (GEMINI_KEYS.length === 0) {
    return res.status(500).json({
      error: "Gemini API keys not configured. Add GEMINI_API_KEY_1 and GEMINI_API_KEY_2 to Vercel environment variables.",
    });
  }

  const { message, category, history } = req.body ?? {};
  if (!message) return res.status(400).json({ error: "message is required" });

  const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;
  const maxTokens = MAX_TOKENS[category] ?? 200;

  let lastError = null;
  for (const key of GEMINI_KEYS) {
    try {
      const reply = await callGemini(key, systemPrompt, history, message, maxTokens);
      return res.json({ message: reply });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(502).json({ error: lastError?.message ?? "All Gemini keys exhausted." });
}
