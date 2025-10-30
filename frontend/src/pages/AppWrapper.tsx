import { BoardView } from "@/components/board/BoardView";
import { ClickupAppSidebar } from "@/components/layout/ClickupAppSidebar";
import { ClickupHeader } from "@/components/layout/ClickupHeader";
import { useBoardStore } from "@/store/boardStore";
import { useDocumentStore } from "@/store/documentStore";
import { useTaskDocStore } from "@/store/taskDocStore";
import { useTaskStore } from "@/store/taskStore";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Docs from "./Docs";
import Index from "./Index";

export default function AppWrapper() {
  const [currentView, setCurrentView] = useState<"tasks" | "docs" | "board">("tasks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useTranslation();
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const tokenTemplate = import.meta.env.VITE_CLERK_JWT_TEMPLATE;

  const loadTasks = useTaskStore((state) => state.loadTasks);
  const setTaskUser = useTaskStore((state) => state.setCurrentUser);

  const loadDocuments = useDocumentStore((state) => state.loadDocuments);
  const setDocumentUser = useDocumentStore((state) => state.setCurrentUser);

  const loadTaskDocs = useTaskDocStore((state) => state.loadTaskDocs);
  const setTaskDocUser = useTaskDocStore((state) => state.setCurrentUser);

  const refreshBoards = useBoardStore((state) => state.refreshBoards);
  const setBoardUser = useBoardStore((state) => state.setCurrentUser);

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

      await Promise.all([
        loadTasks(),
        loadDocuments(),
        loadTaskDocs(),
        refreshBoards(),
      ]);
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
    loadTasks,
    loadDocuments,
    loadTaskDocs,
    refreshBoards,
    getToken,
    tokenTemplate,
  ]);

  return (
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
          {currentView === 'tasks' ? <Index onViewChange={setCurrentView} onSmartCreate={() => {
            const event = new CustomEvent('openSmartParser');
            window.dispatchEvent(event);
          }} /> :
           currentView === 'docs' ? <Docs /> :
           <BoardView />}
        </main>
      </div>
    </div>
  );
}
