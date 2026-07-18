import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Home from "@/pages/home";
import LevelSelect from "@/pages/level-select";
import Chat from "@/pages/chat";
import StrangerChat from "@/pages/stranger";
import Settings from "@/pages/settings";
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";
import About from "@/pages/about";
import VocabularyPage from "@/pages/vocabulary";
import ActorPage from "@/pages/actor";
import TeacherPage from "@/pages/teacher";
import StreakPage from "@/pages/streak";
import QuizPage from "@/pages/quiz";
import RoadmapPage from "@/pages/roadmap";
import GrammarPage from "@/pages/grammar";
import LessonPage from "@/pages/lesson";
import { updateStreak } from "@/lib/streakSystem";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function SplashScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: "linear-gradient(135deg, #1CB0F6, #0E8FD4)",
      }}
    >
      {/* Accessible loading announcement */}
      <span role="status" aria-live="polite" className="sr-only">Loading English Tutor - AI Powered…</span>
      {/* Soft radial glow behind logo */}
      <div
        className="absolute"
        style={{
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(111,211,255,0.4) 0%, transparent 70%)",
        }}
      />
      <img
        src="/owl-logo.png"
        alt="English Tutor - AI Powered"
        style={{
          width: "38vw",
          maxWidth: 200,
          minWidth: 120,
          position: "relative",
          zIndex: 1,
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))",
          // No animation — must match the static HTML splash exactly so
          // the fade-handoff from index.html → React is invisible to the user.
        }}
      />
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [showSplash, setShowSplash] = useState(true);

  // Splash shows for at least 1.5 s
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // Update streak whenever user is authenticated
  useEffect(() => {
    if (user) {
      updateStreak();
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    const publicRoutes = ["/login", "/signup"];
    if (!user && !publicRoutes.includes(location)) {
      setLocation("/login");
    }
  }, [user, loading, location, setLocation]);

  if (loading || showSplash) {
    return <SplashScreen />;
  }
  return null;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (loading) return;
    setLocation(user ? "/home" : "/login");
  }, [user, loading, setLocation]);
  return null;
}

function Router() {
  return (
    <>
      <AuthGate />
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/home" component={Home} />
        <Route path="/level-select" component={LevelSelect} />
        <Route path="/chat" component={Chat} />
        <Route path="/stranger" component={StrangerChat} />
        <Route path="/vocabulary" component={VocabularyPage} />
        <Route path="/actor" component={ActorPage} />
        <Route path="/teacher" component={TeacherPage} />
        <Route path="/settings" component={Settings} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms" component={Terms} />
        <Route path="/about" component={About} />
        {/* New feature routes */}
        <Route path="/streak" component={StreakPage} />
        <Route path="/quiz" component={QuizPage} />
        <Route path="/roadmap" component={RoadmapPage} />
        <Route path="/grammar" component={GrammarPage} />
        <Route path="/lesson/:topicId" component={LessonPage} />
        <Route path="/" component={RootRedirect} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
