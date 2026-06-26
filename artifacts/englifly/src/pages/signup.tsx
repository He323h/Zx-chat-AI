import { useState } from "react";
import { Link, useLocation } from "wouter";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { mockSignUp } from "@/lib/mockAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const googleProvider = new GoogleAuthProvider();

export default function Signup() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    if (!isFirebaseConfigured || !auth) {
      mockSignUp(email, password);
      window.dispatchEvent(new Event("englifly:auth"));
      setLocation("/home");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setLocation("/home");
    } catch (err: any) {
      setError(err?.code === "auth/email-already-in-use" ? "Email already registered. Try signing in." : (err?.message ?? "Signup failed."));
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    if (!isFirebaseConfigured || !auth) {
      setError("Firebase not configured.");
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setLocation("/home");
    } catch (err: any) {
      setError(err?.code === "auth/popup-closed-by-user" ? "Google sign-in was cancelled." : (err?.message ?? "Google sign-in failed."));
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg,#0e5fa8 0%,#1a8fd1 40%,#0ea5e9 70%,#e8f4fd 100%)" }}>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        <div className="fade-up flex flex-col items-center mb-7">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl mb-4"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(20px)", border: "2px solid rgba(255,255,255,0.35)" }}>
            <span className="text-3xl text-white font-black tracking-tight">ZX</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ZX-Chat AI</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}>✅ 3 days free</span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}>🚫 No credit card</span>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-bold text-foreground mb-5">Create account</h2>

          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="w-full h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 font-semibold text-sm text-gray-700 shadow-sm transition-all mb-4 disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.1-2.7-.5-4z" fill="#FFC107"/>
              <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.8 0-14.5 4.4-17.7 10.7z" fill="#FF3D00"/>
              <path d="M24 45c5.5 0 10.5-1.9 14.4-5.1l-6.7-5.5C29.6 35.9 27 37 24 37c-6.1 0-10.7-3.1-11.8-8.5H4.4C7.6 38.9 15.1 45 24 45z" fill="#4CAF50"/>
              <path d="M44.5 20H24v8.5h11.8c-.6 2.1-1.9 3.9-3.5 5.3l6.7 5.5C42.2 36.3 45 30.5 45 24c0-1.4-.1-2.7-.5-4z" fill="#1976D2"/>
            </svg>
            {googleLoading ? "Signing up…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input id="email" data-testid="input-email" type="email" autoComplete="email"
                placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                className="h-12 rounded-xl bg-[#f5f9fe] border-[#dde8f5] text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</Label>
              <Input id="password" data-testid="input-password" type="password" autoComplete="new-password"
                placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required
                className="h-12 rounded-xl bg-[#f5f9fe] border-[#dde8f5] text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirm Password</Label>
              <Input id="confirm" data-testid="input-confirm-password" type="password" autoComplete="new-password"
                placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="h-12 rounded-xl bg-[#f5f9fe] border-[#dde8f5] text-sm" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <p data-testid="text-error" className="text-destructive text-sm">{error}</p>
              </div>
            )}
            <Button type="submit" disabled={loading} data-testid="button-signup"
              className="w-full h-12 rounded-xl font-bold text-sm text-white shadow-lg mt-2"
              style={{ background: "linear-gradient(135deg,#0e5fa8,#1a8fd1)" }}>
              {loading ? "Creating account…" : "Start learning free →"}
            </Button>
          </form>
        </div>

        <p className="text-white/70 text-sm mt-6 fade-up" style={{ animationDelay: "0.18s" }}>
          Have an account?{" "}
          <Link href="/login" className="text-white font-bold hover:underline">Sign in</Link>
        </p>
      </div>

      <div className="h-16 flex items-center justify-center pb-4">
        <p className="text-white/40 text-xs">🔒 Secure · Private · AI-powered</p>
      </div>
    </div>
  );
}
