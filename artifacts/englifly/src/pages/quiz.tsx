import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  getDailyQuestions, getQuizState, saveQuizState,
  type QuizQuestion, type QuizDayState,
} from "@/lib/quizData";
import { ConfettiBurst } from "@/components/chat-ui";
import { playCorrectSound, playWrongSound, playSuccessSound, playExcellentSound } from "@/lib/sounds";

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
  const [slideDir, setSlideDir] = useState<"in-right" | "in-left">("in-right");
  const [showResults, setShowResults] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [glowNext, setGlowNext] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCount = questions.length;
  const question = questions[currentIdx];

  const answeredFromState = Object.keys(state.answers).length;
  const allDone = answeredFromState >= totalCount || showResults;

  useEffect(() => {
    if (answeredFromState >= totalCount && !showResults) {
      setShowResults(true);
      const pct = totalCount > 0 ? Math.round((state.correctCount / totalCount) * 100) : 0;
      if (pct >= 80) {
        setShowConfetti(true);
        playExcellentSound();
        setTimeout(() => setShowConfetti(false), 3500);
      } else {
        playSuccessSound();
      }
    }
  }, [answeredFromState]);

  useEffect(() => {
    saveQuizState(state);
  }, [state]);

  const alreadyAnswered = question ? !!state.answers[question.id] : false;

  useEffect(() => {
    if (alreadyAnswered && question) {
      setRevealed(true);
      const existingAnswer = localAnswers.find(a => a.questionId === question.id);
      if (!existingAnswer) {
        const correct = state.answers[question.id] === "correct";
        setSelected(correct ? question.options.findIndex(o => o.isCorrect) : -1);
      }
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

    if (isCorrect) {
      playCorrectSound();
      setGlowNext(true);
      setTimeout(() => setGlowNext(false), 1200);
    } else {
      playWrongSound();
    }

    const newLocal: LocalAnswer = { questionId: question.id, selectedIdx: optionIdx, correct: isCorrect };
    setLocalAnswers(prev => [...prev, newLocal]);

    setState(prev => ({
      ...prev,
      correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
      wrongCount:   isCorrect ? prev.wrongCount : prev.wrongCount + 1,
      answers: { ...prev.answers, [question.id]: isCorrect ? "correct" : "wrong" },
    }));

    if (isCorrect) {
      autoAdvanceRef.current = setTimeout(() => {
        goNext();
      }, 1400);
    }
  }

  function goNext() {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    const nextIdx = currentIdx + 1;
    if (nextIdx >= totalCount) {
      setShowResults(true);
      const pct = Math.round(((state.correctCount) / totalCount) * 100);
      if (pct >= 80) {
        setShowConfetti(true);
        playExcellentSound();
        setTimeout(() => setShowConfetti(false), 3500);
      } else {
        playSuccessSound();
      }
      return;
    }
    setSlideDir("in-right");
    setSliding(true);
    setTimeout(() => {
      setCurrentIdx(nextIdx);
      setSelected(null);
      setRevealed(false);
      setSliding(false);
    }, 250);
  }

  const scorePercent = totalCount > 0
    ? Math.round((state.correctCount / totalCount) * 100)
    : 0;

  const scoreMessage =
    scorePercent === 100 ? "Perfect Score! 🏆" :
    scorePercent >= 80   ? "Outstanding! 🌟" :
    scorePercent >= 60   ? "Good Job! 👏" :
    scorePercent >= 40   ? "Keep Practicing! 💪" :
    "Don't Give Up! 🌱";

  if (showResults) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
        <ConfettiBurst show={showConfetti} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <div className="text-7xl" style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.3))" }}>
            {scorePercent >= 80 ? "🏆" : scorePercent >= 60 ? "👏" : "💪"}
          </div>
          <div>
            <p className="text-white font-black text-3xl leading-tight">{scoreMessage}</p>
            <p className="text-white/70 text-base mt-2">Quiz Complete!</p>
          </div>

          <div className="w-full max-w-xs rounded-3xl px-6 py-5 flex flex-col gap-4"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)" }}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={22} className="text-green-300" />
                <span className="text-white font-bold text-2xl">{state.correctCount}</span>
                <span className="text-white/60 text-sm">correct</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={22} className="text-red-300" />
                <span className="text-white font-bold text-2xl">{state.wrongCount}</span>
                <span className="text-white/60 text-sm">wrong</span>
              </div>
            </div>
            <div className="w-full h-3 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
              <div className="h-3 rounded-full transition-all duration-1000"
                style={{ width: `${scorePercent}%`, background: scorePercent >= 80 ? "#22c55e" : scorePercent >= 60 ? "#f59e0b" : "#ef4444" }} />
            </div>
            <p className="text-white font-bold text-2xl">{scorePercent}%</p>
          </div>

          {scorePercent >= 80 && (
            <p className="text-white/80 text-sm font-medium">
              🌟 Come back tomorrow for new questions!
            </p>
          )}
          {scorePercent < 80 && (
            <p className="text-white/70 text-sm">
              Keep practicing to improve your score!
            </p>
          )}

          <button
            onClick={() => setLocation("/home")}
            className="w-full max-w-xs py-4 rounded-2xl font-bold text-violet-900 text-base active:scale-95 transition-all"
            style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const localAnswer = question ? localAnswers.find(a => a.questionId === question.id) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,#1e1b4b 0%,#4c1d95 50%,#7c3aed 100%)" }}>
      <ConfettiBurst show={showConfetti} />

      <div className="px-4 pt-10 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setLocation("/home")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">Daily Quiz</p>
            <p className="text-white/50 text-xs">Question {Math.min(currentIdx + 1, totalCount)} of {totalCount}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={16} className="text-green-400" />
              <span className="text-white font-bold">{state.correctCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle size={16} className="text-red-400" />
              <span className="text-white font-bold">{state.wrongCount}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5">
          {questions.map((q, i) => {
            const ans = state.answers[q.id];
            return (
              <div key={q.id} className="flex-1 h-2 rounded-full transition-all duration-300"
                style={{
                  background: ans === "correct" ? "#22c55e" :
                               ans === "wrong"   ? "#ef4444" :
                               i === currentIdx  ? "rgba(255,255,255,0.6)" :
                               "rgba(255,255,255,0.2)",
                }} />
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 pb-8">
        <div
          className={`transition-all duration-250 ${sliding ? "opacity-0 translate-x-6" : "opacity-100 translate-x-0"}`}
          style={{ willChange: "transform, opacity" }}>

          {question && (
            <div className="rounded-3xl p-5 mb-5 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: "rgba(255,255,255,0.2)" }}>
                  Q{currentIdx + 1}
                </span>
              </div>
              <p className="text-white font-semibold text-lg leading-snug">{question.question}</p>
            </div>
          )}

          {question && (
            <div className="space-y-3">
              {question.options.map((opt, oi) => {
                let bg = "rgba(255,255,255,0.1)";
                let border = "rgba(255,255,255,0.15)";
                let textColor = "rgba(255,255,255,0.9)";
                let scale = "";

                if (revealed) {
                  if (opt.isCorrect) {
                    bg = "rgba(34,197,94,0.25)";
                    border = "#22c55e";
                    textColor = "#fff";
                  } else if (localAnswer && localAnswer.selectedIdx === oi && !opt.isCorrect) {
                    bg = "rgba(239,68,68,0.25)";
                    border = "#ef4444";
                    textColor = "rgba(255,255,255,0.8)";
                  } else {
                    bg = "rgba(255,255,255,0.05)";
                    border = "rgba(255,255,255,0.08)";
                    textColor = "rgba(255,255,255,0.4)";
                  }
                } else if (selected === oi) {
                  bg = "rgba(255,255,255,0.25)";
                  border = "rgba(255,255,255,0.6)";
                  scale = "scale-[0.98]";
                }

                return (
                  <button
                    key={oi}
                    disabled={revealed}
                    onClick={() => handleAnswer(oi)}
                    className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${scale}`}
                    style={{
                      background: bg,
                      border: `1.5px solid ${border}`,
                      color: textColor,
                      backdropFilter: "blur(8px)",
                      cursor: revealed ? "default" : "pointer",
                    }}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold mr-3 shrink-0"
                      style={{
                        background: opt.isCorrect && revealed ? "#22c55e" :
                                    localAnswer?.selectedIdx === oi && !opt.isCorrect && revealed ? "#ef4444" :
                                    "rgba(255,255,255,0.15)",
                        color: (opt.isCorrect && revealed) || (localAnswer?.selectedIdx === oi && !opt.isCorrect && revealed) ? "#fff" : textColor,
                      }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          )}

          {revealed && (
            <div className="mt-5">
              <div className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
                style={{
                  background: localAnswer?.correct ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  border: `1px solid ${localAnswer?.correct ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                }}>
                <span className="text-xl">{localAnswer?.correct ? "✅" : "❌"}</span>
                <p className="text-white text-sm font-semibold">
                  {localAnswer?.correct ? "Correct! Well done!" : `Wrong! The answer is: ${question?.options.find(o => o.isCorrect)?.text}`}
                </p>
              </div>
              {!localAnswer?.correct && (
                <button
                  onClick={goNext}
                  className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 ${glowNext ? "quiz-next-glow" : ""}`}
                  style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  Next Question →
                </button>
              )}
              {localAnswer?.correct && (
                <div className="text-center">
                  <p className="text-white/50 text-sm">Auto-advancing… tap Next to skip</p>
                  <button
                    onClick={goNext}
                    className={`mt-2 w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 ${glowNext ? "quiz-next-glow" : ""}`}
                    style={{ background: "rgba(34,197,94,0.3)", border: "1px solid rgba(34,197,94,0.5)" }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
