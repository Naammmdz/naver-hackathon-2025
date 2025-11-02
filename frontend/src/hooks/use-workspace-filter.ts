import { useWorkspaceStore } from "@/store/workspaceStore";
import { useMemo } from "react";

interface WithWorkspace {
  workspaceId?: string;
}

/**
 * Custom hook to filter items by active workspace
 */
export function useWorkspaceFilter<T extends WithWorkspace>(items: T[]): T[] {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  return useMemo(() => {
    // If no workspace is active, show all items (fallback for migration)
    if (!activeWorkspaceId) {
      return items;
    }

    // Only show items that belong to the active workspace
    return items.filter(
      (item) => item.workspaceId === activeWorkspaceId
    );
  }, [items, activeWorkspaceId]);
}

/**
 * Get the active workspace ID for creating new items
 */
export function useActiveWorkspaceId(): string | undefined {
  return useWorkspaceStore((state) => state.activeWorkspaceId) ?? undefined;
}
