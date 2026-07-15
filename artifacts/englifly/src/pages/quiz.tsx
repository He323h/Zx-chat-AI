import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  getDailyQuestions, getQuizState, saveQuizState,
  type QuizQuestion, type QuizDayState,
} from "@/lib/quizData";
import { ConfettiBurst } from "@/components/chat-ui";
import { playCorrectSound, playWrongSound, playSuccessSound, playExcellentSound } from "@/lib/sounds";
import { BottomNav } from "@/components/BottomNav";

type LocalAnswer = { questionId: number; selectedIdx: number; correct: boolean };

export default function QuizPage() {
  const [, setLocation] = useLocation();
  const [questions] = useState<QuizQuestion[]>(() => getDailyQuestions());
  const [state, setState] = useState<QuizDayState>(() => getQuizState());

  const [currentIdx, setCurrentIdx] = useState<number>(() => {
    const s = getQuizState();
    const answered = Object.keys(s.answers).length;
    return Math.min(answered, getDailyQuestions().length - 1);
  });

  const [localAnswers, setLocalAnswers] = useState<LocalAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [glowNext, setGlowNext] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCount = questions.length;
  const question = questions[currentIdx];
  const answeredFromState = Object.keys(state.answers).length;

  useEffect(() => {
    saveQuizState(state);
  }, [state]);

  useEffect(() => {
    if (answeredFromState >= totalCount && !showResults) {
      setShowResults(true);
      const pct = totalCount > 0 ? Math.round((state.correctCount / totalCount) * 100) : 0;
      if (pct >= 80) { setShowConfetti(true); playExcellentSound(); setTimeout(() => setShowConfetti(false), 3500); }
      else { playSuccessSound(); }
    }
  }, [answeredFromState]);

  useEffect(() => {
    const alreadyAnswered = question ? !!state.answers[question.id] : false;
    if (alreadyAnswered && question) {
      setRevealed(true);
      const correct = state.answers[question.id] === "correct";
      setSelected(correct ? question.options.findIndex(o => o.isCorrect) : -1);
    } else {
      setSelected(null);
      setRevealed(false);
    }
  }, [currentIdx]);

  function handleAnswer(optionIdx: number) {
    if (revealed || !question) return;
    const isCorrect = question.options[optionIdx].isCorrect;
    setSelected(optionIdx);
    setRevealed(true);
    if (isCorrect) { playCorrectSound(); setGlowNext(true); setTimeout(() => setGlowNext(false), 1200); }
    else { playWrongSound(); }

    setLocalAnswers(prev => [...prev, { questionId: question.id, selectedIdx: optionIdx, correct: isCorrect }]);
    setState(prev => ({
      ...prev,
      correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
      wrongCount:   isCorrect ? prev.wrongCount : prev.wrongCount + 1,
      answers: { ...prev.answers, [question.id]: isCorrect ? "correct" : "wrong" },
    }));

    if (isCorrect) {
      autoAdvanceRef.current = setTimeout(() => goNext(), 1400);
    }
  }

  function goNext() {
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    const nextIdx = currentIdx + 1;
    if (nextIdx >= totalCount) {
      setShowResults(true);
      const pct = Math.round((state.correctCount / totalCount) * 100);
      if (pct >= 80) { setShowConfetti(true); playExcellentSound(); setTimeout(() => setShowConfetti(false), 3500); }
      else { playSuccessSound(); }
      return;
    }
    setSliding(true);
    setTimeout(() => { setCurrentIdx(nextIdx); setSelected(null); setRevealed(false); setSliding(false); }, 250);
  }

  const scorePercent = totalCount > 0 ? Math.round((state.correctCount / totalCount) * 100) : 0;
  const scoreMessage =
    scorePercent === 100 ? "Perfect Score! 🏆" :
    scorePercent >= 80   ? "Outstanding! 🌟" :
    scorePercent >= 60   ? "Good Job! 👏" :
    scorePercent >= 40   ? "Keep Practicing! 💪" :
    "Don't Give Up! 🌱";

  const localAnswer = question ? localAnswers.find(a => a.questionId === question.id) : null;

  if (showResults) {
    return (
      <div className="clay-page pb-28 flex flex-col">
        <ConfettiBurst show={showConfetti} />
        {/* Header */}
        <div className="clay-header px-5 pt-10 pb-7 flex items-center gap-3">
          <button onClick={() => setLocation("/home")}
            className="w-10 h-10 rounded-[16px] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.22)" }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <p className="text-white font-black text-[18px]">Daily Quiz ❓</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-5 max-w-lg mx-auto w-full">
          <div className="text-7xl">{scorePercent >= 80 ? "🏆" : scorePercent >= 60 ? "👏" : "💪"}</div>
          <div className="text-center">
            <p className="text-[#1A2B3C] font-black text-[24px]">{scoreMessage}</p>
            <p className="text-[#6B7785] text-[14px] mt-1">Quiz Complete!</p>
          </div>

          <div className="clay-card w-full p-5 space-y-4">
            <div className="flex justify-around">
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 size={28} style={{ color: "#58CC02" }} />
                <p className="font-black text-[28px] text-[#1A2B3C]">{state.correctCount}</p>
                <p className="text-[11px] text-[#6B7785]">Correct</p>
              </div>
              <div className="w-px bg-[#EAF4FF]" />
              <div className="flex flex-col items-center gap-1">
                <XCircle size={28} style={{ color: "#ef4444" }} />
                <p className="font-black text-[28px] text-[#1A2B3C]">{state.wrongCount}</p>
                <p className="text-[11px] text-[#6B7785]">Wrong</p>
              </div>
            </div>
            <div className="clay-track h-3 w-full">
              <div className="clay-fill h-3 transition-all duration-1000"
                style={{
                  width: `${scorePercent}%`,
                  background: scorePercent >= 80 ? "linear-gradient(90deg,#58CC02,#7de800)"
                            : scorePercent >= 60 ? "linear-gradient(90deg,#FF9600,#ffc53d)"
                            : "linear-gradient(90deg,#ef4444,#f87171)",
                  boxShadow: scorePercent >= 80 ? "0 2px 8px rgba(88,204,2,0.45)" : "0 2px 8px rgba(28,176,246,0.45)",
                }} />
            </div>
            <p className="text-center font-black text-[22px] text-[#1CB0F6]">{scorePercent}%</p>
          </div>

          <button onClick={() => setLocation("/home")}
            className="clay-btn w-full py-4 text-[15px]">
            Back to Home
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="clay-page pb-28 flex flex-col min-h-screen">
      <ConfettiBurst show={showConfetti} />

      {/* Clay Header */}
      <div className="clay-header px-5 pt-10 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setLocation("/home")}
            className="w-10 h-10 rounded-[16px] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.22)" }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white font-black text-[18px]">Daily Quiz ❓</p>
            <p className="text-white/65 text-[11px]">Question {Math.min(currentIdx + 1, totalCount)} of {totalCount}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} style={{ color: "#7de800" }} />
              <span className="text-white font-black text-[15px]">{state.correctCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle size={16} style={{ color: "#fca5a5" }} />
              <span className="text-white font-black text-[15px]">{state.wrongCount}</span>
            </div>
          </div>
        </div>

        {/* Clay progress dots */}
        <div className="flex gap-1.5">
          {questions.map((q, i) => {
            const ans = state.answers[q.id];
            return (
              <div key={q.id} className="flex-1 h-2.5 rounded-full transition-all duration-300"
                style={{
                  background: ans === "correct" ? "#58CC02"
                            : ans === "wrong"   ? "#ef4444"
                            : i === currentIdx  ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.3)",
                  boxShadow: i === currentIdx ? "0 0 6px rgba(255,255,255,0.6)" : "none",
                }} />
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-4 py-5 max-w-lg mx-auto w-full">
        <div className={`transition-all duration-250 ${sliding ? "opacity-0 translate-x-6" : "opacity-100 translate-x-0"}`}>

          {/* Question card */}
          {question && (
            <div className="clay-card p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full text-white"
                  style={{ background: "linear-gradient(135deg,#1CB0F6,#0E8FD4)" }}>
                  Q{currentIdx + 1}
                </span>
              </div>
              <p className="text-[#1A2B3C] font-bold text-[16px] leading-snug">{question.question}</p>
            </div>
          )}

          {/* Options */}
          {question && (
            <div className="space-y-3 mb-4">
              {question.options.map((opt, oi) => {
                let bg = "#ffffff";
                let shadow = "-2px -2px 6px rgba(255,255,255,0.9), 3px 3px 10px rgba(28,176,246,0.18)";
                let textColor = "#1A2B3C";
                let labelBg = "#EAF4FF";
                let labelColor = "#6B7785";

                if (revealed) {
                  if (opt.isCorrect) {
                    bg = "linear-gradient(135deg,#d4f7b0,#c0f092)";
                    shadow = "-2px -2px 5px rgba(255,255,255,0.7), 3px 3px 10px rgba(88,204,2,0.3)";
                    textColor = "#1e5c00";
                    labelBg = "#58CC02";
                    labelColor = "#fff";
                  } else if (localAnswer?.selectedIdx === oi && !opt.isCorrect) {
                    bg = "linear-gradient(135deg,#fecaca,#fda4a4)";
                    shadow = "-2px -2px 5px rgba(255,255,255,0.7), 3px 3px 10px rgba(239,68,68,0.3)";
                    textColor = "#7f1d1d";
                    labelBg = "#ef4444";
                    labelColor = "#fff";
                  } else {
                    bg = "#f8f9fa";
                    shadow = "none";
                    textColor = "#94a3b8";
                  }
                }

                return (
                  <button
                    key={oi}
                    disabled={revealed}
                    onClick={() => handleAnswer(oi)}
                    className="w-full flex items-center gap-3 text-left transition-all duration-200"
                    style={{
                      background: bg,
                      borderRadius: 20,
                      padding: "14px 16px",
                      boxShadow: shadow,
                      cursor: revealed ? "default" : "pointer",
                    }}>
                    <span className="w-8 h-8 rounded-[12px] flex items-center justify-center text-[11px] font-black shrink-0"
                      style={{ background: labelBg, color: labelColor }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="text-[14px] font-semibold leading-snug flex-1" style={{ color: textColor }}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Feedback + Next */}
          {revealed && (
            <div className="space-y-3">
              <div className="clay-card p-4 flex items-start gap-3"
                style={{
                  background: localAnswer?.correct ? "linear-gradient(135deg,#e8ffd4,#d4f7b0)" : "linear-gradient(135deg,#fff0f0,#fecaca)",
                  boxShadow: localAnswer?.correct
                    ? "-2px -2px 6px rgba(255,255,255,0.7), 4px 4px 12px rgba(88,204,2,0.25)"
                    : "-2px -2px 6px rgba(255,255,255,0.7), 4px 4px 12px rgba(239,68,68,0.2)",
                }}>
                <span className="text-2xl">{localAnswer?.correct ? "✅" : "❌"}</span>
                <div>
                  <p className="font-black text-[14px]" style={{ color: localAnswer?.correct ? "#1e5c00" : "#7f1d1d" }}>
                    {localAnswer?.correct ? "Correct! Well done!" : "Not quite!"}
                  </p>
                  {!localAnswer?.correct && (
                    <p className="text-[12px] mt-0.5" style={{ color: "#7f1d1d" }}>
                      Answer: <span className="font-bold">{question?.options.find(o => o.isCorrect)?.text}</span>
                    </p>
                  )}
                </div>
              </div>
              {!localAnswer?.correct ? (
                <button onClick={goNext} className="clay-btn w-full py-4 text-[15px]">Next Question →</button>
              ) : (
                <div className="space-y-1">
                  <p className="text-center text-[11px] text-[#6B7785]">Auto-advancing…</p>
                  <button onClick={goNext}
                    className={`clay-btn-green w-full py-4 text-[15px] ${glowNext ? "quiz-next-glow" : ""}`}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
