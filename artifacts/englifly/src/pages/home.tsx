import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile, useGetTodayUsage, getGetUserProfileQueryKey, getGetTodayUsageQueryKey } from "@/lib/api";
import { Settings, Users, Mic, ChevronRight, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { getStats, getAccuracy, type DailyStats } from "@/lib/dailyStats";
import { getStreak } from "@/lib/streakSystem";
import { getQuizState } from "@/lib/quizData";
import { getTopicsWithStatus } from "@/lib/roadmapData";
import { BottomNav } from "@/components/BottomNav";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<DailyStats>(getStats());
  const uid = user?.uid ?? "";

  const { data: profile } = useGetUserProfile(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetUserProfileQueryKey({ uid }) } }
  );
  const { data: usage } = useGetTodayUsage(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetTodayUsageQueryKey({ uid }) } }
  );

  useEffect(() => {
    const refresh = () => setStats(getStats());
    window.addEventListener("ef:stats-updated", refresh);
    const t = setInterval(refresh, 10000);
    return () => { window.removeEventListener("ef:stats-updated", refresh); clearInterval(t); };
  }, []);

  const accuracy = getAccuracy();
  const firstName = (user?.displayName ?? user?.email ?? "").split(/[@\s]/)[0] || "Learner";
  const streak = profile?.streak ?? getStreak().currentStreak;
  const remainingMin = usage?.remainingMinutes === 9999 ? null : usage?.remainingMinutes;

  const quizState = getQuizState();
  const roadmapTopics = getTopicsWithStatus();
  const completedTopics = roadmapTopics.filter(t => t.status === "completed").length;

  function goToChat() {
    const hasLevel = localStorage.getItem("ef_level") || profile?.englishLevel;
    setLocation(hasLevel ? "/chat?category=casual" : "/level-select?category=casual");
  }

  return (
    <div className="clay-page pb-28">

      {/* ── Clay Header ── */}
      <div className="clay-header px-5 pt-10 pb-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[18px] flex items-center justify-center text-white font-black text-base"
              style={{ background: "rgba(255,255,255,0.25)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}>
              {firstName[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="text-white font-bold text-[15px] leading-tight">
                Hey, {firstName}! {streak > 0 ? `🔥 ${streak} day streak` : "👋 Welcome"}
              </p>
              <p className="text-white/65 text-[11px]">
                {remainingMin !== null ? `${remainingMin} min left today` : "Unlimited practice"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setLocation("/settings")}
              className="w-9 h-9 rounded-[14px] flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}>
              <Settings size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* Clay stat pills */}
        <div className="flex gap-2 mb-2">
          <StatPill icon="🎯" value={accuracy !== null ? `${accuracy}%` : "—"} label="Accuracy" />
          <StatPill icon="✏️" value={String(stats.corrections)} label="Fixes" />
          <StatPill icon="💬" value={String(stats.msgs)} label="Msgs" />
        </div>
        <div className="flex gap-2">
          <StatPill icon="⏱️" value={stats.minutesPracticed > 0 ? `${stats.minutesPracticed}m` : "0m"} label="Practice" />
          <StatPill icon="🎙️" value={String(stats.voiceSessions)} label="Voice" />
          <StatPill icon="📚" value={`${completedTopics}/${roadmapTopics.length}`} label="Tenses" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ── English with Me ── */}
        <button onClick={goToChat}
          className="clay-card w-full p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all duration-150"
          style={{ background: "linear-gradient(135deg,#1CB0F6,#0E8FD4)", boxShadow: "-4px -4px 10px rgba(255,255,255,0.4), 6px 6px 18px rgba(14,143,212,0.45)" }}>
          <div className="w-16 h-16 rounded-[22px] flex items-center justify-center text-3xl shrink-0"
            style={{ background: "rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}>
            💬
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-[18px] leading-tight">English with Me</p>
            <p className="text-white/75 text-[13px] mt-0.5">AI teacher se English seekho</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-white px-2.5 py-1 rounded-xl"
                style={{ background: "rgba(255,255,255,0.22)" }}>🤖 AI Tutor</span>
              <span className="text-[10px] font-bold text-white px-2.5 py-1 rounded-xl"
                style={{ background: "rgba(255,255,255,0.22)" }}>🇮🇳 Hindi</span>
            </div>
          </div>
          <ChevronRight size={22} className="text-white/70 shrink-0" />
        </button>

        {/* ── Voice Call ── */}
        <button onClick={() => setLocation("/chat?category=casual&mode=voice")}
          className="clay-card w-full p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-all duration-150"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "-4px -4px 10px rgba(255,255,255,0.35), 6px 6px 18px rgba(109,40,217,0.45)" }}>
          <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <Mic size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-[15px] leading-tight">Voice Call Practice</p>
            <p className="text-white/70 text-[12px] mt-0.5">AI se bol ke English seekho — fast!</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80 text-[11px] font-semibold">Live</span>
          </div>
        </button>

        {/* ── More Features ── */}
        <div>
          <p className="text-[11px] font-black text-[#6B7785] uppercase tracking-widest mb-3 px-1">More Features</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { path: "/vocabulary", emoji: "📖", label: "Vocabulary",    sub: "5 words + Hindi meaning",    grad: "linear-gradient(135deg,#f97316,#ea580c)" },
              { path: "/actor",      emoji: "🎭", label: "Actor Mode",     sub: "10 sentences practice",      grad: "linear-gradient(135deg,#ec4899,#db2777)" },
              { path: "/stranger",   icon: <Users size={20} className="text-white" />, label: "Chat Stranger", sub: "Random partner se baat",  grad: "linear-gradient(135deg,#059669,#10b981)" },
              { path: "/teacher",    icon: <GraduationCap size={20} className="text-white" />, label: "AI Teacher", sub: "Study plan + homework", grad: "linear-gradient(135deg,#0d9488,#0891b2)" },
            ].map(item => (
              <button key={item.path} onClick={() => setLocation(item.path)}
                className="clay-card p-4 flex flex-col gap-2.5 items-start text-left active:scale-[0.97] transition-all duration-150">
                <div className="w-12 h-12 rounded-[16px] flex items-center justify-center text-xl shrink-0 clay-icon"
                  style={{ background: item.grad }}>
                  {"emoji" in item ? item.emoji : item.icon}
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#1A2B3C] leading-tight">{item.label}</p>
                  <p className="text-[11px] text-[#6B7785] mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Your Progress ── */}
        <div>
          <p className="text-[11px] font-black text-[#6B7785] uppercase tracking-widest mb-3 px-1">Your Progress</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { path: "/streak",  emoji: "🔥", label: "Streak Badges",   sub: getStreak().currentStreak > 0 ? `${getStreak().currentStreak}-day streak` : "Start today!",             grad: "linear-gradient(135deg,#FF9600,#e07800)" },
              { path: "/quiz",    emoji: "❓", label: "Daily Quiz",       sub: quizState.correctCount + quizState.wrongCount > 0 ? `${quizState.correctCount}✅ ${quizState.wrongCount}❌` : "7 questions today", grad: "linear-gradient(135deg,#7c3aed,#6d28d9)" },
              { path: "/roadmap", emoji: "📚", label: "Tense Path",       sub: `${completedTopics}/${roadmapTopics.length} tenses done`,                                               grad: "linear-gradient(135deg,#1CB0F6,#0E8FD4)" },
              { path: "/grammar", emoji: "🧩", label: "Word Arrange",     sub: "Duolingo-style exercise",                                                                               grad: "linear-gradient(135deg,#0e7490,#0891b2)" },
            ].map(item => (
              <button key={item.path} onClick={() => setLocation(item.path)}
                className="clay-card p-4 flex flex-col gap-2.5 items-start text-left active:scale-[0.97] transition-all duration-150">
                <div className="w-12 h-12 rounded-[16px] flex items-center justify-center text-xl shrink-0 clay-icon"
                  style={{ background: item.grad }}>
                  {item.emoji}
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#1A2B3C] leading-tight">{item.label}</p>
                  <p className="text-[11px] text-[#6B7785] mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="clay-pill flex-1 flex items-center gap-1.5 px-3 py-2">
      <span className="text-[15px]">{icon}</span>
      <div>
        <p className="text-white font-black text-[13px] leading-none">{value}</p>
        <p className="text-white/55 text-[9px] leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}
