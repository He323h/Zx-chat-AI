import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile, useGetTodayUsage, getGetUserProfileQueryKey, getGetTodayUsageQueryKey } from "@/lib/api";
import { Settings, Crown, Users, Mic, BookOpen, ChevronRight, X, MessageCircle } from "lucide-react";
import { useState } from "react";
import { getStats, getAccuracy } from "@/lib/dailyStats";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [adDismissed, setAdDismissed] = useState(false);
  const uid = user?.uid ?? "";

  const { data: profile } = useGetUserProfile(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetUserProfileQueryKey({ uid }) } }
  );
  const { data: usage } = useGetTodayUsage(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetTodayUsageQueryKey({ uid }) } }
  );

  const stats = getStats();
  const accuracy = getAccuracy();
  const firstName = (user?.email ?? "").split("@")[0];
  const streak = profile?.streak ?? 0;
  const subscription = profile?.subscription ?? "trial";
  const remainingMin = usage?.remainingMinutes === 9999 ? null : usage?.remainingMinutes;

  function goToChat() {
    const hasLevel = localStorage.getItem("ef_level") || profile?.englishLevel;
    setLocation(hasLevel ? "/chat?category=casual" : "/level-select?category=casual");
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: "#f2f5f9" }}>

      {/* Header */}
      <div className="px-4 pt-10 pb-3"
        style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
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

        {/* Stats strip */}
        <div className="flex gap-2 mt-3 pb-1">
          <StatPill icon="🎯" value={accuracy !== null ? `${accuracy}%` : "—"} label="Accuracy" />
          <StatPill icon="✏️" value={String(stats.corrections)} label="Corrections" />
          <StatPill icon="💬" value={String(stats.sessions)} label="Sessions" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ── English with Me — BIG featured card ── */}
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
                <p className="text-white/70 text-sm mt-0.5">AI ke saath free conversation practice karo</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-semibold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                    🤖 AI Tutor
                  </span>
                  <span className="text-[11px] font-semibold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                    ✏️ Grammar fix
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/60 shrink-0" />
            </div>
          </button>
        </div>

        {/* ── Feature Grid 2x2 ── */}
        <div className="fade-up" style={{ animationDelay: "0.05s" }}>
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">Features</p>
          <div className="grid grid-cols-2 gap-2.5">

            {/* Vocabulary */}
            <button
              onClick={() => setLocation("/vocabulary")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
                📖
              </div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Vocabulary</p>
                <p className="text-[11px] text-slate-400 mt-0.5">5 words + Hindi meaning</p>
              </div>
            </button>

            {/* Actor Mode */}
            <button
              onClick={() => setLocation("/actor")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                style={{ background: "linear-gradient(135deg,#ec4899,#db2777)" }}>
                🎭
              </div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Actor Mode</p>
                <p className="text-[11px] text-slate-400 mt-0.5">10 sentences to practice</p>
              </div>
            </button>

            {/* Voice Practice */}
            <button
              onClick={() => setLocation("/chat?category=casual&mode=voice")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
              style={{ background: "white" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                <Mic size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-[13px] text-slate-800 leading-tight">Voice Practice</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bol ke practice karo</p>
              </div>
            </button>

            {/* Chat with Stranger */}
            <button
              onClick={() => setLocation("/stranger")}
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
            <div className="relative"
              style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", minHeight: 130 }}>
              <div className="absolute top-2.5 left-3 z-10">
                <span className="text-[10px] font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                  Advertisement
                </span>
              </div>
              <button
                onClick={() => setAdDismissed(true)}
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
                <button
                  onClick={() => setLocation("/subscription")}
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
