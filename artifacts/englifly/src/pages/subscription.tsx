import { useLocation } from "wouter";
import { ArrowLeft, Check, Zap, Crown, Sprout } from "lucide-react";

const PLANS = [
  {
    id: "trial",
    name: "Free Trial",
    price: "Free",
    period: "",
    daily: "Unlimited",
    Icon: Sprout,
    highlight: false,
    accentColor: "#4caf50",
    features: ["3 days full access", "All conversation topics", "No credit card needed"],
  },
  {
    id: "basic",
    name: "Basic",
    price: "₹39",
    period: "/month",
    daily: "60 min/day",
    Icon: Zap,
    highlight: false,
    accentColor: "hsl(200, 92%, 42%)",
    features: ["60 min of chat daily", "All topics & levels", "Grammar corrections"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹99",
    period: "/month",
    daily: "4 hours/day",
    Icon: Crown,
    highlight: true,
    accentColor: "hsl(200, 92%, 42%)",
    features: ["240 min of chat daily", "All topics & levels", "Grammar corrections", "Priority AI responses"],
  },
];

export default function Subscription() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setLocation("/home")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f4f8] transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground text-base leading-tight">Choose a Plan</h1>
          <p className="text-xs text-muted-foreground">Unlock unlimited practice time</p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        {/* Coming soon notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center fade-up">
          <p className="text-amber-800 text-sm font-medium">🎉 Payments will be enabled soon.</p>
          <p className="text-amber-700 text-xs mt-0.5">Enjoy your free trial for now!</p>
        </div>

        {PLANS.map((plan, i) => {
          const { Icon } = plan;
          return (
            <div key={plan.id}
              className="relative rounded-2xl overflow-hidden fade-up"
              style={{ animationDelay: `${i * 0.07}s` }}>
              {plan.highlight && (
                <div className="absolute top-0 right-0 text-[11px] font-bold text-white px-3 py-1 rounded-bl-xl"
                  style={{ background: "hsl(200, 92%, 42%)" }}>
                  BEST VALUE
                </div>
              )}
              <div className={`border p-5 rounded-2xl ${plan.highlight ? "border-primary shadow-md" : "border-border bg-white"}`}
                style={plan.highlight ? { background: "linear-gradient(135deg,#e8f4fd 0%,#fff 100%)" } : {}}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: plan.highlight ? "#e0f0ff" : "#f0f8ff" }}>
                      <Icon size={18} style={{ color: plan.accentColor }} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.daily}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                      <Check size={14} style={{ color: plan.accentColor }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.id !== "trial" && (
                  <button
                    disabled
                    className="w-full h-10 rounded-xl font-semibold text-sm text-white opacity-50 cursor-not-allowed"
                    style={{ background: "#94a3b8" }}
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Paid plans coming soon · Cancel anytime
        </p>
      </div>
    </div>
  );
}
