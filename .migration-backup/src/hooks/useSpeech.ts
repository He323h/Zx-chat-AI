import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechReturn {
  isListening: boolean;
  transcript: string;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSupported: boolean;
}

// Rate presets stored in localStorage as "slow" | "normal" | "fast"
export const RATE_MAP: Record<string, number> = { slow: 0.7, normal: 1.0, fast: 1.25 };
export const DEFAULT_RATE_KEY = "slow"; // 0.7x — easier for beginners

/** Pick the best available voice: en-IN first, then en-GB, then any en-US, else first available */
export function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const find = (lang: string) => voices.find(v => v.lang === lang);
  return (
    find("en-IN") ??
    find("en-GB") ??
    find("en-US") ??
    voices.find(v => v.lang.startsWith("en")) ??
    voices[0]
  );
}

/** Read user's saved voice URI from localStorage, resolve to a real voice object */
function getSavedVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const saved = localStorage.getItem("ef_voice_uri");
  if (saved) {
    const match = voices.find(v => v.voiceURI === saved);
    if (match) return match;
  }
  return pickBestVoice(voices);
}

function getSavedRate(): number {
  const key = localStorage.getItem("ef_speech_rate") ?? DEFAULT_RATE_KEY;
  return RATE_MAP[key] ?? RATE_MAP[DEFAULT_RATE_KEY];
}

export function useSpeech(onTranscriptReady?: (text: string) => void): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionClass;

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass) return;
    finalTranscriptRef.current = "";
    setTranscript("");

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) finalTranscriptRef.current += final;
      setTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = () => setIsListening(false);

    recognition.onend = () => {
      setIsListening(false);
      const text = finalTranscriptRef.current.trim();
      if (text && onTranscriptReady) {
        onTranscriptReady(text);
        finalTranscriptRef.current = "";
        setTranscript("");
      }
    };

    recognition.start();
  }, [SpeechRecognitionClass, onTranscriptReady]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Read rate from localStorage every call so settings take effect immediately
    utterance.rate = getSavedRate();
    utterance.pitch = 1;

    // Pick voice from localStorage preference, then best available
    const voices = window.speechSynthesis.getVoices();
    const voice = getSavedVoice(voices);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-IN";
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  return { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported };
}
