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
  // Accumulated final text across continuous segments
  const accumulatedRef = useRef("");
  // Timer to auto-submit after speech pause
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      .slice(0, 500);

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

  // ── Internal: submit accumulated text ────────────────────────────────────────
  const submitAccumulated = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    const text = accumulatedRef.current.trim();
    accumulatedRef.current = "";
    setTranscript("");
    setIsListening(false);
    listeningRef.current = false;
    if (text) onTranscriptReadyRef.current?.(text);
  }, []);

  // ── Stop listening ───────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    listeningRef.current = false;
    accumulatedRef.current = "";
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
  }, []);

  // ── Start listening — uses continuous=true so mic opens ONCE (no repeated OS sound) ──
  const startListening = useCallback(() => {
    if (!SpeechRec || listeningRef.current) return;

    stopSpeaking();

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    accumulatedRef.current = "";

    const rec = new SpeechRec();
    rec.lang = "en-IN";
    // continuous=true: mic stays open without OS "click" sound between messages
    rec.continuous = true;
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
      let finalSegment = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalSegment += t;
        } else {
          interim += t;
        }
      }

      if (finalSegment) {
        accumulatedRef.current += (accumulatedRef.current ? " " : "") + finalSegment.trim();
      }

      const display = accumulatedRef.current || interim;
      if (display) setTranscript(`🎙️ ${display}`);

      // After a final segment, wait 1.2s of silence then auto-submit
      if (finalSegment && accumulatedRef.current) {
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
          submitAccumulated();
          // Keep recognition alive for next utterance (mic stays open)
        }, 1200);
      }
    };

    rec.onspeechend = () => {
      // Speech detected then stopped — trigger submit after short delay
      if (accumulatedRef.current) {
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(submitAccumulated, 800);
      }
    };

    rec.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        // No speech — keep listening
        setTranscript("🎙️ Bol raha hoon...");
        return;
      }
      setIsListening(false);
      listeningRef.current = false;
      recognitionRef.current = null;
      setTranscript("");
      accumulatedRef.current = "";
    };

    rec.onend = () => {
      // Recognition ended unexpectedly while we're still in listening mode — restart silently
      if (listeningRef.current && recognitionRef.current === rec) {
        // Submit anything accumulated first
        if (accumulatedRef.current) {
          submitAccumulated();
          return;
        }
        // Restart to keep mic open without a new OS sound
        try {
          rec.start();
        } catch {
          setIsListening(false);
          listeningRef.current = false;
          recognitionRef.current = null;
        }
      }
    };

    try {
      rec.start();
    } catch {
      setIsListening(false);
      listeningRef.current = false;
      recognitionRef.current = null;
    }
  }, [SpeechRec, stopSpeaking, submitAccumulated]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
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
