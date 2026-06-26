import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md mb-6">
        <span className="text-3xl text-primary-foreground font-bold">E</span>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page doesn't exist.</p>
      <Link
        href="/chat"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
      >
        Go to chat
      </Link>
    </div>
  );
}
