import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle, RefreshCw, Volume2 } from "lucide-react";
import { ROADMAP_TOPICS } from "@/lib/roadmapData";
import { completeTopic } from "@/lib/roadmapData";

interface LessonCard {
  type: "vocab" | "phrase" | "example";
  english: string;
  hindi: string;
  note?: string;
}

interface LessonContent {
  intro: string;
  cards: LessonCard[];
  tip: string;
}

const FALLBACK: Record<string, LessonContent> = {
  greetings: {
    intro: "Learn essential greetings to start any conversation confidently!",
    cards: [
      { type: "vocab",   english: "Hello / Hi",        hindi: "नमस्ते",                 note: "Most common greeting" },
      { type: "vocab",   english: "Good morning",      hindi: "सुप्रभात",               note: "Used before noon" },
      { type: "vocab",   english: "Good afternoon",    hindi: "शुभ दोपहर",              note: "Used 12pm–5pm" },
      { type: "vocab",   english: "Good evening",      hindi: "शुभ संध्या",             note: "After 5pm" },
      { type: "phrase",  english: "How are you?",      hindi: "आप कैसे हैं?" },
      { type: "phrase",  english: "I'm fine, thanks!", hindi: "मैं ठीक हूँ, धन्यवाद!" },
      { type: "example", english: "A: Hi! How are you?\nB: I'm good, thank you!", hindi: "A: नमस्ते! आप कैसे हैं?\nB: मैं अच्छा हूँ, धन्यवाद!" },
    ],
    tip: "Always smile when greeting — it makes your English sound more natural!",
  },
  numbers: {
    intro: "Numbers and time are used every single day — master these to communicate better!",
    cards: [
      { type: "vocab",   english: "One, Two, Three",   hindi: "एक, दो, तीन" },
      { type: "vocab",   english: "Ten, Twenty, Hundred", hindi: "दस, बीस, सौ" },
      { type: "vocab",   english: "Monday to Sunday",  hindi: "सोमवार से रविवार" },
      { type: "phrase",  english: "What time is it?",  hindi: "क्या समय हुआ है?" },
      { type: "phrase",  english: "It's three o'clock.", hindi: "तीन बजे हैं।" },
      { type: "example", english: "I wake up at 6 AM every day.", hindi: "मैं हर दिन सुबह 6 बजे उठता हूँ।" },
    ],
    tip: "Practice counting to 20 out loud every morning to build fluency.",
  },
  colors: {
    intro: "Describe the world around you using colors and shapes!",
    cards: [
      { type: "vocab", english: "Red, Blue, Green",    hindi: "लाल, नीला, हरा" },
      { type: "vocab", english: "Yellow, Black, White", hindi: "पीला, काला, सफेद" },
      { type: "phrase", english: "What color is this?", hindi: "यह किस रंग का है?" },
      { type: "example", english: "The sky is blue and the grass is green.", hindi: "आसमान नीला है और घास हरी है।" },
    ],
    tip: "Look around your room and name the color of each object in English!",
  },
};

function buildSystemPrompt(topic: { title: string; description: string; emoji: string }): string {
  return `You are an English teacher for Hindi-speaking beginners. Create a short lesson for the topic: "${topic.emoji} ${topic.title}" (${topic.description}).

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "intro": "1-2 sentence topic introduction in simple English",
  "cards": [
    { "type": "vocab",   "english": "English word/phrase", "hindi": "हिंदी अर्थ", "note": "optional short note" },
    { "type": "phrase",  "english": "Useful phrase",       "hindi": "हिंदी अर्थ" },
    { "type": "example", "english": "Example sentence",    "hindi": "हिंदी अनुवाद" }
  ],
  "tip": "One practical tip for beginners"
}

Include 4-6 cards total. Keep English simple (A1-A2 level). Hindi translations must be accurate.`;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const clean = text.replace(/\n/g, " ").replace(/A:|B:/g, "").trim();
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = "en-US";
  utt.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

function CardBadge({ type }: { type: LessonCard["type"] }) {
  const map = {
    vocab:   { label: "WORD",    bg: "#dbeafe", color: "#1d4ed8" },
    phrase:  { label: "PHRASE",  bg: "#fef9c3", color: "#a16207" },
    example: { label: "EXAMPLE", bg: "#dcfce7", color: "#15803d" },
  };
  const s = map[type];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function LessonPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ topicId: string }>();
  const topicId = params.topicId ?? "";

  const topic = ROADMAP_TOPICS.find(t => t.id === topicId);

  const [content, setContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadLesson(forceRefresh = false) {
    setLoading(true);
    setError(null);

    const cacheKey = `ef_lesson_${topicId}_v1`;
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setContent(JSON.parse(cached) as LessonContent);
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }
    }

    if (!topic) {
      const fallback = FALLBACK[topicId] ?? null;
      setContent(fallback);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate lesson for: ${topic.title}`,
          category: "teacher",
          history: [],
          systemPrompt: buildSystemPrompt(topic),
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json() as { message: string };
      let raw = data.message.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(raw) as LessonContent;
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
      setContent(parsed);
    } catch {
      const fallback = FALLBACK[topicId];
      if (fallback) {
        setContent(fallback);
      } else {
        setError("Could not load lesson. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLesson();
  }, [topicId]);

  function handleComplete() {
    completeTopic(topicId);
    setDone(true);
    setToast("Lesson complete! 🎉");
    setTimeout(() => {
      setToast(null);
      setLocation("/roadmap");
    }, 1800);
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-slate-500 text-lg">Topic not found.</p>
        <button onClick={() => setLocation("/roadmap")} className="text-blue-600 underline">← Back to Roadmap</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button
          onClick={() => setLocation("/roadmap")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
        >
          {topic.emoji}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm leading-tight">{topic.title}</p>
          <p className="text-[11px] text-muted-foreground">{topic.description}</p>
        </div>
        <button
          onClick={() => loadLesson(true)}
          disabled={loading}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors disabled:opacity-40"
          title="Refresh lesson"
        >
          <RefreshCw size={15} className={`text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl animate-pulse"
              style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
              {topic.emoji}
            </div>
            <p className="text-slate-500 text-sm">Preparing your lesson…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 text-center space-y-2">
            <p className="text-red-600 font-medium text-sm">{error}</p>
            <button onClick={() => loadLesson(true)} className="text-blue-600 underline text-sm">Try again</button>
          </div>
        )}

        {content && !loading && (
          <>
            {/* Intro */}
            <div className="rounded-2xl px-4 py-3 shadow-sm" style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
              <p className="text-white text-sm leading-relaxed font-medium">{content.intro}</p>
            </div>

            {/* Cards */}
            {content.cards.map((card, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <CardBadge type={card.type} />
                  <button
                    onClick={() => speak(card.english)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors"
                    title="Listen"
                  >
                    <Volume2 size={14} className="text-blue-400" />
                  </button>
                </div>
                <p className="text-slate-800 font-semibold text-sm whitespace-pre-line leading-relaxed">{card.english}</p>
                <p className="text-slate-400 text-sm whitespace-pre-line">{card.hindi}</p>
                {card.note && (
                  <p className="text-[11px] text-blue-500 font-medium">💡 {card.note}</p>
                )}
              </div>
            ))}

            {/* Tip */}
            <div className="rounded-2xl px-4 py-3.5 shadow-sm" style={{ background: "#fefce8", border: "1.5px solid #fde047" }}>
              <p className="text-[11px] font-bold text-yellow-700 uppercase tracking-wide mb-1">Pro Tip</p>
              <p className="text-sm text-yellow-900 leading-relaxed">{content.tip}</p>
            </div>

            {/* Complete button */}
            {!done && (
              <button
                onClick={handleComplete}
                className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all active:scale-[0.98] mt-2"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
              >
                ✅ Mark as Complete
              </button>
            )}
            {done && (
              <div className="w-full py-4 rounded-2xl font-bold text-white text-base text-center"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                <CheckCircle size={20} className="inline mr-2" />Completed!
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-xl z-50 transition-all"
          style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
