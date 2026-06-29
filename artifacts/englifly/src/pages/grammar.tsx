import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight, RotateCcw, Zap } from "lucide-react";

const WORD_ARRANGE_KEY = "ef_word_arrange_v1";
const REQUIRED_TO_ADVANCE = 5;

interface WordArrangeProgress {
  level: number;
  correctInLevel: number;
}

function getProgress(): WordArrangeProgress {
  try {
    const raw = localStorage.getItem(WORD_ARRANGE_KEY);
    if (!raw) return { level: 1, correctInLevel: 0 };
    return JSON.parse(raw) as WordArrangeProgress;
  } catch {
    return { level: 1, correctInLevel: 0 };
  }
}

function saveProgress(p: WordArrangeProgress) {
  localStorage.setItem(WORD_ARRANGE_KEY, JSON.stringify(p));
}

const SENTENCE_BANK: Record<number, string[]> = {
  1: [
    "I go to school",
    "She is happy",
    "He likes tea",
    "We eat food",
    "The cat is big",
    "I drink water",
    "She reads books",
    "He plays cricket",
  ],
  2: [
    "I am going to school today",
    "She does not like apples",
    "He went to the market yesterday",
    "We have a big house",
    "They are playing cricket outside",
    "I will call you tomorrow",
    "She cannot come to the party",
    "He always wakes up early",
  ],
  3: [
    "I was watching TV when she called me",
    "She has been learning English for two years",
    "We should study hard to pass the exam",
    "They had already eaten when we arrived",
    "He will go to the office if it rains",
    "I have never seen such a beautiful place",
    "She told me that she was feeling sick",
    "We were waiting for the bus for an hour",
  ],
  4: [
    "Although it was raining we decided to go out",
    "She would have passed if she had studied harder",
    "He is not only smart but also very hardworking",
    "I wish I had more time to practice English every day",
    "By the time we reached the station the train had left",
    "She asked me whether I had finished my homework yet",
    "The teacher explained the lesson clearly to all students",
  ],
  5: [
    "Having finished his work he went home to rest",
    "Not only did she win the competition but she also broke the record",
    "It is essential that every student submit the assignment on time",
    "Despite the heavy traffic she managed to reach the office on time",
    "He would not have made such a mistake had he been more careful",
    "The manager suggested that the team work together more effectively",
    "She has developed a strong habit of reading books every night",
  ],
};

function shuffleWords(sentence: string): string[] {
  const words = sentence.split(" ");
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.join(" ") === sentence && words.length > 1) {
    return shuffleWords(sentence);
  }
  return arr;
}

function getSentenceForLevel(level: number, seenIdx: number): string {
  const bank = SENTENCE_BANK[level] ?? SENTENCE_BANK[5];
  return bank[seenIdx % bank.length];
}

type ResultState = "correct" | "wrong" | null;

export default function GrammarPage() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState<WordArrangeProgress>(getProgress);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [tiles, setTiles] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [result, setResult] = useState<ResultState>(null);
  const [justLeveled, setJustLeveled] = useState(false);

  const loadSentence = useCallback((level: number, idx: number) => {
    const sentence = getSentenceForLevel(level, idx);
    setCurrentSentence(sentence);
    setTiles(shuffleWords(sentence));
    setBuilt([]);
    setResult(null);
  }, []);

  useEffect(() => {
    loadSentence(progress.level, sentenceIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addWord(wordIdx: number) {
    if (result !== null) return;
    const word = tiles[wordIdx];
    setBuilt(prev => [...prev, word]);
    setTiles(prev => prev.filter((_, i) => i !== wordIdx));
  }

  function removeWord(builtIdx: number) {
    if (result !== null) return;
    const word = built[builtIdx];
    setBuilt(prev => prev.filter((_, i) => i !== builtIdx));
    setTiles(prev => [...prev, word]);
  }

  function checkAnswer() {
    if (built.length === 0 || result !== null) return;
    const isCorrect = built.join(" ") === currentSentence;
    setResult(isCorrect ? "correct" : "wrong");
  }

  function handleNext() {
    let { level, correctInLevel } = progress;
    if (result === "correct") {
      correctInLevel += 1;
      if (correctInLevel >= REQUIRED_TO_ADVANCE) {
        const maxLevel = Math.max(...Object.keys(SENTENCE_BANK).map(Number));
        if (level < maxLevel) {
          level += 1;
          correctInLevel = 0;
          setJustLeveled(true);
          setTimeout(() => setJustLeveled(false), 2500);
        } else {
          correctInLevel = REQUIRED_TO_ADVANCE;
        }
      }
    }
    const newProgress = { level, correctInLevel };
    setProgress(newProgress);
    saveProgress(newProgress);
    const nextIdx = sentenceIdx + 1;
    setSentenceIdx(nextIdx);
    loadSentence(level, nextIdx);
  }

  function handleReset() {
    setBuilt([]);
    setTiles(shuffleWords(currentSentence));
    setResult(null);
  }

  const allPlaced = tiles.length === 0;
  const maxLevel = Math.max(...Object.keys(SENTENCE_BANK).map(Number));

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{ background: "#f2f5f9" }}>
      {justLeveled && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl flex items-center gap-2"
          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", maxWidth: "90vw" }}
        >
          <Zap size={16} />
          Level Up! You're now on Level {progress.level} 🎉
        </div>
      )}

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
          <span className="text-base">🧩</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm leading-tight">Word Arrange</p>
          <p className="text-[11px] text-muted-foreground">Build the correct sentence</p>
        </div>
        <div
          className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
          style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
        >
          Lv.{progress.level}
        </div>
      </div>

      {/* Level progress bar */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] text-slate-500 font-semibold">
            Level {progress.level}: {Math.min(progress.correctInLevel, REQUIRED_TO_ADVANCE)}/{REQUIRED_TO_ADVANCE} completed
          </p>
          {progress.level < maxLevel ? (
            <p className="text-[10px] text-slate-400">{REQUIRED_TO_ADVANCE - Math.min(progress.correctInLevel, REQUIRED_TO_ADVANCE)} more to level up</p>
          ) : (
            <p className="text-[10px] text-amber-500 font-bold">🏆 Max Level!</p>
          )}
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${(Math.min(progress.correctInLevel, REQUIRED_TO_ADVANCE) / REQUIRED_TO_ADVANCE) * 100}%`,
              background: "linear-gradient(90deg,#0e5fa8,#1a8fd1)",
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <p className="text-center text-[13px] text-slate-500 font-medium">
          Tap the words in the correct order to build the sentence 👇
        </p>

        {/* Sentence building area */}
        <div
          className="min-h-[80px] rounded-2xl p-3 flex flex-wrap gap-2 items-start content-start"
          style={{
            background: "white",
            border: result === "correct" ? "2px solid #22c55e" : result === "wrong" ? "2px solid #ef4444" : "2px dashed #cbd5e1",
          }}
        >
          {built.length === 0 ? (
            <p className="text-slate-300 text-sm w-full text-center py-4 select-none">Tap words below to start...</p>
          ) : (
            built.map((word, i) => (
              <button
                key={`b-${i}-${word}`}
                onClick={() => removeWord(i)}
                disabled={result !== null}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: result === "correct" ? "rgba(34,197,94,0.15)" : result === "wrong" ? "rgba(239,68,68,0.1)" : "rgba(14,95,168,0.1)",
                  color: result === "correct" ? "#15803d" : result === "wrong" ? "#dc2626" : "#0e5fa8",
                  border: result === "correct" ? "1.5px solid #22c55e" : result === "wrong" ? "1.5px solid #ef4444" : "1.5px solid rgba(14,95,168,0.3)",
                  cursor: result !== null ? "default" : "pointer",
                }}
              >
                {word}
              </button>
            ))
          )}
        </div>

        {/* Result feedback */}
        {result === "correct" && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(34,197,94,0.1)", border: "1.5px solid #22c55e" }}>
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-green-700 text-sm">Correct!</p>
              <p className="text-green-600 text-[12px]">Great job! You built the sentence perfectly.</p>
            </div>
          </div>
        )}

        {result === "wrong" && (
          <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: "rgba(239,68,68,0.07)", border: "1.5px solid #ef4444" }}>
            <span className="text-2xl shrink-0">❌</span>
            <div>
              <p className="font-bold text-red-700 text-sm">Not quite!</p>
              <p className="text-slate-500 text-[12px] mt-0.5">Correct order:</p>
              <p className="text-slate-800 text-[13px] font-semibold mt-0.5">{currentSentence}</p>
            </div>
          </div>
        )}

        {/* Word tile pool */}
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-2">Word Tiles</p>
          <div className="flex flex-wrap gap-2">
            {tiles.map((word, i) => (
              <button
                key={`t-${i}-${word}`}
                onClick={() => addWord(i)}
                disabled={result !== null}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm"
                style={{
                  background: "white",
                  color: "#1e293b",
                  border: "1.5px solid #e2e8f0",
                  cursor: result !== null ? "default" : "pointer",
                  opacity: result !== null ? 0.5 : 1,
                }}
              >
                {word}
              </button>
            ))}
            {tiles.length === 0 && result === null && (
              <p className="text-[12px] text-slate-400 italic">All words placed — check your answer!</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pb-4">
          {result === null ? (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: "white", color: "#64748b", border: "1.5px solid #e2e8f0", flex: 1 }}
              >
                <RotateCcw size={14} />
                Reset
              </button>
              <button
                onClick={checkAnswer}
                disabled={!allPlaced || built.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)", flex: 2 }}
              >
                Check Answer ✓
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: result === "correct" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
            >
              Next Sentence
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

