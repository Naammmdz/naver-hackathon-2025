import { BoardView } from "@/components/board/BoardView";
import { ClickupAppSidebar } from "@/components/layout/ClickupAppSidebar";
import { ClickupHeader } from "@/components/layout/ClickupHeader";
import { WorkspaceOnboarding } from "@/components/layout/WorkspaceOnboarding";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { useBoardYjsSync } from "@/hooks/useBoardYjsSync";
import { useDocumentYjsSync } from "@/hooks/useDocumentYjsSync";
import { useTaskYjsSync } from "@/hooks/useTaskYjsSync";
import { useUserIdentityAwareness } from "@/hooks/useUserIdentityAwareness";
import { useWorkspaceYjs } from "@/hooks/useWorkspaceYjs";
import { getColor } from "@/lib/userColors";
import { useBoardStore } from "@/store/boardStore";
import { useDocumentStore } from "@/store/documentStore";
import { useTaskDocStore } from "@/store/taskDocStore";
import { useTaskStore } from "@/store/taskStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Docs from "./Docs";
import Home from "./Home";
import Index from "./Index";
import Teams from "./Teams";
import type { SearchResult } from "@/types/search";

export default function AppWrapper() {
  const [currentView, setCurrentView] = useState<"tasks" | "docs" | "board" | "home" | "teams">("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { t } = useTranslation();
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
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

  // Initialize workspace-level Yjs for realtime sync
  const { 
    tasksMap, 
    taskOrdersMap, 
    boardsMap, 
    boardContentMap,
    documentsMap,
    docContentMap,
    isConnected: isYjsConnected 
  } = useWorkspaceYjs({
    workspaceId: activeWorkspaceId,
    enabled: !!activeWorkspaceId && isSignedIn,
  });

  // Manage user identity in awareness (separate from view-specific awareness like boardCursor)
  // This ensures user info is always present for OnlineUsers display in header
  useUserIdentityAwareness();

  // Force awareness reseed when switching to home/board/teams views
  useEffect(() => {
    if (isSignedIn && activeWorkspaceId && ['home', 'board', 'teams'].includes(currentView)) {
      const timer = setTimeout(() => {
        const provider = (window as any).__WORKSPACE_PROVIDER;
        if (provider?.awareness) {
          const awareness = provider.awareness;
          // Force complete reseed of user identity
          awareness.setLocalState({
            userIdentity: {
              userId: userId,
              name: user?.fullName || user?.firstName || user?.username || userId,
              email: user?.emailAddresses?.[0]?.emailAddress || `${userId}@example.com`,
              avatarUrl: user?.imageUrl,
              color: getColor(userId),
            },
            _viewSwitch: Date.now(),
            _keepAlive: Date.now(),
          });
          console.log('[AppWrapper] Force reseeded user identity for view:', currentView);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentView, isSignedIn, activeWorkspaceId, userId, user]);

  // Sync tasks with Yjs
  useTaskYjsSync({
    tasksMap,
    taskOrdersMap,
    enabled: !!tasksMap && !!taskOrdersMap && isYjsConnected,
  });

  // Sync boards with Yjs
  useBoardYjsSync({
    boardsMap,
    boardContentMap,
    enabled: !!boardsMap && !!boardContentMap && isYjsConnected,
  });

  // Sync documents with Yjs
  useDocumentYjsSync({
    documentsMap,
    docContentMap,
    enabled: !!documentsMap && !!docContentMap && isYjsConnected,
  });

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

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SearchResult>).detail;
      if (!detail) {
        return;
      }
      setSidebarOpen(true);
      if (detail.type === "task") {
        setCurrentView("tasks");
        useTaskStore.getState().setFilters({ search: detail.title });
      } else if (detail.type === "doc") {
        setCurrentView("docs");
        useDocumentStore.getState().setActiveDocument(detail.id);
      } else if (detail.type === "board") {
        setCurrentView("board");
        useBoardStore.getState().setActiveBoard(detail.id);
      }
    };
    window.addEventListener("globalSearchNavigate", handler as EventListener);
    return () => window.removeEventListener("globalSearchNavigate", handler as EventListener);
  }, [setCurrentView]);

  return (
    <>
      <GlobalSearchModal />
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
              {currentView === 'home' ? <Home onViewChange={setCurrentView} /> :
               currentView === 'tasks' ? <Index onViewChange={setCurrentView} onSmartCreate={() => {
                const event = new CustomEvent('openSmartParser');
                window.dispatchEvent(event);
              }} /> :
               currentView === 'docs' ? <Docs /> :
               currentView === 'board' ? <BoardView /> :
               currentView === 'teams' ? <Teams onViewChange={setCurrentView} /> :
               <Home onViewChange={setCurrentView} />}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
