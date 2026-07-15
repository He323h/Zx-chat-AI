import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteOnboarding } from "@/lib/api";
import { Button } from "@/components/ui/button";

const LEVELS = [
  {
    id: "Beginner",
    emoji: "🌱",
    title: "Beginner",
    desc: "I know basic words and simple phrases",
    color: "from-green-400/20 to-emerald-400/10 border-green-300",
    selected: "from-green-400/40 to-emerald-400/25 border-green-500 ring-2 ring-green-400",
  },
  {
    id: "Intermediate",
    emoji: "🚀",
    title: "Intermediate",
    desc: "I can hold conversations but make mistakes",
    color: "from-amber-400/20 to-orange-400/10 border-amber-300",
    selected: "from-amber-400/40 to-orange-400/25 border-amber-500 ring-2 ring-amber-400",
  },
  {
    id: "Advanced",
    emoji: "⭐",
    title: "Advanced",
    desc: "I'm fluent but want to polish my skills",
    color: "from-purple-400/20 to-violet-400/10 border-purple-300",
    selected: "from-purple-400/40 to-violet-400/25 border-purple-500 ring-2 ring-purple-400",
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const completeOnboarding = useCompleteOnboarding();

  async function handleContinue() {
    if (!selected || !user) return;
    setError("");

    completeOnboarding.mutate(
      {
        data: {
          uid: user.uid,
          email: user.email ?? "",
        },
      },
      {
        onSuccess: () => {
          setLocation("/home");
        },
        onError: () => {
          setError("Something went wrong. Please try again.");
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 fade-up">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="text-2xl font-bold text-foreground">What's your English level?</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Your tutor will adjust to make conversations just right for you
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {LEVELS.map((level, i) => (
            <button
              key={level.id}
              data-testid={`card-level-${level.id.toLowerCase()}`}
              onClick={() => setSelected(level.id)}
              className={`
                w-full text-left p-4 rounded-2xl border bg-gradient-to-br transition-all duration-200 fade-up
                ${selected === level.id ? level.selected : level.color}
              `}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{level.emoji}</span>
                <div>
                  <div className="font-semibold text-foreground">{level.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{level.desc}</div>
                </div>
                {selected === level.id && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg viewBox="0 0 12 9" fill="none" className="w-3 h-3">
                      <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm rounded-lg bg-destructive/10 px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <Button
          data-testid="button-continue"
          onClick={handleContinue}
          disabled={!selected || completeOnboarding.isPending}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover-elevate fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          {completeOnboarding.isPending ? "Saving..." : "Let's start talking!"}
        </Button>

        <p className="text-center text-muted-foreground text-xs mt-4">
          You can change this later in settings
        </p>
      </div>
    </div>
  );
}
