import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/taskStore';
import { CheckSquare, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TaskWidgetProps {
  onNavigate: () => void;
}

export function TaskWidget({ onNavigate }: TaskWidgetProps) {
  const tasks = useTaskStore((state) => state.tasks);
  
  // Get recent tasks (max 5)
  const recentTasks = tasks
    .filter((task) => task.status !== 'Done')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    })
    .slice(0, 5);

  const todoCount = tasks.filter((t) => t.status === 'Todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-2">
            <CheckSquare className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-foreground">My Tasks</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigate} className="gap-1">
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{todoCount}</div>
          <div className="text-xs text-muted-foreground">Todo</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{inProgressCount}</div>
          <div className="text-xs text-muted-foreground">In Progress</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-500">{doneCount}</div>
          <div className="text-xs text-muted-foreground">Done</div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {recentTasks.length > 0 ? (
          recentTasks.map((task) => (
            <div
              key={task.id}
              className="group cursor-pointer rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-purple-500/50 hover:shadow-sm"
              onClick={onNavigate}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.dueDate), 'MMM d')}
                      </div>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        task.priority === 'High'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : task.priority === 'Medium'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20">
            <p className="text-sm text-muted-foreground">No pending tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
