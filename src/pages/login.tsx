import { useState } from "react";
import { Link, useLocation } from "wouter";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { mockSignIn } from "@/lib/mockAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    if (!isFirebaseConfigured || !auth) {
      mockSignIn(email, password);
      window.dispatchEvent(new Event("englifly:auth"));
      setLocation("/home");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLocation("/home");
    } catch (err: any) {
      setError(err?.code === "auth/invalid-credential" ? "Invalid email or password." : (err?.message ?? "Sign in failed."));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg,#0e5fa8 0%,#1a8fd1 40%,#0ea5e9 70%,#e8f4fd 100%)" }}>

      {/* Top branding area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-6">
        <div className="fade-up flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl mb-4"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(20px)", border: "2px solid rgba(255,255,255,0.35)" }}>
            <span className="text-3xl text-white font-black tracking-tight">ZX</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ZX-Chat AI</h1>
          <p className="text-white/70 mt-1.5 text-sm font-medium">Your AI English tutor</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-bold text-foreground mb-5">Sign in</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input id="email" data-testid="input-email" type="email" autoComplete="email"
                placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                className="h-12 rounded-xl bg-[#f5f9fe] border-[#dde8f5] text-sm focus:border-primary focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</Label>
              <Input id="password" data-testid="input-password" type="password" autoComplete="current-password"
                placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required
                className="h-12 rounded-xl bg-[#f5f9fe] border-[#dde8f5] text-sm" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <p data-testid="text-error" className="text-destructive text-sm">{error}</p>
              </div>
            )}
            <Button type="submit" disabled={loading} data-testid="button-login"
              className="w-full h-12 rounded-xl font-bold text-sm text-white shadow-lg mt-2"
              style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
              {loading ? "Signing in…" : "Sign in →"}
            </Button>
          </form>
        </div>

        <p className="text-white/70 text-sm mt-6 fade-up" style={{ animationDelay: "0.18s" }}>
          No account?{" "}
          <Link href="/signup" className="text-white font-bold hover:underline">
            Create one free
          </Link>
        </p>
      </div>

      {/* Bottom decoration */}
      <div className="h-16 flex items-center justify-center pb-4">
        <p className="text-white/40 text-xs">🔒 Secure · Private · AI-powered</p>
      </div>
    </div>
  );
}
