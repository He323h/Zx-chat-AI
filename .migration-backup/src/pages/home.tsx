import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile, useGetTodayUsage, getGetUserProfileQueryKey, getGetTodayUsageQueryKey } from "@/lib/api";
import { Settings, Crown, Users, Mic, BookOpen, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { getStats, getAccuracy } from "@/lib/dailyStats";

const TOPICS = [
  { id: "travel",     label: "Travel English",  emoji: "✈️", grad: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
  { id: "interview",  label: "Job Interview",   emoji: "💼", grad: "linear-gradient(135deg,#10b981,#059669)" },
  { id: "school",     label: "Daily Speaking",  emoji: "📚", grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { id: "casual",     label: "Casual Chat",     emoji: "💬", grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
  { id: "vocabulary", label: "Vocabulary",      emoji: "📖", grad: "linear-gradient(135deg,#f97316,#ea580c)" },
  { id: "actor",      label: "Actor Mode",      emoji: "🎭", grad: "linear-gradient(135deg,#ec4899,#db2777)" },
];

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

  function handleTopicClick(topicId: string) {
    const hasLevel = localStorage.getItem("ef_level") || profile?.englishLevel;
    setLocation(hasLevel ? `/chat?category=${topicId}` : `/level-select?category=${topicId}`);
  }

  return (
    <div className="min-h-screen pb-6" style={{ background: "#f2f5f9" }}>

      {/* ── Compact Header ── */}
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

        {/* Compact stats strip */}
        <div className="flex gap-2 mt-3 pb-1">
          <StatPill icon="🎯" value={accuracy !== null ? `${accuracy}%` : "—"} label="Accuracy" />
          <StatPill icon="✏️" value={String(stats.corrections)} label="Corrections" />
          <StatPill icon="💬" value={String(stats.sessions)} label="Sessions" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── Practice Topics Grid ── */}
        <div className="fade-up">
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">Practice Topics</p>
          <div className="grid grid-cols-2 gap-2.5">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                data-testid={`card-category-${topic.id}`}
                onClick={() => handleTopicClick(topic.id)}
                className="flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.97] transition-all duration-150 shadow-sm text-left"
                style={{ background: "white" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
                  style={{ background: topic.grad }}>
                  <span className="text-base">{topic.emoji}</span>
                </div>
                <p className="font-semibold text-[13px] text-slate-800 leading-tight">{topic.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Ad Banner (Spotify-style) ── */}
        {!adDismissed && (
          <div className="fade-up rounded-2xl overflow-hidden shadow-sm" style={{ animationDelay: "0.08s" }}>
            <div className="relative"
              style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", minHeight: 140 }}>
              {/* Ad label */}
              <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-10">
                <span className="text-[10px] font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                  Advertisement
                </span>
              </div>
              {/* Dismiss */}
              <button
                onClick={() => setAdDismissed(true)}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)" }}>
                <X size={14} className="text-white/70" />
              </button>

              {/* Ad creative area */}
              <div className="flex items-center justify-center" style={{ minHeight: 140 }}>
                <div className="text-center px-6 py-8">
                  <div className="text-4xl mb-2">🚀</div>
                  <p className="text-white font-bold text-base">Boost Your English Fast!</p>
                  <p className="text-white/60 text-xs mt-1">Practice 15 min/day — see results in 30 days</p>
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

        {/* ── Quick Actions — all in ONE card ── */}
        <div className="fade-up bg-white rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: "0.12s" }}>
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-2">Quick Practice</p>

          {/* Chat with Stranger */}
          <button
            onClick={() => setLocation("/stranger")}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
              <Users size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-800 text-sm">Chat with a Stranger</p>
              <p className="text-slate-400 text-xs mt-0.5">Anonymous 3-min partner matching</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </button>

          <div className="h-px bg-slate-100 mx-4" />

          {/* Voice Practice */}
          <button
            onClick={() => setLocation("/chat?category=casual&mode=voice")}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
              <Mic size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-800 text-sm">Voice Practice</p>
              <p className="text-slate-400 text-xs mt-0.5">Speak & listen — full call mode</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </button>

          <div className="h-px bg-slate-100 mx-4" />

          {/* Today's Learning */}
          <button
            onClick={() => setLocation("/subscription")}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <BookOpen size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-800 text-sm">Upgrade Plan</p>
              <p className="text-slate-400 text-xs mt-0.5">Basic & Pro plans — coming soon</p>
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">Soon</span>
          </button>
        </div>

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
