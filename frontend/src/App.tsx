import GlobalChatPanel from "@/components/ai/GlobalChatPanel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiAuthContext } from "@/lib/api/authContext";
import { useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FocusFlyProvider } from "./features/focusFly/FocusFlyProvider";

// Lazy load pages for better performance
const Landing = lazy(() => import("./pages/Landing"));
const AppWrapper = lazy(() => import("./pages/AppWrapper"));
const SignInPage = lazy(() => import("./pages/SignIn"));
const SignUpPage = lazy(() => import("./pages/SignUp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  // Initialize theme on app load and route changes
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isMainApp = location.pathname.startsWith("/app");

    const resolvedTheme =
      savedTheme === "system"
        ? (systemDark ? "dark" : "light")
        : savedTheme;

    const shouldBeDark = resolvedTheme
      ? resolvedTheme === "dark"
      : (isMainApp ? true : systemDark);

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [location.pathname]);

  const { isLoaded, getToken, userId } = useAuth();
  const tokenTemplate = import.meta.env.VITE_CLERK_JWT_TEMPLATE;

  useEffect(() => {
    if (!isLoaded) {
      apiAuthContext.setTokenFetcher(null);
      return;
    }

    let lastToken: string | null = null;
    let lastFetchedAt = 0;
    const CACHE_TTL_MS = 55_000; // Clerk tokens typically valid ~60s; refresh slightly before

    apiAuthContext.setTokenFetcher(async () => {
      const now = Date.now();
      if (lastToken && now - lastFetchedAt < CACHE_TTL_MS) {
        return lastToken;
      }
      try {
        // Prefer cached token from Clerk SDK (no skipCache) to avoid 429s
        const baseOptions = tokenTemplate ? { template: tokenTemplate } : {};
        let token = await getToken(baseOptions as any);

        // If token is missing, force refresh once
        if (!token) {
          const refreshOptions = tokenTemplate
          ? { template: tokenTemplate, skipCache: true }
          : { skipCache: true };
          token = await getToken(refreshOptions as any);
        }

        if (token) {
          lastToken = token;
          lastFetchedAt = Date.now();
          return token;
        }
        return null;
      } catch (error) {
        console.warn("Failed to acquire auth token", error);
        return null;
      }
    });

    return () => {
      apiAuthContext.setTokenFetcher(null);
    };
  }, [getToken, isLoaded, tokenTemplate]);

  useEffect(() => {
    if (!isLoaded) {
      apiAuthContext.setUserIdFetcher(null);
      return;
    }

    apiAuthContext.setUserIdFetcher(() => userId ?? null);

    return () => {
      apiAuthContext.setUserIdFetcher(null);
    };
  }, [userId, isLoaded]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FocusFlyProvider>
          <Toaster />
          <Sonner />
          {!isLandingPage && <GlobalChatPanel />}
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-background">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          }>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              
              {/* Protected App Routes */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <AppWrapper />
                  </ProtectedRoute>
                }
              />
              
              {/* 404 - Catch all unmatched routes */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </FocusFlyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
