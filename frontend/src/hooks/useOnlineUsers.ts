import { useEffect, useMemo, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { HocuspocusProvider } from '@hocuspocus/provider';

interface OnlineUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  color: string;
}

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'
];

const getColor = (id: string) => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
};

export function useOnlineUsers(): OnlineUser[] {
  const { activeWorkspaceId, members } = useWorkspaceStore();
  const [awarenessUsers, setAwarenessUsers] = useState<Map<number, any>>(new Map());

  // Get provider from window (set by useWorkspaceYjs)
  const provider = useMemo(() => {
    return (window as any).__WORKSPACE_PROVIDER as HocuspocusProvider | null;
  }, []);

  useEffect(() => {
    if (!provider || !activeWorkspaceId) {
      setAwarenessUsers(new Map());
      return;
    }

    const awareness = provider.awareness;
    if (!awareness) {
      setAwarenessUsers(new Map());
      return;
    }

    // Initial state
    const updateUsers = () => {
      const states = awareness.getStates();
      setAwarenessUsers(new Map(states));
    };

    updateUsers();

    // Listen for changes
    awareness.on('change', updateUsers);

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [provider, activeWorkspaceId]);

  // Convert awareness states to OnlineUser array
  const onlineUsers = useMemo(() => {
    const users: OnlineUser[] = [];
    const selfClientId = provider?.awareness?.clientID;

    awarenessUsers.forEach((state: any, clientId: number) => {
      // Skip self
      if (clientId === selfClientId) return;

      // Get user info from awareness state or fallback
      const userIdFromState = state.userId || state.id;
      const name = state.name || state.fullName;
      const email = state.email || `${userIdFromState || `user-${clientId}`}@example.com`;
      const avatarUrl = state.avatarUrl || state.imageUrl;

      // If we have userId, try to get info from workspace members
      let finalName = name;
      let finalEmail = email;
      let finalAvatarUrl = avatarUrl;

      if (userIdFromState) {
        const member = members.find(m => m.userId === userIdFromState);
        if (member) {
          finalName = member.user?.fullName || name;
          finalEmail = member.user?.email || email;
          finalAvatarUrl = member.user?.avatarUrl || avatarUrl;
        }
      }

      users.push({
        id: userIdFromState || `client-${clientId}`,
        email: finalEmail,
        name: finalName,
        avatarUrl: finalAvatarUrl,
        color: state.color || getColor(userIdFromState || `client-${clientId}`),
      });
    });

    return users;
  }, [awarenessUsers, members, provider]);

  return onlineUsers;
}

