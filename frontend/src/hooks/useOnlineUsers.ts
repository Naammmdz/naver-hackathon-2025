import { getColor } from '@/lib/userColors';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuth } from '@clerk/clerk-react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect, useState } from 'react';

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

  // Watch for provider changes (reactive)
  useEffect(() => {
    const checkProvider = () => {
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
      clearInterval(interval);
      window.removeEventListener('workspace-provider-ready', handleProviderReady);
    };
  }, []);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Convert awareness states to OnlineUser array with delay to handle sync
  useEffect(() => {
    if (!provider?.awareness) {
      setOnlineUsers([]);
      return;
    }

    const updateUsers = () => {
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
      setOnlineUsers(users);
    };

    // Delay update to allow awareness sync
    const timer = setTimeout(updateUsers, 200);
    
    // Also listen for changes
    provider.awareness.on('change', () => {
      clearTimeout(timer);
      setTimeout(updateUsers, 200);
    });

    return () => {
      clearTimeout(timer);
      provider.awareness.off('change', updateUsers);
    };
  }, [provider, members, userId]);

  return onlineUsers;
}

