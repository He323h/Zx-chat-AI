export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const GROQ_KEYS = [
  process.env["GROQ_API_KEY_1"] ?? "",
  process.env["GROQ_API_KEY_2"] ?? "",
].filter(Boolean);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (GROQ_KEYS.length === 0) {
    return res.status(500).json({ error: "Groq API keys not configured." });
  }

  const { audio, mimeType } = req.body ?? {};
  if (!audio) return res.status(400).json({ error: "audio is required" });

  const buffer = Buffer.from(audio, "base64");
  const ext = (mimeType ?? "audio/webm").includes("mp4") ? "m4a" : "webm";

  let lastError = null;
  for (const key of GROQ_KEYS) {
    try {
      const formData = new FormData();
      const file = new File([buffer], `audio.${ext}`, { type: mimeType ?? "audio/webm" });
      formData.append("file", file);
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "en");
      formData.append("response_format", "json");

      const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${key}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      const data = await response.json();
      return res.json({ text: data.text ?? "" });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(502).json({ error: lastError?.message ?? "Transcription failed." });
}
