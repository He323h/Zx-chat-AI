import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  getDailyQuestions, getQuizState, saveQuizState,
  type QuizQuestion, type QuizDayState,
} from "@/lib/quizData";

export default function QuizPage() {
  const [, setLocation] = useLocation();
  const [questions] = useState<QuizQuestion[]>(() => getDailyQuestions());
  const [state, setState] = useState<QuizDayState>(() => getQuizState());

  useEffect(() => {
    saveQuizState(state);
  }, [state]);

  function handleAnswer(question: QuizQuestion, optionIndex: number) {
    if (state.answers[question.id]) return; // already answered

    const isCorrect = question.options[optionIndex].isCorrect;
    setState(prev => ({
      ...prev,
      correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
      wrongCount:   isCorrect ? prev.wrongCount : prev.wrongCount + 1,
      answers: {
        ...prev.answers,
        [question.id]: isCorrect ? "correct" : "wrong",
      },
    }));
  }

  const answeredCount = Object.keys(state.answers).length;
  const totalCount = questions.length;
  const allDone = answeredCount === totalCount;

  const scorePercent = totalCount > 0
    ? Math.round((state.correctCount / Math.max(answeredCount, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f2f5f9" }}>
      {/* Header */}
      <div
        className="px-4 pt-10 pb-4"
        style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLocation("/home")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white font-bold text-lg leading-tight">Daily Quiz</p>
            <p className="text-white/60 text-xs">Resets every day at midnight</p>
          </div>
        </div>

        {/* Score bar */}
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={18} className="text-green-300" />
              <span className="text-white font-bold text-xl">{state.correctCount}</span>
              <span className="text-white/60 text-xs">correct</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle size={18} className="text-red-300" />
              <span className="text-white font-bold text-xl">{state.wrongCount}</span>
              <span className="text-white/60 text-xs">wrong</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-2xl">{answeredCount}/{totalCount}</p>
            <p className="text-white/60 text-[10px]">answered</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Completion banner */}
        {allDone && (
          <div
            className="fade-up rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
          >
            <span className="text-3xl">🎉</span>
            <div>
              <p className="text-white font-bold">Quiz Complete!</p>
              <p className="text-white/80 text-sm">
                You scored {state.correctCount}/{totalCount} ({scorePercent}%). Come back tomorrow for new questions!
              </p>
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.map((q, qi) => {
          const answered = state.answers[q.id];

          return (
            <div
              key={q.id}
              className="fade-up bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{ animationDelay: `${qi * 0.04}s` }}
            >
              {/* Question header */}
              <div className="px-4 pt-4 pb-2 flex items-start gap-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0 mt-0.5"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                >
                  Q{qi + 1}
                </span>
                {answered && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{
                      background: answered === "correct" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      color: answered === "correct" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {answered === "correct" ? "✓ Correct" : "✗ Wrong"}
                  </span>
                )}
              </div>
              <p className="px-4 pb-3 text-[15px] font-semibold text-slate-800 leading-snug">
                {q.question}
              </p>

              {/* Options */}
              <div className="px-4 pb-4 space-y-2">
                {q.options.map((opt, oi) => {
                  let bg = "rgba(0,0,0,0.04)";
                  let border = "transparent";
                  let textColor = "#475569";
                  let fontWeight = "500";

                  if (answered) {
                    if (opt.isCorrect) {
                      bg = "rgba(34,197,94,0.12)";
                      border = "#22c55e";
                      textColor = "#15803d";
                      fontWeight = "700";
                    } else if (!opt.isCorrect && state.answers[q.id] === "wrong") {
                      // Show the option the user chose as red
                      const chosenIdx = q.options.findIndex((_, ci) => {
                        if (state.answers[q.id] === "correct") return q.options[ci].isCorrect;
                        // find which wrong one they picked — we track by question id only
                        return false;
                      });
                      // We highlight all non-correct options subtly in red to show what was wrong
                      bg = "rgba(239,68,68,0.05)";
                      border = "rgba(239,68,68,0.2)";
                      textColor = "#94a3b8";
                    }
                  }

                  return (
                    <button
                      key={oi}
                      disabled={!!answered}
                      onClick={() => handleAnswer(q, oi)}
                      className="w-full text-left px-4 py-3 rounded-2xl text-sm transition-all duration-200 active:scale-[0.98]"
                      style={{
                        background: bg,
                        border: `1.5px solid ${border || "transparent"}`,
                        color: textColor,
                        fontWeight,
                        cursor: answered ? "default" : "pointer",
                      }}
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-2 shrink-0"
                        style={{
                          background: opt.isCorrect && answered
                            ? "#22c55e"
                            : "rgba(0,0,0,0.08)",
                          color: opt.isCorrect && answered ? "#fff" : textColor,
                        }}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Tip if not started */}
        {answeredCount === 0 && (
          <div
            className="fade-up rounded-2xl p-4 flex items-start gap-3"
            style={{ animationDelay: "0.3s", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <span className="text-xl shrink-0">💡</span>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tap an option to answer. Questions change every day — come back tomorrow for a new set!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
