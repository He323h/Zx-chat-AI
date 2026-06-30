import { useState, useEffect, useMemo, useRef } from "react";

export function StreamingText({
  text,
  speed = 30,
  onDone,
}: {
  text: string;
  speed?: number;
  onDone?: () => void;
}) {
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setCount(0);
    doneRef.current = false;
    if (!text) { onDone?.(); return; }

    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= tokens.length && !doneRef.current) {
        doneRef.current = true;
        clearInterval(id);
        onDone?.();
      }
    }, speed);

    return () => clearInterval(id);
  }, [text]);

  const isDone = count >= tokens.length;
  return (
    <span className="whitespace-pre-wrap">
      {tokens.slice(0, count).join("")}
      {!isDone && <span className="streaming-cursor" />}
    </span>
  );
}

export function TypingBubble({
  avatarContent,
  avatarBg = "hsl(var(--primary))",
  dotColor = "#94a3b8",
}: {
  avatarContent: React.ReactNode;
  avatarBg?: string;
  dotColor?: string;
}) {
  return (
    <div className="flex items-end gap-2 mb-3 bubble-in-left">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
        style={{ background: avatarBg }}
      >
        {avatarContent}
      </div>
      <div className="relative bubble-recv px-4 py-3.5 shadow-sm overflow-hidden" style={{ minWidth: 72 }}>
        <div className="absolute inset-0 typing-shimmer pointer-events-none rounded-[inherit]" />
        <div className="flex items-center gap-1.5 h-5">
          <span className="typing-dot w-2 h-2 rounded-full" style={{ background: dotColor }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ background: dotColor }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ background: dotColor }} />
        </div>
      </div>
    </div>
  );
}

export function Waveform({
  active,
  color = "#22c55e",
  bars = 5,
}: {
  active: boolean;
  color?: string;
  bars?: number;
}) {
  return (
    <div className="flex items-end gap-1" style={{ height: 32 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className={active ? `wave-bar wave-bar-${i + 1}` : "wave-bar"}
          style={{
            background: color,
            height: active ? undefined : [6, 12, 18, 12, 6][i] ?? 6,
            opacity: active ? 1 : 0.35,
            transition: "opacity 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

const CONFETTI_PARTICLES = [
  { color: "#f59e0b", delay: 0,    anim: 1, shape: "circle"  },
  { color: "#22c55e", delay: 0.1,  anim: 2, shape: "square"  },
  { color: "#3b82f6", delay: 0.05, anim: 3, shape: "circle"  },
  { color: "#ec4899", delay: 0.15, anim: 4, shape: "square"  },
  { color: "#a855f7", delay: 0.08, anim: 5, shape: "circle"  },
  { color: "#ef4444", delay: 0.12, anim: 6, shape: "square"  },
  { color: "#f97316", delay: 0.03, anim: 7, shape: "circle"  },
  { color: "#06b6d4", delay: 0.18, anim: 8, shape: "square"  },
  { color: "#84cc16", delay: 0.07, anim: 1, shape: "circle"  },
  { color: "#f59e0b", delay: 0.13, anim: 3, shape: "square"  },
  { color: "#c026d3", delay: 0.02, anim: 5, shape: "circle"  },
  { color: "#10b981", delay: 0.16, anim: 2, shape: "square"  },
];

export function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-[100]">
      {CONFETTI_PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 9,
            height: 9,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            background: p.color,
            animation: `confetti-${p.anim} 0.85s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
