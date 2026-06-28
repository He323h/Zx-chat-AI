import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { firestore, isFirebaseConfigured } from "@/lib/firebase";
import {
  joinQueue, watchMyQueueEntry, leaveQueue,
  watchSession, endSession,
  watchMessages, sendMessage, sendSystemMessage, deleteSessionMessages, submitReport,
  type StrangerMessage, type StrangerSession,
} from "@/lib/firestoreStranger";
import { containsProfanity } from "@/lib/profanity";
import { ArrowLeft, Send, Flag, Timer, UserX, RefreshCw, AlertTriangle } from "lucide-react";
import { Timestamp } from "firebase/firestore";

type Phase = "idle" | "searching" | "matched" | "ended";

const SESSION_SECONDS = 600;

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function ReportModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const reasons = [
    "Inappropriate language",
    "Harassment or bullying",
    "Spam or advertising",
    "Inappropriate content",
    "Other",
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Flag size={18} className="text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Report User</p>
            <p className="text-xs text-muted-foreground">Choose a reason for reporting</p>
          </div>
        </div>
        <div className="space-y-2 mb-6">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                selected === r
                  ? "border-red-400 bg-red-50 text-red-700 font-medium"
                  : "border-border bg-white text-foreground hover:bg-muted/50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-600 transition-colors"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StrangerChat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const uid = user?.uid ?? "";

  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StrangerMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [countdown, setCountdown] = useState(SESSION_SECONDS);
  const [showReport, setShowReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [profanityWarning, setProfanityWarning] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubQueue = useRef<(() => void) | null>(null);
  const unsubSession = useRef<(() => void) | null>(null);
  const unsubMessages = useRef<(() => void) | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const phaseRef = useRef<Phase>("idle");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function clearSubs() {
    unsubQueue.current?.();
    unsubSession.current?.();
    unsubMessages.current?.();
    if (countdownRef.current) clearInterval(countdownRef.current);
  }

  useEffect(() => {
    return () => {
      clearSubs();
      if (firestore && uid) leaveQueue(firestore, uid).catch(() => {});
    };
  }, [uid]);

  const handleSessionMatched = useCallback((sid: string, session: StrangerSession) => {
    if (phaseRef.current === "ended") return;
    sessionIdRef.current = sid;
    setSessionId(sid);
    const partner = session.user1 === uid ? session.user2 : session.user1;
    setPartnerId(partner);
    setPhase("matched");

    // Compute initial countdown from expiresAt
    const expiresAt = session.expiresAt instanceof Timestamp
      ? session.expiresAt.toDate()
      : new Date((session.expiresAt as any).seconds * 1000);
    const initialSecs = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
    setCountdown(initialSecs);

    // Start countdown timer
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(countdownRef.current!);
        if (firestore && sid) {
          endSession(firestore, sid).catch(() => {});
        }
      }
    }, 1000);

    // Watch session status
    if (firestore) {
      unsubSession.current = watchSession(firestore, sid, (updatedSession) => {
        if (updatedSession.status === "ended" && phaseRef.current === "matched") {
          handleSessionEnded(sid);
        }
      });

      // Watch messages
      unsubMessages.current = watchMessages(firestore, sid, (msgs) => {
        setMessages(msgs);
      });
    }
  }, [uid]);

  async function startSearching() {
    if (!firestore) return;
    setPhase("searching");

    // Clean up any old queue entry
    await leaveQueue(firestore, uid).catch(() => {});

    // Try to match immediately
    const matchedSessionId = await joinQueue(firestore, uid);

    if (matchedSessionId) {
      // We got matched immediately
      const session = await import("../lib/firestoreStranger").then(m => m.getSession(firestore!, matchedSessionId));
      if (session) {
        unsubQueue.current?.();
        handleSessionMatched(matchedSessionId, session);
      }
    } else {
      // Wait for match via listener
      unsubQueue.current = watchMyQueueEntry(firestore, uid, async (sid) => {
        unsubQueue.current?.();
        const session = await import("../lib/firestoreStranger").then(m => m.getSession(firestore!, sid));
        if (session) handleSessionMatched(sid, session);
      });
    }
  }

  function handleSessionEnded(sid: string) {
    clearSubs();
    setPhase("ended");
    if (firestore && sid) {
      deleteSessionMessages(firestore, sid).catch(() => {});
    }
  }

  async function handleEndChat() {
    const sid = sessionIdRef.current ?? sessionId;
    clearSubs();
    if (firestore && uid) await leaveQueue(firestore, uid).catch(() => {});
    if (firestore && sid) {
      await sendSystemMessage(firestore, sid, "Your partner has left the chat.").catch(() => {});
      await endSession(firestore, sid).catch(() => {});
      await deleteSessionMessages(firestore, sid).catch(() => {});
    }
    setPhase("ended");
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !sessionId || !firestore || isSending) return;

    if (containsProfanity(text)) {
      setProfanityWarning(true);
      setTimeout(() => setProfanityWarning(false), 3000);
      return;
    }

    setIsSending(true);
    setInputText("");
    await sendMessage(firestore, sessionId, uid, text).catch(() => {});
    setIsSending(false);
  }

  async function handleReport(reason: string) {
    if (!firestore || !sessionId || !partnerId) return;
    setShowReport(false);
    await submitReport(firestore, uid, partnerId, sessionId, reason, messages).catch(() => {});
    setReportSubmitted(true);
  }

  async function handleFindNew() {
    setPhase("idle");
    setSessionId(null);
    setPartnerId(null);
    setMessages([]);
    setCountdown(SESSION_SECONDS);
    setReportSubmitted(false);
    sessionIdRef.current = null;
  }

  // Not configured state
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "#f0f4f8" }}>
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle size={28} className="text-amber-500" />
        </div>
        <h2 className="font-bold text-xl text-foreground mb-2">Firebase Not Configured</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-6">
          Chat with a Stranger needs Firebase to match partners in real-time. Set up your Firebase project environment variables to enable this feature.
        </p>
        <button
          onClick={() => setLocation("/home")}
          className="px-6 py-3 rounded-xl text-white text-sm font-medium"
          style={{ background: "hsl(var(--primary))" }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <>
      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          onSubmit={handleReport}
        />
      )}

      <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "#f0f4f8" }}>
        {/* Header */}
        <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
          <button
            onClick={() => { handleEndChat(); setLocation("/home"); }}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#e8f8f1] flex items-center justify-center shrink-0">
            <span className="text-base">🌍</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm leading-tight">Chat with a Stranger</p>
            <p className="text-xs text-muted-foreground">
              {phase === "matched" ? "Anonymous partner • 10 min session" :
               phase === "searching" ? "Looking for a partner…" :
               phase === "ended" ? "Session ended" :
               "Anonymous English practice"}
            </p>
          </div>
          {phase === "matched" && (
            <div className="flex items-center gap-2">
              {/* Timer */}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                countdown <= 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
              }`}>
                <Timer size={12} />
                {formatCountdown(countdown)}
              </div>
              {/* Report */}
              <button
                onClick={() => setShowReport(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Flag size={16} className="text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* IDLE */}
          {phase === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-[#e8f8f1] flex items-center justify-center text-4xl shadow-sm">
                🌍
              </div>
              <div>
                <h2 className="font-bold text-xl text-foreground mb-2">Chat with a Stranger</h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Get matched with a random English learner for a <strong>10-minute</strong> anonymous conversation. Practice real conversations!
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-border p-4 w-full text-left space-y-2 text-sm text-muted-foreground">
                <p>✅ Completely anonymous — no names shared</p>
                <p>⏱️ Session automatically ends in 10 minutes</p>
                <p>🚩 Report inappropriate behavior anytime</p>
                <p>🔒 Chat history deleted when session ends</p>
              </div>
              <button
                onClick={startSearching}
                className="w-full py-4 rounded-2xl text-white font-semibold text-base shadow-md active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #1a9e6c, #15805a)" }}
              >
                Find a Partner
              </button>
            </div>
          )}

          {/* SEARCHING */}
          {phase === "searching" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#e8f8f1] flex items-center justify-center text-4xl">
                  🌍
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-green-400 border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground mb-1">Looking for a partner…</p>
                <p className="text-muted-foreground text-sm">This usually takes a few seconds</p>
              </div>
              <button
                onClick={async () => {
                  clearSubs();
                  if (firestore) await leaveQueue(firestore, uid).catch(() => {});
                  setPhase("idle");
                }}
                className="px-6 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* MATCHED — chat */}
          {phase === "matched" && (
            <>
              {/* Profanity warning */}
              {profanityWarning && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-center shrink-0">
                  <p className="text-red-700 text-sm font-medium">⚠️ Message blocked — please keep the conversation respectful.</p>
                </div>
              )}

              {/* Report submitted banner */}
              {reportSubmitted && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center shrink-0">
                  <p className="text-amber-700 text-xs font-medium">✅ Report submitted. Thank you for keeping ZX-Chat AI safe.</p>
                </div>
              )}

              {/* Timer warning */}
              {countdown <= 30 && countdown > 0 && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center shrink-0 animate-pulse">
                  <p className="text-red-700 text-sm font-medium">⏰ Session ending in {countdown}s!</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">You're connected! Say hi to start practicing 👋</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.uid === uid;
                  const isSystem = msg.isSystem || msg.uid === "system";
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center py-2">
                        <span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full border border-border">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 mb-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-[#e8f8f1] flex items-center justify-center text-sm shrink-0">
                          🌍
                        </div>
                      )}
                      <div
                        className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                          isMe ? "bubble-sent bubble-in-right" : "bubble-recv bubble-in-left"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-border px-3 py-3 shrink-0 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message…"
                    className="flex-1 h-10 bg-[#f0f4f8] rounded-full px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 border-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isSending}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white transition-all disabled:opacity-40"
                    style={{ background: "#1a9e6c" }}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <button
                  onClick={handleEndChat}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors"
                >
                  <UserX size={14} />
                  End Chat Early
                </button>
              </div>
            </>
          )}

          {/* ENDED */}
          {phase === "ended" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-[#f0f4f8] flex items-center justify-center text-4xl">
                ⏰
              </div>
              <div>
                <h2 className="font-bold text-xl text-foreground mb-2">
                  {countdown === 0 ? "Time's Up!" : "Session Ended"}
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {countdown === 0
                    ? "Great practice! Your 10-minute session is complete. Chat history has been deleted."
                    : "The chat session has ended. Chat history has been deleted."}
                </p>
              </div>
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleFindNew}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base shadow-md active:scale-[0.98] transition-all"
                  style={{ background: "linear-gradient(135deg, #1a9e6c, #15805a)" }}
                >
                  <RefreshCw size={18} />
                  Find New Partner
                </button>
                <button
                  onClick={() => setLocation("/home")}
                  className="w-full py-3 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:bg-white transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
