import { useWorkspaceStore } from "@/store/workspaceStore";
import { useEffect } from "react";
import { useToast } from "./use-toast";

export function useWorkspacePermission() {
  const canEdit = useWorkspaceStore((state) => state.canEditActiveWorkspace());
  const activeWorkspace = useWorkspaceStore((state) => 
    state.workspaces.find(w => w.id === state.activeWorkspaceId)
  );
  const currentMemberRole = useWorkspaceStore((state) => state.getCurrentMemberRole());
  const members = useWorkspaceStore((state) => state.members);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const { toast } = useToast();

  const isViewer = currentMemberRole === "viewer";
  const isReadOnly = !canEdit;

  // Debug log
  useEffect(() => {
    console.log("[useWorkspacePermission] Debug:", {
      activeWorkspaceId,
      currentMemberRole,
      canEdit,
      isViewer,
      isReadOnly,
      membersCount: members.length,
      members,
    });
  }, [activeWorkspaceId, currentMemberRole, canEdit, isViewer, isReadOnly, members]);

  const showReadOnlyToast = () => {
    toast({
      title: "Chỉ xem",
      description: "Bạn chỉ có quyền xem trong workspace này.",
      variant: "destructive",
    });
  };

  return {
    canEdit,
    isViewer,
    isReadOnly,
    currentMemberRole,
    activeWorkspace,
    showReadOnlyToast,
  };
}
