import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Client, type IMessage } from '@stomp/stompjs';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import SockJS from 'sockjs-client';

export interface CollaborationUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    start: number;
    end: number;
  };
  color: string;
}

export interface CollaborationState {
  activeUsers: CollaborationUser[];
  isConnected: boolean;
  isReconnecting: boolean;
}

export interface CollaborationEvent {
  type: 'user-joined' | 'user-left' | 'cursor-move' | 'selection-change' | 'content-change' | 'member-update' | 'data-change';
  userId: string;
  workspaceId: string;
  timestamp: number;
  data?: any;
  // For data-change events
  entityType?: 'task' | 'document' | 'board';
  action?: 'created' | 'updated' | 'deleted';
  entityId?: string;
}

interface CollaborationContextType extends CollaborationState {
  // Connection management
  connect: () => void;
  disconnect: () => void;
  
  // User presence
  updateCursor: (x: number, y: number) => void;
  updateSelection: (start: number, end: number) => void;
  
  // Event handlers
  onEvent: (handler: (event: CollaborationEvent) => void) => () => void;
  
  // Broadcasting
  broadcastEvent: (event: Omit<CollaborationEvent, 'userId' | 'timestamp'>) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'
];

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const { user } = useUser();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const stompClientRef = useRef<Client | null>(null);
  const eventHandlersRef = useRef<Set<(event: CollaborationEvent) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const isIntentionalDisconnectRef = useRef(false);

  // Get user color based on userId
  const getUserColor = useCallback((id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
  }, []);

  const connect = useCallback(() => {
    if (!userId || !activeWorkspaceId) return;
    
    // Reset intentional disconnect flag when connecting
    isIntentionalDisconnectRef.current = false;
    
    // Close existing connection
    if (stompClientRef.current?.connected) {
      stompClientRef.current.deactivate();
    }

    try {
      // SockJS requires HTTP/HTTPS URLs, not WS/WSS
      const httpUrl = import.meta.env.VITE_API_URL || 'http://localhost:8989';
      
      console.log('[Collaboration] Connecting to WebSocket:', `${httpUrl}/ws/collaboration`);
      
      // Create STOMP client with SockJS
      const client = new Client({
        webSocketFactory: () => new SockJS(`${httpUrl}/ws/collaboration`),
        debug: (str) => {
          console.log('[STOMP]', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      client.onConnect = () => {
        console.log('[Collaboration] Connected to WebSocket');
        setIsConnected(true);
        setIsReconnecting(false);
        
        // Subscribe to workspace topic
        client.subscribe(`/topic/workspace.${activeWorkspaceId}`, (message) => {
          try {
            const data: CollaborationEvent = JSON.parse(message.body);
            
            console.log('[Collaboration] Received event:', data.type);
            
            // Update active users
            if (data.type === 'user-joined' && data.data?.user) {
              setActiveUsers(prev => {
                if (prev.find(u => u.id === data.data.user.id)) {
                  return prev;
                }
                return [...prev, { ...data.data.user, color: getUserColor(data.data.user.id) }];
              });
            } else if (data.type === 'user-left') {
              setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
            } else if (data.type === 'member-update') {
              // Trigger workspace members reload
              console.log('[Collaboration] Member update detected');
            }
            
            // Notify event handlers
            eventHandlersRef.current.forEach(handler => handler(data));
          } catch (error) {
            console.error('[Collaboration] Failed to parse message:', error);
          }
        });
        
        // Subscribe to user topic for invite notifications
        // Use user's email if available, fallback to userId
        const userEmail = user?.primaryEmailAddress?.emailAddress;
        const subscriptionKey = userEmail || userId;
        
        console.log('[Collaboration] Subscribing to invite notifications:', {
          userEmail,
          userId,
          subscriptionKey,
          topic: `/topic/user.${subscriptionKey}`
        });
        
        client.subscribe(`/topic/user.${subscriptionKey}`, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            console.log('[Collaboration] Received notification:', {
              type: data.type,
              fullData: data
            });
            
            // Trigger a custom event for invite notifications
            if (data.type === 'invite') {
              console.log('[Collaboration] Dispatching workspace-invite event:', data);
              const event = new CustomEvent('workspace-invite', { detail: data });
              window.dispatchEvent(event);
            }
          } catch (error) {
            console.error('[Collaboration] Failed to parse notification:', error);
          }
        });
        
        // Send join message
        client.publish({
          destination: `/app/collaboration/join/${activeWorkspaceId}`,
          body: JSON.stringify({
            id: userId,
            email: `${userId}@example.com`,
            name: userId,
          }),
        });
        
        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (client.connected) {
            client.publish({
              destination: '/app/collaboration/ping',
              body: JSON.stringify({
                workspaceId: activeWorkspaceId,
                userId,
              }),
            });
          }
        }, 30000);
      };

      client.onStompError = (frame) => {
        console.error('[Collaboration] STOMP error:', frame.headers['message']);
        console.error('[Collaboration] Error details:', frame.body);
      };

      client.onWebSocketClose = () => {
        console.log('[Collaboration] WebSocket closed');
        setIsConnected(false);
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Only attempt reconnection if it wasn't an intentional disconnect
        if (!isIntentionalDisconnectRef.current && activeWorkspaceId && userId) {
          setIsReconnecting(true);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[Collaboration] Attempting to reconnect...');
            connect();
          }, 3000);
        } else {
          // Reset flag for next connection
          isIntentionalDisconnectRef.current = false;
        }
      };

      client.activate();
      stompClientRef.current = client;
    } catch (error) {
      console.error('[Collaboration] Failed to connect:', error);
      setIsConnected(false);
    }
  }, [userId, activeWorkspaceId, getUserColor]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true; // Mark as intentional disconnect
    
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setIsConnected(false);
    setActiveUsers([]);
  }, []);

  const updateCursor = useCallback((x: number, y: number) => {
    if (!stompClientRef.current || !isConnected) return;
    
    const event: Omit<CollaborationEvent, 'userId' | 'timestamp'> = {
      type: 'cursor-move',
      workspaceId: activeWorkspaceId!,
      data: { cursor: { x, y } },
    };
    
    stompClientRef.current.publish({
      destination: `/app/collaboration/cursor/${activeWorkspaceId}`,
      body: JSON.stringify({
        ...event,
        userId,
        timestamp: Date.now(),
      }),
    });
  }, [isConnected, activeWorkspaceId, userId]);

  const updateSelection = useCallback((start: number, end: number) => {
    if (!stompClientRef.current || !isConnected) return;
    
    const event: Omit<CollaborationEvent, 'userId' | 'timestamp'> = {
      type: 'selection-change',
      workspaceId: activeWorkspaceId!,
      data: { selection: { start, end } },
    };
    
    stompClientRef.current.publish({
      destination: `/app/collaboration/selection/${activeWorkspaceId}`,
      body: JSON.stringify({
        ...event,
        userId,
        timestamp: Date.now(),
      }),
    });
  }, [isConnected, activeWorkspaceId, userId]);

  const broadcastEvent = useCallback((event: Omit<CollaborationEvent, 'userId' | 'timestamp'>) => {
    if (!stompClientRef.current || !isConnected) return;
    
    stompClientRef.current.publish({
      destination: `/app/collaboration/event/${activeWorkspaceId}`,
      body: JSON.stringify({
        ...event,
        userId,
        timestamp: Date.now(),
      }),
    });
  }, [isConnected, userId, activeWorkspaceId]);

  const onEvent = useCallback((handler: (event: CollaborationEvent) => void) => {
    eventHandlersRef.current.add(handler);
    return () => {
      eventHandlersRef.current.delete(handler);
    };
  }, []);

  // Auto-connect when workspace changes
  useEffect(() => {
    if (activeWorkspaceId && userId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, userId]);

  const value: CollaborationContextType = {
    activeUsers,
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    updateCursor,
    updateSelection,
    onEvent,
    broadcastEvent,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}
