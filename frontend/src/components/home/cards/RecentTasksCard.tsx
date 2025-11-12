import { useTaskStore } from '@/store/taskStore';
import { Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface RecentTasksCardProps {
  onNavigate: () => void;
}

export function RecentTasksCard({ onNavigate }: RecentTasksCardProps) {
  const tasks = useTaskStore((state) => state.tasks);
  
  // Get recent pending tasks (max 5)
  const recentTasks = tasks
    .filter((task) => task.status !== 'Done')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    })
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Tasks</h3>
        <Button variant="ghost" size="sm" onClick={onNavigate} className="h-7 gap-1 px-2 text-xs">
          View All
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {recentTasks.length > 0 ? (
          recentTasks.map((task) => (
            <div
              key={task.id}
              className="group cursor-pointer rounded-md border border-border/40 bg-background/50 p-2.5 transition-all hover:border-purple-500/50 hover:bg-background"
              onClick={onNavigate}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs font-medium text-foreground">{task.title}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(task.dueDate), 'MMM d')}
                  </div>
                )}
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    task.priority === 'High'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : task.priority === 'Medium'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {task.priority}
                </span>
                <span className="text-[10px]">• {task.status}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">No pending tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
