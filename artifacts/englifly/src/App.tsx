import { useEffect } from "react";
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
import Subscription from "@/pages/subscription";
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

function AuthGate() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md animate-pulse">
            <span className="text-xl text-primary-foreground font-bold">ZX</span>
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
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
        <Route path="/subscription" component={Subscription} />
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
