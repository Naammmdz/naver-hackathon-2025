import { BoardView } from "@/components/board/BoardView";
import { ClickupAppSidebar } from "@/components/layout/ClickupAppSidebar";
import { ClickupHeader } from "@/components/layout/ClickupHeader";
import { WorkspaceOnboarding } from "@/components/layout/WorkspaceOnboarding";
import { CollaborationProvider } from "@/contexts/CollaborationContext";
import { YjsProvider } from "@/contexts/YjsContext";
import { useToast } from "@/hooks/use-toast";
import { useYjsAdapter } from "@/hooks/use-yjs-adapter";
import { mergeBoardSnapshots } from "@/lib/board-sync";
import { useBoardStore } from "@/store/boardStore";
import { useDocumentStore } from "@/store/documentStore";
import { useTaskDocStore } from "@/store/taskDocStore";
import { useTaskStore } from "@/store/taskStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Board } from "@/types/board";
import type { Document } from "@/types/document";
import type { Task } from "@/types/task";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Docs from "./Docs";
import Index from "./Index";
import WorkspaceSettings from "./WorkspaceSettings";

// Component to handle Yjs sync inside YjsProvider
function YjsSyncHandler() {
  const parseDate = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    // Don't fallback to new Date() - preserve original undefined to avoid corrupting timestamps
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  useYjsAdapter("tasks", useTaskStore, {
    debugLabel: "tasks",
    decode: (value) => {
      const task = value as Task;
      if (!task) return value as Task;
      const normalized: Task = {
        ...task,
        // Only fallback to new Date() if createdAt/updatedAt are required fields
        // For dueDate (optional), keep undefined if parsing fails
        createdAt: parseDate(task.createdAt) ?? new Date(),
        updatedAt: parseDate(task.updatedAt) ?? new Date(),
        dueDate: parseDate(task.dueDate), // No fallback - preserve undefined
      };
      return normalized;
    },
    merge: (prev, next) => {
      const prevTask = prev as Task | undefined;
      const nextTask = next as Task;
      
      if (!prevTask) return nextTask;
      
      // Merge subtasks by ID - deduplicate and preserve both additions
      const mergedSubtasks = nextTask.subtasks ? [...nextTask.subtasks] : [];
      if (prevTask.subtasks) {
        prevTask.subtasks.forEach(prevSubtask => {
          const existsInNext = mergedSubtasks.some(s => s.id === prevSubtask.id);
          if (!existsInNext) {
            mergedSubtasks.push(prevSubtask);
          }
        });
      }

      // Use latest updatedAt to determine which task is newer
      const prevTime = prevTask.updatedAt ? prevTask.updatedAt.getTime() : 0;
      const nextTime = nextTask.updatedAt ? nextTask.updatedAt.getTime() : 0;
      
      // Resolve order conflicts: if both have order, use the one from the more recent update
      // If orders are the same but timestamps differ, add 0.001 to distinguish
      let resolvedOrder = nextTask.order;
      if (prevTask.order !== undefined && nextTask.order !== undefined) {
        if (prevTask.order === nextTask.order && prevTime !== nextTime) {
          // Same order but different timestamps - use fractional ordering
          resolvedOrder = nextTime > prevTime ? nextTask.order : prevTask.order + 0.001;
        } else {
          // Different orders - trust the more recent update
          resolvedOrder = nextTime >= prevTime ? nextTask.order : prevTask.order;
        }
      }
      
      return {
        ...(nextTime >= prevTime ? nextTask : prevTask),
        subtasks: mergedSubtasks,
        order: resolvedOrder,
        updatedAt: new Date(Math.max(prevTime, nextTime)),
      };
    },
  });

  useYjsAdapter("documents", useDocumentStore, {
    debugLabel: "documents",
    decode: (value) => {
      const document = value as Document;
      if (!document) return value as Document;
      const normalized: Document = {
        ...document,
        createdAt: parseDate(document.createdAt) ?? new Date(),
        updatedAt: parseDate(document.updatedAt) ?? new Date(),
        trashedAt: parseDate(document.trashedAt),
      };
      return normalized;
    },
  });

  useYjsAdapter("boards", useBoardStore, {
    debugLabel: "boards",
    collection: "map",
    decode: (value) => {
      const board = value as Board;
      if (!board) return value as Board;
      const normalized: Board = {
        ...board,
        createdAt: parseDate(board.createdAt) ?? new Date(),
        updatedAt: parseDate(board.updatedAt) ?? new Date(),
      };
      return normalized;
    },
    merge: (prev, next) => {
      const mergedSnapshot =
        next.snapshot && prev?.snapshot
          ? mergeBoardSnapshots(prev.snapshot, next.snapshot)
          : next.snapshot ?? prev?.snapshot ?? null;

      const mergedUpdatedAt = (() => {
        if (next.updatedAt && prev?.updatedAt) {
          return new Date(Math.max(next.updatedAt.getTime(), prev.updatedAt.getTime()));
        }
        return next.updatedAt ?? prev?.updatedAt ?? new Date();
      })();

      return {
        ...(prev ?? {}),
        ...next,
        updatedAt: mergedUpdatedAt,
        snapshot: mergedSnapshot,
      } as Board;
    },
  });

  return null;
}

export default function AppWrapper() {
  const [currentView, setCurrentView] = useState<"tasks" | "docs" | "board" | "settings">("tasks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { t } = useTranslation();
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const tokenTemplate = import.meta.env.VITE_CLERK_JWT_TEMPLATE;
  
  // Track if initial load is complete to prevent duplicate loading
  const isInitialLoadRef = useRef(true);
  // Track previous workspace to detect real changes
  const previousWorkspaceRef = useRef<string | null>(null);

  const loadTasks = useTaskStore((state) => state.loadTasks);
  const setTaskUser = useTaskStore((state) => state.setCurrentUser);

  const loadDocuments = useDocumentStore((state) => state.loadDocuments);
  const setDocumentUser = useDocumentStore((state) => state.setCurrentUser);
  const setActiveDocument = useDocumentStore((state) => state.setActiveDocument);

  const loadTaskDocs = useTaskDocStore((state) => state.loadTaskDocs);
  const setTaskDocUser = useTaskDocStore((state) => state.setCurrentUser);

  const refreshBoards = useBoardStore((state) => state.refreshBoards);
  const setBoardUser = useBoardStore((state) => state.setCurrentUser);
  const setActiveBoard = useBoardStore((state) => state.setActiveBoard);

  const initializeWorkspace = useWorkspaceStore((state) => state.initialize);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const getCurrentMemberRole = useWorkspaceStore((state) => state.getCurrentMemberRole);
  const { toast } = useToast();

  useEffect(() => {
    const handleReadOnly = () => {
      toast({
        title: "Chỉ xem",
        description: "Bạn chỉ có quyền xem trong workspace này.",
        variant: "destructive",
      });
    };
    window.addEventListener("workspace-readonly", handleReadOnly);
    return () => window.removeEventListener("workspace-readonly", handleReadOnly);
  }, [toast]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const activeUserId = userId ?? null;

    setTaskUser(activeUserId);
    setDocumentUser(activeUserId);
    setTaskDocUser(activeUserId);
    setBoardUser(activeUserId);

    if (!isSignedIn || !activeUserId) {
      return;
    }

    const bootstrap = async () => {
      try {
        const tokenOptions = tokenTemplate
          ? { template: tokenTemplate, skipCache: true }
          : { skipCache: true };
        await getToken(tokenOptions);
      } catch (error) {
        console.warn("Failed to prefetch Clerk token before data load", error);
      }

      await initializeWorkspace();
      
      // Check if user needs to create their first workspace
      const currentWorkspaces = useWorkspaceStore.getState().workspaces;
      if (currentWorkspaces.length === 0) {
        setShowOnboarding(true);
        // Mark initial load as complete
        isInitialLoadRef.current = false;
        return;
      }

      await Promise.all([
        loadTasks(),
        loadDocuments(),
        loadTaskDocs(),
        refreshBoards(),
      ]);
      
      // Mark initial load as complete and set initial workspace
      const initialWorkspace = useWorkspaceStore.getState().activeWorkspaceId;
      previousWorkspaceRef.current = initialWorkspace;
      isInitialLoadRef.current = false;
    };

    void bootstrap();
  }, [
    isLoaded,
    isSignedIn,
    userId,
    setTaskUser,
    setDocumentUser,
    setTaskDocUser,
    setBoardUser,
    initializeWorkspace,
    loadTasks,
    loadDocuments,
    loadTaskDocs,
    refreshBoards,
    getToken,
    tokenTemplate,
  ]);

  // Reload data when workspace changes
  useEffect(() => {
    // Skip if initial load hasn't completed yet
    if (isInitialLoadRef.current) {
      return;
    }
    
    // Skip if workspace hasn't actually changed
    if (previousWorkspaceRef.current === activeWorkspaceId) {
      return;
    }
    
    // Skip if no workspace selected
    if (!activeWorkspaceId) {
      return;
    }
    
    if (isSignedIn && userId) {
      const reloadData = async () => {
        // Update previous workspace ref
        const oldWorkspace = previousWorkspaceRef.current;
        previousWorkspaceRef.current = activeWorkspaceId;
        
        // Clear active document and board when switching workspace
        // They will be reloaded if they belong to the new workspace
        setActiveDocument(null);
        setActiveBoard(null);
        
        // Check if user is on settings page but not owner in new workspace
        const currentRole = getCurrentMemberRole();
        if (currentView === "settings" && currentRole !== "owner") {
          setCurrentView("tasks");
          toast({
            title: "Chuyển hướng",
            description: "Chỉ có chủ workspace mới có thể truy cập cài đặt.",
            variant: "default",
          });
        }
        
        try {
          // Ensure token is fresh before reloading data
          const tokenOptions = tokenTemplate
            ? { template: tokenTemplate, skipCache: true }
            : { skipCache: true };
          await getToken(tokenOptions);
        } catch (error) {
          console.warn("Failed to refresh token before reload", error);
        }

        await Promise.all([
          loadTasks(),
          loadDocuments(),
          loadTaskDocs(),
          refreshBoards(),
        ]);
      };
      void reloadData();
    }
  }, [activeWorkspaceId, isSignedIn, userId, loadTasks, loadDocuments, loadTaskDocs, refreshBoards, getToken, tokenTemplate, setActiveDocument, setActiveBoard]);

  // Handle workspace creation from onboarding
  const handleWorkspaceCreated = async () => {
    setShowOnboarding(false);
    
    // Load initial data now that workspace exists
    await Promise.all([
      loadTasks(),
      loadDocuments(),
      loadTaskDocs(),
      refreshBoards(),
    ]);
    
    // Set initial workspace ref
    const newWorkspace = useWorkspaceStore.getState().activeWorkspaceId;
    previousWorkspaceRef.current = newWorkspace;
  };

  return (
    <CollaborationProvider>
      <YjsProvider workspaceId={activeWorkspaceId}>
        {/* Yjs Sync Handler - Auto-syncs Yjs ↔ Zustand */}
        <YjsSyncHandler />
        
        {/* Workspace Onboarding Modal */}
        {showOnboarding && (
          <WorkspaceOnboarding
            open={showOnboarding}
            onWorkspaceCreated={handleWorkspaceCreated}
          />
        )}
      
      {/* Main App - Hidden while onboarding */}
      {!showOnboarding && (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
          {/* ClickUp Style Header */}
          <ClickupHeader
            currentView={currentView}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            onNavigateToSettings={() => setCurrentView('settings')}
          />

          {/* Main Layout - ClickUp 3-Column Layout */}
          <div className="flex flex-1 overflow-hidden overflow-x-hidden pt-2 pl-2 pb-2">
            {/* ClickUp App Sidebar (Icon bar + Workspace sidebar) */}
            <ClickupAppSidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              currentView={currentView}
              onViewChange={setCurrentView}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              {currentView === 'tasks' ? <Index onViewChange={setCurrentView} onSmartCreate={() => {
                const event = new CustomEvent('openSmartParser');
                window.dispatchEvent(event);
              }} /> :
               currentView === 'docs' ? <Docs /> :
               currentView === 'settings' ? <WorkspaceSettings /> :
               <BoardView />}
            </main>
          </div>
        </div>
      )}
      </YjsProvider>
    </CollaborationProvider>
  );
}
