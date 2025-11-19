import { getColor } from '@/lib/userColors';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuth } from '@clerk/clerk-react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useState, useRef } from 'react';

interface OnlineUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  color: string;
}

export function useOnlineUsers(): OnlineUser[] {
  const { activeWorkspaceId, members } = useWorkspaceStore();
  const { userId } = useAuth();
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const providerCheckMountedRef = useRef(true);

  // Watch for provider changes (reactive)
  useEffect(() => {
    providerCheckMountedRef.current = true;
    
    const checkProvider = () => {
      // Don't update state if component is unmounted
      if (!providerCheckMountedRef.current) {
        return;
      }
      const p = (window as any).__WORKSPACE_PROVIDER as HocuspocusProvider | null;
      setProvider(p);
    };

    // Initial check
    checkProvider();

    // Poll for provider (in case it's set after mount)
    const interval = setInterval(checkProvider, 500);
    
    // Also listen for custom event if provider sets it
    const handleProviderReady = () => checkProvider();
    window.addEventListener('workspace-provider-ready', handleProviderReady);

    return () => {
      providerCheckMountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('workspace-provider-ready', handleProviderReady);
    };
  }, []);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Convert awareness states to OnlineUser array with delay to handle sync
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const changeHandlerRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!provider?.awareness) {
      if (isMountedRef.current) {
        setOnlineUsers([]);
      }
      return;
    }

    const updateUsers = () => {
      // Don't update state if component is unmounted
      if (!isMountedRef.current || !provider?.awareness) {
        return;
      }
      const users: OnlineUser[] = [];
      const selfClientId = provider.awareness.clientID;
      const states = provider.awareness.getStates() || new Map();
      const seenUserIds = new Set<string>(); // Deduplicate by userId
      
      console.log('[useOnlineUsers] Reading awareness states:', {
        totalStates: states.size,
        selfClientId,
        selfUserId: userId,
        states: Array.from(states.entries()).map(([id, state]) => ({ 
          clientId: id, 
          userIdentity: (state as any).userIdentity,
          userId: (state as any).userId,
          name: (state as any).name 
        }))
      });
      // Process each awareness state
      for (const [clientId, state] of states) {
        console.log(`[useOnlineUsers] Processing client ${clientId}:`, {
          userId: (state as any).userId,
          name: (state as any).name,
          email: (state as any).email
        });
        
        // Skip self
        if (clientId === selfClientId) {
          console.log('[useOnlineUsers] Skipping self:', clientId);
          continue;
        }

        // Get user info from awareness state or fallback
        const userIdFromState = (state as any).userId || (state as any).id;
        const name = (state as any).name || (state as any).fullName;
        const email = (state as any).email || `${userIdFromState || `user-${clientId}`}@example.com`;
        const avatarUrl = (state as any).avatarUrl || (state as any).imageUrl;

        console.log(`[useOnlineUsers] User data for client ${clientId}:`, {
          userIdFromState,
          name,
          email
        });

        // Normalize userId for deduplication
        const normalizeId = (id: string) => id?.toLowerCase().trim();
        const normalizedUserId = userIdFromState ? normalizeId(userIdFromState) : null;
        
        console.log(`[useOnlineUsers] Normalized userId for client ${clientId}:`, normalizedUserId);
        
        // Skip if we've already seen this userId (deduplicate - same user in multiple tabs/windows)
        if (normalizedUserId && seenUserIds.has(normalizedUserId)) {
          console.log('[useOnlineUsers] Skipping duplicate userId:', normalizedUserId, 'clientId:', clientId);
          continue;
        }
        
        if (normalizedUserId) {
          seenUserIds.add(normalizedUserId);
        }

        console.log(`[useOnlineUsers] Adding user for client ${clientId}:`, { userIdFromState, name });

        // If we have userId, try to get info from workspace members
        let finalName = name;
        let finalEmail = email;
        let finalAvatarUrl = avatarUrl;

        if (userIdFromState) {
          const member = members.find(m => {
            return normalizeId(m.userId) === normalizedUserId;
          });
          if (member) {
            finalName = member.user?.fullName || name;
            finalEmail = member.user?.email || email;
            finalAvatarUrl = member.user?.avatarUrl || avatarUrl;
          }
        }

        // Only add if we have at least userId or name
        if (userIdFromState || name) {
          const userToAdd = {
            id: userIdFromState || `client-${clientId}`,
            email: finalEmail,
            name: finalName,
            avatarUrl: finalAvatarUrl,
            color: (state as any).color || getColor(userIdFromState || `client-${clientId}`),
          };
          console.log(`[useOnlineUsers] Adding user to array:`, userToAdd);
          users.push(userToAdd);
        } else {
          console.log(`[useOnlineUsers] Skipping user for client ${clientId} - no userId or name`);
        }
      }

      console.log('[useOnlineUsers] Final online users:', users.map(u => ({ id: u.id, name: u.name })));
      
      // Double check component is still mounted before updating state
      if (isMountedRef.current) {
        setOnlineUsers(users);
      }
    };

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Delay update to allow awareness sync
    timerRef.current = setTimeout(updateUsers, 200);
    
    // Create change handler that clears and resets timer
    const changeHandler = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(updateUsers, 200);
    };
    
    // Store handler reference for cleanup
    changeHandlerRef.current = changeHandler;
    
    // Listen for changes
    provider.awareness.on('change', changeHandler);

    return () => {
      // Clear timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Remove event listener using stored handler reference
      if (changeHandlerRef.current && provider?.awareness) {
        try {
          provider.awareness.off('change', changeHandlerRef.current);
        } catch (err) {
          // Ignore errors during cleanup (provider might be destroyed)
          console.warn('[useOnlineUsers] Error removing event listener:', err);
        }
        changeHandlerRef.current = null;
      }
    };
  }, [provider, members, userId]);

  return onlineUsers;
}

