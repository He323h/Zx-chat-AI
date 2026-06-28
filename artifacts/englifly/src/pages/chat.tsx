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
  incrementSessions, incrementMsgs, incrementCorrections,
  midnightCountdown,
} from "@/lib/dailyStats";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3 bubble-in-left">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
        style={{ background: "hsl(var(--primary))" }}>E</div>
      <div className="bubble-recv px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1 h-4">
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#aaa]" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#aaa]" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#aaa]" />
        </div>
      </div>
    </div>
  );
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
    "Ready…";

  const phaseColor =
    phase === "listening" ? "#22c55e" :
    phase === "speaking"  ? "#3b82f6" :
    phase === "thinking"  ? "#f59e0b" :
    "#94a3b8";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(180deg,#0a0f1e 0%,#0d1b2e 100%)" }}>

      {/* Top: name */}
      <div className="w-full px-6 pt-14 text-center">
        <p className="text-white/50 text-xs font-medium tracking-widest uppercase mb-1">ZX-Chat AI</p>
        <p className="text-white text-xl font-bold">{meta.label}</p>
      </div>

      {/* Center: avatar + timer + phase */}
      <div className="flex flex-col items-center gap-6">
        {/* Pulse rings */}
        <div className="relative flex items-center justify-center">
          {(phase === "speaking" || phase === "listening") && (
            <>
              <div className="absolute w-48 h-48 rounded-full animate-ping opacity-10"
                style={{ background: phaseColor }} />
              <div className="absolute w-36 h-36 rounded-full animate-pulse opacity-20"
                style={{ background: phaseColor }} />
            </>
          )}
          <div className="w-28 h-28 rounded-full flex items-center justify-center text-5xl relative z-10 shadow-2xl"
            style={{ background: "linear-gradient(135deg,#1565c0,#1a8fd1)" }}>
            {meta.emoji}
          </div>
        </div>

        {/* Call timer — the main thing user sees */}
        <p className="text-white text-5xl font-mono font-light tracking-widest tabular-nums">
          {timer}
        </p>

        {/* Phase pill */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: `${phaseColor}22`, border: `1px solid ${phaseColor}44` }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: phaseColor }} />
          <span className="text-sm font-medium" style={{ color: phaseColor }}>{phaseLabel}</span>
        </div>

        <p className="text-white/30 text-xs text-center px-10 leading-relaxed">
          Bolne ke baad ruko — AI automatically sun raha hai
        </p>
      </div>

      {/* End call button */}
      <div className="pb-16 flex flex-col items-center gap-3">
        <button
          onClick={onEndCall}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
          style={{ background: "#ef4444" }}>
          <PhoneOff size={28} className="text-white" />
        </button>
        <span className="text-white/40 text-sm">Call khatam karo</span>
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
    }
  }, []);

  const starterRef = useRef(pickStarter(meta.starters));

  // handleSend is stable — reads mutable refs for callMode & isMuted
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

            if (hasCorrectionSignal(data.message)) incrementCorrections();

            // Speak AI reply (call mode always speaks; normal mode respects mute)
            if (!isMutedRef.current || callModeRef.current) {
              speak(data.message);
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

  // Auto-restart listening after AI finishes speaking (call mode loop)
  useEffect(() => {
    if (!isSpeaking && callMode && !isListening && !isTyping && callModeRef.current) {
      const t = setTimeout(() => {
        if (callModeRef.current && !isListening) {
          startListening();
        }
      }, 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isSpeaking, callMode, isListening, isTyping, startListening]);

  // Greeting on mount
  useEffect(() => {
    if (!started) {
      setStarted(true);
      setMessages([{ id: "greeting", role: "assistant", content: starterRef.current }]);

      setTimeout(() => {
        if (startInVoiceMode && isSupported) {
          // activateCallMode ONLY sets the flag — does NOT stop audio or start listening.
          // speak() will run the greeting; when it finishes, onSpeakDone() sees
          // callMode=true and automatically starts listening. Perfect loop.
          callModeRef.current = true;
          setCallModeState(true);
          speak(starterRef.current); // play greeting → auto-listen when done
        } else {
          if (!isMuted) speak(starterRef.current);
        }
      }, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Usage tracking heartbeat
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(() => {
      trackUsage.mutate(
        { data: { uid, minutes: 1 } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTodayUsageQueryKey({ uid }) }) }
      );
    }, 60_000);
    return () => clearInterval(interval);
  }, [uid]);

  function handleMicClick() {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  }

  function enterCallMode() {
    callModeRef.current = true;
    setCallModeState(true);
    stopSpeaking();
    startListening();
  }

  function exitCallMode() {
    callModeRef.current = false;
    setCallModeState(false);
    stopListening();
    stopSpeaking();
    if (startInVoiceMode) setLocation("/home");
  }

  function getCallPhase(): CallPhase {
    if (isListening) return "listening";
    if (isTyping)    return "thinking";
    if (isSpeaking)  return "speaking";
    return "idle";
  }

  return (
    <>
      {callMode && (
        <CallModeOverlay
          phase={getCallPhase()}
          meta={meta}
          onEndCall={exitCallMode}
        />
      )}

      <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "#f0f4f8" }}>
        {/* Header */}
        <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
          <button onClick={() => { stopSpeaking(); stopListening(); setLocation("/home"); }}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{ background: "hsl(var(--primary))" }}>
            <span className="text-base">{meta.emoji}</span>
          </div>
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
              <button
                onClick={enterCallMode}
                title="Start Voice Call"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors disabled:opacity-40">
                <Phone size={17} style={{ color: "#22c55e" }} />
              </button>
            )}
            <button onClick={() => setIsMuted(m => !m)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors">
              {isMuted ? <VolumeX size={18} className="text-muted-foreground" /> : <Volume2 size={18} style={{ color: "hsl(var(--primary))" }} />}
            </button>
            {profile?.subscription !== "pro" && (
              <button onClick={() => setLocation("/subscription")}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors">
                <Crown size={18} className="text-amber-500" />
              </button>
            )}
          </div>
        </div>


        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-end gap-2 mb-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: "hsl(var(--primary))" }}>E</div>
              )}
              <div className="max-w-[78%]">
                <div className={`px-3.5 py-2.5 text-sm leading-relaxed shadow-sm
                  ${msg.role === "user" ? "bubble-sent bubble-in-right" : "bubble-recv bubble-in-left"}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="bg-white border-t border-border px-3 py-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            {isSupported && (
              <button onClick={handleMicClick} disabled={!!usage?.limitReached}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all
                  ${isListening ? "text-white mic-pulsing" : "bg-[#f0f4f8] text-muted-foreground hover:bg-[#e0e8f0]"}
                  ${usage?.limitReached ? "opacity-40 cursor-not-allowed" : ""}`}
                style={isListening ? { background: "hsl(var(--primary))" } : {}}>
                {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            )}
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputText); } }}
              placeholder={isListening ? "Listening…" : usage?.limitReached ? "Daily limit reached" : "Type a message…"}
              disabled={!!usage?.limitReached || isListening}
              className="flex-1 h-10 bg-[#f0f4f8] rounded-full px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 disabled:opacity-50 border-none"
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || !!usage?.limitReached || sendMessage.isPending}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white transition-all disabled:opacity-40"
              style={{ background: "hsl(var(--primary))" }}>
              <Send size={16} />
            </button>
          </div>
          {isListening && (
            <p className="text-center text-xs font-medium mt-2 fade-up" style={{ color: "hsl(var(--primary))" }}>
              🎙️ Listening… speak and it will auto-send
            </p>
          )}
        </div>
      </div>
    </>
  );
}
