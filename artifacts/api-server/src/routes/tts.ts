import { Router, type IRouter } from "express";

const router: IRouter = Router();

const EL_VOICE_PRIMARY  = (process.env["ELEVENLABS_VOICE_ID"] ?? "ohvvU75FpBEB8fdaLOMh").trim();
const EL_VOICE_FALLBACK = "EXAVITQu4vr4xnSDxMaL"; // Bella — always accessible on free plan
const EL_MODEL = "eleven_multilingual_v2";

// Read keys per-request so no restart needed after secrets are added
function getElevenLabsKeys(): string[] {
  return [
    process.env["ELEVENLABS_API_KEY_1"]       ?? "",
    process.env["ELEVENLABS_API_KEY_2"]       ?? "",
    process.env["ELEVENLABS_API_KEY"]         ?? "",
    process.env["VITE_ELEVENLABS_API_KEY_1"] ?? "",
    process.env["VITE_ELEVENLABS_API_KEY_2"] ?? "",
  ].filter(Boolean);
}

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

  const elKeys = getElevenLabsKeys();

  if (elKeys.length === 0) {
    // No keys — tell frontend to use Web Speech fallback
    res.status(503).json({ error: "ElevenLabs not configured — use Web Speech fallback." });
    return;
  }

  // Try KEY_1 first, then KEY_2; for each key try primary voice then fallback voice
  for (const key of elKeys) {
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
        // Log non-ok for debugging
        const errBody = await response.text().catch(() => "");
        console.warn(`[TTS] key ending ...${key.slice(-6)} voice ${voiceId} → ${response.status}: ${errBody.slice(0, 120)}`);
      } catch (e) {
        console.warn(`[TTS] network error:`, e);
      }
    }
  }

  res.status(502).json({ error: "All ElevenLabs keys/voices exhausted." });
});

export default router;
