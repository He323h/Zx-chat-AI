import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile, useGetTodayUsage, getGetUserProfileQueryKey, getGetTodayUsageQueryKey } from "@/lib/api";
import { Settings, Crown, Users, Mic, ChevronRight, X, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { getStats, getAccuracy, type DailyStats } from "@/lib/dailyStats";
import { getStreak } from "@/lib/streakSystem";
import { getQuizState } from "@/lib/quizData";
import { getTopicsWithStatus } from "@/lib/roadmapData";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [adDismissed, setAdDismissed] = useState(false);
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

  // Live-refresh stats whenever chat updates them
  useEffect(() => {
    const refresh = () => setStats(getStats());
    window.addEventListener("ef:stats-updated", refresh);
    const t = setInterval(refresh, 10000);
    return () => {
      window.removeEventListener("ef:stats-updated", refresh);
      clearInterval(t);
    };
  }, []);

  const accuracy = getAccuracy();
  const firstName = (user?.email ?? "").split("@")[0];
  const streak = profile?.streak ?? getStreak().currentStreak;
  const subscription = profile?.subscription ?? "trial";
  const remainingMin = usage?.remainingMinutes === 9999 ? null : usage?.remainingMinutes;

  // Quick stats for new features
  const quizState = getQuizState();
  const roadmapTopics = getTopicsWithStatus();
  const completedTopics = roadmapTopics.filter(t => t.status === "completed").length;
  const currentTopic = roadmapTopics.find(t => t.status === "current");

  function goToChat() {
    const hasLevel = localStorage.getItem("ef_level") || profile?.englishLevel;
    setLocation(hasLevel ? "/chat?category=casual" : "/level-select?category=casual");
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: "#f2f5f9" }}>

      {/* Header */}
      <div className="px-4 pt-10 pb-4" style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "rgba(255,255,255,0.25)" }}>
              {firstName[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">
                Hey, {firstName}! {streak > 0 ? `🔥 ${streak}-day streak` : "👋"}
              </p>
              <p className="text-white/60 text-[11px]">
                {subscription === "trial" ? "Free trial active" : `${subscription} plan`}
                {remainingMin !== null ? ` · ${remainingMin} min left` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {subscription !== "pro" && (
              <button onClick={() => setLocation("/subscription")}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                <Crown size={15} className="text-amber-300" />
              </button>
            )}
            <button onClick={() => setLocation("/settings")}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <Settings size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* Stats strip — Row 1 */}
        <div className="flex gap-2 mt-3">
          <StatPill icon="🎯" value={accuracy !== null ? `${accuracy}%` : "—"} label="Accuracy" />
          <StatPill icon="✏️" value={String(stats.corrections)} label="Corrections" />
          <StatPill icon="💬" value={String(stats.msgs)} label="Messages" />
        </div>
        {/* Stats strip — Row 2: today's progress */}
        <div className="flex gap-2 mt-2 pb-2">
          <StatPill icon="⏱️" value={stats.minutesPracticed > 0 ? `${stats.minutesPracticed}m` : "0m"} label="Practice" />
          <StatPill icon="🎙️" value={String(stats.voiceSessions)} label="Voice" />
          <StatPill icon="🔥" value={String(stats.topics.length)} label="Topics" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── English with Me ── */}
        <div className="fade-up">
          <button
            onClick={goToChat}
            className="w-full rounded-2xl overflow-hidden shadow-md active:scale-[0.98] transition-all duration-150 text-left"
            style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
            <div className="px-5 py-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                💬
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg leading-tight">English with Me</p>
                <p className="text-white/70 text-sm mt-0.5">AI teacher se English seekho</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-semibold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                    🤖 AI Tutor
                  </span>
                  <span className="text-[11px] font-semibold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                    🇮🇳 Hindi support
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/60 shrink-0" />
            </div>
          </button>
        </div>

        {/* ── Voice Call card ── */}
        <div className="fade-up" style={{ animationDelay: "0.03s" }}>
          <button
            onClick={() => setLocation("/chat?category=casual&mode=voice")}
            className="w-full rounded-2xl overflow-hidden shadow-md active:scale-[0.98] transition-all duration-150 text-left"
            style={{ background: "linear-gradient(135deg,#6d28d9,#7c3aed)" }}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                <Mic size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-base leading-tight">Voice Call Practice</p>
                <p className="text-white/70 text-sm mt-0.5">AI se bol ke English seekho — fast!</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/80 text-xs font-medium">Live</span>
              </div>
            </div>
          </button>
        </div>

        {/* ── More Features Grid ── */}
        <div className="fade-up" style={{ animationDelay: "0.05s" }}>
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">More Features</p>
          <div className="grid grid-cols-2 gap-2.5">

            <button onClick={() => setLocation("/vocabulary")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>📖</div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Vocabulary</p>
                <p className="text-[11px] text-slate-400 mt-0.5">5 words + Hindi meaning</p>
              </div>
            </button>

            <button onClick={() => setLocation("/actor")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#ec4899,#db2777)" }}>🎭</div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Actor Mode</p>
                <p className="text-[11px] text-slate-400 mt-0.5">10 sentences to practice</p>
              </div>
            </button>

            <button onClick={() => setLocation("/stranger")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                <Users size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Chat Stranger</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Random partner se baat</p>
              </div>
            </button>

            <button onClick={() => setLocation("/teacher")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
                <GraduationCap size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">AI Teacher</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Personal study plan + homework</p>
              </div>
            </button>

          </div>
        </div>

        {/* ── Your Progress Row ── */}
        <div className="fade-up" style={{ animationDelay: "0.08s" }}>
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">Your Progress</p>
          <div className="grid grid-cols-2 gap-2.5">

            {/* Streak Badge */}
            <button onClick={() => setLocation("/streak")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>🔥</div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Streak Badges</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {getStreak().currentStreak > 0 ? `${getStreak().currentStreak}-day streak` : "Start today!"}
                </p>
              </div>
            </button>

            {/* Daily Quiz */}
            <button onClick={() => setLocation("/quiz")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>❓</div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Daily Quiz</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {quizState.correctCount + quizState.wrongCount > 0
                    ? `${quizState.correctCount}✅ ${quizState.wrongCount}❌ today`
                    : "7 questions today"}
                </p>
              </div>
            </button>

            {/* Roadmap */}
            <button onClick={() => setLocation("/roadmap")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>🗺️</div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Roadmap</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {completedTopics}/{roadmapTopics.length} topics done
                </p>
              </div>
            </button>

            {/* Word Arrange */}
            <button onClick={() => setLocation("/grammar")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#0e7490,#0891b2)" }}>🧩</div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Word Arrange</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Duolingo-style exercise</p>
              </div>
            </button>

          </div>
        </div>

        {/* ── Ad Banner ── */}
        {!adDismissed && (
          <div className="fade-up rounded-2xl overflow-hidden shadow-sm" style={{ animationDelay: "0.12s" }}>
            <div className="relative" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", minHeight: 130 }}>
              <div className="absolute top-2.5 left-3 z-10">
                <span className="text-[10px] font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                  Advertisement
                </span>
              </div>
              <button onClick={() => setAdDismissed(true)}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)" }}>
                <X size={14} className="text-white/70" />
              </button>
              <div className="flex items-center justify-center" style={{ minHeight: 130 }}>
                <div className="text-center px-6 py-6">
                  <div className="text-3xl mb-2">🚀</div>
                  <p className="text-white font-bold text-base">Boost Your English Fast!</p>
                  <p className="text-white/60 text-xs mt-1">15 min daily practice — results in 30 days</p>
                </div>
              </div>
              <div className="px-4 pb-4 flex items-center justify-between">
                <p className="text-white/40 text-[11px]">ZX-Chat AI</p>
                <button onClick={() => setLocation("/subscription")}
                  className="text-xs font-bold px-4 py-1.5 rounded-full text-slate-900"
                  style={{ background: "#fff" }}>
                  Learn more
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.15)" }}>
      <span className="text-sm">{icon}</span>
      <div>
        <p className="text-white font-bold text-sm leading-none">{value}</p>
        <p className="text-white/50 text-[9px] leading-tight">{label}</p>
      </div>
    </div>
  );
}
