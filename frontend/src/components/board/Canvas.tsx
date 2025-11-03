import { useYjs } from '@/contexts/YjsContext';
import { mergeBoardSnapshots, sanitizeBoardAppState } from '@/lib/board-sync';
import { useBoardStore } from '@/store/boardStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { BoardSnapshot } from '@/types/board';
import { useUser } from '@clerk/clerk-react';
import { Excalidraw, LiveCollaborationTrigger } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type {
  AppState,
  BinaryFiles,
  Collaborator,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ExcalidrawElement = any; // Type from Excalidraw runtime

type StoredScene = BoardSnapshot | null;

const serializeSceneForStorage = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): BoardSnapshot => {
  return {
    elements: JSON.parse(JSON.stringify(elements)),
    appState: sanitizeBoardAppState(appState),
    files: JSON.parse(JSON.stringify(files)),
  };
};

const prepareSceneForEditor = (
  snapshot: StoredScene,
  isViewMode: boolean = false
): ExcalidrawInitialDataState | null => {
  if (!snapshot) {
    return null;
  }

  const { elements = [], appState = {}, files = {} } = snapshot;
  const { collaborators, ...restAppState } = appState;

  return {
    elements,
    appState: {
      ...restAppState,
      zenModeEnabled: false,
      viewModeEnabled: isViewMode,
    },
    files,
  };
};

export function Canvas() {
  const { activeBoardId, boards, updateBoardContent } = useBoardStore();
  const canEditWorkspace = useWorkspaceStore((state) => state.canEditActiveWorkspace());
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const { ydoc, provider, isConnected } = useYjs();
  const { user } = useUser();
  
  const [isDark, setIsDark] = useState(false);
  const activeBoardIdRef = useRef<string | null>(activeBoardId ?? null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const lastAppliedRef = useRef<{ id: string | null; signature: string | null }>({
    id: null,
    signature: null,
  });
  
  // Flag to prevent infinite loop when syncing Yjs ↔ Canvas
  const isApplyingYjsChangeRef = useRef(false);
  
  // Debounce ref for Yjs sync to avoid excessive updates
  const yjsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track if initial Yjs load is done to prevent setup triggers
  const yjsInitialLoadDoneRef = useRef(false);
  
  // Track last synced state to avoid unnecessary updates
  const lastSyncedElementsRef = useRef<string>('');
  const lastSyncedAppStateRef = useRef<string>('');
  
  // Generate consistent color for user
  const generateUserColor = useCallback((userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8',
      '#FDCB6E', '#6C5CE7', '#00B894', '#E17055'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);
  
  const computeSignature = useCallback((snapshot: StoredScene) => {
    if (!snapshot) {
      return "null";
    }
    try {
      return JSON.stringify(snapshot);
    } catch {
      return String(Date.now());
    }
  }, []);

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? null,
    [activeBoardId, boards],
  );
  
  // Prepare Yjs collaboration data for Excalidraw
  // Store board canvas data in Y.Map for realtime sync
  const yjsCollabData = useMemo(() => {
    if (!activeBoardId || !ydoc || !provider || !activeBoard || !activeWorkspaceId) {
      return null;
    }
    
    const yElements = ydoc.getArray(`board-elements-${activeBoardId}`);
    const yAppState = ydoc.getMap(`board-appstate-${activeBoardId}`);
    
    return {
      elements: yElements,
      appState: yAppState,
      userName: user?.fullName || user?.username || 'Anonymous',
      userColor: generateUserColor(user?.id || 'default'),
    };
  }, [activeBoardId, ydoc, provider, activeBoard, activeWorkspaceId, user, generateUserColor]);

  const initialScene = useMemo(
    () => prepareSceneForEditor(activeBoard?.snapshot ?? null, !canEditWorkspace),
    [activeBoard?.snapshot, canEditWorkspace],
  );

  useEffect(() => {
    activeBoardIdRef.current = activeBoardId ?? null;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [activeBoardId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Detect current theme (watch for documentElement 'dark' class or saved preference)
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        savedTheme === 'dark' ||
        (!savedTheme && systemDark) ||
        document.documentElement.classList.contains('dark');
      setIsDark(shouldBeDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);
  
  // Periodic save to DB in collaborative mode (like Documents)
  // Yjs handles real-time sync, but we still need DB persistence
  useEffect(() => {
    if (!yjsCollabData || !activeBoardId || !excalidrawAPIRef.current) return;
    
    console.log('[Board] Setting up periodic DB save in collaborative mode');
    
    const saveInterval = setInterval(() => {
      const api = excalidrawAPIRef.current;
      if (!api) return;
      
      try {
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files = api.getFiles();
        
        if (elements && elements.length > 0) {
          const snapshot = serializeSceneForStorage(elements, appState, files);
          console.log('[Board] Periodic save to DB in collaborative mode');
          updateBoardContent(activeBoardId, snapshot);
        }
      } catch (e) {
        console.error('[Board] Failed to periodic save:', e);
      }
    }, 10000); // Save to DB every 10 seconds in collaborative mode
    
    return () => clearInterval(saveInterval);
  }, [yjsCollabData, activeBoardId, updateBoardContent]);
  
  // Listen to Yjs changes and update Excalidraw (Yjs → Canvas sync)
  useEffect(() => {
    if (!yjsCollabData || !excalidrawAPIRef.current) return;
    
    console.log('[Board] Setting up Yjs → Canvas sync');
    
    const yElements = yjsCollabData.elements;
    const yAppState = yjsCollabData.appState;
    
    // Observer for elements changes
    const elementsObserver = () => {
      const api = excalidrawAPIRef.current;
      if (!api || !yjsInitialLoadDoneRef.current) return;
      
      try {
        const elements = yElements.toArray();
        if (elements.length === 0) return;
        
        // Check if elements actually changed to avoid unnecessary re-renders
        const elementsSignature = JSON.stringify(elements.map((el: any) => el.id + el.version));
        if (elementsSignature === lastSyncedElementsRef.current) {
          return; // No change, skip update
        }
        
        // Set flag to prevent onChange from syncing back
        isApplyingYjsChangeRef.current = true;
        
        api.updateScene({ elements: elements as any });
        lastSyncedElementsRef.current = elementsSignature;
      } catch (e) {
        console.error('[Board] Failed to apply Yjs elements:', e);
      } finally {
        // Reset flag after a tick to allow next user changes
        setTimeout(() => {
          isApplyingYjsChangeRef.current = false;
        }, 50);
      }
    };
    
    // Observer for appState changes
    const appStateObserver = () => {
      const api = excalidrawAPIRef.current;
      if (!api || !yjsInitialLoadDoneRef.current) return;
      
      try {
        const appStateObj = Object.fromEntries(yAppState.entries());
        if (Object.keys(appStateObj).length === 0) return;
        
        // Check if appState actually changed
        const appStateSignature = JSON.stringify(appStateObj);
        if (appStateSignature === lastSyncedAppStateRef.current) {
          return; // No change, skip update
        }
        
        // Set flag to prevent onChange from syncing back
        isApplyingYjsChangeRef.current = true;
        
        api.updateScene({ appState: appStateObj as any });
        lastSyncedAppStateRef.current = appStateSignature;
      } catch (e) {
        console.error('[Board] Failed to apply Yjs appState:', e);
      } finally {
        // Reset flag after a tick to allow next user changes
        setTimeout(() => {
          isApplyingYjsChangeRef.current = false;
        }, 50);
      }
    };
    
    yElements.observe(elementsObserver);
    yAppState.observe(appStateObserver);
    
    // Mark initial load as done after a small delay
    const initTimer = setTimeout(() => {
      yjsInitialLoadDoneRef.current = true;
      console.log('[Board] Yjs initial load complete, observers active');
    }, 100);
    
    return () => {
      clearTimeout(initTimer);
      yjsInitialLoadDoneRef.current = false;
      yElements.unobserve(elementsObserver);
      yAppState.unobserve(appStateObserver);
    };
  }, [yjsCollabData]);
  
  // Sync collaborator pointers/cursors (Yjs → Excalidraw collaborators)
  useEffect(() => {
    if (!yjsCollabData || !excalidrawAPIRef.current || !activeBoardId) return;
    
    const yPointers = ydoc?.getMap(`board-pointers-${activeBoardId}`);
    if (!yPointers) return;
    
    console.log('[Board] Setting up collaborator pointer sync');
    
    const pointersObserver = () => {
      const api = excalidrawAPIRef.current;
      if (!api) return;
      
      try {
        // Convert Yjs pointers to Excalidraw collaborators format
        const collaborators = new Map<string, Collaborator>();
        
        yPointers.forEach((pointer: any, userId: string) => {
          // Skip self
          if (userId === user?.id) return;
          
          collaborators.set(userId as any, {
            pointer: { x: pointer.x, y: pointer.y, tool: 'pointer' },
            button: 'up',
            username: pointer.username,
            avatarUrl: undefined,
            id: userId as any,
            color: { background: pointer.color, stroke: pointer.color },
            selectedElementIds: {},
          } as any);
        });
        
        if (collaborators.size > 0) {
          console.log('[Board] Updating collaborators:', collaborators.size);
          api.updateScene({ collaborators: collaborators as any });
        }
      } catch (e) {
        console.error('[Board] Failed to update collaborators:', e);
      }
    };
    
    yPointers.observe(pointersObserver);
    
    return () => {
      yPointers.unobserve(pointersObserver);
    };
  }, [yjsCollabData, activeBoardId, ydoc, user]);

  const applySceneToCanvas = useCallback((snapshot: StoredScene, isViewMode: boolean = false) => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      return;
    }

    const scene = prepareSceneForEditor(snapshot, isViewMode);

    const localState = api.getAppState();
    const localElements = api.getSceneElementsIncludingDeleted();

    api.resetScene();

    if (!scene) {
      return;
    }

    const nextElements = scene.elements ?? [];
    const syncedElementIds = new Set(nextElements.map((element) => element.id));
    const insertedElements = nextElements.map((element) => {
      const local = localElements.find((item) => item.id === element.id);
      const keepLocal = local && local.version && element.version && element.version < local.version;
      return keepLocal ? local : element;
    });

    const localOnlyElements = localElements.filter(
      (element) => !syncedElementIds.has(element.id) && !element.isDeleted
    );

    const combinedElements = [...insertedElements, ...localOnlyElements];

    const preservedState: Partial<AppState> = {
      activeTool: localState?.activeTool,
      cursorButton: localState?.cursorButton,
      penMode: localState?.penMode,
      openSidebar: localState?.openSidebar,
      currentItemStrokeColor: localState?.currentItemStrokeColor,
      currentItemBackgroundColor: localState?.currentItemBackgroundColor,
      currentItemFillStyle: localState?.currentItemFillStyle,
      currentItemStrokeStyle: localState?.currentItemStrokeStyle,
      currentItemStrokeWidth: localState?.currentItemStrokeWidth,
      gridSize: localState?.gridSize,
    };

    api.updateScene({
      elements: combinedElements,
      appState: {
        ...scene.appState,
        ...preservedState,
        scrollX: localState?.scrollX ?? scene.appState?.scrollX ?? 0,
        scrollY: localState?.scrollY ?? scene.appState?.scrollY ?? 0,
        zoom: localState?.zoom ?? scene.appState?.zoom ?? { value: 1 },
        viewModeEnabled: isViewMode || Boolean(scene.appState?.viewModeEnabled),
      },
      commitToHistory: false,
    });

    const fileValues = scene.files ? Object.values(scene.files) : [];
    if (fileValues.length) {
      api.addFiles(fileValues);
    }
  }, []);

  useEffect(() => {
    if (!isApiReady) {
      return;
    }

    const boardId = activeBoard?.id ?? null;
    const signature = computeSignature(activeBoard?.snapshot ?? null);

    if (boardId === lastAppliedRef.current.id && signature === lastAppliedRef.current.signature) {
      return;
    }
    
    // Reset Yjs initial load flag when switching boards
    yjsInitialLoadDoneRef.current = false;
    lastSyncedElementsRef.current = '';
    lastSyncedAppStateRef.current = '';

    applySceneToCanvas(activeBoard?.snapshot ?? null, !canEditWorkspace);
    lastAppliedRef.current = {
      id: boardId,
      signature,
    };
  }, [
    applySceneToCanvas,
    activeBoard?.id,
    activeBoard?.snapshot,
    computeSignature,
    isApiReady,
    canEditWorkspace,
  ]);

  const handleSceneChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // Silently block changes if user doesn't have edit permission
      if (!canEditWorkspace) {
        return;
      }
      
      // Prevent infinite loop: don't sync back to Yjs if we're applying Yjs changes
      if (isApplyingYjsChangeRef.current) {
        return;
      }
      
      // Debounce Yjs sync to reduce performance impact (500ms)
      if (yjsSyncTimeoutRef.current) {
        clearTimeout(yjsSyncTimeoutRef.current);
      }
      
      yjsSyncTimeoutRef.current = setTimeout(() => {
        // Sync to Yjs for realtime collaboration
        if (yjsCollabData) {
          try {
            ydoc?.transact(() => {
              const yElements = yjsCollabData.elements;
              
              // Clear and insert new elements
              yElements.delete(0, yElements.length);
              
              // Insert as flat array (NOT nested!)
              const serializedElements = JSON.parse(JSON.stringify(elements));
              yElements.insert(0, serializedElements);
              
              // Sync only essential appState keys to avoid bloat
              const yAppState = yjsCollabData.appState;
              const { 
                collaborators, 
                selectedElementIds,
                selectedGroupIds,
                editingGroupId,
                ...essentialAppState 
              } = appState;
              
              // Clear old keys that might have changed
              yAppState.clear();
              
              // Only sync essential state
              const keysToSync = ['viewBackgroundColor', 'currentItemStrokeColor', 'currentItemBackgroundColor'];
              keysToSync.forEach(key => {
                const value = (essentialAppState as any)[key];
                if (value !== undefined && value !== null) {
                  try {
                    yAppState.set(key, JSON.parse(JSON.stringify(value)));
                  } catch (e) {
                    // Skip non-serializable
                  }
                }
              });
            });
          } catch (e) {
            console.error('[Board] Failed to sync to Yjs:', e);
          }
        }
      }, 500); // 500ms debounce for Yjs sync

      // Debounced save to DB (in both modes)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const boardId = activeBoardIdRef.current;
        if (!boardId) {
          return;
        }

        try {
          const sceneData = serializeSceneForStorage(elements, appState, files);
          const latestBoard = useBoardStore.getState().boards.find((board) => board.id === boardId);
          const mergedScene = mergeBoardSnapshots(latestBoard?.snapshot ?? null, sceneData);
          lastAppliedRef.current = {
            id: boardId,
            signature: computeSignature(mergedScene),
          };
          updateBoardContent(boardId, mergedScene);
        } catch (error) {
          console.error('Error saving board snapshot:', error);
        }
      }, 1000);
    },
    [updateBoardContent, canEditWorkspace, computeSignature, yjsCollabData, ydoc],
  );

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api;
    setIsApiReady(true);
  }, []);

  const uiOptions = useMemo(() => {
    if (!canEditWorkspace) {
      return {
        canvasActions: {
          loadScene: false,
          export: { saveFileToDisk: false },
          saveAsImage: false,
        },
      };
    }
    return undefined;
  }, [canEditWorkspace]);
  
  // Handle pointer updates for cursor collaboration
  const handlePointerUpdate = useCallback((payload: { pointer: { x: number; y: number }; button: 'down' | 'up'; pointersMap: Map<number, any> }) => {
    if (!yjsCollabData || !user) return;
    
    // Broadcast cursor position via Yjs
    const yPointers = ydoc?.getMap(`board-pointers-${activeBoardId}`);
    if (yPointers) {
      yPointers.set(user.id, {
        x: payload.pointer.x,
        y: payload.pointer.y,
        username: user.fullName || user.username || 'Anonymous',
        color: yjsCollabData.userColor,
      });
    }
  }, [yjsCollabData, user, ydoc, activeBoardId]);
  
  // Render collaboration button in top right
  const renderTopRightUI = useCallback(() => {
    if (!yjsCollabData) return null;
    
    return (
      <LiveCollaborationTrigger
        isCollaborating={!!yjsCollabData}
        onSelect={() => {
          // Could open a dialog showing collaborators list
          console.log('[Board] Collaboration active');
        }}
      />
    );
  }, [yjsCollabData]);

  return (
    <div 
      className="w-full h-full relative" 
      onClick={(event) => event.stopPropagation()}
      style={{
        ...((!canEditWorkspace) && {
          '--excalidraw-toolbar-display': 'none',
        } as React.CSSProperties),
      }}
    >
      <Excalidraw
        key={activeBoard?.id ?? 'default'}
        initialData={initialScene ?? undefined}
        onChange={handleSceneChange}
        onPointerUpdate={handlePointerUpdate}
        isCollaborating={!!yjsCollabData}
        renderTopRightUI={renderTopRightUI}
        theme={isDark ? 'dark' : 'light'}
        excalidrawAPI={handleApiReady}
        viewModeEnabled={!canEditWorkspace}
        UIOptions={uiOptions}
      />
      {!canEditWorkspace && (
        <style>{`
          .excalidraw .App-toolbar,
          .excalidraw .App-toolbar-content,
          .excalidraw .App-bottom-bar,
          .excalidraw .App-menu,
          .excalidraw .App-menu_top,
          .excalidraw .App-menu__left,
          .excalidraw .ToolIcon_type_floating,
          .excalidraw button[aria-label*="Menu"] {
            display: none !important;
          }
        `}</style>
      )}
    </div>
  );
}
