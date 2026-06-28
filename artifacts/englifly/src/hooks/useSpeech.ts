import { useState, useRef, useCallback, useEffect } from "react";

// ─── ElevenLabs TTS via backend ──────────────────────────────────────────────
async function fetchTTS(text: string): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return res.blob();
}

// ─── Groq Whisper transcription via backend ───────────────────────────────────
async function fetchTranscribe(audioBlob: Blob): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: base64, mimeType: audioBlob.type }),
  });
  if (!res.ok) throw new Error(`Transcribe ${res.status}`);
  const data = await res.json() as { text?: string };
  return data.text ?? "";
}

// ─── Hook interface ───────────────────────────────────────────────────────────
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

  // Recording refs
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const audioContextRef   = useRef<AudioContext | null>(null);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSpeechRef      = useRef(false);
  const isProcessingRef   = useRef(false);

  // Playback refs
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef  = useRef<string | null>(null);

  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);

  // MediaRecorder is supported in all modern browsers (no Google mic popup sound)
  const isSupported = typeof window !== "undefined" && !!navigator?.mediaDevices?.getUserMedia;

  // ── Web Speech fallback (only for TTS, not for recognition) ─────────────────
  const webSpeechFallback = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = 1.0;
    utterance.lang  = "en-IN";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Stop speaking ────────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
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
    setIsSpeaking(false);
  }, []);

  // ── Speak via ElevenLabs → fallback Web Speech ───────────────────────────────
  const speak = useCallback(async (text: string) => {
    stopSpeaking();
    let blob: Blob | null = null;
    try { blob = await fetchTTS(text); } catch { blob = null; }

    if (blob) {
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
      audio.play().catch(() => { setIsSpeaking(false); webSpeechFallback(text); });
      return;
    }
    webSpeechFallback(text);
  }, [stopSpeaking, webSpeechFallback]);

  // ── Cleanup recording resources ──────────────────────────────────────────────
  const cleanupRecording = useCallback(() => {
    if (levelIntervalRef.current)  { clearInterval(levelIntervalRef.current);  levelIntervalRef.current  = null; }
    if (silenceTimerRef.current)   { clearTimeout(silenceTimerRef.current);    silenceTimerRef.current   = null; }
    if (audioContextRef.current)   { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
    if (streamRef.current)         { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    hasSpeechRef.current    = false;
    isProcessingRef.current = false;
  }, []);

  // ── Process recorded audio → Groq Whisper ───────────────────────────────────
  const processAudio = useCallback(async (chunks: Blob[], mimeType: string) => {
    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size < 500) { setTranscript(""); return; } // too short, ignore

    isProcessingRef.current = true;
    setTranscript("⏳ Processing…");
    try {
      const text = await fetchTranscribe(blob);
      setTranscript("");
      if (text.trim() && onTranscriptReadyRef.current) {
        onTranscriptReadyRef.current(text.trim());
      }
    } catch {
      setTranscript("");
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  // ── Stop listening ───────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecording();
      setIsListening(false);
      setTranscript("");
    }
  }, [cleanupRecording]);

  // ── Start listening (silent MediaRecorder — no browser ping sound!) ──────────
  const startListening = useCallback(async () => {
    if (!isSupported) return;

    // Stop any AI audio
    stopSpeaking();
    cleanupRecording();
    audioChunksRef.current = [];
    hasSpeechRef.current   = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported MIME type
      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm")             ? "audio/webm" :
        "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        setIsListening(false);
        cleanupRecording();
        await processAudio(chunks, mimeType);
      };

      recorder.start(200); // collect chunks every 200ms
      setIsListening(true);
      setTranscript("🎙️ Listening…");

      // ── Silence detection via AudioContext ────────────────────────────────
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      levelIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (avg > 5) {
          // User is speaking
          hasSpeechRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpeechRef.current && !silenceTimerRef.current) {
          // Silence after speech → auto-stop after 3s (give user time to pause mid-sentence)
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
            }
          }, 3000);
        }
      }, 100);

    } catch {
      setIsListening(false);
      setTranscript("");
    }
  }, [isSupported, stopSpeaking, cleanupRecording, processAudio]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioRef.current)        { audioRef.current.pause(); audioRef.current = null; }
      if (audioBlobUrlRef.current) { URL.revokeObjectURL(audioBlobUrlRef.current); audioBlobUrlRef.current = null; }
      if (window.speechSynthesis)  window.speechSynthesis.cancel();
    };
  }, [cleanupRecording]);

  return { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported };
}

// ─── Exported helpers (used by settings page) ─────────────────────────────────
export const RATE_MAP: Record<string, number> = { slow: 0.7, normal: 1.0, fast: 1.25 };
export const DEFAULT_RATE_KEY = "normal";
export function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return voices.find(v => v.lang === "en-IN") ?? voices.find(v => v.lang === "en-GB") ??
         voices.find(v => v.lang === "en-US") ?? voices.find(v => v.lang.startsWith("en")) ?? voices[0];
}
