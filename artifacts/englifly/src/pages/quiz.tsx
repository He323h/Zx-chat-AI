import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { getDailyQuestions, getQuizState, saveQuizState, type QuizQuestion, type QuizDayState } from "@/lib/quizData";
import { recordAnswer, logActivity } from "@/lib/dailyStats";

function tone(kind: "good" | "bad" | "click") {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(kind === "bad" ? 220 : kind === "click" ? 520 : 660, ctx.currentTime);
  if (kind === "good") o.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.16);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(kind === "bad" ? 0.045 : 0.07, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === "bad" ? 0.28 : 0.18));
  o.start(); o.stop(ctx.currentTime + 0.3);
}

function speakScore(percent: number) {
  if (!("speechSynthesis" in window)) return;
  const text = percent >= 90 ? "Outstanding!" : percent >= 75 ? "Excellent!" : "Good job!";
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.95; u.pitch = percent >= 75 ? 1.18 : 1.05;
  window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
}

export default function QuizPage() {
  const [, setLocation] = useLocation();
  const [questions] = useState<QuizQuestion[]>(() => getDailyQuestions());
  const [state, setState] = useState<QuizDayState>(() => getQuizState());
  const [index, setIndex] = useState(() => Math.min(Object.keys(getQuizState().answers).length, 6));
  const [glowNext, setGlowNext] = useState(false);
  const [announcedDone, setAnnouncedDone] = useState(false);

  useEffect(() => { saveQuizState(state); }, [state]);

  const answeredCount = Object.keys(state.answers).length;
  const totalCount = questions.length;
  const allDone = answeredCount === totalCount;
  const scorePercent = totalCount ? Math.round((state.correctCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (allDone && !announcedDone) { setAnnouncedDone(true); speakScore(scorePercent); logActivity("quiz", `Daily Quiz ${scorePercent}%`); }
  }, [allDone, announcedDone, scorePercent]);

  function handleAnswer(question: QuizQuestion, optionIndex: number) {
    if (state.answers[question.id]) return;
    const isCorrect = question.options[optionIndex].isCorrect;
    tone(isCorrect ? "good" : "bad");
    recordAnswer(isCorrect);
    setGlowNext(isCorrect);
    setState(prev => ({
      ...prev,
      correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
      wrongCount: isCorrect ? prev.wrongCount : prev.wrongCount + 1,
      answers: { ...prev.answers, [question.id]: isCorrect ? "correct" : "wrong" },
      selections: { ...prev.selections, [question.id]: optionIndex },
    }));
    window.setTimeout(() => {
      setGlowNext(false);
      setIndex(i => Math.min(i + 1, totalCount));
    }, 900);
  }

  const q = questions[index];

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: "linear-gradient(135deg,#eef6ff,#f6efff 52%,#eefdf7)" }}>
      {allDone && scorePercent >= 75 && <div className="fixed inset-0 pointer-events-none z-20">{Array.from({ length: 18 }).map((_, i) => <span key={i} className="absolute confetti-piece" style={{ left: `${10 + (i * 5) % 82}%`, top: "8%", animationDelay: `${i * 0.06}s`, background: ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b"][i % 4] }} />)}</div>}
      <div className="px-4 pt-10 pb-4" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
        <div className="flex items-center gap-3 mb-4"><button onClick={() => setLocation("/home")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}><ArrowLeft size={18} className="text-white" /></button><div className="flex-1"><p className="text-white font-bold text-lg leading-tight">Daily Quiz</p><p className="text-white/60 text-xs">One question at a time</p></div></div>
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.15)" }}><div className="flex gap-4"><span className="flex items-center gap-1.5 text-white"><CheckCircle2 size={18} className="text-green-300" />{state.correctCount}</span><span className="flex items-center gap-1.5 text-white"><XCircle size={18} className="text-red-300" />{state.wrongCount}</span></div><p className="text-white font-black text-2xl">{answeredCount}/{totalCount}</p></div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-6">
        {allDone ? (
          <div className="scale-in rounded-3xl bg-white/85 backdrop-blur p-6 text-center shadow-xl border border-white">
            <div className="text-5xl mb-3">{scorePercent >= 90 ? "🏆" : scorePercent >= 75 ? "🎉" : "👏"}</div>
            <p className="text-2xl font-black text-slate-800">{scorePercent >= 90 ? "Outstanding!" : scorePercent >= 75 ? "Excellent!" : "Good job!"}</p>
            <p className="text-slate-500 mt-2">You scored {state.correctCount}/{totalCount} ({scorePercent}%). Come back tomorrow for new questions.</p>
            <button onClick={() => setLocation("/home")} className="mt-5 w-full rounded-2xl py-3 text-white font-bold btn-3d" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>Back Home</button>
          </div>
        ) : q && (
          <div key={q.id} className="quiz-slide rounded-3xl bg-white/88 backdrop-blur p-5 shadow-xl border border-white">
            <p className="text-xs font-bold text-violet-600 mb-2">Question {index + 1} of {totalCount}</p><p className="text-xl font-black text-slate-800 leading-snug mb-5">{q.question}</p>
            <div className="space-y-3">{q.options.map((opt, oi) => { const chosen = state.selections[q.id] === oi; const answered = state.answers[q.id]; const green = answered && opt.isCorrect; const red = answered === "wrong" && chosen; return <button key={oi} disabled={!!answered} onClick={() => handleAnswer(q, oi)} className="w-full text-left px-4 py-3 rounded-2xl font-semibold transition-all active:scale-[0.98]" style={{ background: green ? "rgba(34,197,94,0.14)" : red ? "rgba(239,68,68,0.12)" : "rgba(248,250,252,0.95)", border: `2px solid ${green ? "#22c55e" : red ? "#ef4444" : "#e2e8f0"}`, color: green ? "#15803d" : red ? "#dc2626" : "#334155" }}><span className="mr-2">{String.fromCharCode(65 + oi)}.</span>{opt.text}</button>; })}</div>
            <div className={`mt-5 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all ${glowNext ? "next-glow" : ""}`} style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", opacity: state.answers[q.id] ? 1 : 0.55 }}>Next <ChevronRight size={16} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
