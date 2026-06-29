import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const GRAMMAR_SYSTEM_PROMPT = `You are an English grammar teacher. The user will send a sentence that may contain mistakes. Respond ONLY in this JSON format with no extra text: { "hasMistakes": boolean, "mistakes": [{"wrong": "word or phrase", "right": "corrected word or phrase"}], "correctedSentence": "full corrected sentence", "hindiTranslation": "Hindi translation of corrected sentence" }. If there are no mistakes, set hasMistakes to false and leave mistakes as an empty array.`;

interface GrammarResult {
  hasMistakes: boolean;
  mistakes: { wrong: string; right: string }[];
  correctedSentence: string;
  hindiTranslation: string;
}

interface ChatEntry {
  id: string;
  userText: string;
  result: GrammarResult | null;
  loading: boolean;
  error: string | null;
}

function highlightMistakes(text: string, phrases: string[], color: string): React.ReactNode {
  if (!phrases.length) return <span>{text}</span>;

  // Build an array of {start, end, phrase} for all match positions
  type Match = { start: number; end: number; phrase: string };
  const matches: Match[] = [];

  phrases.forEach(phrase => {
    if (!phrase) return;
    let idx = text.indexOf(phrase);
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + phrase.length, phrase });
      idx = text.indexOf(phrase, idx + 1);
    }
  });

  if (!matches.length) return <span>{text}</span>;

  // Sort by start position
  matches.sort((a, b) => a.start - b.start);

  // Merge overlapping matches and build result nodes
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const m of matches) {
    if (m.start < cursor) continue; // overlapping, skip
    if (m.start > cursor) {
      nodes.push(<span key={key++}>{text.slice(cursor, m.start)}</span>);
    }
    nodes.push(
      <span
        key={key++}
        style={{ color, textDecoration: "underline", fontWeight: 700, textDecorationStyle: "wavy", textDecorationColor: color }}
      >
        {m.phrase}
      </span>
    );
    cursor = m.end;
  }

  if (cursor < text.length) {
    nodes.push(<span key={key++}>{text.slice(cursor)}</span>);
  }

  return <>{nodes}</>;
}

function GrammarBubble({ entry }: { entry: ChatEntry }) {
  const wrongPhrases = entry.result?.mistakes.map(m => m.wrong) ?? [];
  const rightPhrases = entry.result?.mistakes.map(m => m.right) ?? [];

  return (
    <div className="space-y-2 mb-4">
      {/* User bubble — highlight wrong phrases in red */}
      <div className="flex justify-end">
        <div
          className="max-w-[80%] px-4 py-3 rounded-[18px_18px_4px_18px] text-sm leading-relaxed shadow-sm"
          style={{ background: "hsl(var(--primary))", color: "#fff" }}
        >
          {entry.result
            ? highlightMistakes(entry.userText, wrongPhrases, "#fca5a5")
            : entry.userText}
        </div>
      </div>

      {/* AI response */}
      {entry.loading && (
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "hsl(var(--primary))" }}>G</div>
          <div className="bubble-recv px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1 h-4">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#aaa]" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#aaa]" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#aaa]" />
            </div>
          </div>
        </div>
      )}

      {entry.error && (
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "#ef4444" }}>!</div>
          <div
            className="max-w-[80%] px-4 py-3 rounded-[18px_18px_18px_4px] text-sm shadow-sm"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
          >
            {entry.error}
          </div>
        </div>
      )}

      {entry.result && !entry.loading && (
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1"
            style={{ background: "hsl(var(--primary))" }}>G</div>

          {entry.result.hasMistakes ? (
            <div
              className="max-w-[85%] rounded-[18px_18px_18px_4px] shadow-sm overflow-hidden"
              style={{ border: "1.5px solid #22c55e" }}
            >
              {/* Corrections header */}
              <div className="px-4 pt-3 pb-1" style={{ background: "#f0fdf4" }}>
                <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide mb-2">
                  ✏️ Grammar Correction
                </p>
                {entry.result.mistakes.map((m, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <span
                      className="text-[11px] shrink-0 mt-0.5"
                      style={{ color: "#dc2626", fontWeight: 700, textDecoration: "underline" }}
                    >
                      {m.wrong}
                    </span>
                    <span className="text-slate-400 text-[11px] shrink-0">→</span>
                    <span
                      className="text-[11px] shrink-0"
                      style={{ color: "#16a34a", fontWeight: 700, textDecoration: "underline" }}
                    >
                      {m.right}
                    </span>
                  </div>
                ))}
              </div>

              {/* Corrected sentence */}
              <div className="px-4 py-3" style={{ background: "white" }}>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Corrected Sentence
                </p>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {highlightMistakes(entry.result.correctedSentence, rightPhrases, "#16a34a")}
                </p>
                {entry.result.hindiTranslation && (
                  <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">
                    🇮🇳 {entry.result.hindiTranslation}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div
              className="max-w-[80%] px-4 py-3 rounded-[18px_18px_18px_4px] text-sm shadow-sm leading-relaxed"
              style={{ background: "#f0fdf4", border: "1.5px solid #22c55e", color: "#15803d" }}
            >
              <p className="font-bold text-base mb-0.5">✅ Perfect!</p>
              <p className="text-slate-600 text-[13px]">No grammar mistakes found. Well written!</p>
              {entry.result.hindiTranslation && (
                <p className="text-[12px] text-slate-400 mt-1.5">
                  🇮🇳 {entry.result.hindiTranslation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GrammarPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText("");
    setIsSending(true);

    const id = `entry-${Date.now()}`;
    const newEntry: ChatEntry = { id, userText: text, result: null, loading: true, error: null };
    setEntries(prev => [...prev, newEntry]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          category: "teacher",
          history: [],
          systemPrompt: GRAMMAR_SYSTEM_PROMPT,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err?.error ?? `Error ${res.status}`);
      }

      const data = await res.json() as { message: string };
      let raw = data.message.trim();
      // Strip markdown code fences if present
      raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

      let parsed: GrammarResult;
      try {
        parsed = JSON.parse(raw) as GrammarResult;
      } catch {
        parsed = {
          hasMistakes: false,
          mistakes: [],
          correctedSentence: text,
          hindiTranslation: "",
        };
      }

      setEntries(prev =>
        prev.map(e => e.id === id ? { ...e, loading: false, result: parsed } : e)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setEntries(prev =>
        prev.map(e => e.id === id ? { ...e, loading: false, error: msg } : e)
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button
          onClick={() => setLocation("/home")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
        >
          <span className="text-base">✏️</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm leading-tight">Grammar Check</p>
          <p className="text-[11px] text-muted-foreground">Type any sentence for instant correction</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-10">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg"
              style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
            >
              ✏️
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700 text-lg">Grammar Correction</p>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed px-6">
                Type any English sentence below. I'll check it for grammar mistakes and show you the correction!
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {[
                "She don't like apples.",
                "I goed to school yesterday.",
                "He is very intelligent student.",
              ].map(example => (
                <button
                  key={example}
                  onClick={() => setInputText(example)}
                  className="text-left px-3 py-2.5 rounded-xl text-sm text-slate-600 transition-all active:scale-[0.98]"
                  style={{ background: "white", border: "1px solid #e2e8f0" }}
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map(entry => (
          <GrammarBubble key={entry.id} entry={entry} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 px-3 py-3 border-t"
        style={{ background: "white", borderColor: "hsl(var(--border))" }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{ background: "#f2f5f9", border: "1px solid hsl(var(--border))" }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={e => {
              setInputText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a sentence to check..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed py-1"
            style={{ maxHeight: 100 }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-1.5">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
