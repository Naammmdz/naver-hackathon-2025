import { useCollaboration } from "@/contexts/CollaborationContext";
import { useCallback, useEffect, useRef } from "react";

interface UseRealtimeDataSyncOptions {
  onTaskChange?: () => void | Promise<void>;
  onDocumentChange?: () => void | Promise<void>;
  onBoardChange?: () => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Hook to automatically sync data when other users make changes
 */
export function useRealtimeDataSync({
  onTaskChange,
  onDocumentChange,
  onBoardChange,
  enabled = true,
}: UseRealtimeDataSyncOptions = {}) {
  const { onEvent, isConnected } = useCollaboration();
  
  // Use refs to avoid recreating the event handler on every render
  const handlersRef = useRef({ onTaskChange, onDocumentChange, onBoardChange });
  
  useEffect(() => {
    handlersRef.current = { onTaskChange, onDocumentChange, onBoardChange };
  }, [onTaskChange, onDocumentChange, onBoardChange]);

  const handleDataChange = useCallback(async (event: any) => {
    if (!enabled || event.type !== 'data-change') return;

    const { entityType, action, entityId, userId } = event;
    
    console.log('[RealtimeSync] Data change detected:', {
      entityType,
      action,
      entityId,
      userId,
    });

    // Call appropriate handler based on entity type
    try {
      if (entityType === 'task' && handlersRef.current.onTaskChange) {
        await handlersRef.current.onTaskChange();
      } else if (entityType === 'document' && handlersRef.current.onDocumentChange) {
        await handlersRef.current.onDocumentChange();
      } else if (entityType === 'board' && handlersRef.current.onBoardChange) {
        await handlersRef.current.onBoardChange();
      }
    } catch (error) {
      console.error('[RealtimeSync] Failed to handle data change:', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isConnected) return;

    const unsubscribe = onEvent(handleDataChange);
    return unsubscribe;
  }, [onEvent, handleDataChange, enabled, isConnected]);

  return {
    isConnected,
    enabled,
  };
}
