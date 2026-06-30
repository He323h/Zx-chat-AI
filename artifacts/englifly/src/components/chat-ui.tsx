import { useState, useEffect, useMemo, useRef } from "react";

/* ─── Streaming word-by-word text ─── */
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

/* ─── Typing indicator bubble ─── */
export function TypingBubble({
  avatarContent,
  avatarBg = "hsl(var(--primary))",
  dotColor = "#7c3aed",
}: {
  avatarContent: React.ReactNode;
  avatarBg?: string;
  dotColor?: string;
}) {
  return (
    <div className="flex items-end gap-2.5 mb-3 bubble-in-left">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md avatar-ai-glow"
        style={{ background: avatarBg }}
      >
        {avatarContent}
      </div>
      <div className="relative bubble-ai px-4 py-3.5 shadow-sm overflow-hidden" style={{ minWidth: 80 }}>
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

/* ─── Waveform visualizer ─── */
export function Waveform({
  active,
  color = "#22c55e",
  bars = 5,
}: {
  active: boolean;
  color?: string;
  bars?: number;
}) {
  const clampedBars = Math.min(bars, 7);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 36 }}>
      {Array.from({ length: clampedBars }, (_, i) => (
        <div
          key={i}
          className={active ? `wave-bar wave-bar-${i + 1}` : "wave-bar"}
          style={{
            background: color,
            height: active ? undefined : [5, 12, 20, 12, 5, 9, 16][i] ?? 5,
            opacity: active ? 1 : 0.3,
            transition: "opacity 0.4s ease, height 0.4s ease",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Floating gradient orbs — full-page background layer ─── */
export function ChatBackground({
  variant = "blue",
}: {
  variant?: "blue" | "green" | "purple" | "teal" | "pink";
}) {
  const palettes: Record<string, [string, string, string]> = {
    blue:   ["rgba(147,197,253,0.52)", "rgba(196,181,253,0.40)", "rgba(167,243,208,0.28)"],
    green:  ["rgba(167,243,208,0.55)", "rgba(147,197,253,0.32)", "rgba(196,181,253,0.22)"],
    purple: ["rgba(196,181,253,0.55)", "rgba(147,197,253,0.38)", "rgba(251,207,232,0.30)"],
    teal:   ["rgba(153,246,228,0.52)", "rgba(147,197,253,0.38)", "rgba(196,181,253,0.22)"],
    pink:   ["rgba(251,207,232,0.55)", "rgba(196,181,253,0.38)", "rgba(147,197,253,0.25)"],
  };
  const [c1, c2, c3] = palettes[variant];
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div style={{
        position: "absolute", width: 320, height: 320, borderRadius: "50%",
        background: `radial-gradient(circle, ${c1} 0%, transparent 70%)`,
        top: -90, left: -90, filter: "blur(55px)",
      }} />
      <div style={{
        position: "absolute", width: 260, height: 260, borderRadius: "50%",
        background: `radial-gradient(circle, ${c2} 0%, transparent 70%)`,
        top: "38%", right: -80, filter: "blur(48px)",
      }} />
      <div style={{
        position: "absolute", width: 340, height: 340, borderRadius: "50%",
        background: `radial-gradient(circle, ${c3} 0%, transparent 70%)`,
        bottom: 50, left: "18%", filter: "blur(60px)",
      }} />
    </div>
  );
}

/* ─── Glowing AI avatar ─── */
export function GlowAvatar({
  content,
  bg,
  size = 32,
  state = "idle",
}: {
  content: React.ReactNode;
  bg: string;
  size?: number;
  state?: "idle" | "thinking" | "speaking";
}) {
  const animClass =
    state === "thinking" ? "avatar-ai-think" :
    state === "speaking" ? "avatar-ai-speak" :
    "avatar-ai-glow";
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${animClass}`}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.4,
      }}
    >
      {content}
    </div>
  );
}

/* ─── Voice praise — confetti burst ─── */
const CONFETTI_PARTICLES = [
  { color: "#f59e0b", delay: 0,    anim: 1,  shape: "circle" },
  { color: "#22c55e", delay: 0.06, anim: 2,  shape: "square" },
  { color: "#3b82f6", delay: 0.04, anim: 3,  shape: "circle" },
  { color: "#ec4899", delay: 0.10, anim: 4,  shape: "square" },
  { color: "#a855f7", delay: 0.08, anim: 5,  shape: "circle" },
  { color: "#ef4444", delay: 0.12, anim: 6,  shape: "square" },
  { color: "#f97316", delay: 0.02, anim: 7,  shape: "circle" },
  { color: "#06b6d4", delay: 0.14, anim: 8,  shape: "square" },
  { color: "#84cc16", delay: 0.07, anim: 9,  shape: "circle" },
  { color: "#f59e0b", delay: 0.11, anim: 10, shape: "square" },
  { color: "#c026d3", delay: 0.03, anim: 11, shape: "circle" },
  { color: "#10b981", delay: 0.09, anim: 12, shape: "square" },
  { color: "#fbbf24", delay: 0.05, anim: 1,  shape: "circle" },
  { color: "#60a5fa", delay: 0.13, anim: 3,  shape: "square" },
  { color: "#f472b6", delay: 0.01, anim: 5,  shape: "circle" },
  { color: "#34d399", delay: 0.16, anim: 7,  shape: "square" },
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
            width: 10,
            height: 10,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            background: p.color,
            animation: `confetti-${p.anim} 0.9s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Praise star sparkle — renders next to a praised bubble ─── */
export function PraiseStar() {
  return (
    <div
      className="scale-in"
      style={{
        fontSize: 18,
        lineHeight: 1,
        filter: "drop-shadow(0 0 4px rgba(251,191,36,0.9))",
        animation: "scale-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}
    >
      ⭐
    </div>
  );
}

/* ─── Praise phrases for TTS prepend ─── */
export const PRAISE_PHRASES = [
  "Excellent! ",
  "Great job! ",
  "Perfect! ",
  "Amazing! ",
  "Well done! ",
  "Fantastic! ",
  "Brilliant! ",
  "Outstanding! ",
  "You're doing great! ",
  "Wonderful! ",
  "Superb! ",
  "Keep it up! ",
];

export function pickPraise(): string {
  return PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
}
