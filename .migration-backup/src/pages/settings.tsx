import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@/lib/api";
import { ArrowLeft, Crown, LogOut, ChevronRight, Volume2, Gauge, FileText, Info, Shield, Zap } from "lucide-react";
import { RATE_MAP, DEFAULT_RATE_KEY, pickBestVoice } from "@/hooks/useSpeech";

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

  const firstName = (user?.email ?? "").split("@")[0];

  return (
    <div className="min-h-screen" style={{ background: "#f2f5f9" }}>

      {/* Header */}
      <div className="px-4 pt-10 pb-4"
        style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
        <button onClick={() => setLocation("/home")}
          className="w-8 h-8 rounded-full flex items-center justify-center mb-3"
          style={{ background: "rgba(255,255,255,0.15)" }}>
          <ArrowLeft size={17} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-xl">Settings</h1>
        <p className="text-white/60 text-xs mt-0.5">Manage your preferences</p>
      </div>

      {/* Profile Card */}
      <div className="mx-4 -mt-1 fade-up">
        <div className="bg-white rounded-2xl shadow-md p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0"
            style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
            {firstName[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-base capitalize truncate">{firstName}</p>
            <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
                {profile?.subscription ?? "trial"} plan
              </span>
              {(profile?.streak ?? 0) > 0 && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  🔥 {profile?.streak}-day streak
                </span>
              )}
            </div>
          </div>
          {(profile?.subscription ?? "trial") !== "pro" && (
            <button
              onClick={() => setLocation("/subscription")}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <Crown size={18} className="text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Voice & Speech */}
        <Card>
          <CardHeader icon={<Volume2 size={15} className="text-white" />} iconBg="linear-gradient(135deg,#0ea5e9,#0284c7)" title="Voice & Speech" />

          {/* Speed */}
          <div className="px-4 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Gauge size={14} className="text-slate-400" /> Speech Speed
              </span>
            </div>
            <div className="flex gap-2 mb-4">
              {RATE_OPTIONS.map(opt => {
                const isActive = rateKey === opt.key;
                return (
                  <button key={opt.key} onClick={() => handleRateChange(opt.key)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: isActive ? "linear-gradient(135deg,#0e5fa8,#1a8fd1)" : "#f5f8fc",
                      color: isActive ? "#fff" : "#64748b",
                      boxShadow: isActive ? "0 2px 8px rgba(14,95,168,0.3)" : "none",
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
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                  <Volume2 size={14} className="text-slate-400" /> AI Voice
                </p>
                <select
                  value={selectedVoiceURI}
                  onChange={e => handleVoiceChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#f5f8fc] px-3 text-sm text-slate-700 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300">
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
              className="w-full h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mb-3"
              style={{
                background: testPlaying ? "#f5f8fc" : "linear-gradient(135deg,#0e5fa8,#1a8fd1)",
                color: testPlaying ? "#94a3b8" : "#fff",
                boxShadow: testPlaying ? "none" : "0 2px 8px rgba(14,95,168,0.3)",
              }}>
              {testPlaying ? "🔊 Playing..." : "▶ Test Voice"}
            </button>
            <p className="text-[11px] text-slate-400 text-center pb-1">
              Available voices depend on your device & browser
            </p>
          </div>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader icon={<Zap size={15} className="text-white" />} iconBg="linear-gradient(135deg,#f59e0b,#d97706)" title="Subscription" />
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#f5f8fc" }}>
              <div>
                <p className="font-bold text-slate-800 text-sm capitalize">{profile?.subscription ?? "trial"} Plan</p>
                {profile?.trialEndsAt && profile.subscription === "trial" && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trial ends {new Date(profile.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {(profile?.subscription ?? "trial") !== "pro" && (
                <button onClick={() => setLocation("/subscription")}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shadow-md"
                  style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
                  View Plans
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Legal */}
        <Card>
          <CardHeader icon={<Shield size={15} className="text-white" />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" title="Legal & Info" />
          <div className="px-2 pb-2">
            <SettingsRow icon={<FileText size={15} />} label="Privacy Policy" onClick={() => setLocation("/privacy-policy")} />
            <SettingsRow icon={<FileText size={15} />} label="Terms of Service" onClick={() => setLocation("/terms")} />
            <SettingsRow icon={<Info size={15} />} label="About ZX-Chat AI" onClick={() => setLocation("/about")} last />
          </div>
        </Card>

        {/* Sign out */}
        <button
          onClick={() => { logout(); setLocation("/login"); }}
          className="w-full flex items-center gap-2.5 justify-center py-3.5 rounded-2xl text-sm font-bold transition-colors"
          style={{ background: "#fff1f2", color: "#e11d48", border: "1.5px solid #fecdd3" }}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden fade-up">
      {children}
    </div>
  );
}

function CardHeader({ icon, iconBg, title }: { icon: React.ReactNode; iconBg: string; title: string }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}>
        {icon}
      </div>
      <p className="font-bold text-slate-800 text-sm">{title}</p>
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
        className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
        <span className="text-slate-400 shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
        {value && <span className="text-xs text-slate-400 mr-1">{value}</span>}
        <ChevronRight size={15} className="text-slate-300 shrink-0" />
      </button>
      {!last && <div className="h-px bg-slate-100 mx-3" />}
    </>
  );
}
