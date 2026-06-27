import { Router, type IRouter } from "express";

const router: IRouter = Router();

const EL_VOICE_PRIMARY  = "ohvvU75FpBEB8fdaLOMh";
const EL_VOICE_FALLBACK = "EXAVITQu4vr4xnSDxMaL"; // Bella — confirmed accessible
const EL_MODEL = "eleven_multilingual_v2";

const EL_KEYS: string[] = [
  process.env["ELEVENLABS_API_KEY"] ?? "",
  process.env["ELEVENLABS_API_KEY_1"] ?? "",
  process.env["ELEVENLABS_API_KEY_2"] ?? "",
].filter(Boolean);

async function tryTTS(apiKey: string, voiceId: string, text: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key":   apiKey,
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
  return response;
}

router.post("/tts", async (req, res) => {
  const { text } = req.body as { text?: string };

  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (EL_KEYS.length === 0) {
    res.status(500).json({ error: "ElevenLabs API keys not configured." });
    return;
  }

  // Try each key × each voice (primary first, then fallback)
  for (const key of EL_KEYS) {
    for (const voiceId of [EL_VOICE_PRIMARY, EL_VOICE_FALLBACK]) {
      try {
        const response = await tryTTS(key, voiceId, text);
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          res.set("Content-Type", "audio/mpeg");
          res.set("Cache-Control", "no-store");
          res.send(Buffer.from(audioBuffer));
          return;
        }
      } catch {
        // network error — try next combination
      }
    }
  }

  res.status(502).json({ error: "All ElevenLabs keys/voices exhausted." });
});

export default router;
