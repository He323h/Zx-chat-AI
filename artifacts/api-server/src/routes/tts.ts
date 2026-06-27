import { Router, type IRouter } from "express";

const router: IRouter = Router();

const EL_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const EL_MODEL    = "eleven_multilingual_v2";

const EL_KEYS: string[] = [
  process.env["ELEVENLABS_API_KEY_1"] ?? "",
  process.env["ELEVENLABS_API_KEY_2"] ?? "",
].filter(Boolean);

let elKeyIndex = 0;

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

  for (let i = elKeyIndex; i < EL_KEYS.length; i++) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key":   EL_KEYS[i],
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

      if (!response.ok) {
        elKeyIndex = i + 1;
        continue;
      }

      elKeyIndex = i;
      const audioBuffer = await response.arrayBuffer();
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "no-store");
      res.send(Buffer.from(audioBuffer));
      return;
    } catch {
      elKeyIndex = i + 1;
    }
  }

  res.status(502).json({ error: "All ElevenLabs keys exhausted." });
});

export default router;
