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
    }, 1000);
  });
}

interface UseSpeechReturn {
  isListening:    boolean;
  transcript:     string;
  isSpeaking:     boolean;
  startListening: () => void;
  stopListening:  () => void;
  speak:          (text: string) => void;
  stopSpeaking:   () => void;
  isSupported:    boolean;
}

export function useSpeech(onTranscriptReady?: (text: string) => void): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [isSpeaking,  setIsSpeaking]  = useState(false);

  const recognitionRef       = useRef<any>(null);
  const finalTranscriptRef   = useRef("");
  const audioRef             = useRef<HTMLAudioElement | null>(null);
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const isSupported = !!SpeechRecognitionClass;

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const webSpeechFallback = useCallback(async (text: string) => {
    if (!window.speechSynthesis) { setIsSpeaking(false); return; }
    window.speechSynthesis.cancel();
    const utterance  = new SpeechSynthesisUtterance(text);
    utterance.rate   = getSavedRate();
    utterance.pitch  = 1;
    const voices     = await getVoicesReady();
    const voice      = getSavedVoice(voices);
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    else          { utterance.lang = "en-IN"; }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(async (text: string) => {
    // Stop anything currently playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // Mark speaking IMMEDIATELY so call-mode loop doesn't trigger during fetch
    setIsSpeaking(true);

    try {
      const response = await fetch("/api/tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`TTS ${response.status}`);

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);

      const audio = new Audio();
      audioRef.current = audio;

      audio.src = url;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        webSpeechFallback(text);
      };

      await audio.play();
    } catch (err) {
      console.error("[TTS] fetch/play failed:", err);
      // webSpeechFallback will manage isSpeaking itself (onstart/onend)
      // so we first reset to false so it can set true again via onstart
      setIsSpeaking(false);
      webSpeechFallback(text);
    }
  }, [webSpeechFallback]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    // Stop any currently playing audio — mic and speaker together causes echo
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    // Abort any existing recognition before creating a new one
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    finalTranscriptRef.current = "";
    setTranscript("");

    const recognition          = new SpeechRecognitionClass();
    recognitionRef.current     = recognition;
    // continuous=false: recognition stops naturally after a pause (no restart ding)
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = "en-IN";
    // Suppress the browser's built-in "listening" sound on Chrome by maxAlternatives
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
      if (event.error === "no-speech" || event.error === "aborted") return;
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
        onTranscriptReadyRef.current(text);
      }
    };

    try { recognition.start(); } catch {}
  }, [SpeechRecognitionClass]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      if (audioRef.current)       { audioRef.current.pause(); audioRef.current.src = ""; }
      if (window.speechSynthesis)  window.speechSynthesis.cancel();
    };
  }, []);

  return { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported };
}
