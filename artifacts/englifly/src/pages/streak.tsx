import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import {
  getStreak, updateStreak, getBadgeTier, getProgressToNextTier,
  type StreakData,
} from "@/lib/streakSystem";

const BADGE_CONFIG = {
  bronze: { label: "Bronze", color: "#cd7f32", glow: "rgba(205,127,50,0.4)", emoji: "🥉", range: "1–6 days" },
  silver: { label: "Silver", color: "#a8a9ad", glow: "rgba(168,169,173,0.4)", emoji: "🥈", range: "7–14 days" },
  gold:   { label: "Gold",   color: "#ffd700", glow: "rgba(255,215,0,0.5)",   emoji: "🥇", range: "15+ days" },
} as const;

const TIERS = ["bronze", "silver", "gold"] as const;

function CircularProgress({ progress, max, color }: { progress: number; max: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(progress / max, 1) : 0;
  const dash = pct * circ;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="absolute inset-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}

export default function StreakPage() {
  const [, setLocation] = useLocation();
  const [streak, setStreak] = useState<StreakData>(getStreak());

  useEffect(() => {
    const updated = updateStreak();
    setStreak(updated);
  }, []);

  useEffect(() => {
    const handler = () => setStreak(getStreak());
    window.addEventListener("ef:streak-updated", handler);
    return () => window.removeEventListener("ef:streak-updated", handler);
  }, []);

  const currentTier = getBadgeTier(streak.currentStreak);
  const prog = getProgressToNextTier(streak.currentStreak);

  const days15 = Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f2f5f9" }}>
      {/* Header */}
      <div
        className="px-4 pt-10 pb-6 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
      >
        <button
          onClick={() => setLocation("/home")}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div>
          <p className="text-white font-bold text-lg leading-tight">Streak Badges</p>
          <p className="text-white/60 text-xs">Daily practice keeps your streak alive!</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Badge Tiers */}
        <div className="fade-up bg-white rounded-2xl shadow-sm p-5">
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">Badge Tiers</p>
          <div className="flex justify-around items-end">
            {TIERS.map(tier => {
              const cfg = BADGE_CONFIG[tier];
              const isActive = currentTier === tier;
              const tierProg = tier === currentTier ? prog : null;

              return (
                <div key={tier} className="flex flex-col items-center gap-2">
                  <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                    {/* Glow ring when active */}
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          boxShadow: `0 0 18px 4px ${cfg.glow}`,
                          borderRadius: "50%",
                        }}
                      />
                    )}
                    {/* Arc progress */}
                    {isActive && tierProg && (
                      <CircularProgress
                        progress={tierProg.progress}
                        max={tierProg.max}
                        color={cfg.color}
                      />
                    )}
                    {/* Badge circle */}
                    <div
                      className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300"
                      style={{
                        background: isActive
                          ? `radial-gradient(circle at 40% 40%, ${cfg.color}99, ${cfg.color}44)`
                          : "rgba(0,0,0,0.04)",
                        border: `2.5px solid ${isActive ? cfg.color : "rgba(0,0,0,0.08)"}`,
                        opacity: isActive ? 1 : 0.45,
                        transform: isActive ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      {cfg.emoji}
                    </div>
                  </div>
                  <p
                    className="text-[13px] font-bold"
                    style={{ color: isActive ? cfg.color : "#94a3b8" }}
                  >
                    {cfg.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{cfg.range}</p>
                  {isActive && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: cfg.color }}
                    >
                      Active
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress text */}
          {prog.next && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-700">{prog.max - prog.progress}</span> more day{prog.max - prog.progress !== 1 ? "s" : ""} to reach{" "}
                <span className="font-bold" style={{ color: BADGE_CONFIG[prog.next].color }}>
                  {BADGE_CONFIG[prog.next].label}
                </span>!
              </p>
            </div>
          )}
          {!prog.next && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-sm font-bold text-amber-500">🏆 You've reached the highest tier!</p>
            </div>
          )}
        </div>

        {/* Day Progress Track */}
        <div className="fade-up bg-white rounded-2xl shadow-sm p-5" style={{ animationDelay: "0.06s" }}>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">15-Day Progress</p>
          <div className="grid grid-cols-5 gap-3">
            {days15.map((day) => {
              const filled = day <= Math.min(streak.currentStreak, 15);
              const isCurrent = day === streak.currentStreak && streak.currentStreak > 0;
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300"
                    style={{
                      background: filled
                        ? "linear-gradient(135deg,#22c55e,#16a34a)"
                        : "rgba(0,0,0,0.05)",
                      color: filled ? "#fff" : "#94a3b8",
                      border: filled ? "none" : "1.5px solid #e2e8f0",
                      transform: isCurrent ? "scale(1.12)" : "scale(1)",
                      boxShadow: isCurrent ? "0 0 0 3px rgba(34,197,94,0.3)" : "none",
                    }}
                  >
                    {filled ? "✓" : day}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">D{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="fade-up grid grid-cols-2 gap-3" style={{ animationDelay: "0.1s" }}>
          <div
            className="rounded-2xl p-5 flex flex-col items-center gap-1 shadow-sm"
            style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}
          >
            <span className="text-3xl">🔥</span>
            <p className="text-white font-black text-4xl leading-tight">{streak.currentStreak}</p>
            <p className="text-white/70 text-xs font-medium">Current Streak</p>
          </div>
          <div
            className="rounded-2xl p-5 flex flex-col items-center gap-1 shadow-sm"
            style={{ background: "linear-gradient(135deg,#b45309,#d97706)" }}
          >
            <span className="text-3xl">🏆</span>
            <p className="text-white font-black text-4xl leading-tight">{streak.longestStreak}</p>
            <p className="text-white/70 text-xs font-medium">Longest Streak</p>
          </div>
        </div>

        {/* Tip */}
        <div
          className="fade-up rounded-2xl p-4 flex items-start gap-3"
          style={{ animationDelay: "0.14s", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <span className="text-xl shrink-0">💡</span>
          <p className="text-sm text-slate-600 leading-relaxed">
            Practice at least once every day to keep your streak alive. Missing a day resets it back to 1!
          </p>
        </div>

      </div>
    </div>
  );
}
