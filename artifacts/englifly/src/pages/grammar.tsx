import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, RotateCcw, Zap } from "lucide-react";
import { playClickSound, playCorrectSound, playWrongSound } from "@/lib/sounds";
import { BottomNav } from "@/components/BottomNav";

const WORD_ARRANGE_KEY = "ef_word_arrange_v1";
const REQUIRED_TO_ADVANCE = 5;

interface WordArrangeProgress { level: number; correctInLevel: number; }

function getProgress(): WordArrangeProgress {
  try { const r = localStorage.getItem(WORD_ARRANGE_KEY); return r ? JSON.parse(r) : { level: 1, correctInLevel: 0 }; }
  catch { return { level: 1, correctInLevel: 0 }; }
}
function saveProgress(p: WordArrangeProgress) { localStorage.setItem(WORD_ARRANGE_KEY, JSON.stringify(p)); }

const SENTENCE_BANK: Record<number, string[]> = {
  1: ["I go to school","She is happy","He likes tea","We eat food","The cat is big","I drink water","She reads books","He plays cricket"],
  2: ["I am going to school today","She does not like apples","He went to the market yesterday","We have a big house","They are playing cricket outside","I will call you tomorrow","She cannot come to the party","He always wakes up early"],
  3: ["I was watching TV when she called me","She has been learning English for two years","We should study hard to pass the exam","They had already eaten when we arrived","He will go to the office if it rains","I have never seen such a beautiful place"],
  4: ["Although it was raining we decided to go out","She would have passed if she had studied harder","He is not only smart but also very hardworking","I wish I had more time to practice English every day","By the time we reached the station the train had left"],
  5: ["Having finished his work he went home to rest","Not only did she win the competition but she also broke the record","It is essential that every student submit the assignment on time","Despite the heavy traffic she managed to reach the office on time"],
};

function shuffleWords(sentence: string): string[] {
  const arr = sentence.split(" ");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join(" ") === sentence && arr.length > 1 ? shuffleWords(sentence) : arr;
}

function getSentenceForLevel(level: number, idx: number): string {
  const bank = SENTENCE_BANK[level] ?? SENTENCE_BANK[5];
  return bank[idx % bank.length];
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
  const [shaking, setShaking] = useState(false);
  const [glowing, setGlowing] = useState(false);
  const [newTileIdx, setNewTileIdx] = useState<number | null>(null);

  const loadSentence = useCallback((level: number, idx: number) => {
    const sentence = getSentenceForLevel(level, idx);
    setCurrentSentence(sentence);
    setTiles(shuffleWords(sentence));
    setBuilt([]); setResult(null); setShaking(false); setGlowing(false);
  }, []);

  useEffect(() => { loadSentence(progress.level, sentenceIdx); }, []);

  function addWord(wordIdx: number) {
    if (result !== null) return;
    playClickSound();
    setNewTileIdx(built.length);
    setTimeout(() => setNewTileIdx(null), 300);
    const word = tiles[wordIdx];
    setBuilt(prev => [...prev, word]);
    setTiles(prev => prev.filter((_, i) => i !== wordIdx));
  }

  function removeWord(builtIdx: number) {
    if (result !== null) return;
    playClickSound();
    const word = built[builtIdx];
    setBuilt(prev => prev.filter((_, i) => i !== builtIdx));
    setTiles(prev => [...prev, word]);
  }

  function checkAnswer() {
    if (built.length === 0 || result !== null) return;
    const isCorrect = built.join(" ") === currentSentence;
    setResult(isCorrect ? "correct" : "wrong");
    if (isCorrect) { playCorrectSound(); setGlowing(true); }
    else { playWrongSound(); setShaking(true); setTimeout(() => setShaking(false), 600); }
  }

  function handleNext() {
    let { level, correctInLevel } = progress;
    if (result === "correct") {
      correctInLevel += 1;
      if (correctInLevel >= REQUIRED_TO_ADVANCE) {
        const maxLevel = Math.max(...Object.keys(SENTENCE_BANK).map(Number));
        if (level < maxLevel) { level += 1; correctInLevel = 0; setJustLeveled(true); setTimeout(() => setJustLeveled(false), 2500); }
        else { correctInLevel = REQUIRED_TO_ADVANCE; }
      }
    }
    const newProg = { level, correctInLevel };
    setProgress(newProg); saveProgress(newProg);
    const nextIdx = sentenceIdx + 1;
    setSentenceIdx(nextIdx);
    loadSentence(level, nextIdx);
  }

  function handleReset() {
    setBuilt([]); setTiles(shuffleWords(currentSentence));
    setResult(null); setShaking(false); setGlowing(false);
  }

  const allPlaced = tiles.length === 0;
  const maxLevel = Math.max(...Object.keys(SENTENCE_BANK).map(Number));

  return (
    <div className="clay-page pb-28 flex flex-col min-h-screen">
      {justLeveled && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[18px] text-white text-[13px] font-black shadow-xl flex items-center gap-2"
          style={{ background: "linear-gradient(135deg,#FF9600,#e07800)", boxShadow: "-3px -3px 8px rgba(255,255,255,0.4), 4px 4px 12px rgba(224,120,0,0.5)", maxWidth: "90vw" }}>
          <Zap size={16} />Level Up! You're now on Level {progress.level} 🎉
        </div>
      )}

      {/* Clay Header */}
      <div className="clay-header px-5 pt-10 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setLocation("/home")}
            className="w-10 h-10 rounded-[16px] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.22)" }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white font-black text-[18px]">Word Arrange 🧩</p>
            <p className="text-white/65 text-[11px]">Build the correct sentence</p>
          </div>
          <div className="px-3 py-1.5 rounded-full text-white text-[11px] font-black"
            style={{ background: "rgba(255,255,255,0.22)" }}>
            Lv.{progress.level}
          </div>
        </div>

        {/* Level progress bar */}
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-white/80 text-[11px] font-bold">
            Level {progress.level}: {Math.min(progress.correctInLevel, REQUIRED_TO_ADVANCE)}/{REQUIRED_TO_ADVANCE}
          </p>
          {progress.level < maxLevel
            ? <p className="text-white/55 text-[10px]">{REQUIRED_TO_ADVANCE - Math.min(progress.correctInLevel, REQUIRED_TO_ADVANCE)} more to level up</p>
            : <p className="text-[10px] font-black" style={{ color: "#7de800" }}>🏆 Max Level!</p>}
        </div>
        <div className="clay-track h-2.5 w-full" style={{ background: "rgba(255,255,255,0.2)", boxShadow: "none" }}>
          <div className="clay-fill h-2.5" style={{ background: "white", boxShadow: "0 2px 6px rgba(255,255,255,0.4)", width: `${(Math.min(progress.correctInLevel, REQUIRED_TO_ADVANCE) / REQUIRED_TO_ADVANCE) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">

        <p className="text-center text-[13px] text-[#6B7785] font-semibold">
          Tap words in the correct order 👇
        </p>

        {/* Sentence builder — clay inset */}
        <div
          className={`clay-builder min-h-[88px] p-3 flex flex-wrap gap-2 items-start content-start ${shaking ? "word-shake" : ""}`}
          style={{
            boxShadow: glowing
              ? "0 0 0 3px #58CC02, inset 3px 3px 8px rgba(28,176,246,0.12), inset -3px -3px 8px rgba(255,255,255,0.85)"
              : result === "wrong"
              ? "0 0 0 2px #ef4444, inset 3px 3px 8px rgba(28,176,246,0.12), inset -3px -3px 8px rgba(255,255,255,0.85)"
              : undefined,
            transition: "box-shadow 0.2s ease",
          }}>
          {built.length === 0 ? (
            <p className="text-[#94a3b8] text-[13px] w-full text-center py-5 select-none">Tap words below to start…</p>
          ) : (
            built.map((word, i) => (
              <button
                key={`b-${i}-${word}`}
                onClick={() => removeWord(i)}
                disabled={result !== null}
                className={`px-3 py-1.5 text-[13px] font-bold transition-all ${i === newTileIdx ? "tile-enter" : ""}`}
                style={{
                  background: result === "correct" ? "linear-gradient(135deg,#58CC02,#43a800)"
                             : result === "wrong"   ? "linear-gradient(135deg,#ef4444,#dc2626)"
                             : "linear-gradient(135deg,#1CB0F6,#0E8FD4)",
                  color: "#fff",
                  borderRadius: 12,
                  boxShadow: result !== null ? "none" : "-1px -1px 3px rgba(255,255,255,0.4), 2px 2px 6px rgba(14,143,212,0.35)",
                  cursor: result !== null ? "default" : "pointer",
                }}>
                {word}
              </button>
            ))
          )}
        </div>

        {/* Result feedback */}
        {result === "correct" && (
          <div className="clay-card p-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,#e8ffd4,#d4f7b0)", boxShadow: "-3px -3px 8px rgba(255,255,255,0.7), 4px 4px 12px rgba(88,204,2,0.3)" }}>
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-black text-[14px]" style={{ color: "#1e5c00" }}>Correct! Great job!</p>
              <p className="text-[11px]" style={{ color: "#2d7a00" }}>You built the sentence perfectly.</p>
            </div>
          </div>
        )}
        {result === "wrong" && (
          <div className="clay-card p-4 flex items-start gap-3"
            style={{ background: "linear-gradient(135deg,#fff0f0,#fecaca)", boxShadow: "-3px -3px 8px rgba(255,255,255,0.7), 4px 4px 12px rgba(239,68,68,0.25)" }}>
            <span className="text-2xl shrink-0">❌</span>
            <div>
              <p className="font-black text-[14px]" style={{ color: "#7f1d1d" }}>Not quite!</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#991b1b" }}>Correct: <span className="font-bold">{currentSentence}</span></p>
            </div>
          </div>
        )}

        {/* Word tiles */}
        <div>
          <p className="text-[11px] font-black text-[#6B7785] uppercase tracking-widest mb-2.5">Word Tiles</p>
          <div className="flex flex-wrap gap-2.5">
            {tiles.map((word, i) => (
              <button
                key={`t-${i}-${word}`}
                onClick={() => addWord(i)}
                disabled={result !== null}
                className="clay-tile px-4 py-2 text-[13px] font-bold"
                style={{
                  color: "#1A2B3C",
                  opacity: result !== null ? 0.38 : 1,
                  cursor: result !== null ? "default" : "pointer",
                }}>
                {word}
              </button>
            ))}
            {tiles.length === 0 && result === null && (
              <p className="text-[12px] text-[#6B7785] italic">All placed — check your answer!</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pb-2">
          {result === null ? (
            <>
              <button onClick={handleReset}
                className="clay-btn-white flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px]">
                <RotateCcw size={14} />Reset
              </button>
              <button onClick={checkAnswer}
                disabled={!allPlaced || built.length === 0}
                className="clay-btn flex-[2] py-3.5 text-[14px] disabled:opacity-40">
                Check Answer ✓
              </button>
            </>
          ) : (
            <button onClick={handleNext}
              className={result === "correct" ? "clay-btn-green w-full py-4 text-[14px]" : "clay-btn w-full py-4 text-[14px]"}>
              Next Sentence →
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
