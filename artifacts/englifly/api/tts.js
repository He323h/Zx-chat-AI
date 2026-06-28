const EL_VOICE_PRIMARY  = process.env["VITE_ELEVENLABS_VOICE_ID"] ?? "ohvvU75FpBEB8fdaLOMh";
const EL_VOICE_FALLBACK = "EXAVITQu4vr4xnSDxMaL";
const EL_MODEL = "eleven_multilingual_v2";

const EL_KEYS = [
  process.env["VITE_ELEVENLABS_API_KEY_1"] ?? process.env["ELEVENLABS_API_KEY_1"] ?? "",
  process.env["VITE_ELEVENLABS_API_KEY_2"] ?? process.env["ELEVENLABS_API_KEY_2"] ?? "",
].filter(Boolean);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text } = req.body ?? {};
  if (!text) return res.status(400).json({ error: "text is required" });

  if (EL_KEYS.length === 0) {
    return res.status(500).json({ error: "ElevenLabs API keys not configured." });
  }

  for (const key of EL_KEYS) {
    for (const voiceId of [EL_VOICE_PRIMARY, EL_VOICE_FALLBACK]) {
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key":   key,
              "Content-Type": "application/json",
              "Accept":       "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: EL_MODEL,
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          }
        );
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "no-store");
          res.status(200).send(Buffer.from(audioBuffer));
          return;
        }
      } catch { /* try next */ }
    }
  }

  return res.status(502).json({ error: "All ElevenLabs keys/voices exhausted." });
}
