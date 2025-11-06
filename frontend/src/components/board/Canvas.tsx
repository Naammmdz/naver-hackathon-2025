import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBoardStore } from '@/store/boardStore';
import type { BoardSnapshot } from '@/types/board';
import { CaptureUpdateAction, convertToExcalidrawElements, Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type {
    AppState,
    BinaryFiles,
    ExcalidrawImperativeAPI,
    ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types';
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw';
import { Loader2, Wand2 } from 'lucide-react';
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

const prepareSceneForEditor = (snapshot: StoredScene): ExcalidrawInitialDataState | null => {
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
    },
    files,
  };
};

export function Canvas() {
  const { activeBoardId, boards, updateBoardContent } = useBoardStore();
  const [isDark, setIsDark] = useState(false);
  const activeBoardIdRef = useRef<string | null>(activeBoardId ?? null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const lastAppliedRef = useRef<{ id: string | null; hasSnapshot: boolean }>({
    id: null,
    hasSnapshot: false,
  });

  // AI Diagram Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? null,
    [activeBoardId, boards],
  );

  const initialScene = useMemo(
    () => prepareSceneForEditor(activeBoard?.snapshot ?? null),
    [activeBoard?.snapshot],
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

  const applySceneToCanvas = useCallback((snapshot: StoredScene) => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      return;
    }

    const scene = prepareSceneForEditor(snapshot);

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

    applySceneToCanvas(activeBoard?.snapshot ?? null);
    lastAppliedRef.current = {
      id: boardId,
      hasSnapshot,
    };
  }, [applySceneToCanvas, activeBoard?.id, activeBoard?.snapshot, isApiReady]);

  const handleSceneChange = useCallback(
    (elements: readonly any[], appState: AppState, files: BinaryFiles) => {
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
    [updateBoardContent],
  );

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api;
    setIsApiReady(true);
  }, []);

  // AI Diagram Generation
  const generateDiagram = useCallback(async () => {
    if (!prompt.trim() || !excalidrawAPIRef.current) return;

    setIsGenerating(true);
    try {
      // Call Gemini API to generate Mermaid code
      const response = await fetch('/api/ai/generate-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          type: 'mermaid',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate diagram');
      }

      const { mermaidCode } = await response.json();

      // Parse Mermaid to Excalidraw elements
      const { elements, files } = await parseMermaidToExcalidraw(mermaidCode);

      // Convert to fully qualified Excalidraw elements
      const excalidrawElements = convertToExcalidrawElements(elements);

      // Add elements to canvas using updateScene
      excalidrawAPIRef.current.updateScene({
        elements: [...excalidrawAPIRef.current.getSceneElements(), ...excalidrawElements],
        appState: excalidrawAPIRef.current.getAppState(),
      });

      // Close dialog and reset
      setIsDialogOpen(false);
      setPrompt('');

    } catch (error) {
      console.error('Error generating diagram:', error);
      // TODO: Show error toast
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  return (
    <div className="w-full h-full relative" onClick={(event) => event.stopPropagation()}>
      <Excalidraw
        key={activeBoard?.id ?? 'default'}
        initialData={initialScene ?? undefined}
        onChange={handleSceneChange}
        theme={isDark ? 'dark' : 'light'}
        excalidrawAPI={handleApiReady}
      />

      {/* AI Diagram Generation Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="rounded-full shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Wand2 className="h-5 w-5" />
              <span className="ml-2 hidden sm:inline">AI Draw</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Diagram with AI</DialogTitle>
              <DialogDescription>
                Describe the diagram you want to create and AI will generate it for you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="prompt" className="text-sm font-medium">
                  Describe your diagram
                </label>
                <Input
                  id="prompt"
                  placeholder="e.g., Create a flowchart for user authentication process"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isGenerating) {
                      generateDiagram();
                    }
                  }}
                  disabled={isGenerating}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateDiagram}
                  disabled={!prompt.trim() || isGenerating}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
