import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeech } from "@/hooks/useSpeech";
import { recordPracticeNow } from "@/lib/notifications";
import {
  useSendMessage,
  useGetUserProfile,
  useGetTodayUsage,
  getGetUserProfileQueryKey,
  getGetTodayUsageQueryKey,
  useTrackUsage,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mic, MicOff, Send, ArrowLeft, Volume2, VolumeX, Crown,
  Phone, PhoneOff,
} from "lucide-react";
import {
  StreamingText, TypingBubble, Waveform,
  ChatBackground, GlowAvatar, ConfettiBurst, PraiseStar, pickPraise,
} from "@/components/chat-ui";

import {
  incrementSessions, incrementMsgs, incrementCorrections,
  incrementVoiceSessions, addMinutesPracticed, addTopic, logActivity,
} from "@/lib/dailyStats";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Extract only English sentences for TTS — strip Hindi lines
function englishOnlyForTTS(text: string): string {
  return text
    .split("\n")
    .filter(line => {
      const t = line.trim();
      if (!t) return false;
      if (t.startsWith("📝 In English:")) return false;
      if (t.startsWith("(Hindi:")) return false;
      if (t.startsWith("Hindi:")) return false;
      return true;
    })
    .join(" ")
    .trim();
}

const CATEGORY_META: Record<string, { label: string; emoji: string; starters: string[] }> = {
  travel:    { label: "Travel English",  emoji: "✈️", starters: [
    "Let's practice travel English! 🛫 You've just landed at a busy international airport. Tell me — where are you flying to today?",
    "Welcome to travel practice! Imagine you're checking into a hotel. How would you greet the receptionist?",
    "Travel time! 🗺️ You're lost in a new city and need directions. How would you ask a local for help?",
  ]},
  interview: { label: "Job Interview",   emoji: "💼", starters: [
    "Let's do a mock interview! I'll be your interviewer. 💼 First question — tell me about yourself and the role you're applying for.",
    "Interview practice! Imagine you're sitting across from me in a job interview. Tell me — what are your biggest strengths?",
    "Ready for your interview? Let's start! Why do you want to work at this company?",
  ]},
  school:    { label: "Daily Speaking",  emoji: "📚", starters: [
    "Hey! Let's practice everyday English. 😊 Tell me — what did you do this morning? Describe your routine.",
    "Hi there! Let's chat about daily life. What do you usually do after school or work?",
    "Hello! 👋 Let's talk about your week. What's been the best part of your day so far?",
  ]},
  casual:    { label: "Casual Chat",     emoji: "💬", starters: [
    "Hey! I'm your English chat buddy. 😄 What's something interesting that happened to you recently?",
    "Hi! Let's have a fun chat. If you could visit any country right now, where would you go and why?",
    "Hey there! 🌟 What's your favourite movie or TV show these days? Tell me about it!",
  ]},
  vocabulary:{ label: "Vocabulary",      emoji: "📖", starters: [
    "Welcome to Vocabulary practice! 📖 Today's word is RESILIENT — it means able to recover quickly from difficulties. Example: 'She was resilient after losing her job and found a better one.' Now use 'resilient' in your own sentence!",
    "Let's build your vocabulary! 🌟 Today's word: AMBITIOUS — having a strong desire to succeed. Example: 'He was so ambitious that he started his own company at 22.' Can you make a sentence with 'ambitious'?",
    "Vocabulary time! 📚 Today's word: ELOQUENT — speaking clearly and persuasively. Example: 'The eloquent speaker held the audience's attention the whole time.' Try using 'eloquent' in a sentence!",
  ]},
  actor:     { label: "Actor English",   emoji: "🎭", starters: [
    "🎭 Welcome to Actor English! I'll give you lines to read aloud. Ready? Here's your first line:\n\n*At a coffee shop*\n\"Hi, could I get a medium latte with oat milk, please? And can you add my name — it's [your name].\"\n\nGo ahead and say it! I'll give you feedback.",
    "🎭 Actor mode ON! Let's practice with everyday scenes. Here's your line:\n\n*On a phone call*\n\"Hello, I'd like to make a reservation for two people this Saturday at 7 PM. Is that available?\"\n\nRepeat the line and I'll coach you!",
    "🎭 Lights, camera, practice! Here's your scene:\n\n*At the airport*\n\"Excuse me, could you tell me which gate I need for the flight to London? I think I'm in Terminal B.\"\n\nSay it out loud or type it — let's go!",
  ]},
};

function pickStarter(starters: string[]): string {
  return starters[Math.floor(Math.random() * starters.length)];
}

const CORRECTION_SIGNALS = [
  "the correct form", "you should say", "it's better to say", "a small correction",
  "you meant", "actually,", "by the way,", "just to correct", "more natural",
];

function hasCorrectionSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return CORRECTION_SIGNALS.some(s => lower.includes(s));
}


type CallPhase = "listening" | "thinking" | "speaking" | "idle";

interface CallModeOverlayProps {
  phase: CallPhase;
  meta: { label: string; emoji: string };
  onEndCall: () => void;
}

function useCallTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function CallModeOverlay({ phase, meta, onEndCall }: CallModeOverlayProps) {
  const timer = useCallTimer(true);

  const phaseLabel =
    phase === "listening" ? "Listening…" :
    phase === "thinking"  ? "Thinking…" :
    phase === "speaking"  ? "Speaking…" :
    "Waiting…";

  const phaseColor =
    phase === "listening" ? "#22c55e" :
    phase === "speaking"  ? "#60a5fa" :
    phase === "thinking"  ? "#f59e0b" :
    "#64748b";

  const waveColor =
    phase === "listening" ? "#4ade80" :
    phase === "speaking"  ? "#93c5fd" :
    "#475569";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(180deg,#070c1a 0%,#0a1628 60%,#0d1f38 100%)" }}>

      {/* Top: name */}
      <div className="w-full px-6 pt-14 text-center">
        <p className="text-white/40 text-[11px] font-semibold tracking-widest uppercase mb-1">EngliFly</p>
        <p className="text-white text-xl font-bold">{meta.label}</p>
      </div>

      {/* Center: avatar + waveform + timer */}
      <div className="flex flex-col items-center gap-5">
        {/* Avatar with rings */}
        <div className="relative flex items-center justify-center">
          {phase === "speaking" && (
            <>
              <div className="call-ring-1 absolute w-52 h-52 rounded-full"
                style={{ background: `${phaseColor}18` }} />
              <div className="call-ring-2 absolute w-40 h-40 rounded-full"
                style={{ background: `${phaseColor}28` }} />
            </>
          )}
          {phase === "listening" && (
            <>
              <div className="call-ring-1 absolute w-52 h-52 rounded-full"
                style={{ background: `${phaseColor}22` }} />
              <div className="call-ring-2 absolute w-38 h-38 rounded-full"
                style={{ background: `${phaseColor}30` }} />
            </>
          )}
          <div
            className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl relative z-10 shadow-2xl ${phase !== "idle" && phase !== "thinking" ? "call-avatar" : ""}`}
            style={{
              background: "linear-gradient(135deg,#1565c0,#1a8fd1)",
              boxShadow: phase === "speaking"
                ? `0 0 0 4px ${phaseColor}40, 0 8px 40px rgba(14,95,168,0.6)`
                : `0 8px 32px rgba(14,95,168,0.4)`,
            }}>
            {meta.emoji}
          </div>
        </div>

        {/* Waveform visualizer */}
        <div className="flex flex-col items-center gap-3">
          <Waveform
            active={phase === "listening" || phase === "speaking"}
            color={waveColor}
            bars={7}
          />
          <p className="text-white text-5xl font-mono font-extralight tracking-widest tabular-nums">
            {timer}
          </p>
        </div>

        {/* Phase pill */}
        <div className="flex items-center gap-2 px-5 py-2 rounded-full"
          style={{ background: `${phaseColor}20`, border: `1px solid ${phaseColor}50` }}>
          <div className="w-2 h-2 rounded-full call-phase-dot" style={{ background: phaseColor }} />
          <span className="text-sm font-semibold" style={{ color: phaseColor }}>{phaseLabel}</span>
        </div>

        <p className="text-white/25 text-xs text-center px-10 leading-relaxed">
          {phase === "idle"
            ? "AI ki baat suno, phir apni baari hai"
            : "Bolne ke baad ruko — AI automatically sun raha hai"}
        </p>
      </div>

      {/* End call button */}
      <div className="pb-16 flex flex-col items-center gap-3">
        <button
          onClick={onEndCall}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
          style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 4px 24px rgba(239,68,68,0.5)" }}>
          <PhoneOff size={28} className="text-white" />
        </button>
        <span className="text-white/30 text-xs">Call khatam karo</span>
      </div>
    </div>
  );
}

// ─── Mic permission overlay shown before entering call mode ───────────────────
interface MicPermOverlayProps {
  onAllow: () => void;
  onCancel: () => void;
  error: string | null;
  requesting: boolean;
  meta: { label: string; emoji: string };
}

function MicPermOverlay({ onAllow, onCancel, error, requesting, meta }: MicPermOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="bg-[#0d1b2e] rounded-3xl p-8 max-w-sm w-full flex flex-col items-center gap-6 shadow-2xl border border-white/10">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
          style={{ background: "linear-gradient(135deg,#1565c0,#1a8fd1)" }}>
          🎙️
        </div>

        <div className="text-center">
          <p className="text-white text-lg font-bold mb-2">Microphone Access</p>
          <p className="text-white/60 text-sm leading-relaxed">
            Voice practice for <span className="text-white font-medium">{meta.label}</span> needs your microphone.
            Your audio is only used during the conversation.
          </p>
        </div>

        {error && (
          <div className="w-full rounded-xl px-4 py-3 text-sm text-red-300 text-center"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        <button
          onClick={onAllow}
          disabled={requesting}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-60"
          style={{ background: requesting ? "#334155" : "linear-gradient(135deg,#22c55e,#16a34a)" }}>
          {requesting ? "Requesting…" : "Allow Microphone"}
        </button>

        <button
          onClick={onCancel}
          className="text-white/40 text-sm hover:text-white/70 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const category = (params.get("category") ?? "casual") as keyof typeof CATEGORY_META;
  const startInVoiceMode = params.get("mode") === "voice";
  const meta = CATEGORY_META[category] ?? CATEGORY_META.casual;

  const uid = user?.uid ?? "";
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [callMode, setCallModeState] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [praisedId, setPraisedId]     = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Mic permission gate
  const [showMicPerm, setShowMicPerm]     = useState(false);
  const [micPermError, setMicPermError]   = useState<string | null>(null);
  const [micRequesting, setMicRequesting] = useState(false);

  // Ref so handleSend (useCallback) can check call mode without stale closure
  const callModeRef = useRef(false);
  const isMutedRef  = useRef(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const sessionStarted  = useRef(false);

  const sendMessage = useSendMessage();
  const trackUsage  = useTrackUsage();

  const { data: profile } = useGetUserProfile(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetUserProfileQueryKey({ uid }) } }
  );
  const { data: usage } = useGetTodayUsage(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetTodayUsageQueryKey({ uid }) } }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      incrementSessions();
      addTopic(meta.label);
      logActivity("chat", meta.label);
    }
  }, []);

  const starterRef = useRef(pickStarter(meta.starters));

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !uid || usage?.limitReached) return;

      setInputText("");
      recordPracticeNow();
      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);
      incrementMsgs();

      const historyForApi = messages
        .filter(m => m.id !== "greeting")
        .map(m => ({ role: m.role, content: m.content }));

      sendMessage.mutate(
        {
          data: {
            uid,
            message: trimmed,
            category: category as "travel" | "interview" | "school" | "casual" | "vocabulary" | "actor",
            history: historyForApi,
          }
        },
        {
          onSuccess: (data) => {
            setIsTyping(false);
            const aiMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: data.message };
            setMessages(prev => [...prev, aiMsg]);
            setStreamingId(aiMsg.id);

            const isCorrection = hasCorrectionSignal(data.message);
            if (isCorrection) {
              incrementCorrections();
            } else {
              // Positive response — show praise
              setPraisedId(aiMsg.id);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 2200);
              setTimeout(() => setPraisedId(null), 6000);
            }

            // Speak AI reply — English only (strip Hindi lines for TTS)
            // Prepend praise phrase when response is positive
            if (!isMutedRef.current || callModeRef.current) {
              const ttsBase = englishOnlyForTTS(data.message);
              const ttsText = (!isCorrection && !callModeRef.current && ttsBase)
                ? pickPraise() + ttsBase
                : ttsBase;
              if (ttsText) speak(ttsText);
            }
            queryClient.invalidateQueries({ queryKey: getGetTodayUsageQueryKey({ uid }) });
          },
          onError: () => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
              id: `e-${Date.now()}`, role: "assistant",
              content: "Sorry, I had trouble responding. Please try again!",
            }]);
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, messages, category, usage?.limitReached]
  );

  const {
    isListening, transcript, isSpeaking,
    startListening, stopListening,
    speak, stopSpeaking,
    isSupported,
  } = useSpeech(handleSend);

  // Keep refs in sync with state
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Auto-restart listening ONLY after AI fully finishes speaking (call mode loop)
  // This is the turn-based loop: AI speaks → wait 1.5s → listen for user
  useEffect(() => {
    if (!isSpeaking && callMode && !isListening && !isTyping && callModeRef.current) {
      const t = setTimeout(() => {
        if (callModeRef.current && !isListening && !isSpeaking) {
          startListening();
        }
      }, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isSpeaking, callMode, isListening, isTyping, startListening]);

  // Greeting on mount — show message only, never auto-speak in call mode
  useEffect(() => {
    if (!started) {
      setStarted(true);
      setMessages([{ id: "greeting", role: "assistant", content: starterRef.current }]);

      setTimeout(() => {
        if (startInVoiceMode && isSupported) {
          // Show mic permission prompt — don't enter call mode yet
          setShowMicPerm(true);
        } else {
          // Text mode: speak greeting as normal if not muted
          if (!isMuted) speak(starterRef.current);
        }
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Usage tracking heartbeat — also updates practice minutes
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(() => {
      trackUsage.mutate(
        { data: { uid, minutes: 1 } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTodayUsageQueryKey({ uid }) }) }
      );
      addMinutesPracticed(1);
    }, 60_000);
    return () => clearInterval(interval);
  }, [uid]);

  // ── Mic permission request ────────────────────────────────────────────────────
  const voiceCallStartRef = useRef<number | null>(null);

  async function requestMicAndEnterCall() {
    setMicPermError(null);
    setMicRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setShowMicPerm(false);
      setMicRequesting(false);
      callModeRef.current = true;
      setCallModeState(true);
      voiceCallStartRef.current = Date.now();
      incrementVoiceSessions();
      logActivity("voice", meta.label);
      startListening();
    } catch {
      setMicRequesting(false);
      setMicPermError("Microphone access was denied. Please allow mic access in your browser settings and try again.");
    }
  }

  function handleMicClick() {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  }

  function enterCallMode() {
    // Show mic permission screen first — don't auto-speak anything
    setShowMicPerm(true);
    setMicPermError(null);
  }

  function exitCallMode() {
    callModeRef.current = false;
    setCallModeState(false);
    stopListening();
    stopSpeaking();
    if (voiceCallStartRef.current) {
      const mins = Math.max(1, Math.round((Date.now() - voiceCallStartRef.current) / 60000));
      addMinutesPracticed(mins);
      voiceCallStartRef.current = null;
    }
    if (startInVoiceMode) setLocation("/home");
  }

  function getCallPhase(): CallPhase {
    if (isListening) return "listening";
    if (isTyping)    return "thinking";
    if (isSpeaking)  return "speaking";
    return "idle";
  }

  const userInitial = (user?.email?.[0] ?? user?.displayName?.[0] ?? "U").toUpperCase();

  return (
    <>
      <ChatBackground variant="blue" />
      <ConfettiBurst show={showConfetti} />

      {/* Mic permission overlay */}
      {showMicPerm && (
        <MicPermOverlay
          meta={meta}
          onAllow={requestMicAndEnterCall}
          onCancel={() => { setShowMicPerm(false); setMicPermError(null); }}
          error={micPermError}
          requesting={micRequesting}
        />
      )}

      {callMode && (
        <CallModeOverlay
          phase={getCallPhase()}
          meta={meta}
          onEndCall={exitCallMode}
        />
      )}

      <div className="min-h-screen flex flex-col max-w-lg mx-auto relative z-10" style={{ background: "transparent" }}>
        {/* Header */}
        <div className="border-b border-white/60 px-4 py-3 flex items-center gap-3 shrink-0 sticky top-0 z-20"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 1px 20px rgba(59,130,246,0.08)",
          }}>
          <button onClick={() => { stopSpeaking(); stopListening(); setLocation("/home"); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all btn-3d"
            style={{ background: "rgba(241,245,249,0.8)" }}>
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <GlowAvatar
            content={<span style={{ fontSize: 16 }}>{meta.emoji}</span>}
            bg="linear-gradient(135deg,hsl(var(--primary)),hsl(200,85%,33%))"
            size={36}
            state={isTyping ? "thinking" : "idle"}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm leading-tight">{meta.label}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {profile?.englishLevel && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: "hsl(var(--primary))" }}>{profile.englishLevel}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {isSupported && (
              <button onClick={enterCallMode} title="Start Voice Call"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all btn-3d disabled:opacity-40"
                style={{ background: "rgba(241,245,249,0.8)" }}>
                <Phone size={17} style={{ color: "#22c55e" }} />
              </button>
            )}
            <button onClick={() => setIsMuted(m => !m)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all btn-3d"
              style={{ background: "rgba(241,245,249,0.8)" }}>
              {isMuted ? <VolumeX size={18} className="text-muted-foreground" /> : <Volume2 size={18} style={{ color: "hsl(var(--primary))" }} />}
            </button>
            {profile?.subscription !== "pro" && (
              <button onClick={() => setLocation("/subscription")}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all btn-3d"
                style={{ background: "rgba(241,245,249,0.8)" }}>
                <Crown size={18} className="text-amber-500" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {messages.map(msg => {
            const isPraised = msg.id === praisedId;
            return (
              <div key={msg.id} className={`flex items-end gap-2.5 mb-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <GlowAvatar
                    content="E"
                    bg="linear-gradient(135deg,hsl(var(--primary)),hsl(200,85%,33%))"
                    size={28}
                    state={isTyping && msg === messages[messages.length - 1] ? "thinking" : "idle"}
                  />
                )}
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)" }}>
                    {userInitial}
                  </div>
                )}
                <div className="max-w-[78%] flex flex-col gap-1">
                  <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bubble-user bubble-in-right"
                      : `bubble-ai bubble-in-left${isPraised ? " bubble-praise" : ""}`
                  }`}>
                    {msg.role === "assistant" && msg.id === streamingId
                      ? <StreamingText text={msg.content} onDone={() => setStreamingId(null)} />
                      : msg.content}
                  </div>
                  {isPraised && (
                    <div className="flex items-center gap-1 pl-1">
                      <PraiseStar />
                      <span className="text-[11px] font-semibold text-amber-500">Great job!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isTyping && (
            <TypingBubble
              avatarContent="E"
              avatarBg="linear-gradient(135deg,hsl(var(--primary)),hsl(200,85%,33%))"
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="px-3 py-3 shrink-0 sticky bottom-0"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(147,197,253,0.3)",
            boxShadow: "0 -4px 20px rgba(59,130,246,0.06)",
          }}>
          <div className="flex items-center gap-2">
            {isSupported && (
              <button onClick={handleMicClick} disabled={!!usage?.limitReached}
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all btn-3d
                  ${isListening ? "text-white mic-breathe" : "text-muted-foreground"}
                  ${usage?.limitReached ? "opacity-40 cursor-not-allowed" : ""}`}
                style={isListening
                  ? { background: "hsl(var(--primary))" }
                  : { background: "rgba(241,245,249,0.9)", border: "1px solid rgba(147,197,253,0.3)" }
                }>
                {isListening ? <Mic size={19} /> : <MicOff size={19} />}
              </button>
            )}
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputText); } }}
              placeholder={isListening ? "Listening…" : usage?.limitReached ? "Daily limit reached" : "Type a message…"}
              disabled={!!usage?.limitReached || isListening}
              className="flex-1 h-11 rounded-full px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              style={{
                background: "rgba(241,245,249,0.9)",
                border: "1px solid rgba(147,197,253,0.3)",
              }}
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || !!usage?.limitReached || sendMessage.isPending}
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white transition-all disabled:opacity-40 btn-3d"
              style={{ background: "linear-gradient(135deg,hsl(var(--primary)),hsl(200,85%,33%))", boxShadow: "0 4px 16px rgba(14,95,168,0.4)" }}>
              <Send size={16} />
            </button>
          </div>
          {isListening && (
            <p className="text-center text-xs font-semibold mt-2 fade-up" style={{ color: "hsl(var(--primary))" }}>
              🎙️ Listening… speak and it will auto-send
            </p>
          )}
        </div>
      </div>
    </>
  );
}
