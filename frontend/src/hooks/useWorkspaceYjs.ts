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
      setIsConnected(false);
      return;
    }

    let mounted = true;
    let hocuspocusProvider: HocuspocusProvider | null = null;

    const initializeProvider = async () => {
      try {
        // Get token first with skipCache to ensure fresh token
        const token = await getToken({ skipCache: true });
        
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
          onStateless: (data) => {
            // Handle stateless messages (e.g., metadata updates)
            if (mounted && data.type === 'metadata') {
              window.dispatchEvent(new CustomEvent('workspace-metadata', {
                detail: data.payload
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
          const tasks = doc.getMap('tasks');
          const orders = doc.getMap('taskOrders');
          const boards = doc.getMap('boards');
          const boardContent = doc.getMap('boardContent');

          setTasksMap(tasks);
          setTaskOrdersMap(orders);
          setBoardsMap(boards);
          setBoardContentMap(boardContent);
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
      setIsConnected(false);
    };
  }, [workspaceId, enabled, userId]);

  return {
    provider,
    ydoc,
    isConnected,
    error,
    tasksMap,
    taskOrdersMap,
    boardsMap,
    boardContentMap,
  };
}

