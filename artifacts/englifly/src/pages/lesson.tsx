import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle, RefreshCw, Volume2 } from "lucide-react";
import { ROADMAP_TOPICS, completeTopic } from "@/lib/roadmapData";

interface LessonCard { type: "vocab" | "phrase" | "example"; english: string; hindi: string; note?: string; }
interface LessonContent { intro: string; cards: LessonCard[]; tip: string; }

const FALLBACK: Record<string, LessonContent> = {
  "present-simple": {
    intro: "Present Simple is used for daily habits, facts, and routines. It's the most common tense!",
    cards: [
      { type: "vocab",   english: "go / goes",          hindi: "जाना",              note: "I go, She goes (add -s for He/She/It)" },
      { type: "vocab",   english: "eat / eats",          hindi: "खाना",              note: "We eat, He eats" },
      { type: "phrase",  english: "She goes to school every day.", hindi: "वह हर दिन स्कूल जाती है।" },
      { type: "phrase",  english: "I don't like coffee.",          hindi: "मुझे कॉफ़ी पसंद नहीं है।" },
      { type: "example", english: "A: Do you speak English?\nB: Yes, I speak a little.", hindi: "A: क्या आप अंग्रेजी बोलते हैं?\nB: हाँ, मैं थोड़ा बोलता हूँ।" },
    ],
    tip: "Add -s or -es to the verb when the subject is He, She, or It!",
  },
  "present-continuous": {
    intro: "Present Continuous describes actions happening RIGHT NOW. Use 'is/am/are + verb-ing'.",
    cards: [
      { type: "vocab",   english: "is / am / are + verb-ing", hindi: "हो + क्रिया + रहा/रही हूँ", note: "I am eating, She is reading" },
      { type: "phrase",  english: "I am learning English right now.", hindi: "मैं अभी अंग्रेजी सीख रहा हूँ।" },
      { type: "phrase",  english: "She is not watching TV.",          hindi: "वह टीवी नहीं देख रही है।" },
      { type: "example", english: "A: What are you doing?\nB: I am cooking dinner.", hindi: "A: तुम क्या कर रहे हो?\nB: मैं रात का खाना बना रहा हूँ।" },
    ],
    tip: "Use 'What are you doing?' to ask about current activities!",
  },
  "present-perfect": {
    intro: "Present Perfect connects the past with now. Use 'have/has + V3 (past participle)'.",
    cards: [
      { type: "vocab",   english: "have / has + past participle", hindi: "हो + क्रिया (तीसरा रूप)", note: "gone, eaten, seen, done" },
      { type: "vocab",   english: "just / already / never / ever", hindi: "अभी-अभी / पहले से / कभी नहीं / कभी" },
      { type: "phrase",  english: "I have already eaten lunch.",   hindi: "मैं दोपहर का खाना पहले ही खा चुका हूँ।" },
      { type: "phrase",  english: "She has never seen snow.",      hindi: "उसने कभी बर्फ नहीं देखी है।" },
      { type: "example", english: "A: Have you ever been to Delhi?\nB: Yes, I have been there twice.", hindi: "A: क्या आप कभी दिल्ली गए हैं?\nB: हाँ, मैं दो बार गया हूँ।" },
    ],
    tip: "If you mention a specific time (yesterday), use Past Simple instead!",
  },
  "past-simple": {
    intro: "Past Simple is for completed actions in the past. Use the second form of the verb (V2).",
    cards: [
      { type: "vocab",   english: "went / ate / saw / bought", hindi: "गया / खाया / देखा / खरीदा", note: "Irregular verbs — must memorize!" },
      { type: "vocab",   english: "walked / talked / played",  hindi: "चला / बात की / खेला",        note: "Regular verbs — add -ed" },
      { type: "phrase",  english: "I went to the market yesterday.", hindi: "मैं कल बाज़ार गया था।" },
      { type: "phrase",  english: "She didn't come to school.",      hindi: "वह स्कूल नहीं आई।" },
      { type: "example", english: "A: What did you do last night?\nB: I watched a movie.", hindi: "A: कल रात तुमने क्या किया?\nB: मैंने एक फिल्म देखी।" },
    ],
    tip: "For negatives use 'didn't' — main verb stays base form: 'Did you go?' not 'Did you went?'",
  },
  "past-continuous": {
    intro: "Past Continuous describes an ongoing action at a specific past time. Use 'was/were + verb-ing'.",
    cards: [
      { type: "vocab",   english: "was / were + verb-ing", hindi: "था/थी/थे + क्रिया + रहा/रही", note: "I was, You/They/We were" },
      { type: "phrase",  english: "I was watching TV when she called.", hindi: "जब उसने फ़ोन किया, मैं टीवी देख रहा था।" },
      { type: "phrase",  english: "They were playing cricket at 5 PM.", hindi: "शाम 5 बजे वे क्रिकेट खेल रहे थे।" },
      { type: "example", english: "A: What were you doing at 8 PM?\nB: I was having dinner.", hindi: "A: रात 8 बजे तुम क्या कर रहे थे?\nB: मैं खाना खा रहा था।" },
    ],
    tip: "Often paired with Past Simple: 'I was sleeping WHEN the phone rang.'",
  },
  "past-perfect": {
    intro: "Past Perfect shows an action that happened BEFORE another past action. Use 'had + V3'.",
    cards: [
      { type: "vocab",   english: "had + past participle",              hindi: "हो + क्रिया (तीसरा रूप)", note: "had gone, had eaten, had seen" },
      { type: "vocab",   english: "before / after / already / by the time", hindi: "पहले / बाद में / पहले से / जब तक" },
      { type: "phrase",  english: "By the time I arrived, he had already left.", hindi: "जब तक मैं पहुँचा, वह जा चुका था।" },
      { type: "example", english: "A: Why were you late?\nB: The bus had already left when I reached.", hindi: "A: तुम देर से क्यों आए?\nB: जब मैं पहुँचा, बस जा चुकी थी।" },
    ],
    tip: "Think of Past Perfect as 'the earlier past' — the thing that happened first!",
  },
  "future-simple": {
    intro: "Future Simple uses 'will + base verb' for predictions, decisions, and promises.",
    cards: [
      { type: "vocab",   english: "will + V1 (base verb)", hindi: "क्रिया का पहला रूप + करूँगा/करेगा", note: "I will go, She will eat" },
      { type: "vocab",   english: "won't (will not)",      hindi: "नहीं करूँगा / नहीं करेगा" },
      { type: "phrase",  english: "I will call you tomorrow.", hindi: "मैं कल तुम्हें फ़ोन करूँगा।" },
      { type: "phrase",  english: "It will rain today.",       hindi: "आज बारिश होगी।" },
      { type: "example", english: "A: Are you coming to the party?\nB: Yes, I will be there at 7 PM.", hindi: "A: क्या तुम पार्टी में आ रहे हो?\nB: हाँ, मैं शाम 7 बजे वहाँ रहूँगा।" },
    ],
    tip: "Use 'will' for quick decisions — phone rings → 'I'll get it!'",
  },
  "future-continuous": {
    intro: "Future Continuous shows an ongoing action at a specific future time. Use 'will be + verb-ing'.",
    cards: [
      { type: "vocab",   english: "will be + verb-ing", hindi: "क्रिया + रहा/रही + होगा/होगी", note: "I will be sleeping" },
      { type: "phrase",  english: "At 10 PM tonight, I will be sleeping.",   hindi: "आज रात 10 बजे, मैं सो रहा होऊँगा।" },
      { type: "phrase",  english: "This time tomorrow, she will be flying.", hindi: "कल इस वक्त, वह हवाई जहाज़ में होगी।" },
      { type: "example", english: "A: Can I call you at noon?\nB: No, I will be attending a meeting.", hindi: "A: क्या मैं दोपहर को फ़ोन कर सकता हूँ?\nB: नहीं, उस समय मैं मीटिंग में हूँगा।" },
    ],
    tip: "Great for politely asking plans: 'Will you be using the car later?' sounds more polite!",
  },
  "future-perfect": {
    intro: "Future Perfect describes an action completed BEFORE a specific future time. Use 'will have + V3'.",
    cards: [
      { type: "vocab",   english: "will have + past participle",    hindi: "क्रिया (तीसरा रूप) + कर चुका होऊँगा", note: "will have finished, will have gone" },
      { type: "vocab",   english: "by the time / by then / by + time", hindi: "जब तक / तब तक / [समय] तक" },
      { type: "phrase",  english: "By next year, I will have finished my course.", hindi: "अगले साल तक, मैं अपना कोर्स पूरा कर चुका होऊँगा।" },
      { type: "example", english: "A: When will you be free?\nB: By 5 PM, I will have completed all my work.", hindi: "A: तुम कब फ्री होगे?\nB: शाम 5 बजे तक, मैं सारा काम कर चुका होऊँगा।" },
    ],
    tip: "Future Perfect = 'before future' — things completed before a future deadline!",
  },
};

function buildSystemPrompt(topic: { title: string; description: string; emoji: string; formula?: string }): string {
  return `You are an English teacher for Hindi-speaking learners. Create a short lesson for: "${topic.emoji} ${topic.title}" (${topic.description}).${topic.formula ? ` Formula: ${topic.formula}` : ""}
Respond ONLY with valid JSON (no markdown):
{"intro":"1-2 sentence intro","cards":[{"type":"vocab","english":"term","hindi":"हिंदी","note":"optional"},{"type":"phrase","english":"sentence","hindi":"हिंदी"},{"type":"example","english":"A: ...\\nB: ...","hindi":"A: ...\\nB: ..."}],"tip":"practical tip"}
Include 5-6 cards. Keep English clear and A1-A2 level. Hindi must be accurate.`;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utt = new SpeechSynthesisUtterance(text.replace(/\n/g, " ").replace(/A:|B:/g, "").trim());
  utt.lang = "en-US"; utt.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

function CardBadge({ type }: { type: LessonCard["type"] }) {
  const map = { vocab: { label: "WORD", bg: "#DBEAFE", color: "#1d4ed8" }, phrase: { label: "PHRASE", bg: "#FEF9C3", color: "#a16207" }, example: { label: "EXAMPLE", bg: "#DCFCE7", color: "#15803d" } };
  const s = map[type];
  return <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
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
    setLoading(true); setError(null);
    const cacheKey = `ef_lesson_${topicId}_v2`;
    if (!forceRefresh) {
      try { const c = localStorage.getItem(cacheKey); if (c) { setContent(JSON.parse(c)); setLoading(false); return; } } catch {}
    }
    const fallback = FALLBACK[topicId] ?? null;
    if (!topic) { setContent(fallback); setLoading(false); return; }
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Generate lesson for: ${topic.title}`, category: "teacher", history: [], systemPrompt: buildSystemPrompt(topic) }) });
      if (!res.ok) throw new Error();
      const data = await res.json() as { message: string };
      let raw = data.message.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
      const parsed = JSON.parse(raw) as LessonContent;
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
      setContent(parsed);
    } catch { setContent(fallback ?? null); if (!fallback) setError("Could not load lesson. Please try again."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadLesson(); }, [topicId]);

  function handleComplete() {
    completeTopic(topicId); setDone(true); setToast("Lesson complete! 🎉");
    setTimeout(() => { setToast(null); setLocation("/roadmap"); }, 1800);
  }

  if (!topic) return (
    <div className="clay-page flex items-center justify-center flex-col gap-4">
      <p className="text-[#6B7785] text-[15px]">Topic not found.</p>
      <button onClick={() => setLocation("/roadmap")} className="clay-btn px-5 py-2.5 text-[14px]">← Back to Path</button>
    </div>
  );

  return (
    <div className="clay-page flex flex-col min-h-screen">
      {/* Clay Header */}
      <div className="clay-header px-5 pt-10 pb-5 flex items-center gap-3 shrink-0">
        <button onClick={() => setLocation("/roadmap")}
          className="w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.22)" }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl shrink-0"
          style={{ background: "rgba(255,255,255,0.25)" }}>
          {topic.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-[15px] leading-tight">{topic.title}</p>
          <p className="text-white/65 text-[10px] font-mono">{topic.formula}</p>
        </div>
        <button onClick={() => loadLesson(true)} disabled={loading}
          className="w-9 h-9 rounded-[14px] flex items-center justify-center disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.22)" }}>
          <RefreshCw size={14} className={`text-white ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-5 space-y-4 pb-8">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl animate-pulse clay-card">{topic.emoji}</div>
            <p className="text-[#6B7785] text-[13px]">Preparing your lesson…</p>
          </div>
        )}
        {error && !loading && (
          <div className="clay-card p-4 text-center space-y-2"
            style={{ background: "linear-gradient(135deg,#fff0f0,#fecaca)" }}>
            <p className="text-red-600 font-bold text-[13px]">{error}</p>
            <button onClick={() => loadLesson(true)} className="clay-btn px-4 py-2 text-[12px]">Try again</button>
          </div>
        )}

        {content && !loading && (
          <>
            {/* Intro */}
            <div className="clay-card p-4"
              style={{ background: "linear-gradient(135deg,#1CB0F6,#0E8FD4)", boxShadow: "-4px -4px 10px rgba(255,255,255,0.35), 6px 6px 18px rgba(14,143,212,0.45)" }}>
              <p className="text-white text-[13px] leading-relaxed font-semibold">{content.intro}</p>
              <div className="mt-2.5 px-3 py-1.5 rounded-[12px] inline-block"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                <p className="text-white/90 text-[11px] font-black font-mono">📐 {topic.formula}</p>
              </div>
            </div>

            {/* Cards */}
            {content.cards.map((card, i) => (
              <div key={i} className="clay-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <CardBadge type={card.type} />
                  <button onClick={() => speak(card.english)}
                    className="w-8 h-8 rounded-[12px] flex items-center justify-center transition-all"
                    style={{ background: "#EAF4FF", boxShadow: "-1px -1px 3px rgba(255,255,255,0.9), 2px 2px 6px rgba(28,176,246,0.2)" }}>
                    <Volume2 size={14} style={{ color: "#1CB0F6" }} />
                  </button>
                </div>
                <p className="text-[#1A2B3C] font-bold text-[14px] whitespace-pre-line leading-relaxed">{card.english}</p>
                <p className="text-[#6B7785] text-[13px] whitespace-pre-line">{card.hindi}</p>
                {card.note && <p className="text-[11px] font-bold" style={{ color: "#1CB0F6" }}>💡 {card.note}</p>}
              </div>
            ))}

            {/* Tip */}
            <div className="clay-card p-4"
              style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", boxShadow: "-3px -3px 8px rgba(255,255,255,0.7), 4px 4px 12px rgba(255,150,0,0.2)" }}>
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Pro Tip 💡</p>
              <p className="text-[13px] text-amber-900 leading-relaxed">{content.tip}</p>
            </div>

            {/* Complete button */}
            {!done ? (
              <button onClick={handleComplete}
                className="clay-btn-green w-full py-4 text-[15px]">
                ✅ Mark as Complete
              </button>
            ) : (
              <div className="clay-card p-4 flex items-center justify-center gap-2 text-white font-black text-[15px]"
                style={{ background: "linear-gradient(135deg,#58CC02,#43a800)", boxShadow: "-4px -4px 10px rgba(255,255,255,0.4), 6px 6px 18px rgba(88,204,2,0.45)" }}>
                <CheckCircle size={20} />Completed!
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-white text-[13px] font-black shadow-xl z-50"
          style={{ background: "linear-gradient(135deg,#58CC02,#43a800)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
