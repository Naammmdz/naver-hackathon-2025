import { useEffect, useMemo, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useAuth } from '@clerk/clerk-react';
import { getColor } from '@/lib/userColors';

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
  const [awarenessUsers, setAwarenessUsers] = useState<Map<number, any>>(new Map());
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

  // Only read awareness states - user identity seeding is handled by useUserIdentityAwareness
  // Note: We don't require activeWorkspaceId because awareness works at provider level, not workspace level
  useEffect(() => {
    if (!provider) {
      setAwarenessUsers(new Map());
      return;
    }

    const awareness = provider.awareness;
    if (!awareness) {
      setAwarenessUsers(new Map());
      return;
    }

    // Just read and update awareness states - don't seed (that's handled by useUserIdentityAwareness)
    const updateUsers = () => {
      const states = awareness.getStates();
      const currentWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      console.log('[useOnlineUsers] Reading awareness states:', {
        totalStates: states.size,
        activeWorkspaceId: currentWorkspaceId,
        states: Array.from(states.entries()).map(([id, state]) => ({ 
          clientId: id, 
          userId: (state as any).userId, 
          name: (state as any).name 
        }))
      });
      setAwarenessUsers(new Map(states));
    };

    // Initial read
    updateUsers();

    // Listen for changes
    awareness.on('change', updateUsers);

    // Also listen for provider status changes
    const providerAny = provider as any;
    if (providerAny.on) {
      const handleStatusChange = (status: string) => {
        if (status === 'connected') {
          // Re-read when reconnected
          setTimeout(() => updateUsers(), 100);
        }
      };
      providerAny.on('status', handleStatusChange);

      return () => {
        awareness.off('change', updateUsers);
        if (providerAny.off) {
          providerAny.off('status', handleStatusChange);
        }
      };
    }

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [provider]); // Remove activeWorkspaceId dependency - awareness works at provider level

  // Convert awareness states to OnlineUser array
  const onlineUsers = useMemo(() => {
    const users: OnlineUser[] = [];
    const selfClientId = provider?.awareness?.clientID;
    const seenUserIds = new Set<string>(); // Deduplicate by userId
    
    console.log('[useOnlineUsers] Converting awareness states:', {
      totalStates: awarenessUsers.size,
      selfClientId,
      states: Array.from(awarenessUsers.entries()).map(([id, state]) => ({ clientId: id, userId: (state as any).userId, name: (state as any).name }))
    });

    awarenessUsers.forEach((state: any, clientId: number) => {
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
    return users;
  }, [awarenessUsers, members, provider]);

  return onlineUsers;
}

