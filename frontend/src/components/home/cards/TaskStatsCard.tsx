import { useTaskStore } from '@/store/taskStore';
import { BarChart3 } from 'lucide-react';

export function TaskStatsCard() {
  const tasks = useTaskStore((state) => state.tasks);
  
  const todoCount = tasks.filter((t) => t.status === 'Todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const totalCount = tasks.length;
  
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-foreground">Task Statistics</h3>
      </div>

      <div className="flex-1 space-y-3">
        {/* Completion Rate */}
        <div className="rounded-lg border border-border/40 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{completionRate}%</div>
          <div className="text-xs text-muted-foreground">Completion Rate</div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border/40 bg-background/50 p-2.5 text-center">
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-500">{todoCount}</div>
            <div className="text-[10px] text-muted-foreground">Todo</div>
          </div>
          <div className="rounded-md border border-border/40 bg-background/50 p-2.5 text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-500">{inProgressCount}</div>
            <div className="text-[10px] text-muted-foreground">In Progress</div>
          </div>
          <div className="rounded-md border border-border/40 bg-background/50 p-2.5 text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-500">{doneCount}</div>
            <div className="text-[10px] text-muted-foreground">Done</div>
          </div>
        </div>

        {/* Total */}
        <div className="rounded-md border border-border/40 bg-background/50 p-2.5 text-center">
          <div className="text-2xl font-bold text-foreground">{totalCount}</div>
          <div className="text-xs text-muted-foreground">Total Tasks</div>
        </div>
      </div>
    </div>
  );
}
