import { HocuspocusProvider } from '@hocuspocus/provider';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';

interface UseHocuspocusProviderOptions {
  documentName: string;
  enabled?: boolean;
}

export function useHocuspocusProvider({
  documentName,
  enabled = true
}: UseHocuspocusProviderOptions) {
  const { getToken, userId } = useAuth();
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (!enabled || !documentName || !userId) {
      // Clean up if conditions are not met
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      setProvider(null);
      setYdoc(null);
      setIsConnected(false);
      return;
    }

    let mounted = true;
    let hocuspocusProvider: HocuspocusProvider | null = null;

    // Simple in-memory token cache
    let lastToken: string | null = null;
    let lastFetchedAt = 0;
    const CACHE_TTL_MS = 55_000;

    const getStableToken = async (): Promise<string | null> => {
      const now = Date.now();
      if (lastToken && now - lastFetchedAt < CACHE_TTL_MS) {
        return lastToken;
      }
      let token = await getToken(); // prefer cached SDK token
      if (!token) {
        token = await getToken({ skipCache: true });
      }
      if (token) {
        lastToken = token;
        lastFetchedAt = Date.now();
        return token;
      }
      return null;
    };

    const initializeProvider = async () => {
      try {
        const token = await getStableToken();

        // Check if still mounted and have token
        if (!mounted) {
          return;
        }

        if (!token || token.trim() === '') {
          setError('No authentication token available. Please sign in again.');
          console.warn('HocuspocusProvider: No token available, cannot connect');
          return;
        }

        // Create Y.Doc
        const doc = new Y.Doc();

        // Determine WebSocket URL
        // Priority: VITE_HOCUSPOCUS_URL > relative /ws (nginx proxy)
        // IMPORTANT: Frontend runs in browser, so NEVER use localhost:1234 unless explicitly set
        // Always use relative /ws path which nginx will proxy to hocuspocus service
        const getWebSocketUrl = () => {
          // In development, we might want to use the env var if set
          if (import.meta.env.DEV && import.meta.env.VITE_HOCUSPOCUS_URL) {
            console.log('[HocuspocusProvider] Using VITE_HOCUSPOCUS_URL (DEV):', import.meta.env.VITE_HOCUSPOCUS_URL);
            return import.meta.env.VITE_HOCUSPOCUS_URL;
          }

          // For production/deployed environments, ALWAYS use relative path via nginx proxy
          // This ensures we never try to connect to localhost:1234 from a client's browser
          // Use ws:// for Traefik domains (often have self-signed certs) or if explicitly set
          const isTraefikDomain = window.location.hostname.includes('.traefik.me');
          const forceWs = import.meta.env.VITE_FORCE_WS === 'true' || isTraefikDomain;
          const protocol = (!forceWs && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
          const url = `${protocol}//${window.location.host}/ws`;
          console.log('[HocuspocusProvider] Using WebSocket URL via nginx proxy:', url, {
            hostname: window.location.hostname,
            port: window.location.port,
            protocol: window.location.protocol,
            mode: import.meta.env.MODE,
            dev: import.meta.env.DEV,
            isTraefikDomain,
            forceWs
          });
          return url;
        };

        // Create Hocuspocus provider with token
        hocuspocusProvider = new HocuspocusProvider({
          url: getWebSocketUrl(),
          name: documentName,
          token: token,
          document: doc,
          onConnect: () => {
            if (mounted) {
              setIsConnected(true);
              setError(null);
            }
          },
          onDisconnect: () => {
            if (mounted) {
              setIsConnected(false);
            }
          },
          onStateless: (data) => {
            // Handle stateless messages (e.g., metadata updates)
            const payload = data.payload as any;
            if (mounted && payload && payload.type === 'metadata') {
              // Emit custom event for metadata updates
              window.dispatchEvent(new CustomEvent('hocuspocus-metadata', {
                detail: payload.payload
              }));
            }
          },
          onDestroy: () => {
            if (mounted) {
              setIsConnected(false);
            }
          },
          onClose: ({ event }) => {
            // Handle connection close events
            if (mounted) {
              console.warn('Hocuspocus connection closed:', event);
            }
          },
        });

        if (mounted) {
          providerRef.current = hocuspocusProvider;
          setProvider(hocuspocusProvider);
          setYdoc(doc);
          setError(null);
        } else {
          // If unmounted while initializing, destroy the provider
          hocuspocusProvider.destroy();
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize provider';
          setError(errorMessage);
          console.error('Failed to initialize Hocuspocus provider:', err);
        }
      }
    };

    initializeProvider();

    return () => {
      mounted = false;
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (hocuspocusProvider) {
        hocuspocusProvider.destroy();
      }
      setProvider(null);
      setYdoc(null);
      setIsConnected(false);
    };
  }, [documentName, enabled, userId, getToken]);

  return {
    provider,
    ydoc,
    isConnected,
    error,
  };
}

