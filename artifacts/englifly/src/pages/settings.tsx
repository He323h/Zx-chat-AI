import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@/lib/api";
import { ArrowLeft, Crown, LogOut, ChevronRight, Volume2, Gauge, FileText, Info, Shield, Zap, Bell } from "lucide-react";
import {
  isNotificationSupported,
  getNotificationEnabled,
  setNotificationEnabled,
  requestNotificationPermission,
  showNotification,
} from "@/lib/notifications";
import { RATE_MAP, DEFAULT_RATE_KEY, pickBestVoice } from "@/hooks/useSpeech";
import { BottomNav } from "@/components/BottomNav";

const RATE_OPTIONS = [
  { key: "slow",   label: "Slow",   hint: "0.7×" },
  { key: "normal", label: "Normal", hint: "1.0×" },
  { key: "fast",   label: "Fast",   hint: "1.25×" },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const uid = user?.uid ?? "";

  const { data: profile } = useGetUserProfile(
    { uid },
    { query: { enabled: !!uid, queryKey: getGetUserProfileQueryKey({ uid }) } }
  );

  const [rateKey, setRateKey] = useState<string>(() => localStorage.getItem("ef_speech_rate") ?? DEFAULT_RATE_KEY);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => localStorage.getItem("ef_voice_uri") ?? "");
  const [testPlaying, setTestPlaying] = useState(false);

  const [notifSupported] = useState(() => isNotificationSupported());
  const [notifEnabled, setNotifEnabled] = useState(() => getNotificationEnabled());
  const [notifPermission, setNotifPermission] = useState(() =>
    isNotificationSupported() ? Notification.permission : "default"
  );

  async function handleNotifToggle() {
    if (notifEnabled) {
      setNotificationEnabled(false);
      setNotifEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    setNotifPermission(Notification.permission);
    if (granted) {
      setNotifEnabled(true);
      showNotification("✅ Notifications enabled!", "You'll get daily practice reminders from English Tutor - AI Powered.");
    }
  }

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("en"));
      setVoices(v);
      if (!localStorage.getItem("ef_voice_uri") && v.length) {
        const best = pickBestVoice(v);
        if (best) setSelectedVoiceURI(best.voiceURI);
      }
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  function handleRateChange(key: string) {
    setRateKey(key);
    localStorage.setItem("ef_speech_rate", key);
  }

  function handleVoiceChange(uri: string) {
    setSelectedVoiceURI(uri);
    localStorage.setItem("ef_voice_uri", uri);
  }

  function handleTestVoice() {
    if (!window.speechSynthesis || testPlaying) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance("Hello! I am your English tutor. How are you today?");
    utter.rate = RATE_MAP[rateKey] ?? RATE_MAP[DEFAULT_RATE_KEY];
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
    utter.onstart = () => setTestPlaying(true);
    utter.onend = () => setTestPlaying(false);
    utter.onerror = () => setTestPlaying(false);
    window.speechSynthesis.speak(utter);
  }

  const firstName = (user?.displayName ?? user?.email ?? "").split(/[@\s]/)[0] || "Learner";

  return (
    <div className="clay-page pb-28">

      {/* Clay Header */}
      <div className="clay-header px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setLocation("/home")}
            aria-label="Back to Home"
            className="w-10 h-10 rounded-[16px] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <p className="text-white font-black text-[18px] leading-tight">Settings</p>
            <p className="text-white/65 text-[11px]">Manage your preferences</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="mx-4 -mt-4 fade-up">
        <div className="clay-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-white font-black text-xl shrink-0"
            style={{ background: "linear-gradient(135deg,#1CB0F6,#0E8FD4)", boxShadow: "-2px -2px 5px rgba(255,255,255,0.7), 3px 3px 8px rgba(28,176,246,0.35)" }}>
            {firstName[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[#1A2B3C] text-base capitalize truncate">{firstName}</p>
            <p className="text-[#6B7785] text-xs truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full text-white"
                style={{ background: "linear-gradient(135deg,#1CB0F6,#0E8FD4)" }}>
                {profile?.subscription ?? "trial"} plan
              </span>
              {(profile?.streak ?? 0) > 0 && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  🔥 {profile?.streak}-day streak
                </span>
              )}
            </div>
          </div>
          {(profile?.subscription ?? "trial") !== "pro" && (
            <button
              onClick={() => setLocation("/subscription")}
              aria-label="Upgrade to Pro"
              className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "-2px -2px 5px rgba(255,255,255,0.6), 3px 3px 10px rgba(217,119,6,0.4)" }}>
              <Crown size={18} className="text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Notifications */}
        {notifSupported && (
          <ClayCard>
            <ClayCardHeader icon={<Bell size={15} className="text-white" />} iconBg="linear-gradient(135deg,#8b5cf6,#7c3aed)" title="Notifications" />
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-[16px]"
                style={{ background: "#EAF4FF", boxShadow: "inset 1px 1px 4px rgba(28,176,246,0.12), inset -1px -1px 3px rgba(255,255,255,0.9)" }}>
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-bold text-[#1A2B3C] text-sm">Daily Practice Reminder</p>
                  <p className="text-xs text-[#6B7785] mt-0.5">
                    {notifPermission === "denied"
                      ? "⚠️ Blocked in browser — allow in site settings"
                      : "Get reminded if you haven't practiced today"}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={notifEnabled}
                  aria-label="Daily Practice Reminder"
                  onClick={handleNotifToggle}
                  disabled={notifPermission === "denied"}
                  className={`relative w-12 h-6 rounded-full transition-all shrink-0 disabled:opacity-40 ${
                    notifEnabled ? "bg-violet-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      notifEnabled ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              {!notifEnabled && notifPermission !== "denied" && (
                <p className="text-[11px] text-[#6B7785] text-center">
                  Toggle on to allow daily English practice reminders
                </p>
              )}
            </div>
          </ClayCard>
        )}

        {/* Voice & Speech */}
        <ClayCard>
          <ClayCardHeader icon={<Volume2 size={15} className="text-white" />} iconBg="linear-gradient(135deg,#1CB0F6,#0E8FD4)" title="Voice & Speech" />

          {/* Speed */}
          <div className="px-4 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[#1A2B3C] flex items-center gap-1.5">
                <Gauge size={14} className="text-[#6B7785]" /> Speech Speed
              </span>
            </div>
            <div className="flex gap-2 mb-4">
              {RATE_OPTIONS.map(opt => {
                const isActive = rateKey === opt.key;
                return (
                  <button key={opt.key} onClick={() => handleRateChange(opt.key)}
                    className="flex-1 py-2.5 rounded-[16px] text-sm font-bold transition-all"
                    style={{
                      background: isActive ? "linear-gradient(135deg,#1CB0F6,#0E8FD4)" : "#EAF4FF",
                      color: isActive ? "#fff" : "#6B7785",
                      boxShadow: isActive
                        ? "-2px -2px 5px rgba(255,255,255,0.55), 3px 3px 10px rgba(14,143,212,0.38)"
                        : "inset 1px 1px 4px rgba(28,176,246,0.1), inset -1px -1px 3px rgba(255,255,255,0.9)",
                    }}>
                    {opt.label}
                    <span className="block text-[10px] font-normal mt-0.5 opacity-70">{opt.hint}</span>
                  </button>
                );
              })}
            </div>

            {/* Voice picker */}
            {voices.length > 0 && (
              <>
                <p className="text-sm font-bold text-[#1A2B3C] flex items-center gap-1.5 mb-2">
                  <Volume2 size={14} className="text-[#6B7785]" /> AI Voice
                </p>
                <select
                  value={selectedVoiceURI}
                  onChange={e => handleVoiceChange(e.target.value)}
                  className="w-full h-11 rounded-[16px] px-3 text-sm text-[#1A2B3C] mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  style={{
                    background: "#EAF4FF",
                    border: "none",
                    boxShadow: "inset 1px 1px 4px rgba(28,176,246,0.12), inset -1px -1px 3px rgba(255,255,255,0.9)",
                  }}>
                  {voices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}){v.lang === "en-IN" ? " ⭐" : ""}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Test button */}
            <button onClick={handleTestVoice} disabled={testPlaying}
              className="clay-btn w-full h-11 text-sm flex items-center justify-center gap-2 mb-3"
              style={{
                background: testPlaying ? "#EAF4FF" : undefined,
                color: testPlaying ? "#94a3b8" : undefined,
                boxShadow: testPlaying ? "inset 2px 2px 6px rgba(28,176,246,0.12), inset -1px -1px 3px rgba(255,255,255,0.9)" : undefined,
              }}>
              {testPlaying ? "🔊 Playing..." : "▶ Test Voice"}
            </button>
            <p className="text-[11px] text-[#6B7785] text-center pb-1">
              Available voices depend on your device & browser
            </p>
          </div>
        </ClayCard>

        {/* Subscription */}
        <ClayCard>
          <ClayCardHeader icon={<Zap size={15} className="text-white" />} iconBg="linear-gradient(135deg,#f59e0b,#d97706)" title="Subscription" />
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between p-3 rounded-[16px]"
              style={{ background: "#EAF4FF", boxShadow: "inset 1px 1px 4px rgba(28,176,246,0.12), inset -1px -1px 3px rgba(255,255,255,0.9)" }}>
              <div>
                <p className="font-black text-[#1A2B3C] text-sm capitalize">{profile?.subscription ?? "trial"} Plan</p>
                {profile?.trialEndsAt && profile.subscription === "trial" && (
                  <p className="text-xs text-[#6B7785] mt-0.5">
                    Trial ends {new Date(profile.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {(profile?.subscription ?? "trial") !== "pro" && (
                <button onClick={() => setLocation("/subscription")}
                  className="clay-btn text-xs px-3 py-1.5"
                  style={{ borderRadius: 12 }}>
                  View Plans
                </button>
              )}
            </div>
          </div>
        </ClayCard>

        {/* Legal */}
        <ClayCard>
          <ClayCardHeader icon={<Shield size={15} className="text-white" />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" title="Legal & Info" />
          <div className="px-2 pb-2">
            <SettingsRow icon={<FileText size={15} />} label="Privacy Policy" onClick={() => setLocation("/privacy-policy")} />
            <SettingsRow icon={<FileText size={15} />} label="Terms of Service" onClick={() => setLocation("/terms")} />
            <SettingsRow icon={<Info size={15} />} label="About English Tutor - AI Powered" onClick={() => setLocation("/about")} last />
          </div>
        </ClayCard>

        {/* Sign out */}
        <button
          onClick={() => { logout(); setLocation("/login"); }}
          className="w-full flex items-center gap-2.5 justify-center py-3.5 rounded-[24px] text-sm font-bold transition-colors clay-card"
          style={{ color: "#e11d48", background: "#fff1f2", boxShadow: "-3px -3px 8px rgba(255,255,255,0.9), 4px 4px 12px rgba(225,29,72,0.15)" }}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function ClayCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="clay-card overflow-hidden fade-up">
      {children}
    </div>
  );
}

function ClayCardHeader({ icon, iconBg, title }: { icon: React.ReactNode; iconBg: string; title: string }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
      <div className="w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 clay-icon"
        style={{ background: iconBg }}>
        {icon}
      </div>
      <p className="font-black text-[#1A2B3C] text-sm">{title}</p>
    </div>
  );
}

function SettingsRow({ icon, label, value, onClick, last }: {
  icon: React.ReactNode; label: string; value?: string; onClick?: () => void; last?: boolean;
}) {
  return (
    <>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[16px] transition-colors text-left active:bg-[#EAF4FF]">
        <span className="text-[#6B7785] shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-[#1A2B3C]">{label}</span>
        {value && <span className="text-xs text-[#6B7785] mr-1">{value}</span>}
        <ChevronRight size={15} className="text-[#6B7785] shrink-0" />
      </button>
      {!last && <div className="h-px bg-[#EAF4FF] mx-3" />}
    </>
  );
}
