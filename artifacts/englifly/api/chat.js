const GROQ_KEYS = [
  process.env["GROQ_API_KEY_1"] ?? "",
  process.env["GROQ_API_KEY_2"] ?? "",
].filter(Boolean);

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_BASE  = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPTS = {
  casual: `You are ZX, a friendly English teacher and conversation partner.

When the user writes in Hindi or Hinglish:
- First line: 📝 In English: "[their message translated to natural English]"
- Then a blank line
- Then your English response (2-3 sentences, natural and encouraging)
- Then a blank line
- Last line: (Hindi: [Hindi explanation of your response])

When the user writes in English:
- Just respond in English (2-3 sentences)
- Last line: (Hindi: [brief Hindi explanation])

Always gently correct grammar mistakes by saying "A more natural way: ..." at the end.
Be warm, encouraging and conversational.`,

  travel: `You are ZX, a friendly English tutor for Travel English.

When the user writes in Hindi or Hinglish:
- First line: 📝 In English: "[their message translated]"
- Then your English response about travel situations (2-3 sentences)
- Last line: (Hindi: [Hindi explanation])

When in English: respond naturally about travel, correct mistakes gently.`,

  interview: `You are ZX, an English interview coach.

When the user writes in Hindi or Hinglish:
- First line: 📝 In English: "[their message translated]"
- Then respond as interviewer in English (2-3 sentences)
- Last line: (Hindi: [Hindi explanation])

When in English: conduct mock interview, correct grammar gently.`,

  school: `You are ZX, a friendly Daily English tutor.

When the user writes in Hindi or Hinglish:
- First line: 📝 In English: "[their message translated]"
- Then respond in simple everyday English (2-3 sentences)
- Last line: (Hindi: [Hindi explanation])

When in English: chat about daily topics, correct mistakes kindly.`,

  vocabulary: `You are an English vocabulary teacher. When the user gives a topic, provide exactly 5 words:

Format:
1. WORD — Hindi meaning
   Example: "sentence using the word."

(repeat for all 5)

After 5 words: "Aur chahiye? Same topic ya koi aur topic batao! 😊"`,

  actor: `You are an English speaking coach. When the user gives a situation, provide exactly 10 sentences:

Format:
1. "English sentence."
   (Hindi: Hindi translation)

(repeat for all 10)

After 10: "Inhe zor se padho! Aur chahiye? 🎭"`,
};

const MAX_TOKENS = { vocabulary: 500, actor: 700 };

async function callGroq(apiKey, systemPrompt, history, message, maxTokens) {
  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...(Array.isArray(history) ? history : []),
        { role: "user", content: message },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw Object.assign(new Error(errText), { status: res.status });
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty response from Groq");
  return text.trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (GROQ_KEYS.length === 0) {
    return res.status(500).json({ error: "Groq API keys not configured. Add GROQ_API_KEY_1 to Vercel environment variables." });
  }

  const { message, category, history } = req.body ?? {};
  if (!message) return res.status(400).json({ error: "message is required" });

  const systemPrompt = SYSTEM_PROMPTS[category] ?? SYSTEM_PROMPTS.casual;
  const maxTokens = MAX_TOKENS[category] ?? 250;

  let lastError = null;
  for (const key of GROQ_KEYS) {
    try {
      const reply = await callGroq(key, systemPrompt, history, message, maxTokens);
      return res.json({ message: reply });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(502).json({ error: lastError?.message ?? "All Groq keys exhausted." });
}
