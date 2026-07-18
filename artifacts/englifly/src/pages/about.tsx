import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const APP_VERSION = "1.0.0";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setLocation("/settings")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground text-base">About</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* App identity */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center text-center fade-up">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg mb-4 overflow-hidden"
            style={{ background: "hsl(var(--primary))" }}>
            <img src="/owl-logo.png" alt="English Tutor - AI Powered" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-bold text-foreground">English Tutor - AI Powered</h2>
          <p className="text-xs text-muted-foreground mt-1">Version {APP_VERSION}</p>
          <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
            English Tutor - AI Powered is an AI-powered English language learning app designed to help you practise speaking, listening, and writing English through real conversations.
          </p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 fade-up">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">What English Tutor - AI Powered offers</p>
          <div className="space-y-3">
            {[
              { emoji: "✈️", title: "Topic-based AI Tutor", desc: "Practice Travel, Job Interview, Daily Speaking, Vocabulary & more" },
              { emoji: "🎙️", title: "Voice Practice (Call Mode)", desc: "Hands-free conversation loop with your AI tutor" },
              { emoji: "🌍", title: "Chat with a Stranger", desc: "Anonymous 3-minute partner matching with real English learners" },
              { emoji: "📊", title: "Progress Tracking", desc: "Daily stats, accuracy score, streaks & session counts" },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{f.emoji}</span>
                <div>
                  <p className="font-semibold text-sm text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 fade-up">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Developer</p>
          <div className="space-y-2 text-sm">
            <Row label="Developer" value="Hemant Kulhada" />
            <Row label="Contact" value="kulhadahemant20@gmail.com" />
            <Row label="Privacy" value="kulhadahemant20@gmail.com" />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-2">
          © 2025 English Tutor - AI Powered · All rights reserved
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
