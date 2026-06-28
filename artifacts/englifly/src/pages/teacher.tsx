import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, BookOpen, RotateCcw } from "lucide-react";
import { useSendMessage } from "@/lib/api";
import { logActivity, addTopic, incrementMsgs } from "@/lib/dailyStats";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface TeacherProfile {
  subject: string;
  level: string;
  hoursPerDay: number;
  createdDate: string;
}

interface SessionRecord {
  date: string;
  topicsCovered: string;
  homework: string;
  dayNumber: number;
}

const STORAGE_PROFILE = "ef_teacher_profile";
const STORAGE_SESSIONS = "ef_teacher_sessions";

function loadProfile(): TeacherProfile | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_PROFILE) ?? "null"); } catch { return null; }
}
function saveProfile(p: TeacherProfile) {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(p));
}
function loadSessions(): SessionRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_SESSIONS) ?? "[]"); } catch { return []; }
}
function saveSessions(s: SessionRecord[]) {
  localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(s));
}
function todayStr() { return new Date().toISOString().split("T")[0]; }

function buildSystemPrompt(profile: TeacherProfile, sessions: SessionRecord[]): string {
  const dayNumber = sessions.length + 1;
  const lastSession = sessions[sessions.length - 1];
  const lastHomework = lastSession?.homework ?? "None (this is the first session)";
  const lastTopics = lastSession?.topicsCovered ?? "None (this is the first session)";

  return `You are a friendly but serious AI Teacher. You are teaching "${profile.subject}" to a ${profile.level} level student who can study ${profile.hoursPerDay} hour(s) per day.

TODAY IS DAY ${dayNumber} OF THEIR LEARNING JOURNEY.

LAST SESSION INFO:
- Topics covered: ${lastTopics}
- Homework assigned: ${lastHomework}

YOUR TEACHING STYLE:
- Be warm, encouraging, and patient like a real teacher
- Explain concepts in simple language; use Hindi examples when needed
- Ask questions to check understanding (don't just lecture)
- Correct mistakes gently and clearly
- Give specific, practical homework at end of each session
- Keep track of what was covered and build upon it
- Format your study plan and explanations clearly using bullet points

SESSION FLOW (follow this strictly):
1. GREET the student warmly and mention today is Day ${dayNumber}
2. REVIEW last homework — ask if they completed it, check their understanding
3. TEACH today's topic — explain clearly, give examples, ask comprehension questions
4. SUMMARIZE what was covered today in a clear list
5. ASSIGN new homework — specific and doable in ${profile.hoursPerDay} hour(s)
6. END with encouragement

For Day ${dayNumber}, plan appropriate topics that build on what was covered in previous sessions.
Keep responses focused and not too long. Use numbered steps and bullet points for clarity.`;
}

function buildOnboardingPrompt(): string {
  return `You are a friendly AI Teacher starting a first-day onboarding with a new student. 

Your job is to warmly greet them and ask exactly these 3 questions ONE AT A TIME:
1. What subject or topic do you want to learn? (e.g. English speaking, Math, Programming, etc.)
2. What is your current level? (Beginner / Intermediate / Advanced)
3. How many hours can you study per day? (e.g. 30 minutes, 1 hour, 2 hours)

After they answer all 3 questions, create a brief personalized introduction:
- Confirm their choices
- Tell them roughly what Day 1 will cover
- Say you're ready to begin their first session

Be warm, enthusiastic, and encouraging. Use simple language. Add a Hindi sentence occasionally to make them feel comfortable.

IMPORTANT: After the student answers all 3 questions, end your message with this exact tag on a new line:
[ONBOARDING_COMPLETE:subject=<their subject>|level=<their level>|hours=<number>]`;
}

export default function TeacherPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [profile, setProfile] = useState<TeacherProfile | null>(loadProfile);
  const [sessions, setSessions] = useState<SessionRecord[]>(loadSessions);
  const [isOnboarding, setIsOnboarding] = useState(!loadProfile());

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendMessage();

  const pendingHomeworkRef = useRef<string>("");
  const pendingTopicsRef = useRef<string>("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-send opening message on first load
  useEffect(() => {
    if (messages.length > 0) return;
    const currentProfile = loadProfile();
    const currentSessions = loadSessions();

    if (!currentProfile) {
      sendToAI("Hello! I want to start learning with you today.", true);
    } else {
      sendToAI("Start my session for today.", false, currentProfile, currentSessions);
    }
  }, []);

  function sendToAI(
    userText: string,
    onboarding: boolean,
    overrideProfile?: TeacherProfile | null,
    overrideSessions?: SessionRecord[]
  ) {
    const activeProfile = overrideProfile !== undefined ? overrideProfile : profile;
    const activeSessions = overrideSessions ?? sessions;

    const systemPrompt = onboarding
      ? buildOnboardingPrompt()
      : buildSystemPrompt(activeProfile!, activeSessions);

    const history = messages
      .filter(m => m.id !== "init")
      .map(m => ({ role: m.role, content: m.content }));

    setIsTyping(true);

    sendMessage.mutate(
      {
        data: {
          uid: user?.uid ?? "",
          message: userText,
          category: "teacher",
          history,
          systemPrompt,
        } as any,
      },
      {
        onSuccess: (data) => {
          setIsTyping(false);
          const reply = data.message ?? "";

          // Check if onboarding is complete
          const match = reply.match(/\[ONBOARDING_COMPLETE:subject=(.+?)\|level=(.+?)\|hours=(.+?)\]/);
          if (match) {
            const newProfile: TeacherProfile = {
              subject: match[1].trim(),
              level: match[2].trim(),
              hoursPerDay: parseFloat(match[3]) || 1,
              createdDate: todayStr(),
            };
            saveProfile(newProfile);
            setProfile(newProfile);
            setIsOnboarding(false);

            const cleanReply = reply.replace(/\[ONBOARDING_COMPLETE:[^\]]+\]/, "").trim();
            setMessages(prev => [
              ...prev,
              { id: `a-${Date.now()}`, role: "assistant", content: cleanReply },
            ]);
          } else {
            // Extract homework and topics from AI reply for session logging
            if (!onboarding) {
              const hwMatch = reply.match(/homework[:\s]+([^\n]+)/i);
              if (hwMatch) pendingHomeworkRef.current = hwMatch[1].trim();
              const topMatch = reply.match(/today['']?s? topic[:\s]+([^\n]+)/i);
              if (topMatch) pendingTopicsRef.current = topMatch[1].trim();
            }

            setMessages(prev => [
              ...prev,
              { id: `a-${Date.now()}`, role: "assistant", content: reply },
            ]);
          }
        },
        onError: () => {
          setIsTyping(false);
          setMessages(prev => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: "Network error. Please check your connection and try again.",
            },
          ]);
        },
      }
    );
  }

  function handleSend() {
    const text = inputText.trim();
    if (!text || isTyping) return;
    setInputText("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);

    incrementMsgs();
    addTopic(`Teacher: ${profile?.subject ?? "Study"}`);
    logActivity("chat", `AI Teacher — ${profile?.subject ?? "study session"}`);

    sendToAI(text, isOnboarding);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function endSession() {
    if (!profile || messages.length < 4) return;
    const today = todayStr();
    const newSession: SessionRecord = {
      date: today,
      dayNumber: sessions.length + 1,
      topicsCovered: pendingTopicsRef.current || profile.subject,
      homework: pendingHomeworkRef.current || "Review today's lesson",
    };
    const updated = [...sessions, newSession];
    saveSessions(updated);
    setSessions(updated);
    setMessages([]);
    pendingHomeworkRef.current = "";
    pendingTopicsRef.current = "";
    sendToAI("Start my next session.", false, profile, updated);
  }

  function resetTeacher() {
    localStorage.removeItem(STORAGE_PROFILE);
    localStorage.removeItem(STORAGE_SESSIONS);
    setProfile(null);
    setSessions([]);
    setIsOnboarding(true);
    setMessages([]);
    sendToAI("Hello! I want to start learning with you today.", true, null, []);
  }

  const dayNumber = sessions.length + 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f2f5f9" }}>

      {/* Header */}
      <div className="px-4 pt-10 pb-3 flex items-center gap-3 sticky top-0 z-20"
        style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
        <button onClick={() => setLocation("/home")}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <ArrowLeft size={16} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">
            🎓 AI Teacher{profile ? ` — ${profile.subject}` : ""}
          </p>
          <p className="text-white/60 text-[11px]">
            {isOnboarding
              ? "First time setup"
              : `Day ${dayNumber} · ${profile?.level ?? ""} · ${profile?.hoursPerDay}h/day`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!isOnboarding && messages.length >= 4 && (
            <button
              onClick={endSession}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full text-teal-900"
              style={{ background: "rgba(255,255,255,0.9)" }}>
              End Session ✓
            </button>
          )}
          <button onClick={resetTeacher}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
            title="Reset teacher">
            <RotateCcw size={14} className="text-white/70" />
          </button>
        </div>
      </div>

      {/* Progress bar (days) */}
      {!isOnboarding && sessions.length > 0 && (
        <div className="px-4 py-2" style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
          <div className="flex gap-1 pb-1">
            {Array.from({ length: Math.min(sessions.length + 1, 14) }, (_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full"
                style={{
                  background: i < sessions.length
                    ? "rgba(255,255,255,0.9)"
                    : i === sessions.length
                    ? "rgba(255,255,255,0.4)"
                    : "rgba(255,255,255,0.15)",
                }} />
            ))}
          </div>
          <p className="text-white/50 text-[10px] text-right">{sessions.length} sessions completed</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
                <BookOpen size={13} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "text-white rounded-br-sm"
                  : "text-slate-800 rounded-bl-sm shadow-sm"
              }`}
              style={{
                background: msg.role === "user"
                  ? "linear-gradient(135deg,#0d9488,#0891b2)"
                  : "white",
              }}>
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
              style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
              <BookOpen size={13} className="text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2 bg-white border-t border-slate-100 sticky bottom-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={isOnboarding ? "Jawab yahan likho..." : "Teacher se baat karo..."}
            className="flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 leading-snug"
            style={{ maxHeight: 120, focusRingColor: "#0d9488" }}
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-opacity"
            style={{
              background: "linear-gradient(135deg,#0d9488,#0891b2)",
              opacity: !inputText.trim() || isTyping ? 0.4 : 1,
            }}>
            <Send size={17} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
