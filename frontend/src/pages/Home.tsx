import { useBoardStore } from '@/store/boardStore';
import { useDocumentStore } from '@/store/documentStore';
import { useTaskStore } from '@/store/taskStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CheckSquare, FileText, Layers, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home({ onViewChange }: { onViewChange: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams') => void }) {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const tasks = useTaskStore((state) => state.tasks);
  const documents = useDocumentStore((state) => state.documents);
  const boards = useBoardStore((state) => state.boards);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
      setIsDark(shouldBeDark);
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Filter by active workspace
  const workspaceTasks = activeWorkspaceId
    ? tasks.filter((t) => t.workspaceId === activeWorkspaceId)
    : tasks.filter((t) => !t.workspaceId);
  const workspaceDocuments = activeWorkspaceId
    ? documents.filter((d) => d.workspaceId === activeWorkspaceId && !d.trashed)
    : documents.filter((d) => !d.workspaceId && !d.trashed);
  const workspaceBoards = activeWorkspaceId
    ? boards.filter((b) => b.workspaceId === activeWorkspaceId)
    : boards.filter((b) => !b.workspaceId);

  // Statistics
  const todoTasks = workspaceTasks.filter((t) => t.status === 'Todo').length;
  const inProgressTasks = workspaceTasks.filter((t) => t.status === 'In Progress').length;
  const doneTasks = workspaceTasks.filter((t) => t.status === 'Done').length;
  const recentDocuments = workspaceDocuments
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);
  const recentBoards = workspaceBoards
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {activeWorkspace ? `Welcome to ${activeWorkspace.name}` : 'Home'}
          </h1>
          <p className="text-muted-foreground">
            Overview of your workspace activities and recent updates
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{workspaceTasks.length}</p>
              </div>
              <div className="rounded-full bg-blue-500/10 p-3">
                <CheckSquare className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Todo: </span>
                <span className="font-medium">{todoTasks}</span>
              </div>
              <div>
                <span className="text-muted-foreground">In Progress: </span>
                <span className="font-medium">{inProgressTasks}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Done: </span>
                <span className="font-medium">{doneTasks}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{workspaceDocuments.length}</p>
              </div>
              <div className="rounded-full bg-orange-500/10 p-3">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => onViewChange('docs')}
                className="text-xs text-primary hover:underline"
              >
                View all documents →
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Boards</p>
                <p className="text-2xl font-bold">{workspaceBoards.length}</p>
              </div>
              <div className="rounded-full bg-pink-500/10 p-3">
                <Layers className="h-5 w-5 text-pink-500" />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => onViewChange('board')}
                className="text-xs text-primary hover:underline"
              >
                View all boards →
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">-</p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <Users className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Documents */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Recent Documents
              </h2>
              <button
                onClick={() => onViewChange('docs')}
                className="text-sm text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet</p>
            ) : (
              <div className="space-y-2">
                {recentDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      useDocumentStore.getState().setActiveDocument(doc.id);
                      onViewChange('docs');
                    }}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{doc.icon || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Boards */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5 text-pink-500" />
                Recent Boards
              </h2>
              <button
                onClick={() => onViewChange('board')}
                className="text-sm text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {recentBoards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No boards yet</p>
            ) : (
              <div className="space-y-2">
                {recentBoards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => {
                      useBoardStore.getState().setActiveBoard(board.id);
                      onViewChange('board');
                    }}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📋</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{board.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(board.updatedAt).getTime() > 0 ? new Date(board.updatedAt).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Quick Actions
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              onClick={() => onViewChange('tasks')}
              className="p-4 rounded-lg border hover:bg-accent hover:border-primary/20 hover:text-accent-foreground transition-colors text-left"
            >
              <CheckSquare className="h-5 w-5 text-blue-500 mb-2" />
              <p className="font-medium">View Tasks</p>
              <p className="text-sm text-muted-foreground hover:text-muted-foreground/80">Manage your tasks</p>
            </button>
            <button
              onClick={() => onViewChange('docs')}
              className="p-4 rounded-lg border hover:bg-accent hover:border-primary/20 hover:text-accent-foreground transition-colors text-left"
            >
              <FileText className="h-5 w-5 text-orange-500 mb-2" />
              <p className="font-medium">Create Document</p>
              <p className="text-sm text-muted-foreground hover:text-muted-foreground/80">Start writing</p>
            </button>
            <button
              onClick={() => onViewChange('board')}
              className="p-4 rounded-lg border hover:bg-accent hover:border-primary/20 hover:text-accent-foreground transition-colors text-left"
            >
              <Layers className="h-5 w-5 text-pink-500 mb-2" />
              <p className="font-medium">Open Board</p>
              <p className="text-sm text-muted-foreground hover:text-muted-foreground/80">Start drawing</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

