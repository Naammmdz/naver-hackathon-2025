import { useBoardStore } from '@/store/boardStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { BoardSnapshot } from '@/types/board';
import { CaptureUpdateAction, Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type StoredScene = BoardSnapshot | null;

const sanitizeAppStateForStorage = (appState: AppState): Record<string, any> => {
  const sanitized: Record<string, any> = {
    ...appState,
    collaborators: undefined,
    editingLinearElement: null,
    editingTextElement: null,
    openDialog: null,
    openMenu: null,
    openPopup: null,
    openSidebar: null,
    toast: null,
    frameToHighlight: null,
    elementsToHighlight: null,
    suggestedBindings: [],
    pendingElements: [],
    pendingImageElementId: null,
    selectedElementIds: {},
    previousSelectedElementIds: {},
    hoveredElementIds: {},
    zenModeEnabled: false,
  };

  return JSON.parse(JSON.stringify(sanitized));
};

const serializeSceneForStorage = (
  elements: readonly any[],
  appState: AppState,
  files: BinaryFiles,
): BoardSnapshot => {
  return {
    elements: JSON.parse(JSON.stringify(elements)),
    appState: sanitizeAppStateForStorage(appState),
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
  const [isDark, setIsDark] = useState(false);
  const activeBoardIdRef = useRef<string | null>(activeBoardId ?? null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const lastAppliedRef = useRef<{ id: string | null; hasSnapshot: boolean }>({
    id: null,
    hasSnapshot: false,
  });

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? null,
    [activeBoardId, boards],
  );

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

  const applySceneToCanvas = useCallback((snapshot: StoredScene, isViewMode: boolean = false) => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      return;
    }

    const scene = prepareSceneForEditor(snapshot, isViewMode);

    api.resetScene();

    if (!scene) {
      return;
    }

    api.updateScene({
      elements: scene.elements ?? [],
      appState: scene.appState,
      captureUpdate: CaptureUpdateAction.NEVER,
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
    const hasSnapshot = Boolean(activeBoard?.snapshot);

    if (
      boardId === lastAppliedRef.current.id &&
      hasSnapshot === lastAppliedRef.current.hasSnapshot
    ) {
      return;
    }

    applySceneToCanvas(activeBoard?.snapshot ?? null, !canEditWorkspace);
    lastAppliedRef.current = {
      id: boardId,
      hasSnapshot,
    };
  }, [applySceneToCanvas, activeBoard?.id, activeBoard?.snapshot, isApiReady, canEditWorkspace]);

  const handleSceneChange = useCallback(
    (elements: readonly any[], appState: AppState, files: BinaryFiles) => {
      // Silently block changes if user doesn't have edit permission
      if (!canEditWorkspace) {
        return;
      }

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
          updateBoardContent(boardId, sceneData);
        } catch (error) {
          console.error('Error saving board snapshot:', error);
        }
      }, 1000);
    },
    [updateBoardContent, canEditWorkspace],
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
