import GlobalChatPanel from "@/components/ai/GlobalChatPanel";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiAuthContext } from "@/lib/api/authContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { FocusFlyProvider } from "./features/focusFly/FocusFlyProvider";
import AppWrapper from "./pages/AppWrapper";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";

const queryClient = new QueryClient();

const App = () => {
  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const { isLoaded, getToken, userId } = useAuth();
  const tokenTemplate = import.meta.env.VITE_CLERK_JWT_TEMPLATE;

  useEffect(() => {
    if (!isLoaded) {
      apiAuthContext.setTokenFetcher(null);
      return;
    }

    apiAuthContext.setTokenFetcher(async () => {
      try {
        const options = tokenTemplate
          ? { template: tokenTemplate, skipCache: true }
          : { skipCache: true };
        const token = await getToken(options);

        if (token) {
          return token;
        }

        // Attempt fallback retrieval without template in case template is not configured yet
        const fallback = await getToken({ skipCache: true });
        return fallback ?? null;
      } catch (error) {
        console.warn("Failed to acquire auth token", error);
        return null;
      }
    });

    return () => {
      apiAuthContext.setTokenFetcher(null);
    };
  }, [getToken, isLoaded]);

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
          <GlobalChatPanel />
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
