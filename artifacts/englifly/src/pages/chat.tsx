import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeech, unlockAudio } from "@/hooks/useSpeech";
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

function CallModeOverlay({ phase, meta, onEndCall }: CallModeOverlayProps) {
  const phaseLabel =
    phase === "listening" ? "Listening…" :
    phase === "thinking"  ? "Thinking…" :
    phase === "speaking"  ? "Speaking…" :
    "Get ready…";

  const phaseColor =
    phase === "listening" ? "#22c55e" :
    phase === "speaking"  ? "hsl(var(--primary))" :
    phase === "thinking"  ? "#f59e0b" :
    "#94a3b8";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(180deg, #0d1b2e 0%, #1a2f4e 100%)" }}>

      <div className="w-full px-6 pt-14 pb-4 text-center">
        <p className="text-white/60 text-sm font-medium tracking-wide uppercase">ZX-Chat AI Tutor</p>
        <p className="text-white text-xl font-semibold mt-1">{meta.label}</p>
        <p className="text-white/40 text-sm mt-0.5">Voice Practice Session</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="relative flex items-center justify-center">
          {(phase === "speaking" || phase === "listening") && (
            <>
              <div className="absolute w-52 h-52 rounded-full call-ring-1"
                style={{ background: `${phaseColor}18` }} />
              <div className="absolute w-40 h-40 rounded-full call-ring-2"
                style={{ background: `${phaseColor}28` }} />
            </>
          )}
          <div className="w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-2xl relative z-10 call-avatar"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary)), #0a85cc)`,
              boxShadow: phase === "speaking" || phase === "listening"
                ? `0 0 40px ${phaseColor}60, 0 0 0 2px ${phaseColor}80`
                : "0 0 40px rgba(30,120,200,0.3)",
            }}>
            {meta.emoji}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full call-phase-dot" style={{ background: phaseColor }} />
            <span className="text-white text-lg font-medium">{phaseLabel}</span>
          </div>

          {phase === "speaking" && (
            <div className="flex items-end gap-1 h-8">
              {[3, 5, 7, 5, 8, 4, 6, 3].map((h, i) => (
                <div key={i} className="w-1.5 rounded-full call-bar"
                  style={{ height: `${h * 4}px`, background: "hsl(var(--primary))", animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {phase === "listening" && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 2, 1].map((_, i) => (
                <div key={i} className="w-1 rounded-full call-listen-bar"
                  style={{ background: "#22c55e", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {phase === "thinking" && (
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-amber-400 typing-dot"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>

        <p className="text-white/40 text-xs text-center px-8">
          Speak naturally — ZX-Chat AI will listen and respond automatically
        </p>
      </div>

      <div className="pb-16 flex flex-col items-center gap-3">
        <button
          onClick={onEndCall}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95"
          style={{ background: "#ef4444" }}>
          <PhoneOff size={30} className="text-white" />
        </button>
        <span className="text-white/50 text-sm">End Call</span>
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
  const callModeRef = useRef(false);
  const isTypingRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionStarted = useRef(false);

  const sendMessage = useSendMessage();
  const trackUsage = useTrackUsage();

  const { data: profile } = useGetUserProfile(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetUserProfileQueryKey({ uid }) } }
  );
  const { data: usage, refetch: refetchUsage } = useGetTodayUsage(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetTodayUsageQueryKey({ uid }) } }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Track session start (once per mount)
  useEffect(() => {
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      incrementSessions();
    }
  }, []);

  const starterRef = useRef(pickStarter(meta.starters));

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !uid || usage?.limitReached) return;

      unlockAudio(); // unlock AudioContext on user gesture so auto-play works
      setInputText("");
      recordPracticeNow();
      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);
      isTypingRef.current = true;

      // Track message count
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
            isTypingRef.current = false;
            const aiMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: data.message };
            setMessages(prev => [...prev, aiMsg]);

            // Track corrections
            if (hasCorrectionSignal(data.message)) {
              incrementCorrections();
            }

            // Auto-speak AI reply after 1 second — no click needed
            if (!isMuted || callModeRef.current) {
              setTimeout(() => speak(data.message), 1000);
            }
            queryClient.invalidateQueries({ queryKey: getGetTodayUsageQueryKey({ uid }) });
          },
          onError: () => {
            setIsTyping(false);
            isTypingRef.current = false;
            setMessages(prev => [...prev, {
              id: `e-${Date.now()}`, role: "assistant",
              content: "Sorry, I had trouble responding. Please try again!",
            }]);
          },
        }
      );
    },
    [uid, messages, isMuted, category, usage?.limitReached]
  );

  const { isListening, transcript, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported } =
    useSpeech(handleSend);

  // Sync transcript → input while listening
  useEffect(() => {
    if (isListening) setInputText(transcript);
  }, [transcript, isListening]);

  // Auto-loop for call mode
  useEffect(() => {
    if (!callMode) return;
    if (isListening || isSpeaking || isTyping) return;

    const timer = setTimeout(() => {
      if (callModeRef.current && !isListening && !isSpeaking && !isTypingRef.current) {
        startListening();
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [callMode, isListening, isSpeaking, isTyping]);

  // Greeting on mount
  useEffect(() => {
    if (!started) {
      setStarted(true);
      const greeting: Message = {
        id: "greeting",
        role: "assistant",
        content: starterRef.current,
      };
      setMessages([greeting]);
      setTimeout(() => {
        if (!isMuted) speak(starterRef.current);
        // Auto-enter call mode if launched from Voice Practice button
        if (startInVoiceMode && isSupported) {
          enterCallMode();
        }
      }, 600);
    }
  }, []);

  // Usage tracking — 1 min heartbeat
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(() => {
      trackUsage.mutate(
        { data: { uid, minutes: 1 } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTodayUsageQueryKey({ uid }) }) }
      );
    }, 60000);
    return () => clearInterval(interval);
  }, [uid]);

  function handleMicClick() {
    unlockAudio(); // unlock AudioContext on user gesture
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking(); // stop AI voice before user speaks
      startListening();
    }
  }

  function enterCallMode() {
    stopSpeaking();
    stopListening();
    callModeRef.current = true;
    setCallModeState(true);
  }

  function exitCallMode() {
    stopSpeaking();
    stopListening();
    callModeRef.current = false;
    setCallModeState(false);
    // Voice Practice launches with mode=voice — go home when call ends
    if (startInVoiceMode) {
      setLocation("/home");
    }
  }

  function getCallPhase(): CallPhase {
    if (isListening) return "listening";
    if (isTyping) return "thinking";
    if (isSpeaking) return "speaking";
    return "idle";
  }

  const limitReached = usage?.limitReached ?? false;
  const remainingMin = usage?.remainingMinutes === 9999 ? null : usage?.remainingMinutes;

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
              {remainingMin !== null && (
                <span className={`text-[11px] font-medium ${(remainingMin ?? 0) < 10 ? "text-destructive" : "text-muted-foreground"}`}>
                  {remainingMin} min left
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {isSupported && (
              <button
                onClick={enterCallMode}
                disabled={limitReached}
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

        {/* Limit banner */}
        {limitReached && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center shrink-0">
            <p className="text-amber-800 text-sm font-semibold">
              ⏳ You've used today's practice time!
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Come back in <span className="font-bold">{midnightCountdown()}</span> when it resets at midnight.
            </p>
          </div>
        )}

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
              <button onClick={handleMicClick} disabled={limitReached}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all
                  ${isListening ? "text-white mic-pulsing" : "bg-[#f0f4f8] text-muted-foreground hover:bg-[#e0e8f0]"}
                  ${limitReached ? "opacity-40 cursor-not-allowed" : ""}`}
                style={isListening ? { background: "hsl(var(--primary))" } : {}}>
                {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            )}
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputText); } }}
              placeholder={isListening ? "Listening…" : limitReached ? "Daily limit reached" : "Type a message…"}
              disabled={limitReached || isListening}
              className="flex-1 h-10 bg-[#f0f4f8] rounded-full px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 disabled:opacity-50 border-none"
            />
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || limitReached || sendMessage.isPending}
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
