import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";
import {
  getTopicsWithStatus, completeTopic,
  type TopicStatus, type RoadmapTopic,
} from "@/lib/roadmapData";

type TopicWithStatus = RoadmapTopic & { status: TopicStatus };

function TopicNode({
  topic,
  index,
  onComplete,
}: {
  topic: TopicWithStatus;
  index: number;
  onComplete: (id: string) => void;
}) {
  const isLeft = index % 2 === 0;
  const isCompleted = topic.status === "completed";
  const isCurrent = topic.status === "current";
  const isLocked = topic.status === "locked";

  let bg = "white";
  let border = "2px solid #e2e8f0";
  let shadow = "0 2px 8px rgba(0,0,0,0.06)";
  let glow = "";

  if (isCompleted) {
    bg = "linear-gradient(135deg,#22c55e,#16a34a)";
    border = "2px solid #16a34a";
  } else if (isCurrent) {
    bg = "linear-gradient(135deg,#0e5fa8,#1a8fd1)";
    border = "2px solid #1a8fd1";
    glow = "0 0 0 4px rgba(26,143,209,0.2), 0 4px 16px rgba(14,95,168,0.3)";
    shadow = glow;
  } else {
    bg = "#f8fafc";
    border = "2px dashed #cbd5e1";
  }

  return (
    <div
      className={`flex ${isLeft ? "justify-start" : "justify-end"} w-full`}
    >
      <button
        disabled={isLocked}
        onClick={() => !isLocked && onComplete(topic.id)}
        className="relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 active:scale-[0.97] text-left"
        style={{
          background: bg,
          border,
          boxShadow: shadow,
          width: "calc(50% + 24px)",
          opacity: isLocked ? 0.6 : 1,
          cursor: isLocked ? "default" : "pointer",
        }}
      >
        {/* Number badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black shrink-0"
          style={{
            background: isCompleted ? "rgba(255,255,255,0.3)"
              : isCurrent ? "rgba(255,255,255,0.25)"
              : "rgba(0,0,0,0.06)",
            color: (isCompleted || isCurrent) ? "#fff" : "#94a3b8",
          }}
        >
          {isCompleted ? <CheckCircle size={16} className="text-white" /> : isLocked ? <Lock size={13} className="text-slate-400" /> : index + 1}
        </div>

        {/* Emoji + title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl shrink-0">{topic.emoji}</span>
          <div className="min-w-0">
            <p
              className="font-bold text-[13px] leading-tight truncate"
              style={{ color: (isCompleted || isCurrent) ? "#fff" : "#1e293b" }}
            >
              {topic.title}
            </p>
            <p
              className="text-[10px] leading-tight truncate mt-0.5"
              style={{ color: (isCompleted || isCurrent) ? "rgba(255,255,255,0.7)" : "#94a3b8" }}
            >
              {topic.description}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {isCurrent && (
          <span
            className="absolute -top-2 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ background: "#f59e0b" }}
          >
            NOW
          </span>
        )}
        {isCompleted && (
          <span
            className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ background: "#22c55e" }}
          >
            ✓
          </span>
        )}
      </button>
    </div>
  );
}

export default function RoadmapPage() {
  const [, setLocation] = useLocation();
  const [topics, setTopics] = useState<TopicWithStatus[]>(() => getTopicsWithStatus());
  const [toast, setToast] = useState<string | null>(null);

  const completedCount = topics.filter(t => t.status === "completed").length;
  const totalCount = topics.length;

  function handleComplete(id: string) {
    const topic = topics.find(t => t.id === id);
    if (!topic || topic.status === "locked") return;
    setLocation(`/lesson/${id}`);
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f2f5f9" }}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-lg"
          style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", maxWidth: "90vw" }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        className="px-4 pt-10 pb-6"
        style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
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
            <p className="text-white font-bold text-lg leading-tight">Learning Roadmap</p>
            <p className="text-white/60 text-xs">Complete each topic to unlock the next</p>
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-sm font-semibold">Overall Progress</p>
            <p className="text-white font-bold">{completedCount}/{totalCount}</p>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
                background: "white",
              }}
            />
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="max-w-lg mx-auto px-4 pt-5">
        <div className="relative">
          {/* SVG connector lines */}
          <svg
            className="absolute inset-0 w-full pointer-events-none"
            style={{ height: topics.length * 88 }}
            overflow="visible"
          >
            {topics.slice(0, -1).map((topic, i) => {
              const isLeft = i % 2 === 0;
              const nextLocked = topics[i + 1]?.status === "locked";
              const y1 = i * 88 + 44;
              const y2 = (i + 1) * 88 + 44;
              const x1 = isLeft ? "calc(50% - 24px)" : "calc(50% + 24px)";
              const x2 = isLeft ? "calc(50% + 24px)" : "calc(50% - 24px)";

              return (
                <path
                  key={topic.id}
                  d={`M ${isLeft ? "38%" : "62%"} ${y1} C 50% ${(y1 + y2) / 2}, 50% ${(y1 + y2) / 2}, ${isLeft ? "62%" : "38%"} ${y2}`}
                  fill="none"
                  stroke={nextLocked ? "#cbd5e1" : "#22c55e"}
                  strokeWidth="2.5"
                  strokeDasharray={nextLocked ? "6 4" : "none"}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Topic nodes */}
          <div className="space-y-3">
            {topics.map((topic, i) => (
              <div key={topic.id} className="fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                <TopicNode topic={topic} index={i} onComplete={handleComplete} />
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div
          className="mt-6 rounded-2xl p-4 flex flex-wrap gap-3"
          style={{ background: "white" }}
        >
          {[
            { color: "#22c55e", label: "Completed" },
            { color: "#1a8fd1", label: "Current (tap to finish)" },
            { color: "#cbd5e1", label: "Locked", dashed: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  background: item.color,
                  border: item.dashed ? `2px dashed ${item.color}` : "none",
                }}
              />
              <span className="text-[11px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
