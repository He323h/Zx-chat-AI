import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, RefreshCw } from "lucide-react";
import { useSendMessage } from "@/lib/api";
import { logActivity, addTopic, incrementMsgs } from "@/lib/dailyStats";

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
          setMessages(prev => [
            ...prev,
            { id: `a-${Date.now()}`, role: "assistant", content: data.message },
          ]);
        },
        onError: () => {
          setIsTyping(false);
          setMessages(prev => [
            ...prev,
            { id: `e-${Date.now()}`, role: "assistant", content: "Sorry, kuch error hua. Dobara try karo!" },
          ]);
        },
      }
    );
  }

  function handleReset() {
    setMessages([{ id: "greeting", role: "assistant", content: GREETING }]);
    setInputText("");
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button
          onClick={() => setLocation("/home")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg,#ec4899,#db2777)" }}>
          🎭
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-tight">Actor Mode</p>
          <p className="text-slate-400 text-[11px]">10 sentences + Hindi translation</p>
        </div>
        <button
          onClick={handleReset}
          title="Nayi shuruat"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
          <RefreshCw size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Tip banner */}
      <div className="mx-3 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0"
        style={{ background: "linear-gradient(135deg,#fdf2f8,#fce7f3)" }}>
        <span className="text-base">💡</span>
        <p className="text-xs text-pink-700 font-medium">
          Sentences ko zor se padho — yahi practice hai!
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 mb-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 shadow-sm"
                style={{ background: "linear-gradient(135deg,#ec4899,#db2777)" }}>
                🎭
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-line
                ${msg.role === "user"
                  ? "bubble-sent bubble-in-right text-white"
                  : "bubble-recv bubble-in-left text-slate-800"
                }`}
              style={msg.role === "assistant" && msg.id !== "greeting"
                ? { fontFamily: "monospace", fontSize: "12.5px", lineHeight: "1.7" }
                : {}
              }>
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg,#ec4899,#db2777)" }}>
              🎭
            </div>
            <div className="bubble-recv px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1 h-4">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick situation chips */}
      {messages.length === 1 && (
        <div className="px-3 pb-2 flex gap-2 flex-wrap">
          {["Friends ke beech", "Office mein", "Shopping", "Restaurant", "Phone call"].map((s) => (
            <button
              key={s}
              onClick={() => setInputText(s)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-100 px-3 py-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSend(); }
            }}
            placeholder="Situation likhein jaise: friends ke beech..."
            className="flex-1 h-10 bg-[#f0f4f8] rounded-full px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#ec4899,#db2777)" }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
