import { useState, useRef, useCallback, useEffect } from "react";

// ─── AudioContext singleton — unlocked on first user gesture ─────────────────
let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

// Call this on any user interaction (send button, mic click, key press)
// so the AudioContext is unlocked BEFORE we try to auto-play.
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

// ─── Play audio blob via AudioContext (bypasses autoplay policy) ─────────────
async function playBlob(
  blob: Blob,
  onStart: () => void,
  onEnd: () => void
): Promise<() => void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  onStart();
  source.start(0);

  source.onended = () => onEnd();

  // Return a stop function
  return () => {
    try { source.stop(); } catch {}
    onEnd();
  };
}

// ─── TTS via backend proxy ────────────────────────────────────────────────────
async function fetchTTS(text: string): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
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
  const stopCurrentRef      = useRef<(() => void) | null>(null); // stop function for AudioContext source
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const isSupported = !!SpeechRecognitionClass;

  // ── Stop audio (AudioContext or Web Speech) ──────────────────────────────
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
    if (stopCurrentRef.current) {
      stopCurrentRef.current();
      stopCurrentRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Try ElevenLabs TTS via backend
    try {
      const blob = await fetchTTS(text);
      const stopFn = await playBlob(
        blob,
        () => setIsSpeaking(true),
        () => {
          setIsSpeaking(false);
          if (stopCurrentRef.current === stopFn) stopCurrentRef.current = null;
        }
      );
      stopCurrentRef.current = stopFn;
      return; // ElevenLabs succeeded
    } catch {
      // fall through to Web Speech
    }

    // Web Speech fallback
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
    if (stopCurrentRef.current) { stopCurrentRef.current(); stopCurrentRef.current = null; }
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
