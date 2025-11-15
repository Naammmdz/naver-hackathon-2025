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
      states.forEach((state: any, clientId: number) => {
        // Skip self
        if (clientId === selfClientId) {
          console.log('[useOnlineUsers] Skipping self:', clientId);
          return;
        }

        // Get user info from awareness state or fallback
        const userIdFromState = state.userId || state.id;
        const name = state.name || state.fullName;
        const email = state.email || `${userIdFromState || `user-${clientId}`}@example.com`;
        const avatarUrl = state.avatarUrl || state.imageUrl;

        // Normalize userId for deduplication
        const normalizeId = (id: string) => id?.toLowerCase().trim();
        const normalizedUserId = userIdFromState ? normalizeId(userIdFromState) : null;
        
        // Skip if we've already seen this userId (deduplicate - same user in multiple tabs/windows)
        if (normalizedUserId && seenUserIds.has(normalizedUserId)) {
          console.log('[useOnlineUsers] Skipping duplicate userId:', normalizedUserId, 'clientId:', clientId);
          return;
        }
        
        if (normalizedUserId) {
          seenUserIds.add(normalizedUserId);
        }

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
          users.push({
            id: userIdFromState || `client-${clientId}`,
            email: finalEmail,
            name: finalName,
            avatarUrl: finalAvatarUrl,
            color: state.color || getColor(userIdFromState || `client-${clientId}`),
          });
        }
      });

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

