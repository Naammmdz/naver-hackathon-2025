import { HocuspocusProvider } from '@hocuspocus/provider';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface UseWorkspaceYjsOptions {
  workspaceId: string | null;
  enabled?: boolean;
}

export function useWorkspaceYjs({ 
  workspaceId, 
  enabled = true 
}: UseWorkspaceYjsOptions) {
  const { getToken, userId } = useAuth();
  const tokenTemplate = import.meta.env.VITE_CLERK_JWT_TEMPLATE;
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  // Yjs Maps for workspace data
  const [tasksMap, setTasksMap] = useState<Y.Map<any> | null>(null);
  const [taskOrdersMap, setTaskOrdersMap] = useState<Y.Map<Y.Array<number>> | null>(null);
  const [boardsMap, setBoardsMap] = useState<Y.Map<any> | null>(null);
  const [boardContentMap, setBoardContentMap] = useState<Y.Map<any> | null>(null);
  const [documentsMap, setDocumentsMap] = useState<Y.Map<any> | null>(null);
  const [docContentMap, setDocContentMap] = useState<Y.Map<Y.Text> | null>(null);

  useEffect(() => {
    if (!enabled || !workspaceId || !userId) {
      // Clean up if conditions are not met
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      setProvider(null);
      setYdoc(null);
      setTasksMap(null);
      setTaskOrdersMap(null);
      setBoardsMap(null);
      setBoardContentMap(null);
      setDocumentsMap(null);
      setDocContentMap(null);
      setIsConnected(false);
      return;
    }

    let mounted = true;
    let hocuspocusProvider: HocuspocusProvider | null = null;

    // Simple in-memory token cache to avoid Clerk 429 and reconnections
    let lastToken: string | null = null;
    let lastFetchedAt = 0;
    const CACHE_TTL_MS = 55_000;

    const getStableToken = async (): Promise<string | null> => {
      const now = Date.now();
      if (lastToken && now - lastFetchedAt < CACHE_TTL_MS) {
        console.log('[WorkspaceYjs] Using cached token');
        return lastToken;
      }
      // Prefer cached Clerk token (no skipCache)
      const baseOptions = tokenTemplate ? { template: tokenTemplate as string } : {};
      console.log('[WorkspaceYjs] Fetching token from Clerk...', { hasTemplate: !!tokenTemplate });
      let token = await getToken(baseOptions as any);
      if (!token) {
        console.warn('[WorkspaceYjs] Token not found, forcing refresh...');
        // Force refresh only when needed
        const refreshOptions = tokenTemplate
          ? { template: tokenTemplate as string, skipCache: true }
          : { skipCache: true };
        token = await getToken(refreshOptions as any);
      }
      if (token) {
        lastToken = token;
        lastFetchedAt = Date.now();
        console.log('[WorkspaceYjs] Token obtained:', { 
          length: token.length, 
          preview: `${token.substring(0, 20)}...` 
        });
        return token;
      }
      console.error('[WorkspaceYjs] Failed to get token from Clerk');
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
          console.warn('useWorkspaceYjs: No token available, cannot connect');
          return;
        }

        // Debug logging in production
        if (import.meta.env.PROD) {
          console.log('[WorkspaceYjs] Token available:', token ? `${token.substring(0, 20)}...` : 'null');
        }

        // Create Y.Doc
        const doc = new Y.Doc();
        
        // Determine WebSocket URL
        // Priority: VITE_HOCUSPOCUS_URL > relative /ws (nginx proxy) > localhost (dev only)
        // IMPORTANT: Frontend runs in browser, so localhost:1234 only works in local dev
        const getWebSocketUrl = () => {
          // If explicitly set, use it
          if (import.meta.env.VITE_HOCUSPOCUS_URL) {
            console.log('[WorkspaceYjs] Using VITE_HOCUSPOCUS_URL:', import.meta.env.VITE_HOCUSPOCUS_URL);
            return import.meta.env.VITE_HOCUSPOCUS_URL;
          }
          
          // Only use direct localhost connection if:
          // 1. We're in development mode (Vite dev server)
          // 2. AND we're on localhost/127.0.0.1
          // 3. AND we're using Vite dev server port (5173) or common dev port (3000)
          // This ensures we only use direct connection during local development
          const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';
          const isLocalhost = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
          const isViteDevPort = window.location.port === '5173' || 
                               window.location.port === '3000' || 
                               window.location.port === '';
          const isDirectLocalhost = isDevMode && isLocalhost && isViteDevPort;
          
          if (isDirectLocalhost) {
            const devUrl = 'ws://localhost:1234';
            console.log('[WorkspaceYjs] Development WebSocket URL (direct):', devUrl);
            return devUrl;
          }
          
          // For ALL other cases (production, deployed, Docker, etc.), use relative path via nginx proxy
          // This works because nginx will proxy /ws to the actual hocuspocus service
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const url = `${protocol}//${window.location.host}/ws`;
          console.log('[WorkspaceYjs] Using WebSocket URL via nginx proxy:', url, {
            hostname: window.location.hostname,
            port: window.location.port,
            protocol: window.location.protocol,
            isDevMode,
            isLocalhost,
            isViteDevPort,
            isDirectLocalhost
          });
          return url;
        };

        const wsUrl = getWebSocketUrl();
        console.log('[WorkspaceYjs] Initializing provider:', { 
          url: wsUrl, 
          name: `workspace-${workspaceId}`,
          hasToken: !!token,
          tokenLength: token?.length || 0,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
        });

        // Create Hocuspocus provider for workspace with token
        // HocuspocusProvider will automatically add token to query parameter ?token=...
        hocuspocusProvider = new HocuspocusProvider({
          url: wsUrl,
          name: `workspace-${workspaceId}`,
          token: token, // This will be sent as ?token=... in WebSocket URL
          document: doc,
          onConnect: () => {
            if (mounted) {
              setIsConnected(true);
              setError(null);
              // eslint-disable-next-line no-console
              console.log('[WorkspaceYjs] connected');
            }
          },
          onDisconnect: () => {
            if (mounted) {
              setIsConnected(false);
              // eslint-disable-next-line no-console
              console.warn('[WorkspaceYjs] disconnected');
            }
          },
          onStateless: (payload) => {
            // Handle stateless messages (e.g., metadata updates)
            const data = payload as any;
            if (mounted && data && (data as any).type === 'metadata') {
              window.dispatchEvent(new CustomEvent('workspace-metadata', {
                detail: (data as any).payload
              }));
            }
          },
          onDestroy: () => {
            if (mounted) {
              setIsConnected(false);
              // eslint-disable-next-line no-console
              console.warn('[WorkspaceYjs] destroyed');
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
          // expose provider for consumers that cannot easily receive via props
          try {
            (window as any).__WORKSPACE_PROVIDER = hocuspocusProvider;
            // Dispatch event to notify that provider is ready
            // Use setTimeout to defer event dispatch to next event loop
            // This prevents "Cannot update a component while rendering" warnings
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('workspace-provider-ready'));
            }, 0);
          } catch {}
          setYdoc(doc);

          // Initialize Yjs Maps
          const tasks = doc.getMap<any>('tasks');
          const orders = doc.getMap<Y.Array<number>>('taskOrders');
          const boards = doc.getMap<any>('boards');
          const boardContent = doc.getMap<any>('boardContent');
          const documents = doc.getMap<any>('documents');
          const docContent = doc.getMap<Y.Text>('docContent');

          setTasksMap(tasks);
          setTaskOrdersMap(orders as unknown as Y.Map<Y.Array<number>>);
          setBoardsMap(boards);
          setBoardContentMap(boardContent);
          setDocumentsMap(documents);
          setDocContentMap(docContent as unknown as Y.Map<Y.Text>);
          setError(null);

          // Auto-refresh token periodically and on disconnect
          const attachTokenRefresher = () => {
            // Clear old timer if any
            if (refreshTimerRef.current) {
              clearInterval(refreshTimerRef.current);
              refreshTimerRef.current = null;
            }
            // Refresh token every ~50s
            refreshTimerRef.current = window.setInterval(async () => {
              try {
                const newToken = await getStableToken();
                if (newToken && providerRef.current) {
                  if (typeof (providerRef.current as any).setToken === 'function') {
                    (providerRef.current as any).setToken(newToken);
                    // eslint-disable-next-line no-console
                    console.log('[WorkspaceYjs] token refreshed');
                  } else {
                    // Fallback: update configuration
                    try {
                      (providerRef.current as any).configuration.token = newToken;
                    } catch {}
                  }
                  // If currently disconnected, try reconnect
                  try {
                    const p: any = providerRef.current;
                    if (p && p.status === 'disconnected' && typeof p.connect === 'function') {
                      p.connect();
                    }
                  } catch {}
                }
              } catch (e) {
                console.warn('[WorkspaceYjs] token refresh failed', e);
              }
            }, 50_000);
          };

          attachTokenRefresher();

          // Also attempt to refresh token immediately on disconnect
          (hocuspocusProvider as any).on('status', async (event: any) => {
            if (!mounted) return;
            try {
              // eslint-disable-next-line no-console
              console.log('[WorkspaceYjs] status', event?.status);
              if (event?.status === 'disconnected') {
                const newToken = await getStableToken();
                if (newToken && providerRef.current) {
                  if (typeof (providerRef.current as any).setToken === 'function') {
                    (providerRef.current as any).setToken(newToken);
                  } else {
                    try {
                      (providerRef.current as any).configuration.token = newToken;
                    } catch {}
                  }
                  const p: any = providerRef.current;
                  if (p && typeof p.connect === 'function') {
                    p.connect();
                  }
                }
              }
            } catch (e) {
              console.warn('[WorkspaceYjs] status handler error', e);
            }
          });
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
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (hocuspocusProvider) {
        hocuspocusProvider.destroy();
      }
      try {
        delete (window as any).__WORKSPACE_PROVIDER;
      } catch {}
      setProvider(null);
      setYdoc(null);
      setTasksMap(null);
      setTaskOrdersMap(null);
      setBoardsMap(null);
      setBoardContentMap(null);
      setDocumentsMap(null);
      setDocContentMap(null);
      setIsConnected(false);
    };
  }, [workspaceId, enabled, userId, tokenTemplate, getToken]);

  return {
    provider,
    ydoc,
    isConnected,
    error,
    tasksMap,
    taskOrdersMap,
    boardsMap,
    boardContentMap,
    documentsMap,
    docContentMap,
  };
}

