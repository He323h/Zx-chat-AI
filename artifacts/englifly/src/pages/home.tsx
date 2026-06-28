import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile, useGetTodayUsage, getGetUserProfileQueryKey, getGetTodayUsageQueryKey } from "@/lib/api";
import { Settings, Crown, Users, Mic, ChevronRight, X, Clock, MessageSquare, Flame, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { getStats, getAccuracy, getWeekHistory, type DailyStats, type WeekDay } from "@/lib/dailyStats";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [adDismissed, setAdDismissed] = useState(false);
  const [stats, setStats] = useState<DailyStats>(getStats());
  const [weekHistory, setWeekHistory] = useState<WeekDay[]>(getWeekHistory());
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
    const refresh = () => {
      setStats(getStats());
      setWeekHistory(getWeekHistory());
    };
    window.addEventListener("ef:stats-updated", refresh);
    const t = setInterval(refresh, 10000);
    return () => {
      window.removeEventListener("ef:stats-updated", refresh);
      clearInterval(t);
    };
  }, []);

  const accuracy = getAccuracy();
  const firstName = (user?.email ?? "").split("@")[0];
  const streak = profile?.streak ?? 0;
  const subscription = profile?.subscription ?? "trial";
  const remainingMin = usage?.remainingMinutes === 9999 ? null : usage?.remainingMinutes;

  const maxMins = Math.max(...weekHistory.map(d => d.mins), 1);

  function goToChat() {
    const hasLevel = localStorage.getItem("ef_level") || profile?.englishLevel;
    setLocation(hasLevel ? "/chat?category=casual" : "/level-select?category=casual");
  }

  const ACTIVITY_ICONS: Record<string, string> = {
    chat: "💬", voice: "🎙️", vocab: "📖", actor: "🎭",
  };

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

        {/* Quick stat strip */}
        <div className="flex gap-2 mt-3 pb-1">
          <StatPill icon="🎯" value={accuracy !== null ? `${accuracy}%` : "—"} label="Accuracy" />
          <StatPill icon="✏️" value={String(stats.corrections)} label="Corrections" />
          <StatPill icon="💬" value={String(stats.msgs)} label="Messages" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── Aaj Ka Progress Card ── */}
        <div className="fade-up rounded-2xl overflow-hidden shadow-md" style={{ background: "white" }}>
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                <p className="font-bold text-slate-800 text-sm">Aaj Ka Progress</p>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
              </span>
            </div>
          </div>

          {/* 4 stat boxes */}
          <div className="grid grid-cols-2 gap-px bg-slate-100">
            <StatBox
              icon={<Clock size={15} className="text-blue-500" />}
              value={stats.minutesPracticed > 0 ? `${stats.minutesPracticed} min` : "0 min"}
              label="Practice Time"
              color="#3b82f6"
            />
            <StatBox
              icon={<MessageSquare size={15} className="text-green-500" />}
              value={String(stats.msgs)}
              label="Messages Sent"
              color="#22c55e"
            />
            <StatBox
              icon={<Mic size={15} className="text-purple-500" />}
              value={stats.voiceSessions > 0 ? `${stats.voiceSessions} call${stats.voiceSessions > 1 ? "s" : ""}` : "0"}
              label="Voice Sessions"
              color="#a855f7"
            />
            <StatBox
              icon={<Flame size={15} className="text-orange-500" />}
              value={stats.topics.length > 0 ? `${stats.topics.length}` : "0"}
              label="Topics Covered"
              color="#f97316"
            />
          </div>

          {/* Topics covered today */}
          {stats.topics.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">Topics Practiced</p>
              <div className="flex flex-wrap gap-1.5">
                {stats.topics.map(t => (
                  <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full text-blue-700"
                    style={{ background: "#dbeafe" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Weekly bar chart */}
          <div className="px-4 pt-3 pb-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-semibold mb-2.5 uppercase tracking-wide">Is Hafte Ka Practice</p>
            <div className="flex items-end gap-1.5 h-16">
              {weekHistory.map(day => {
                const heightPct = maxMins > 0 ? Math.max((day.mins / maxMins) * 100, day.mins > 0 ? 8 : 0) : 0;
                const isToday = day.label === "Aaj";
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: 44 }}>
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{
                          height: `${heightPct}%`,
                          minHeight: day.mins > 0 ? 4 : 0,
                          background: isToday
                            ? "linear-gradient(180deg,#3b82f6,#1d4ed8)"
                            : day.mins > 0 ? "#bfdbfe" : "#f1f5f9",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: isToday ? "#1d4ed8" : "#94a3b8" }}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity log */}
          {stats.activity.length > 0 && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
              <p className="text-[11px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">Aaj Ki Activity</p>
              <div className="space-y-2">
                {stats.activity.slice(0, 4).map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-base w-6 text-center">{ACTIVITY_ICONS[a.type] ?? "💬"}</span>
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-slate-700">{a.topic}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {stats.msgs === 0 && stats.activity.length === 0 && (
            <div className="px-4 py-5 text-center border-t border-slate-100">
              <p className="text-2xl mb-1.5">🌅</p>
              <p className="text-slate-500 text-sm font-medium">Aaj abhi kuch practice nahi hua</p>
              <p className="text-slate-400 text-xs mt-0.5">Neeche se koi bhi feature start karo!</p>
            </div>
          )}
        </div>

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

        {/* ── Feature Grid ── */}
        <div className="fade-up" style={{ animationDelay: "0.06s" }}>
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

          </div>
        </div>

        {/* ── Ad Banner ── */}
        {!adDismissed && (
          <div className="fade-up rounded-2xl overflow-hidden shadow-sm" style={{ animationDelay: "0.1s" }}>
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

function StatBox({ icon, value, label, color }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
