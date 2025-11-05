import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState, type ReactNode } from "react";

import { YjsProvider } from "@/context/YjsContext";
import { useWorkspaceStore } from "@/store/workspaceStore";

const DEFAULT_REALTIME_ENDPOINT = "/ws/yjs";

interface RealtimeProviderProps {
  endpoint?: string;
  children: ReactNode;
}

export const RealtimeProvider = ({ endpoint = DEFAULT_REALTIME_ENDPOINT, children }: RealtimeProviderProps) => {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);
  const tokenTemplate = import.meta.env.VITE_CLERK_JWT_TEMPLATE;

  useEffect(() => {
    let isActive = true;

    const resolveToken = async () => {
      if (!isLoaded || !isSignedIn) {
        setAuthToken(undefined);
        return;
      }

      try {
        const tokenOptions = tokenTemplate
          ? { template: tokenTemplate, skipCache: true }
          : { skipCache: true };
        const token = await getToken?.(tokenOptions);
        if (isActive) {
          setAuthToken(token ?? undefined);
        }
      } catch (error) {
        console.warn("Failed to fetch realtime token", error);
        if (isActive) {
          setAuthToken(undefined);
        }
      }
    };

    void resolveToken();

    return () => {
      isActive = false;
    };
  }, [getToken, isLoaded, isSignedIn, tokenTemplate]);

  const resolvedEndpoint = endpoint ?? import.meta.env.VITE_REALTIME_WS_URL ?? DEFAULT_REALTIME_ENDPOINT;

  return (
    <YjsProvider endpoint={resolvedEndpoint} workspaceId={workspaceId} authToken={authToken} userId={userId}>
      {children}
    </YjsProvider>
  );
};
