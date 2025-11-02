import { useCollaboration } from "@/contexts/CollaborationContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useEffect } from "react";

/**
 * Hook để xử lý real-time updates cho workspace members
 * Lắng nghe các event từ collaboration context và cập nhật store
 */
export function useRealtimeWorkspaceMembers() {
  const { onEvent, broadcastEvent, isConnected } = useCollaboration();
  const { activeWorkspaceId, loadMembers } = useWorkspaceStore();

  useEffect(() => {
    if (!activeWorkspaceId || !isConnected) return;

    // Subscribe to member update events
    const unsubscribe = onEvent((event) => {
      if (event.workspaceId !== activeWorkspaceId) return;

      switch (event.type) {
        case 'member-update':
          // Reload members when any member is added/removed/updated
          loadMembers(activeWorkspaceId);
          break;
      }
    });

    return unsubscribe;
  }, [activeWorkspaceId, isConnected, onEvent, loadMembers]);

  // Function to broadcast member changes
  const broadcastMemberUpdate = () => {
    if (!activeWorkspaceId || !isConnected) return;
    
    broadcastEvent({
      type: 'member-update',
      workspaceId: activeWorkspaceId,
      data: { action: 'refresh' },
    });
  };

  return {
    broadcastMemberUpdate,
    isConnected,
  };
}
