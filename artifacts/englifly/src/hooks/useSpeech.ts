import { useState, useRef, useCallback, useEffect } from "react";

const EL_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const EL_MODEL    = "eleven_multilingual_v2";

function getElevenLabsKeys(): string[] {
  return [
    (import.meta.env.VITE_ELEVENLABS_API_KEY_1 as string) ?? "",
    (import.meta.env.VITE_ELEVENLABS_API_KEY_2 as string) ?? "",
  ].filter(Boolean);
}

// No-op kept so chat.tsx import doesn't break
export function unlockAudio(): void {}

// ─── Play audio blob via simple new Audio() ───────────────────────────────────
function playAudioBlob(
  blob: Blob,
  onStart: () => void,
  onEnd: () => void
): { stop: () => void } {
  const url    = URL.createObjectURL(blob);
  const audio  = new Audio(url);

  audio.onplay  = () => onStart();
  audio.onended = () => { onEnd(); URL.revokeObjectURL(url); };
  audio.onerror = () => { onEnd(); URL.revokeObjectURL(url); };

  audio.play().catch(() => { onEnd(); URL.revokeObjectURL(url); });

  return {
    stop() {
      audio.pause();
      audio.currentTime = 0;
      onEnd();
      URL.revokeObjectURL(url);
    },
  };
}

// ─── ElevenLabs TTS (direct from browser) ────────────────────────────────────
async function fetchElevenLabs(text: string, apiKey: string): Promise<Blob> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key":   apiKey,
        "Content-Type": "application/json",
        Accept:         "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: EL_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
  return res.blob();
}

// ─── Web Speech API helpers ──────────────────────────────────────────────────
export const RATE_MAP: Record<string, number> = { slow: 0.7, normal: 1.0, fast: 1.25 };
export const DEFAULT_RATE_KEY = "slow";

export function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const find = (lang: string) => voices.find(v => v.lang === lang);
  return find("en-IN") ?? find("en-GB") ?? find("en-US") ?? voices.find(v => v.lang.startsWith("en")) ?? voices[0];
}

function getSavedVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const saved = localStorage.getItem("ef_voice_uri");
  if (saved) { const m = voices.find(v => v.voiceURI === saved); if (m) return m; }
  return pickBestVoice(voices);
}

function getSavedRate(): number {
  const key = localStorage.getItem("ef_speech_rate") ?? DEFAULT_RATE_KEY;
  return RATE_MAP[key] ?? RATE_MAP[DEFAULT_RATE_KEY];
}

function getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) { resolve(voices); return; }
    const onChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChanged);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
}

// ─── Hook types ───────────────────────────────────────────────────────────────
interface UseSpeechReturn {
  isListening:     boolean;
  transcript:      string;
  isSpeaking:      boolean;
  startListening:  () => void;
  stopListening:   () => void;
  speak:           (text: string) => void;
  stopSpeaking:    () => void;
  isSupported:     boolean;
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useSpeech(onTranscriptReady?: (text: string) => void): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [isSpeaking,  setIsSpeaking]  = useState(false);

  const recognitionRef       = useRef<any>(null);
  const finalTranscriptRef   = useRef("");
  const stopCurrentRef       = useRef<(() => void) | null>(null);
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const isSupported = !!SpeechRecognitionClass;

  // ── Stop audio ───────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    if (stopCurrentRef.current) {
      stopCurrentRef.current();
      stopCurrentRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Web Speech fallback ──────────────────────────────────────────────────
  const webSpeechFallback = useCallback(async (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = getSavedRate();
    utterance.pitch = 1;
    const voices = await getVoicesReady();
    const voice  = getSavedVoice(voices);
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    else         { utterance.lang = "en-IN"; }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Main speak function ──────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    // Stop anything currently playing
    if (stopCurrentRef.current) { stopCurrentRef.current(); stopCurrentRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Try ElevenLabs keys in order
    const keys = getElevenLabsKeys();
    for (const key of keys) {
      try {
        const blob    = await fetchElevenLabs(text, key);
        const player  = playAudioBlob(
          blob,
          () => setIsSpeaking(true),
          () => {
            setIsSpeaking(false);
            if (stopCurrentRef.current === player.stop) stopCurrentRef.current = null;
          }
        );
        stopCurrentRef.current = player.stop;
        return;
      } catch {
        // try next key
      }
    }

    // Web Speech fallback (no ElevenLabs keys or all failed)
    webSpeechFallback(text);
  }, [webSpeechFallback]);

  // ── Stop listening ───────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ── Start listening ──────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    if (stopCurrentRef.current) { stopCurrentRef.current(); stopCurrentRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    finalTranscriptRef.current = "";
    setTranscript("");

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current     = recognition;
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = "en-IN";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      let final   = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final   += r[0].transcript;
        else            interim += r[0].transcript;
      }
      if (final) finalTranscriptRef.current += final;
      setTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const text = finalTranscriptRef.current.trim();
      setTranscript("");
      finalTranscriptRef.current = "";
      if (text && onTranscriptReadyRef.current) {
        onTranscriptReadyRef.current(text);
      }
    };

    try { recognition.start(); } catch {}
  }, [SpeechRecognitionClass]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      if (stopCurrentRef.current) { stopCurrentRef.current(); }
      if (window.speechSynthesis)  window.speechSynthesis.cancel();
    };
  }, []);

  return { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported };
}
