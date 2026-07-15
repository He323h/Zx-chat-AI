import { useLocation } from "wouter";

const TABS = [
  { path: "/home",    emoji: "🏠", label: "Home" },
  { path: "/roadmap", emoji: "📚", label: "Path" },
  { path: "/quiz",    emoji: "❓", label: "Quiz" },
  { path: "/streak",  emoji: "🔥", label: "Streak" },
  { path: "/grammar", emoji: "🧩", label: "Words" },
];

export function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-lg px-4 pb-3 pt-1">
        <div className="clay-nav flex justify-around items-center px-2 py-3"
          style={{ borderRadius: 28 }}>
          {TABS.map(tab => {
            const isActive = location === tab.path || location.startsWith(tab.path + "?");
            return (
              <button
                key={tab.path}
                onClick={() => setLocation(tab.path)}
                className="flex flex-col items-center gap-0.5 transition-all duration-200"
                style={{ minWidth: 56 }}>
                <div
                  className="w-11 h-11 rounded-[18px] flex items-center justify-center text-xl transition-all duration-200"
                  style={{
                    background: isActive ? "linear-gradient(135deg,#1CB0F6,#0E8FD4)" : "transparent",
                    boxShadow: isActive
                      ? "-2px -2px 5px rgba(255,255,255,0.55), 3px 3px 10px rgba(14,143,212,0.38)"
                      : "none",
                    transform: isActive ? "scale(1.08) translateY(-2px)" : "scale(1)",
                  }}>
                  {tab.emoji}
                </div>
                <span
                  className="text-[9px] font-bold leading-none transition-colors"
                  style={{ color: isActive ? "#1CB0F6" : "#94a3b8" }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
