import { useAuth } from '@clerk/clerk-react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

interface YjsContextValue {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  workspaceId: string | null;
}

const YjsContext = createContext<YjsContextValue>({
  ydoc: null,
  provider: null,
  isConnected: false,
  workspaceId: null,
});

export const useYjs = () => {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error('useYjs must be used within YjsProvider');
  }
  return context;
};

interface YjsProviderProps {
  workspaceId: string | null;
  children: React.ReactNode;
}

export const YjsProvider: React.FC<YjsProviderProps> = ({ workspaceId, children }) => {
  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      // No workspace selected, cleanup
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Initialize connection with auth token
    const initYjsConnection = async () => {
      try {
        // Get Clerk auth token
        const token = await getToken();
        if (!token) {
          console.error('[Yjs] No auth token available');
          return;
        }

        // Create Yjs document
        const ydoc = new Y.Doc();
        // Don't set clientID manually - let Yjs handle it
        ydocRef.current = ydoc;

        // Create WebSocket provider with auth token
        // Note: y-websocket will append the room name to the URL
        // Token is sent as query parameter for handshake interceptor
        const provider = new WebsocketProvider(
          'ws://localhost:8989/ws/yjs',
          workspaceId,
          ydoc,
          {
            // Auth token sent as query param
            params: { token },
            connect: true,
            // Enable auto-reconnect with exponential backoff
            maxBackoffTime: 5000, // Max 5s between reconnect attempts
            // Disable awareness (we handle cursors separately)
            awareness: undefined,
            // Disable loading initial document state to prevent replay
            disableBc: true,
            // Only sync real-time changes, not historical ones
            resyncInterval: -1,
          }
        );

        providerRef.current = provider;

        // Listen to connection status
        provider.on('status', (event: { status: string }) => {
          console.log('[Yjs] Connection status:', event.status);
          setIsConnected(event.status === 'connected');
          
          if (event.status === 'disconnected') {
            console.warn('[Yjs] Disconnected, will auto-reconnect...');
          }
        });

        provider.on('sync', (isSynced: boolean) => {
          console.log('[Yjs] Sync status:', isSynced);
          if (isSynced) {
            console.log('[Yjs] ✅ Fully synced with server');
          }
        });
        
        provider.on('connection-close', (event: any) => {
          const closeCode = event?.code;
          const closeReason = event?.reason;
          
          console.warn('[Yjs] Connection closed:', { closeCode, closeReason });
          
          // Check if kicked from workspace (custom close code 4003)
          if (closeCode === 4003) {
            console.error('[Yjs] ❌ Access denied: You are not a member of this workspace');
            
            // Stop reconnection attempts
            if (providerRef.current) {
              providerRef.current.shouldConnect = false;
              providerRef.current.disconnect();
            }
            
            // TODO: Show user notification and redirect to workspace selection
            // For now, just log the error
            alert('You have been removed from this workspace. Please select another workspace.');
          }
        });
        
        provider.on('connection-error', (error: any) => {
          console.error('[Yjs] Connection error:', error);
        });
      } catch (error) {
        console.error('[Yjs] Failed to initialize connection:', error);
      }
    };

    initYjsConnection();

    // Cleanup on unmount or workspace change
    return () => {
      console.log('[Yjs] Cleaning up workspace:', workspaceId);
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, [workspaceId, getToken]);

  const value: YjsContextValue = {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    isConnected,
    workspaceId,
  };

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>;
};
