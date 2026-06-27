import { useState, useRef, useCallback, useEffect } from "react";

// ─── ElevenLabs config ────────────────────────────────────────────────────────
const EL_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const EL_MODEL    = "eleven_multilingual_v2";

// Collect non-empty keys in priority order
const EL_KEYS: string[] = [
  import.meta.env.VITE_ELEVENLABS_API_KEY_1 ?? "",
  import.meta.env.VITE_ELEVENLABS_API_KEY_2 ?? "",
].filter(Boolean);

// Module-level: remembers which key is currently working across hook re-renders
let elKeyIndex = 0;

// ─── ElevenLabs fetch helper ──────────────────────────────────────────────────
async function fetchElevenLabs(text: string, apiKey: string): Promise<Blob> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`,
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
  isListening: boolean;
  transcript:  string;
  isSpeaking:  boolean;
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

  const recognitionRef      = useRef<any>(null);
  const finalTranscriptRef  = useRef("");
  const audioRef            = useRef<HTMLAudioElement | null>(null); // ElevenLabs audio element
  const audioBlobUrlRef     = useRef<string | null>(null);           // for cleanup
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const isSupported = !!SpeechRecognitionClass;

  // ── Stop audio (ElevenLabs or Web Speech) ───────────────────────────────
  const stopSpeaking = useCallback(() => {
    // Stop ElevenLabs audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    // Stop Web Speech
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // Try ElevenLabs keys starting from the last working one
    let blob: Blob | null = null;
    for (let i = elKeyIndex; i < EL_KEYS.length; i++) {
      try {
        blob = await fetchElevenLabs(text, EL_KEYS[i]);
        elKeyIndex = i; // this key worked — remember it
        break;
      } catch {
        // This key failed → advance the global index so next call skips it
        elKeyIndex = i + 1;
      }
    }

    if (blob) {
      // Play via <audio> element
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current        = audio;
      audioBlobUrlRef.current = url;
      setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioBlobUrlRef.current = null;
        if (audioRef.current === audio) audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioBlobUrlRef.current = null;
        if (audioRef.current === audio) audioRef.current = null;
      };
      audio.play().catch(() => {
        // Autoplay blocked — fall back to Web Speech
        setIsSpeaking(false);
        webSpeechFallback(text);
      });
      return;
    }

    // Both ElevenLabs keys exhausted → Web Speech fallback
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

    // Stop AI voice before mic starts
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (audioBlobUrlRef.current) { URL.revokeObjectURL(audioBlobUrlRef.current); audioBlobUrlRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Reset transcript
    finalTranscriptRef.current = "";
    setTranscript("");

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    recognition.continuous     = false; // auto-stops after speech → triggers onend
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
      if (audioRef.current)        { audioRef.current.pause(); audioRef.current = null; }
      if (audioBlobUrlRef.current) { URL.revokeObjectURL(audioBlobUrlRef.current); audioBlobUrlRef.current = null; }
      if (window.speechSynthesis)  window.speechSynthesis.cancel();
    };
  }, []);

  return { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported };
}
