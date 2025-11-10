import GlobalChatPanel from "@/components/ai/GlobalChatPanel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiAuthContext } from "@/lib/api/authContext";
import { useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { FocusFlyProvider } from "./features/focusFly/FocusFlyProvider";
import AppWrapper from "./pages/AppWrapper";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";

const queryClient = new QueryClient();

const App = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Main app always uses dark mode
    const isMainApp = location.pathname.startsWith("/app");
    const shouldBeDark = isMainApp || savedTheme !== "light" && (savedTheme === "dark" || systemDark || !savedTheme);
    
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
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppWrapper />
                </ProtectedRoute>
              }
            />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FocusFlyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
