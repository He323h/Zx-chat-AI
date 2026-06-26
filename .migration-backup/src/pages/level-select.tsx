import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateLevel } from "@/lib/api";
import { Button } from "@/components/ui/button";

const LEVELS = [
  {
    id: "Basic",
    emoji: "🌱",
    title: "Basic",
    desc: "Simple words & short sentences. I'm just starting out.",
    border: "#4caf50",
    bg: "#f1faf1",
    selectedBg: "#e0f7e0",
  },
  {
    id: "Medium",
    emoji: "🚀",
    title: "Medium",
    desc: "I can have conversations but still make mistakes.",
    border: "hsl(var(--primary))",
    bg: "#f0f8ff",
    selectedBg: "#dcefff",
  },
  {
    id: "Advanced",
    emoji: "⭐",
    title: "Advanced",
    desc: "I'm confident in English and want to polish my fluency.",
    border: "#9c27b0",
    bg: "#faf0ff",
    selectedBg: "#f0dcff",
  },
];

export default function LevelSelect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const category = params.get("category") ?? "casual";

  const [selected, setSelected] = useState<string | null>(null);
  const updateLevel = useUpdateLevel();

  function handleContinue() {
    if (!selected || !user) return;

    // Save to localStorage immediately so home page never asks again
    localStorage.setItem("ef_level", selected);

    // Navigate RIGHT AWAY — no waiting for API
    setLocation(`/chat?category=${category}`);

    // Save to server in background (silent)
    updateLevel.mutate({ data: { uid: user.uid, englishLevel: selected as "Basic" | "Medium" | "Advanced" } });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <div className="bg-white border-b border-border px-4 py-4 shadow-sm">
        <button onClick={() => setLocation("/home")} className="text-sm font-medium mb-1"
          style={{ color: "hsl(var(--primary))" }}>← Back</button>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-4 py-8">
        <div className="text-center mb-8 fade-up">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold text-foreground">What's your English level?</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Your AI tutor will adjust its vocabulary and pace just for you
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {LEVELS.map((level, i) => {
            const isSelected = selected === level.id;
            return (
              <button
                key={level.id}
                onClick={() => setSelected(level.id)}
                className="w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 fade-up"
                style={{
                  background: isSelected ? level.selectedBg : level.bg,
                  borderColor: isSelected ? level.border : "transparent",
                  animationDelay: `${i * 0.07}s`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{level.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm">{level.title}</div>
                    <div className="text-muted-foreground text-xs mt-0.5 leading-snug">{level.desc}</div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: level.border }}>
                      <svg viewBox="0 0 12 9" fill="none" className="w-3 h-3">
                        <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full h-12 rounded-xl font-semibold text-base text-white fade-up"
          style={{ background: "hsl(var(--primary))", animationDelay: "0.28s" }}
        >
          Start talking →
        </Button>

        <p className="text-center text-muted-foreground text-xs mt-4">
          You can change this anytime from Settings
        </p>
      </div>
    </div>
  );
}
