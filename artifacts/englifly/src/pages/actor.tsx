import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, RefreshCw } from "lucide-react";
import { useSendMessage } from "@/lib/api";
import { logActivity, addTopic, incrementMsgs } from "@/lib/dailyStats";
import { StreamingText, TypingBubble, ChatBackground, GlowAvatar } from "@/components/chat-ui";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const GREETING =
  "Actor Mode! 🎭\n\nKis situation ke liye English sentences chahiye?\n\nJaise:\n• Friends ke beech bolne ke liye\n• Office mein bolne ke liye\n• Shopping karte waqt\n• Restaurant mein order karna\n• Phone pe baat karna\n• Doctor se milna\n\nApni situation likhein — main 10 sentences dunga! 👇";

export default function ActorPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    { id: "greeting", role: "assistant", content: GREETING },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend() {
    const text = inputText.trim();
    if (!text || isTyping) return;
    setInputText("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    incrementMsgs();
    addTopic(`Actor: ${text.slice(0, 20)}`);
    logActivity("actor", text.slice(0, 30));

    const history = messages
      .filter(m => m.id !== "greeting")
      .map(m => ({ role: m.role, content: m.content }));

    sendMessage.mutate(
      { data: { uid: user?.uid ?? "", message: text, category: "actor", history } },
      {
        onSuccess: (data) => {
          setIsTyping(false);
          const aiId = `a-${Date.now()}`;
          setMessages(prev => [...prev, { id: aiId, role: "assistant", content: data.message }]);
          setStreamingId(aiId);
        },
        onError: () => {
          setIsTyping(false);
          const errId = `e-${Date.now()}`;
          setMessages(prev => [...prev, { id: errId, role: "assistant", content: "Sorry, kuch error hua. Dobara try karo!" }]);
        },
      }
    );
  }

  function handleReset() {
    setMessages([{ id: "greeting", role: "assistant", content: GREETING }]);
    setInputText("");
  }

  const userInitial = (user?.email?.[0] ?? user?.displayName?.[0] ?? "U").toUpperCase();

  return (
    <>
      <ChatBackground variant="pink" />
      <div className="min-h-screen flex flex-col max-w-lg mx-auto relative z-10" style={{ background: "transparent" }}>
        {/* Header */}
        <div className="border-b border-white/60 px-4 py-3 flex items-center gap-3 shrink-0 sticky top-0 z-20"
          style={{
            background: "rgba(255,255,255,0.87)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 1px 20px rgba(236,72,153,0.08)",
          }}>
          <button onClick={() => setLocation("/home")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all btn-3d"
            style={{ background: "rgba(253,242,248,0.9)" }}>
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <GlowAvatar
            content="🎭"
            bg="linear-gradient(135deg,#ec4899,#db2777)"
            size={36}
            state={isTyping ? "thinking" : "idle"}
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm leading-tight">Actor Mode</p>
            <p className="text-slate-400 text-[11px]">10 sentences + Hindi translation</p>
          </div>
          <button onClick={handleReset} title="Nayi shuruat"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all btn-3d"
            style={{ background: "rgba(253,242,248,0.9)" }}>
            <RefreshCw size={16} className="text-pink-400" />
          </button>
        </div>

        {/* Tip banner */}
        <div className="mx-3 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0"
          style={{ background: "rgba(252,231,243,0.7)", border: "1px solid rgba(244,114,182,0.2)", backdropFilter: "blur(8px)" }}>
          <span className="text-base">💡</span>
          <p className="text-xs text-pink-700 font-medium">
            Sentences ko zor se padho — yahi practice hai!
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2.5 mb-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "assistant" && (
                <GlowAvatar
                  content="🎭"
                  bg="linear-gradient(135deg,#ec4899,#db2777)"
                  size={28}
                  state="idle"
                />
              )}
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)" }}>
                  {userInitial}
                </div>
              )}
              <div
                className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed
                  ${msg.role === "user" ? "bubble-user bubble-in-right" : "bubble-ai bubble-in-left"}`}
                style={msg.role === "assistant" && msg.id !== "greeting"
                  ? { fontFamily: "monospace", fontSize: "12.5px", lineHeight: "1.7" }
                  : {}
                }>
                {msg.role === "assistant" && msg.id === streamingId
                  ? <StreamingText text={msg.content} speed={18} onDone={() => setStreamingId(null)} />
                  : <span className="whitespace-pre-line">{msg.content}</span>}
              </div>
            </div>
          ))}

          {isTyping && (
            <TypingBubble
              avatarContent="🎭"
              avatarBg="linear-gradient(135deg,#ec4899,#db2777)"
              dotColor="#f472b6"
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick situation chips */}
        {messages.length === 1 && (
          <div className="px-3 pb-2 flex gap-2 flex-wrap">
            {["Friends ke beech", "Office mein", "Shopping", "Restaurant", "Phone call"].map((s) => (
              <button key={s} onClick={() => setInputText(s)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-all btn-3d"
                style={{ background: "rgba(252,231,243,0.8)", border: "1px solid rgba(244,114,182,0.25)", color: "#be185d" }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 shrink-0 sticky bottom-0"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(244,114,182,0.2)",
            boxShadow: "0 -4px 20px rgba(236,72,153,0.06)",
          }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
              placeholder="Situation likhein jaise: friends ke beech..."
              className="flex-1 h-11 rounded-full px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              style={{ background: "rgba(253,242,248,0.9)", border: "1px solid rgba(244,114,182,0.25)" }}
            />
            <button onClick={handleSend} disabled={!inputText.trim() || isTyping}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all btn-3d"
              style={{ background: "linear-gradient(135deg,#ec4899,#db2777)", boxShadow: "0 4px 16px rgba(236,72,153,0.4)" }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
