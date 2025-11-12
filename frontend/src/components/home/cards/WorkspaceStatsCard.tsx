import { useTaskStore } from '@/store/taskStore';
import { useDocumentStore } from '@/store/documentStore';
import { useBoardStore } from '@/store/boardStore';
import { PieChart, CheckSquare, FileText, Kanban, TrendingUp } from 'lucide-react';

export function WorkspaceStatsCard() {
  const tasks = useTaskStore((state) => state.tasks);
  const documents = useDocumentStore((state) => state.documents);
  const boards = useBoardStore((state) => state.boards);
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const totalDocs = documents.length;
  const totalBoards = boards.length;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-green-500" />
        <h3 className="text-sm font-semibold text-foreground">Workspace Overview</h3>
      </div>

      <div className="flex-1 space-y-3">
        {/* Overall Stats */}
        <div className="rounded-lg border border-border/40 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-muted-foreground">Productivity</span>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{completionRate}%</div>
          <div className="text-[10px] text-muted-foreground">Task Completion Rate</div>
        </div>

        {/* Resource Counts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border/40 bg-background/50 p-3 text-center">
            <CheckSquare className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <div className="text-xl font-bold text-foreground">{totalTasks}</div>
            <div className="text-[10px] text-muted-foreground">Tasks</div>
          </div>
          <div className="rounded-md border border-border/40 bg-background/50 p-3 text-center">
            <FileText className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <div className="text-xl font-bold text-foreground">{totalDocs}</div>
            <div className="text-[10px] text-muted-foreground">Docs</div>
          </div>
          <div className="rounded-md border border-border/40 bg-background/50 p-3 text-center">
            <Kanban className="h-4 w-4 mx-auto mb-1 text-pink-500" />
            <div className="text-xl font-bold text-foreground">{totalBoards}</div>
            <div className="text-[10px] text-muted-foreground">Boards</div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="rounded-md border border-border/40 bg-background/50 p-3">
          <div className="text-xs font-medium text-foreground mb-2">Task Status</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-green-600 dark:text-green-400">{completedTasks}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {tasks.filter((t) => t.status === 'In Progress').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">To Do</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                {tasks.filter((t) => t.status === 'Todo').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
