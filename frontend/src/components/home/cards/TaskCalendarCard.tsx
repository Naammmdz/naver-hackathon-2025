import { useTaskStore } from '@/store/taskStore';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';

interface TaskCalendarCardProps {
  onNavigate: () => void;
}

export function TaskCalendarCard({ onNavigate }: TaskCalendarCardProps) {
  const tasks = useTaskStore((state) => state.tasks);
  
  // Get tasks with due dates, sorted by date
  const tasksWithDates = tasks
    .filter((task) => task.dueDate && task.status !== 'Done')
    .sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 6);

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(startOfDay(date))) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getDateColor = (dateString: string) => {
    const date = new Date(dateString);
    if (isPast(startOfDay(date)) && !isToday(date)) {
      return 'text-red-600 dark:text-red-400';
    }
    if (isToday(date)) {
      return 'text-orange-600 dark:text-orange-400';
    }
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-foreground">Upcoming Tasks</h3>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {tasksWithDates.length > 0 ? (
          tasksWithDates.map((task) => {
            const dateLabel = getDateLabel(task.dueDate!);
            const dateColor = getDateColor(task.dueDate!);
            const isOverdue = isPast(startOfDay(new Date(task.dueDate!))) && !isToday(new Date(task.dueDate!));

            return (
              <div
                key={task.id}
                className="group cursor-pointer rounded-md border border-border/40 bg-background/50 p-2.5 transition-all hover:border-blue-500/50 hover:bg-background"
                onClick={onNavigate}
              >
                <div className="flex items-start gap-2">
                  {isOverdue && <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-500 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 text-xs font-medium text-foreground">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-[10px] font-medium ${dateColor}`}>
                        <Clock className="h-3 w-3" />
                        {dateLabel}
                      </div>
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
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/40 bg-muted/10">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No upcoming tasks</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
