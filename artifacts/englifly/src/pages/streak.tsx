import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import {
  getStreak, updateStreak, getBadgeTier, getProgressToNextTier,
  type StreakData,
} from "@/lib/streakSystem";
import { BottomNav } from "@/components/BottomNav";

const BADGE_CONFIG = {
  bronze: { label: "Bronze", color: "#cd7f32", shadow: "rgba(205,127,50,0.35)", emoji: "🥉", range: "1–6 days" },
  silver: { label: "Silver", color: "#a8a9ad", shadow: "rgba(168,169,173,0.35)", emoji: "🥈", range: "7–14 days" },
  gold:   { label: "Gold",   color: "#ffd700", shadow: "rgba(255,215,0,0.45)",   emoji: "🥇", range: "15+ days" },
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

  useEffect(() => { setStreak(updateStreak()); }, []);
  useEffect(() => {
    const handler = () => setStreak(getStreak());
    window.addEventListener("ef:streak-updated", handler);
    return () => window.removeEventListener("ef:streak-updated", handler);
  }, []);

  const currentTier = getBadgeTier(streak.currentStreak);
  const prog = getProgressToNextTier(streak.currentStreak);
  const days15 = Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <div className="clay-page pb-28">
      {/* Clay Header */}
      <div className="clay-header px-5 pt-10 pb-6 flex items-center gap-3">
        <button
          onClick={() => setLocation("/home")}
          className="w-10 h-10 rounded-[16px] flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.22)" }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div>
          <p className="text-white font-black text-[18px] leading-tight">Streak Badges 🔥</p>
          <p className="text-white/65 text-[11px]">Daily practice keeps your streak alive!</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ── Badge Tiers Card ── */}
        <div className="clay-card p-5 fade-up">
          <p className="text-[11px] font-black text-[#6B7785] uppercase tracking-widest mb-4">Badge Tiers</p>
          <div className="flex justify-around items-end">
            {TIERS.map(tier => {
              const cfg = BADGE_CONFIG[tier];
              const isActive = currentTier === tier;
              const tierProg = tier === currentTier ? prog : null;
              return (
                <div key={tier} className="flex flex-col items-center gap-2">
                  <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                    {isActive && (
                      <div className="absolute inset-0 rounded-full"
                        style={{ boxShadow: `0 0 20px 6px ${cfg.shadow}` }} />
                    )}
                    {isActive && tierProg && (
                      <CircularProgress progress={tierProg.progress} max={tierProg.max} color={cfg.color} />
                    )}
                    <div
                      className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300"
                      style={{
                        background: isActive
                          ? `radial-gradient(circle at 38% 38%, ${cfg.color}aa, ${cfg.color}44)`
                          : "#EAF4FF",
                        border: `2.5px solid ${isActive ? cfg.color : "rgba(28,176,246,0.2)"}`,
                        opacity: isActive ? 1 : 0.45,
                        transform: isActive ? "scale(1.1)" : "scale(1)",
                        boxShadow: isActive
                          ? `-2px -2px 6px rgba(255,255,255,0.7), 3px 3px 10px ${cfg.shadow}`
                          : "none",
                      }}>
                      {cfg.emoji}
                    </div>
                  </div>
                  <p className="text-[13px] font-black" style={{ color: isActive ? cfg.color : "#94a3b8" }}>{cfg.label}</p>
                  <p className="text-[10px] text-[#6B7785]">{cfg.range}</p>
                  {isActive && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: cfg.color }}>Active</span>
                  )}
                </div>
              );
            })}
          </div>
          {prog.next && (
            <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: "#EAF4FF" }}>
              <p className="text-[13px] text-[#6B7785]">
                <span className="font-black text-[#1A2B3C]">{prog.max - prog.progress}</span> more day{prog.max - prog.progress !== 1 ? "s" : ""} to reach{" "}
                <span className="font-black" style={{ color: BADGE_CONFIG[prog.next].color }}>{BADGE_CONFIG[prog.next].label}</span>!
              </p>
            </div>
          )}
          {!prog.next && (
            <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: "#EAF4FF" }}>
              <p className="text-[13px] font-black" style={{ color: "#FF9600" }}>🏆 You've reached the highest tier!</p>
            </div>
          )}
        </div>

        {/* ── 15-Day Progress Track ── */}
        <div className="clay-card p-5 fade-up" style={{ animationDelay: "0.06s" }}>
          <p className="text-[11px] font-black text-[#6B7785] uppercase tracking-widest mb-4">15-Day Progress</p>
          <div className="grid grid-cols-5 gap-3">
            {days15.map((day) => {
              const filled = day <= Math.min(streak.currentStreak, 15);
              const isCurrent = day === streak.currentStreak && streak.currentStreak > 0;
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[12px] font-black transition-all duration-300"
                    style={{
                      background: filled ? "linear-gradient(135deg,#58CC02,#43a800)" : "#EAF4FF",
                      color: filled ? "#fff" : "#94a3b8",
                      boxShadow: filled
                        ? "-2px -2px 5px rgba(255,255,255,0.6), 3px 3px 8px rgba(88,204,2,0.35)"
                        : "inset 2px 2px 5px rgba(28,176,246,0.12), inset -1px -1px 3px rgba(255,255,255,0.9)",
                      transform: isCurrent ? "scale(1.15)" : "scale(1)",
                    }}>
                    {filled ? "✓" : day}
                  </div>
                  <span className="text-[9px] text-[#6B7785] font-bold">D{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 gap-3 fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="clay-card p-5 flex flex-col items-center gap-1"
            style={{ background: "linear-gradient(135deg,#1CB0F6,#0E8FD4)", boxShadow: "-4px -4px 10px rgba(255,255,255,0.4), 6px 6px 18px rgba(14,143,212,0.45)" }}>
            <span className="text-3xl">🔥</span>
            <p className="text-white font-black text-4xl leading-tight">{streak.currentStreak}</p>
            <p className="text-white/70 text-[11px] font-bold">Current Streak</p>
          </div>
          <div className="clay-card p-5 flex flex-col items-center gap-1"
            style={{ background: "linear-gradient(135deg,#FF9600,#e07800)", boxShadow: "-4px -4px 10px rgba(255,255,255,0.4), 6px 6px 18px rgba(224,120,0,0.45)" }}>
            <span className="text-3xl">🏆</span>
            <p className="text-white font-black text-4xl leading-tight">{streak.longestStreak}</p>
            <p className="text-white/70 text-[11px] font-bold">Longest Streak</p>
          </div>
        </div>

        {/* ── Tip ── */}
        <div className="clay-card p-4 flex items-start gap-3 fade-up" style={{ animationDelay: "0.14s" }}>
          <span className="text-2xl shrink-0">💡</span>
          <p className="text-[13px] text-[#6B7785] leading-relaxed">
            Practice at least once every day to keep your streak alive. Missing a day resets it back to 1!
          </p>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
