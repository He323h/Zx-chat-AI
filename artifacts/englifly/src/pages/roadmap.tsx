import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lock, CheckCircle, ChevronRight } from "lucide-react";
import {
  getTopicsWithStatus, hasSeenWelcome, markWelcomeSeen,
  type TopicStatus, type RoadmapTopic, type TenseGroup,
} from "@/lib/roadmapData";

type TopicWithStatus = RoadmapTopic & { status: TopicStatus };

const GROUP_META: Record<TenseGroup, { label: string; emoji: string; color: string; bg: string }> = {
  present: { label: "Present Tense", emoji: "🟢", color: "#059669", bg: "linear-gradient(135deg,#059669,#10b981)" },
  past:    { label: "Past Tense",    emoji: "⏮️", color: "#d97706", bg: "linear-gradient(135deg,#d97706,#f59e0b)" },
  future:  { label: "Future Tense",  emoji: "🔮", color: "#7c3aed", bg: "linear-gradient(135deg,#7c3aed,#8b5cf6)" },
};

function TopicRow({ topic, index, onOpen }: { topic: TopicWithStatus; index: number; onOpen: (id: string) => void }) {
  const isCompleted = topic.status === "completed";
  const isCurrent   = topic.status === "current";
  const isLocked    = topic.status === "locked";
  const meta = GROUP_META[topic.group];

  return (
    <button
      disabled={isLocked}
      onClick={() => !isLocked && onOpen(topic.id)}
      className="w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98] text-left"
      style={{
        background: isCompleted ? "linear-gradient(135deg,#22c55e,#16a34a)" :
                    isCurrent   ? "white" :
                    "white",
        border: isCompleted ? "none" :
                isCurrent   ? `2px solid ${meta.color}` :
                "1.5px dashed #e2e8f0",
        opacity: isLocked ? 0.55 : 1,
        cursor: isLocked ? "default" : "pointer",
        boxShadow: isCurrent ? `0 0 0 4px ${meta.color}20, 0 4px 16px ${meta.color}18` :
                   isCompleted ? "0 4px 16px rgba(34,197,94,0.2)" : "0 2px 8px rgba(0,0,0,0.05)",
      }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{
          background: isCompleted ? "rgba(255,255,255,0.25)" :
                      isCurrent   ? meta.bg :
                      "rgba(0,0,0,0.04)",
        }}>
        {isCompleted ? <CheckCircle size={20} className="text-white" /> :
         isLocked    ? <Lock size={16} className="text-slate-300" /> :
         <span>{topic.emoji}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-sm leading-tight"
            style={{ color: isCompleted ? "#fff" : isCurrent ? "#1e293b" : "#94a3b8" }}>
            {topic.title}
          </p>
          {isCurrent && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: meta.color }}>
              NOW
            </span>
          )}
        </div>
        <p className="text-[11px] leading-tight truncate"
          style={{ color: isCompleted ? "rgba(255,255,255,0.75)" : isCurrent ? "#64748b" : "#cbd5e1" }}>
          {topic.formula}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: isCompleted ? "rgba(255,255,255,0.6)" : "#94a3b8" }}>
          {topic.description}
        </p>
      </div>

      {!isLocked && (
        <ChevronRight size={16} style={{ color: isCompleted ? "rgba(255,255,255,0.6)" : meta.color, flexShrink: 0 }} />
      )}
    </button>
  );
}

export default function RoadmapPage() {
  const [, setLocation] = useLocation();
  const [topics, setTopics] = useState<TopicWithStatus[]>(() => getTopicsWithStatus());
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!hasSeenWelcome()) {
      setShowWelcome(true);
    }
  }, []);

  function dismissWelcome() {
    markWelcomeSeen();
    setShowWelcome(false);
  }

  function handleOpen(id: string) {
    setLocation(`/lesson/${id}`);
  }

  const presentTopics = topics.filter(t => t.group === "present");
  const pastTopics    = topics.filter(t => t.group === "past");
  const futureTopics  = topics.filter(t => t.group === "future");

  const completedCount = topics.filter(t => t.status === "completed").length;
  const totalCount = topics.length;

  const isPastUnlocked = pastTopics.some(t => t.status !== "locked");
  const isFutureUnlocked = futureTopics.some(t => t.status !== "locked");

  function GroupSection({
    group, groupTopics, unlocked,
  }: { group: TenseGroup; groupTopics: TopicWithStatus[]; unlocked: boolean }) {
    const meta = GROUP_META[group];
    const done = groupTopics.filter(t => t.status === "completed").length;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-base shrink-0"
            style={{ background: unlocked ? meta.bg : "#e2e8f0" }}>
            {unlocked ? meta.emoji : <Lock size={14} className="text-slate-400" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: unlocked ? "#1e293b" : "#94a3b8" }}>
              {meta.label}
            </p>
            <p className="text-[11px]" style={{ color: unlocked ? "#64748b" : "#cbd5e1" }}>
              {unlocked ? `${done}/${groupTopics.length} completed` : `Locked — complete ${group === "past" ? "Present" : "Past"} Tense first`}
            </p>
          </div>
          {unlocked && done === groupTopics.length && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: "#22c55e" }}>✓ Done</span>
          )}
        </div>

        <div className="space-y-2 pl-2 border-l-2" style={{ borderColor: unlocked ? meta.color + "40" : "#e2e8f0" }}>
          {groupTopics.map((topic, i) => (
            <div key={topic.id} className="fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <TopicRow topic={topic} index={i} onOpen={handleOpen} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f2f5f9" }}>
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">📚</div>
              <p className="text-slate-800 font-black text-xl leading-tight">
                Grammar Learning Path
              </p>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Let's start with <span className="font-bold text-green-600">Present Tense</span> before moving to Past and Future.
                Each tense unlocks the next!
              </p>
            </div>
            <div className="space-y-2 mb-5">
              {(["present", "past", "future"] as TenseGroup[]).map((g) => {
                const m = GROUP_META[g];
                return (
                  <div key={g} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <span className="text-xl">{m.emoji}</span>
                    <p className="text-sm font-semibold text-slate-700">{m.label}</p>
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: g === "present" ? m.color : "#94a3b8" }}>
                      {g === "present" ? "Start here" : "Locked"}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={dismissWelcome}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
              Let's Start! 🚀
            </button>
          </div>
        </div>
      )}

      <div
        className="px-4 pt-10 pb-6"
        style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLocation("/home")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white font-bold text-lg leading-tight">Tense Learning Path</p>
            <p className="text-white/60 text-xs">Present → Past → Future</p>
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-sm font-semibold">Overall Progress</p>
            <p className="text-white font-bold">{completedCount}/{totalCount}</p>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%`, background: "white" }} />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        <GroupSection group="present" groupTopics={presentTopics} unlocked={true} />
        <GroupSection group="past"    groupTopics={pastTopics}    unlocked={isPastUnlocked} />
        <GroupSection group="future"  groupTopics={futureTopics}  unlocked={isFutureUnlocked} />

        <div className="mt-2 rounded-2xl p-4 flex flex-wrap gap-3" style={{ background: "white" }}>
          {[
            { color: "#22c55e", label: "Completed" },
            { color: "#059669", label: "Current (tap to learn)" },
            { color: "#e2e8f0", label: "Locked", dashed: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full shrink-0"
                style={{ background: item.color, border: item.dashed ? `2px dashed ${item.color}` : "none" }} />
              <span className="text-[11px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
