import { useState } from "react";
import { Link, useLocation } from "wouter";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { mockSignIn, checkLoginAllowed, recordFailedAttempt } from "@/lib/mockAuth";

const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }

    // Brute-force guard (applies in both mock and Firebase mode)
    const rateCheck = checkLoginAllowed();
    if (!rateCheck.allowed) {
      setError(`Too many failed attempts. Try again in ${rateCheck.waitMinutes} minute${rateCheck.waitMinutes !== 1 ? "s" : ""}.`);
      return;
    }

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
      recordFailedAttempt();
      // Use a generic message — never reveal whether email or password was wrong
      setError("Invalid email or password.");
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    if (!isFirebaseConfigured || !auth) { setError("Firebase not configured."); return; }
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
      style={{ background: "linear-gradient(160deg,#1CB0F6 0%,#0E8FD4 45%,#0891b2 75%,#EAF4FF 100%)" }}>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pt-14 pb-6">

        {/* Logo */}
        <div className="fade-up flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-[26px] flex items-center justify-center mb-4"
            style={{
              background: "rgba(255,255,255,0.22)",
              backdropFilter: "blur(20px)",
              boxShadow: "-4px -4px 10px rgba(255,255,255,0.35), 6px 6px 18px rgba(14,143,212,0.45)",
              border: "2px solid rgba(255,255,255,0.35)",
            }}>
            <span className="text-3xl text-white font-black tracking-tight">ZX</span>
          </div>
          <h1 className="text-[28px] font-black text-white tracking-tight">ZX-Chat AI</h1>
          <p className="text-white/70 mt-1 text-[13px] font-medium">Your AI English tutor</p>
        </div>

        {/* Clay card */}
        <div className="clay-card w-full max-w-sm p-6 fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-[18px] font-black text-[#1A2B3C] mb-5">Sign in</h2>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="clay-btn-white w-full h-12 flex items-center justify-center gap-2.5 text-[14px] mb-4 disabled:opacity-60">
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.4-.1-2.7-.5-4z" fill="#FFC107"/>
              <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.8 0-14.5 4.4-17.7 10.7z" fill="#FF3D00"/>
              <path d="M24 45c5.5 0 10.5-1.9 14.4-5.1l-6.7-5.5C29.6 35.9 27 37 24 37c-6.1 0-10.7-3.1-11.8-8.5H4.4C7.6 38.9 15.1 45 24 45z" fill="#4CAF50"/>
              <path d="M44.5 20H24v8.5h11.8c-.6 2.1-1.9 3.9-3.5 5.3l6.7 5.5C42.2 36.3 45 30.5 45 24c0-1.4-.1-2.7-.5-4z" fill="#1976D2"/>
            </svg>
            {googleLoading ? "Signing in…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "#EAF4FF" }} />
            <span className="text-[11px] text-[#6B7785] font-bold">or</span>
            <div className="flex-1 h-px" style={{ background: "#EAF4FF" }} />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#6B7785] uppercase tracking-widest">Email</label>
              <input
                type="email" autoComplete="email"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full h-12 px-4 text-[14px] text-[#1A2B3C] rounded-[16px] outline-none transition-all"
                style={{
                  background: "#EAF4FF",
                  boxShadow: "inset 2px 2px 6px rgba(28,176,246,0.12), inset -1px -1px 4px rgba(255,255,255,0.9)",
                  border: "none",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#6B7785] uppercase tracking-widest">Password</label>
              <input
                type="password" autoComplete="current-password"
                placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full h-12 px-4 text-[14px] text-[#1A2B3C] rounded-[16px] outline-none transition-all"
                style={{
                  background: "#EAF4FF",
                  boxShadow: "inset 2px 2px 6px rgba(28,176,246,0.12), inset -1px -1px 4px rgba(255,255,255,0.9)",
                  border: "none",
                }}
              />
            </div>
            {error && (
              <div className="rounded-[16px] px-3 py-2.5" style={{ background: "#fff0f0" }}>
                <p className="text-red-600 text-[12px] font-semibold">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="clay-btn w-full h-12 text-[15px] disabled:opacity-60 mt-1">
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>

        <p className="text-white/75 text-[13px] mt-5 fade-up" style={{ animationDelay: "0.18s" }}>
          No account?{" "}
          <Link href="/signup" className="text-white font-black hover:underline">
            Create one free
          </Link>
        </p>
      </div>

      <div className="h-14 flex items-center justify-center">
        <p className="text-white/40 text-[11px]">🔒 Secure · Private · AI-powered</p>
      </div>
    </div>
  );
}
