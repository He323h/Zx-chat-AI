import { useState, useRef, useCallback, useEffect } from "react";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface UseSpeechReturn {
  isListening: boolean;
  transcript: string;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, onDone?: () => void) => void;
  stopSpeaking: () => void;
  isSupported: boolean;
}

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeech(onTranscriptReady?: (text: string) => void): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  const listeningRef = useRef(false);

  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);

  const SpeechRec = getSpeechRecognition();
  const isSupported = !!SpeechRec && typeof window !== "undefined" && !!navigator?.mediaDevices?.getUserMedia;

  // Pre-warm voices on mount so first speak() is fast
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handler = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
    }
  }, []);

  // ── Stop speaking ─────────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // ── Speak via Web Speech (instant, no API) ───────────────────────────────────
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onDone?.();
      return;
    }

    // Strip Hindi lines and markdown for cleaner TTS
    const cleaned = text
      .split("\n")
      .filter(line => {
        const t = line.trim();
        if (!t) return false;
        if (t.startsWith("(Hindi:")) return false;
        if (t.startsWith("Hindi:")) return false;
        if (t.startsWith("📝")) return false;
        return true;
      })
      .join(" ")
      .replace(/[*_`#]/g, "")
      .trim()
      .slice(0, 500); // keep TTS short for speed

    if (!cleaned) { onDone?.(); return; }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.volume = 1;
    utterance.rate = 1.0;
    utterance.pitch = 1;
    utterance.lang = "en-IN";

    const voices = window.speechSynthesis.getVoices();
    const best =
      voices.find(v => v.lang === "en-GB" && v.localService) ??
      voices.find(v => v.lang === "en-US" && v.localService) ??
      voices.find(v => v.lang === "en-IN") ??
      voices.find(v => v.lang.startsWith("en")) ??
      null;
    if (best) utterance.voice = best;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); onDone?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onDone?.(); };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Stop listening ───────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    listeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
  }, []);

  // ── Start listening via SpeechRecognition (browser built-in, instant) ────────
  const startListening = useCallback(() => {
    if (!SpeechRec || listeningRef.current) return;

    stopSpeaking();

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const rec = new SpeechRec();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    recognitionRef.current = rec;
    listeningRef.current = true;

    rec.onstart = () => {
      setIsListening(true);
      setTranscript("🎙️ Bol raha hoon...");
    };

    rec.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setTranscript(`🎙️ ${interim}`);
      if (final.trim()) {
        setTranscript("");
        setIsListening(false);
        listeningRef.current = false;
        recognitionRef.current = null;
        onTranscriptReadyRef.current?.(final.trim());
      }
    };

    rec.onspeechend = () => {
      try { rec.stop(); } catch {}
    };

    rec.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        setTranscript("");
      }
      setIsListening(false);
      listeningRef.current = false;
      recognitionRef.current = null;
    };

    rec.onend = () => {
      if (listeningRef.current) {
        // Still expecting to listen — was cut short, clean up
        setIsListening(false);
        listeningRef.current = false;
        recognitionRef.current = null;
        setTranscript("");
      }
    };

    try {
      rec.start();
    } catch {
      setIsListening(false);
      listeningRef.current = false;
      recognitionRef.current = null;
    }
  }, [SpeechRec, stopSpeaking]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported };
}

export const RATE_MAP: Record<string, number> = { slow: 0.7, normal: 1.0, fast: 1.25 };
export const DEFAULT_RATE_KEY = "normal";
export function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return voices.find(v => v.lang === "en-IN") ?? voices.find(v => v.lang === "en-GB") ??
    voices.find(v => v.lang === "en-US") ?? voices.find(v => v.lang.startsWith("en")) ?? voices[0];
}
