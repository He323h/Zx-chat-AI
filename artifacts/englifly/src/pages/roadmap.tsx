import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lock, CheckCircle, ChevronRight } from "lucide-react";
import {
  getTopicsWithStatus, hasSeenWelcome, markWelcomeSeen,
  type TopicStatus, type RoadmapTopic, type TenseGroup,
} from "@/lib/roadmapData";
import { BottomNav } from "@/components/BottomNav";

type TopicWithStatus = RoadmapTopic & { status: TopicStatus };

const GROUP_META: Record<TenseGroup, { label: string; emoji: string; grad: string; shadow: string }> = {
  present: { label: "Present Tense", emoji: "🟢", grad: "linear-gradient(135deg,#58CC02,#43a800)", shadow: "rgba(88,204,2,0.35)" },
  past:    { label: "Past Tense",    emoji: "⏮️", grad: "linear-gradient(135deg,#FF9600,#e07800)", shadow: "rgba(255,150,0,0.35)" },
  future:  { label: "Future Tense",  emoji: "🔮", grad: "linear-gradient(135deg,#7c3aed,#6d28d9)", shadow: "rgba(124,58,237,0.35)" },
};

function TopicRow({ topic, onOpen }: { topic: TopicWithStatus; onOpen: (id: string) => void }) {
  const isCompleted = topic.status === "completed";
  const isCurrent   = topic.status === "current";
  const isLocked    = topic.status === "locked";
  const meta = GROUP_META[topic.group];

  return (
    <button
      disabled={isLocked}
      onClick={() => !isLocked && onOpen(topic.id)}
      className="w-full flex items-center gap-4 text-left transition-all duration-200 active:scale-[0.97]"
      style={{
        background: isCompleted ? meta.grad : "#ffffff",
        borderRadius: 20,
        padding: "14px 16px",
        boxShadow: isCompleted
          ? `-3px -3px 8px rgba(255,255,255,0.4), 4px 4px 12px ${meta.shadow}`
          : isCurrent
          ? `-2px -2px 6px rgba(255,255,255,0.9), 4px 4px 12px ${meta.shadow}`
          : "-2px -2px 6px rgba(255,255,255,0.9), 3px 3px 8px rgba(28,176,246,0.14)",
        opacity: isLocked ? 0.5 : 1,
        cursor: isLocked ? "default" : "pointer",
        border: isCurrent ? `2px solid transparent` : "none",
        outline: isCurrent ? `2px solid rgba(28,176,246,0.35)` : "none",
        outlineOffset: 2,
      }}>
      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-xl"
        style={{
          background: isCompleted
            ? "rgba(255,255,255,0.25)"
            : isCurrent
            ? meta.grad
            : "#EAF4FF",
          boxShadow: isCompleted || isCurrent
            ? "-1px -1px 3px rgba(255,255,255,0.5), 2px 2px 6px rgba(0,0,0,0.12)"
            : "inset 1px 1px 4px rgba(28,176,246,0.12)",
        }}>
        {isCompleted ? <CheckCircle size={18} className="text-white" /> :
         isLocked    ? <Lock size={15} className="text-slate-300" /> :
         <span>{topic.emoji}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-[14px] leading-tight"
            style={{ color: isCompleted || isCurrent ? (isCompleted ? "#fff" : "#1A2B3C") : "#94a3b8" }}>
            {topic.title}
          </p>
          {isCurrent && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
              style={{ background: "linear-gradient(135deg,#1CB0F6,#0E8FD4)" }}>
              START
            </span>
          )}
        </div>
        <p className="text-[11px] leading-tight font-mono"
          style={{ color: isCompleted ? "rgba(255,255,255,0.8)" : isCurrent ? "#1CB0F6" : "#D0D8E4" }}>
          {topic.formula}
        </p>
        <p className="text-[10px] mt-0.5"
          style={{ color: isCompleted ? "rgba(255,255,255,0.65)" : "#94a3b8" }}>
          {topic.description}
        </p>
      </div>

      {!isLocked && (
        <ChevronRight size={16}
          style={{ color: isCompleted ? "rgba(255,255,255,0.7)" : "#1CB0F6", flexShrink: 0 }} />
      )}
    </button>
  );
}

export default function RoadmapPage() {
  const [, setLocation] = useLocation();
  const [topics, setTopics] = useState<TopicWithStatus[]>(() => getTopicsWithStatus());
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => { if (!hasSeenWelcome()) setShowWelcome(true); }, []);

  function dismissWelcome() { markWelcomeSeen(); setShowWelcome(false); }
  function handleOpen(id: string) { setLocation(`/lesson/${id}`); }

  const presentTopics = topics.filter(t => t.group === "present");
  const pastTopics    = topics.filter(t => t.group === "past");
  const futureTopics  = topics.filter(t => t.group === "future");
  const completedCount = topics.filter(t => t.status === "completed").length;
  const isPastUnlocked   = pastTopics.some(t => t.status !== "locked");
  const isFutureUnlocked = futureTopics.some(t => t.status !== "locked");

  function GroupSection({ group, groupTopics, unlocked }: { group: TenseGroup; groupTopics: TopicWithStatus[]; unlocked: boolean }) {
    const meta = GROUP_META[group];
    const done = groupTopics.filter(t => t.status === "completed").length;
    return (
      <div className="clay-card p-4 space-y-3">
        {/* Group header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl shrink-0"
            style={{
              background: unlocked ? meta.grad : "#EAF4FF",
              boxShadow: unlocked ? `-2px -2px 5px rgba(255,255,255,0.5), 3px 3px 8px ${meta.shadow}` : "inset 1px 1px 4px rgba(28,176,246,0.12)",
            }}>
            {unlocked ? meta.emoji : <Lock size={14} className="text-slate-300" />}
          </div>
          <div className="flex-1">
            <p className="font-black text-[14px]" style={{ color: unlocked ? "#1A2B3C" : "#94a3b8" }}>
              {meta.label}
            </p>
            <p className="text-[11px]" style={{ color: unlocked ? "#6B7785" : "#D0D8E4" }}>
              {unlocked
                ? `${done}/${groupTopics.length} completed`
                : `Unlock by completing ${group === "past" ? "Present" : "Past"} Tense`}
            </p>
          </div>
          {unlocked && done === groupTopics.length && (
            <span className="text-[9px] font-black px-2.5 py-1 rounded-full text-white"
              style={{ background: "linear-gradient(135deg,#58CC02,#43a800)" }}>✓ Done</span>
          )}
        </div>

        {/* Progress bar */}
        {unlocked && (
          <div className="clay-track h-2 w-full">
            <div className="clay-fill h-2" style={{ width: `${(done / groupTopics.length) * 100}%` }} />
          </div>
        )}

        {/* Topics */}
        <div className="space-y-2">
          {groupTopics.map(topic => (
            <TopicRow key={topic.id} topic={topic} onOpen={handleOpen} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="clay-page pb-28">
      {/* Welcome modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
          <div className="clay-card p-6 max-w-sm w-full">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">📚</div>
              <p className="text-[#1A2B3C] font-black text-[20px]">Grammar Learning Path</p>
              <p className="text-[#6B7785] text-[13px] mt-2 leading-relaxed">
                Start with <span className="font-black text-[#58CC02]">Present Tense</span>, then unlock Past and Future!
              </p>
            </div>
            <div className="space-y-2 mb-5">
              {(["present", "past", "future"] as TenseGroup[]).map((g) => {
                const m = GROUP_META[g];
                return (
                  <div key={g} className="flex items-center gap-3 px-3 py-2.5 rounded-[16px]"
                    style={{ background: "#EAF4FF", boxShadow: "inset 1px 1px 4px rgba(28,176,246,0.1), inset -1px -1px 3px rgba(255,255,255,0.9)" }}>
                    <span className="text-xl">{m.emoji}</span>
                    <p className="text-[13px] font-bold text-[#1A2B3C] flex-1">{m.label}</p>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: g === "present" ? "linear-gradient(135deg,#1CB0F6,#0E8FD4)" : "#94a3b8" }}>
                      {g === "present" ? "Start here" : "Locked"}
                    </span>
                  </div>
                );
              })}
            </div>
            <button onClick={dismissWelcome}
              className="clay-btn w-full py-4 text-[15px]">
              Let's Start! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Clay Header */}
      <div className="clay-header px-5 pt-10 pb-7">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setLocation("/home")}
            className="w-10 h-10 rounded-[16px] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.22)" }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white font-black text-[18px] leading-tight">Tense Learning Path</p>
            <p className="text-white/65 text-[11px]">Present → Past → Future</p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="rounded-[20px] px-4 py-3"
          style={{ background: "rgba(255,255,255,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-[13px] font-bold">Overall Progress</p>
            <p className="text-white font-black">{completedCount}/{topics.length}</p>
          </div>
          <div className="clay-track h-2.5 w-full">
            <div className="clay-fill h-2.5" style={{ width: `${(completedCount / topics.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <GroupSection group="present" groupTopics={presentTopics} unlocked={true} />
        <GroupSection group="past"    groupTopics={pastTopics}    unlocked={isPastUnlocked} />
        <GroupSection group="future"  groupTopics={futureTopics}  unlocked={isFutureUnlocked} />
      </div>

      <BottomNav />
    </div>
  );
}
