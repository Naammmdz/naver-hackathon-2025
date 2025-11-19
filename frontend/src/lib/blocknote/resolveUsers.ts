import { useWorkspaceStore } from "@/store/workspaceStore";
import type { User } from "@blocknote/core/comments";

/**
 * Resolve user information for BlockNote comments
 * This function is called by BlockNote to get user info for comments
 */
export function createResolveUsers(): (userIds: string[]) => Promise<User[]> {
  return async (userIds: string[]): Promise<User[]> => {
    const members = useWorkspaceStore.getState().members;
    
    console.log('[resolveUsers] Resolving users:', userIds);
    console.log('[resolveUsers] Available members:', members.length);

    const resolvedUsers = userIds.map((userId) => {
      const member = members.find((m) => m.userId === userId);

      // Always return a user object, even if member is not found
      // This prevents BlockNote from throwing errors when user data is missing
      const displayName =
        member?.fullName ||
        member?.user?.fullName ||
        member?.user?.username ||
        member?.user?.email ||
        `User ${userId.slice(0, 8)}`;

      const user: User = {
        id: userId,
        username: displayName,
        avatarUrl: member?.user?.imageUrl || "",
      };
      
      if (!member) {
        console.warn('[resolveUsers] User not found in members:', userId, 'returning fallback user');
      }
      
      return user;
    });
    
    console.log('[resolveUsers] Resolved users:', resolvedUsers);
    return resolvedUsers;
  };
}

