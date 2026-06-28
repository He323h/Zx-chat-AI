import { useState, useRef, useCallback, useEffect } from "react";

export function unlockAudio(): void {}

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
    }, 1500);
  });
}

interface UseSpeechReturn {
  isListening:      boolean;
  transcript:       string;
  isSpeaking:       boolean;
  isSupported:      boolean;
  startListening:   () => void;
  stopListening:    () => void;
  speak:            (text: string) => void;
  stopSpeaking:     () => void;
  activateCallMode: () => void;
  startCallMode:    () => void;
  stopCallMode:     () => void;
}

export function useSpeech(onTranscriptReady?: (text: string) => void): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [isSpeaking,  setIsSpeaking]  = useState(false);

  const recognitionRef       = useRef<any>(null);
  const finalTranscriptRef   = useRef("");
  const audioRef             = useRef<HTMLAudioElement | null>(null);
  const callModeRef          = useRef(false);
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const isSupported = !!SpeechRecognitionClass;

  // ─── startListening (forward-declared so speak() can call it) ───────────────
  const startListeningRef = useRef<() => void>(() => {});

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // ─── Called when AI finishes speaking — if in call mode, start listening ────
  const onSpeakDone = useCallback(() => {
    setIsSpeaking(false);
    if (callModeRef.current) {
      setTimeout(() => {
        if (callModeRef.current) startListeningRef.current();
      }, 400);
    }
  }, []);

  const webSpeechFallback = useCallback(async (text: string) => {
    if (!window.speechSynthesis) { onSpeakDone(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = getSavedRate();
    utterance.pitch = 1;
    const voices    = await getVoicesReady();
    const voice     = getSavedVoice(voices);
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    else        { utterance.lang = "en-IN"; }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => onSpeakDone();
    utterance.onerror = () => onSpeakDone();
    window.speechSynthesis.speak(utterance);
  }, [onSpeakDone]);

  const speak = useCallback(async (text: string) => {
    // Stop anything currently playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // Mark speaking immediately so no external loop jumps in
    setIsSpeaking(true);

    try {
      const response = await fetch("/api/tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`TTS ${response.status}`);

      const blob  = await response.blob();
      const url   = URL.createObjectURL(blob);
      const audio = new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        onSpeakDone();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        webSpeechFallback(text);
      };
      await audio.play();
    } catch {
      // TTS not available — use browser voice; it calls onSpeakDone when done
      webSpeechFallback(text);
    }
  }, [webSpeechFallback, onSpeakDone]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    // Stop any ongoing audio first
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Abort any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    finalTranscriptRef.current = "";
    setTranscript("");

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = "en-IN";
    recognition.maxAlternatives = 1;

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
      if (event.error === "no-speech") {
        // In call mode, try listening again after no-speech
        if (callModeRef.current) {
          setTimeout(() => {
            if (callModeRef.current) startListeningRef.current();
          }, 300);
        }
        return;
      }
      if (event.error === "aborted") return;
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const text = finalTranscriptRef.current.trim();
      setTranscript("");
      finalTranscriptRef.current = "";
      if (text && onTranscriptReadyRef.current) {
        // Sends the message; speak() will be called by the chat page when AI replies
        onTranscriptReadyRef.current(text);
      } else if (!text && callModeRef.current) {
        // Empty — restart listening
        setTimeout(() => {
          if (callModeRef.current) startListeningRef.current();
        }, 300);
      }
    };

    try { recognition.start(); } catch {}
  }, [SpeechRecognitionClass]);

  // Keep ref always current
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  /**
   * activateCallMode — just sets the flag. Use this when you're about to call
   * speak() yourself: the hook will auto-start listening once speak finishes.
   */
  const activateCallMode = useCallback(() => {
    callModeRef.current = true;
  }, []);

  /**
   * startCallMode — sets the flag AND immediately stops audio + starts listening.
   * Use this when the user presses the phone button and there's no greeting to finish.
   */
  const startCallMode = useCallback(() => {
    callModeRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setTimeout(() => {
      if (callModeRef.current) startListeningRef.current();
    }, 400);
  }, []);

  const stopCallMode = useCallback(() => {
    callModeRef.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      callModeRef.current = false;
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      if (audioRef.current)       { audioRef.current.pause(); audioRef.current.src = ""; }
      if (window.speechSynthesis)  window.speechSynthesis.cancel();
    };
  }, []);

  return {
    isListening, transcript, isSpeaking, isSupported,
    startListening, stopListening, speak, stopSpeaking,
    activateCallMode, startCallMode, stopCallMode,
  };
}
