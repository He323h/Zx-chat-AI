import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle, RefreshCw, Volume2 } from "lucide-react";
import { ROADMAP_TOPICS, completeTopic } from "@/lib/roadmapData";

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
  "present-simple": {
    intro: "Present Simple is used for daily habits, facts, and routines. It's the most common tense!",
    cards: [
      { type: "vocab",   english: "go / goes",       hindi: "जाना",              note: "I go, She goes (add -s for He/She/It)" },
      { type: "vocab",   english: "eat / eats",       hindi: "खाना",              note: "We eat, He eats" },
      { type: "vocab",   english: "do / does not",    hindi: "करना / नहीं करना", note: "I don't; She doesn't" },
      { type: "phrase",  english: "She goes to school every day.", hindi: "वह हर दिन स्कूल जाती है।" },
      { type: "phrase",  english: "I don't like coffee.",          hindi: "मुझे कॉफ़ी पसंद नहीं है।" },
      { type: "example", english: "A: Do you speak English?\nB: Yes, I speak a little.",  hindi: "A: क्या आप अंग्रेजी बोलते हैं?\nB: हाँ, मैं थोड़ा बोलता हूँ।" },
    ],
    tip: "Remember: add -s or -es to the verb when the subject is He, She, or It!",
  },
  "present-continuous": {
    intro: "Present Continuous describes actions happening RIGHT NOW or around this time. Use 'is/am/are + verb-ing'.",
    cards: [
      { type: "vocab",   english: "is / am / are + verb-ing", hindi: "हो + क्रिया + रहा/रही हूँ", note: "I am eating, She is reading" },
      { type: "vocab",   english: "reading / eating / going",   hindi: "पढ़ रहा / खा रहा / जा रहा" },
      { type: "phrase",  english: "I am learning English right now.", hindi: "मैं अभी अंग्रेजी सीख रहा हूँ।" },
      { type: "phrase",  english: "She is not watching TV.",          hindi: "वह टीवी नहीं देख रही है।" },
      { type: "example", english: "A: What are you doing?\nB: I am cooking dinner.", hindi: "A: तुम क्या कर रहे हो?\nB: मैं रात का खाना बना रहा हूँ।" },
    ],
    tip: "Use 'What are you doing?' to ask someone about their current activity!",
  },
  "present-perfect": {
    intro: "Present Perfect connects the past with now. Use 'have/has + V3 (past participle)' for things that happened recently or that still affect the present.",
    cards: [
      { type: "vocab",   english: "have / has + past participle", hindi: "हो + क्रिया (तीसरा रूप)", note: "gone, eaten, seen, done" },
      { type: "vocab",   english: "just / already / never / ever", hindi: "अभी-अभी / पहले से / कभी नहीं / कभी", note: "Common words with Present Perfect" },
      { type: "phrase",  english: "I have already eaten lunch.",     hindi: "मैं दोपहर का खाना पहले ही खा चुका हूँ।" },
      { type: "phrase",  english: "She has never seen snow.",         hindi: "उसने कभी बर्फ नहीं देखी है।" },
      { type: "example", english: "A: Have you ever been to Delhi?\nB: Yes, I have been there twice.", hindi: "A: क्या आप कभी दिल्ली गए हैं?\nB: हाँ, मैं दो बार गया हूँ।" },
    ],
    tip: "If you mention a specific time (yesterday, last week), use Past Simple instead of Present Perfect!",
  },
  "past-simple": {
    intro: "Past Simple is for completed actions in the past. Use the second form of the verb (V2).",
    cards: [
      { type: "vocab",   english: "went / ate / saw / bought",  hindi: "गया / खाया / देखा / खरीदा", note: "Irregular verbs — must memorize!" },
      { type: "vocab",   english: "walked / talked / played",    hindi: "चला / बात की / खेला",        note: "Regular verbs — just add -ed" },
      { type: "phrase",  english: "I went to the market yesterday.", hindi: "मैं कल बाज़ार गया था।" },
      { type: "phrase",  english: "She didn't come to school.",      hindi: "वह स्कूल नहीं आई।" },
      { type: "example", english: "A: What did you do last night?\nB: I watched a movie and slept early.", hindi: "A: कल रात तुमने क्या किया?\nB: मैंने एक फिल्म देखी और जल्दी सो गया।" },
    ],
    tip: "For negatives and questions in Past Simple, use 'did/didn't' — the main verb stays in base form: 'Did you go?' not 'Did you went?'",
  },
  "past-continuous": {
    intro: "Past Continuous describes an action that was in progress at a specific time in the past. Use 'was/were + verb-ing'.",
    cards: [
      { type: "vocab",   english: "was / were + verb-ing",      hindi: "था/थी/थे + क्रिया + रहा/रही", note: "I was, You/They/We were" },
      { type: "phrase",  english: "I was watching TV when she called.", hindi: "जब उसने फ़ोन किया, मैं टीवी देख रहा था।" },
      { type: "phrase",  english: "They were playing cricket at 5 PM.", hindi: "शाम 5 बजे वे क्रिकेट खेल रहे थे।" },
      { type: "example", english: "A: What were you doing at 8 PM?\nB: I was having dinner with my family.", hindi: "A: रात 8 बजे तुम क्या कर रहे थे?\nB: मैं परिवार के साथ खाना खा रहा था।" },
    ],
    tip: "Past Continuous is often used with Past Simple: 'I was sleeping WHEN the phone rang.' (rang = Past Simple interrupts)",
  },
  "past-perfect": {
    intro: "Past Perfect shows an action that happened BEFORE another past action. Use 'had + V3 (past participle)'.",
    cards: [
      { type: "vocab",   english: "had + past participle",   hindi: "हो + क्रिया (तीसरा रूप)",  note: "had gone, had eaten, had seen" },
      { type: "vocab",   english: "before / after / already / by the time", hindi: "पहले / बाद में / पहले से / जब तक", note: "Common time words" },
      { type: "phrase",  english: "By the time I arrived, he had already left.", hindi: "जब तक मैं पहुँचा, वह जा चुका था।" },
      { type: "phrase",  english: "She had eaten dinner before I called.",       hindi: "मेरे फ़ोन करने से पहले उसने खाना खा लिया था।" },
      { type: "example", english: "A: Why were you late?\nB: Because the bus had already left when I reached the stop.", hindi: "A: तुम देर से क्यों आए?\nB: क्योंकि जब मैं स्टॉप पहुँचा, बस जा चुकी थी।" },
    ],
    tip: "Think of Past Perfect as the 'earlier past' — the thing that happened first when you're talking about two past events!",
  },
  "future-simple": {
    intro: "Future Simple uses 'will + base verb' for predictions, decisions made now, and promises about the future.",
    cards: [
      { type: "vocab",   english: "will + V1 (base verb)", hindi: "क्रिया का पहला रूप + करूँगा/करेगा", note: "I will go, She will eat" },
      { type: "vocab",   english: "won't (will not)",      hindi: "नहीं करूँगा / नहीं करेगा",          note: "I won't do it" },
      { type: "phrase",  english: "I will call you tomorrow.", hindi: "मैं कल तुम्हें फ़ोन करूँगा।" },
      { type: "phrase",  english: "It will rain today.",       hindi: "आज बारिश होगी।" },
      { type: "example", english: "A: Are you coming to the party?\nB: Yes, I will be there at 7 PM.", hindi: "A: क्या तुम पार्टी में आ रहे हो?\nB: हाँ, मैं शाम 7 बजे वहाँ रहूँगा।" },
    ],
    tip: "Use 'will' for quick decisions: phone rings → 'I'll get it!' Use 'going to' when you've already planned something.",
  },
  "future-continuous": {
    intro: "Future Continuous shows an action that will be IN PROGRESS at a specific future time. Use 'will be + verb-ing'.",
    cards: [
      { type: "vocab",   english: "will be + verb-ing",  hindi: "क्रिया + रहा/रही + होगा/होगी", note: "I will be sleeping, She will be working" },
      { type: "phrase",  english: "At 10 PM tonight, I will be sleeping.",     hindi: "आज रात 10 बजे, मैं सो रहा होऊँगा।" },
      { type: "phrase",  english: "This time tomorrow, she will be flying.",   hindi: "कल इस वक्त, वह हवाई जहाज़ में होगी।" },
      { type: "example", english: "A: Can I call you at noon?\nB: No, I will be attending a meeting then.", hindi: "A: क्या मैं दोपहर को फ़ोन कर सकता हूँ?\nB: नहीं, उस समय मैं मीटिंग में हूँगा।" },
    ],
    tip: "Future Continuous is great for politely asking about plans: 'Will you be using the car later?' sounds more polite than 'Will you use the car?'",
  },
  "future-perfect": {
    intro: "Future Perfect describes an action that will be COMPLETED before a specific time in the future. Use 'will have + V3'.",
    cards: [
      { type: "vocab",   english: "will have + past participle", hindi: "क्रिया (तीसरा रूप) + कर चुका होऊँगा", note: "will have gone, will have finished" },
      { type: "vocab",   english: "by the time / by then / by + time", hindi: "जब तक / तब तक / [समय] तक", note: "These time words trigger Future Perfect" },
      { type: "phrase",  english: "By next year, I will have finished my course.", hindi: "अगले साल तक, मैं अपना कोर्स पूरा कर चुका होऊँगा।" },
      { type: "phrase",  english: "By 9 PM, she will have cooked dinner.",          hindi: "रात 9 बजे तक, वह रात का खाना बना चुकी होगी।" },
      { type: "example", english: "A: When will you be free?\nB: By 5 PM, I will have completed all my work.", hindi: "A: तुम कब फ्री होगे?\nB: शाम 5 बजे तक, मैं अपना सारा काम कर चुका होऊँगा।" },
    ],
    tip: "Future Perfect is the 'before future' tense — use it to talk about things you will COMPLETE before a future deadline!",
  },
  greetings: {
    intro: "Learn essential greetings to start any conversation confidently!",
    cards: [
      { type: "vocab",   english: "Hello / Hi",        hindi: "नमस्ते",                 note: "Most common greeting" },
      { type: "vocab",   english: "Good morning",      hindi: "सुप्रभात",               note: "Used before noon" },
      { type: "phrase",  english: "How are you?",      hindi: "आप कैसे हैं?" },
      { type: "phrase",  english: "I'm fine, thanks!", hindi: "मैं ठीक हूँ, धन्यवाद!" },
      { type: "example", english: "A: Hi! How are you?\nB: I'm good, thank you!", hindi: "A: नमस्ते! आप कैसे हैं?\nB: मैं अच्छा हूँ, धन्यवाद!" },
    ],
    tip: "Always smile when greeting — it makes your English sound more natural!",
  },
};

function buildSystemPrompt(topic: { title: string; description: string; emoji: string; formula?: string }): string {
  return `You are an English teacher for Hindi-speaking learners. Create a short lesson for: "${topic.emoji} ${topic.title}" (${topic.description}).${topic.formula ? ` Formula: ${topic.formula}` : ""}

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "intro": "1-2 sentence introduction",
  "cards": [
    { "type": "vocab",   "english": "English term", "hindi": "हिंदी अर्थ", "note": "optional note" },
    { "type": "phrase",  "english": "Example sentence", "hindi": "हिंदी अनुवाद" },
    { "type": "example", "english": "Dialogue A: ...\nB: ...", "hindi": "A: ...\nB: ..." }
  ],
  "tip": "One practical tip"
}
Include 5-6 cards total. Keep English clear and relevant to the tense/topic. Hindi must be accurate.`;
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

    const cacheKey = `ef_lesson_${topicId}_v2`;
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

    const fallback = FALLBACK[topicId] ?? null;

    if (!topic) {
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

  const groupColors: Record<string, string> = {
    present: "linear-gradient(135deg,#059669,#10b981)",
    past:    "linear-gradient(135deg,#d97706,#f59e0b)",
    future:  "linear-gradient(135deg,#7c3aed,#8b5cf6)",
  };
  const headerBg = groupColors[topic.group] ?? "linear-gradient(135deg,#0e5fa8,#1a8fd1)";

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "#f0f4f8" }}>
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm shrink-0"
        style={{ background: headerBg }}>
        <button
          onClick={() => setLocation("/roadmap")}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ background: "rgba(255,255,255,0.25)" }}>
          {topic.emoji}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm leading-tight">{topic.title}</p>
          <p className="text-[11px] text-white/60">{topic.formula}</p>
        </div>
        <button
          onClick={() => loadLesson(true)}
          disabled={loading}
          className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.2)" }}
          title="Refresh lesson">
          <RefreshCw size={15} className={`text-white ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl animate-pulse"
              style={{ background: headerBg }}>
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
            <div className="rounded-2xl px-4 py-3 shadow-sm" style={{ background: headerBg }}>
              <p className="text-white text-sm leading-relaxed font-medium">{content.intro}</p>
              {"formula" in topic && (
                <div className="mt-2 px-3 py-1.5 rounded-xl inline-block" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <p className="text-white/90 text-[12px] font-bold">📐 {topic.formula}</p>
                </div>
              )}
            </div>

            {content.cards.map((card, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <CardBadge type={card.type} />
                  <button
                    onClick={() => speak(card.english)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors"
                    title="Listen">
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

            <div className="rounded-2xl px-4 py-3.5 shadow-sm" style={{ background: "#fefce8", border: "1.5px solid #fde047" }}>
              <p className="text-[11px] font-bold text-yellow-700 uppercase tracking-wide mb-1">Pro Tip</p>
              <p className="text-sm text-yellow-900 leading-relaxed">{content.tip}</p>
            </div>

            {!done && (
              <button
                onClick={handleComplete}
                className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all active:scale-[0.98] mt-2"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
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

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-xl z-50 transition-all"
          style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
