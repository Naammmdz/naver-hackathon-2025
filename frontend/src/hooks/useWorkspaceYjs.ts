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
        return lastToken;
      }
      // Prefer cached Clerk token (no skipCache)
      const baseOptions = tokenTemplate ? { template: tokenTemplate as string } : {};
      let token = await getToken(baseOptions as any);
      if (!token) {
        // Force refresh only when needed
        const refreshOptions = tokenTemplate
          ? { template: tokenTemplate as string, skipCache: true }
          : { skipCache: true };
        token = await getToken(refreshOptions as any);
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
          console.warn('useWorkspaceYjs: No token available, cannot connect');
          return;
        }

        // Create Y.Doc
        const doc = new Y.Doc();
        
        // Create Hocuspocus provider for workspace with token
        hocuspocusProvider = new HocuspocusProvider({
          url: import.meta.env.VITE_HOCUSPOCUS_URL || 'ws://localhost:1234',
          name: `workspace-${workspaceId}`,
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

