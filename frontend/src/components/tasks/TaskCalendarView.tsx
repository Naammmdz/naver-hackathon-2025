import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Task } from "@/types/task";
import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { useTranslation } from "react-i18next";

interface TaskCalendarViewProps {
  onTaskEdit: (task: Task) => void;
  onTaskView: (task: Task) => void;
  onNewTask: (date?: Date) => void;
}

export function TaskCalendarView({ onTaskEdit, onTaskView, onNewTask }: TaskCalendarViewProps) {
  const { t } = useTranslation();
  const { getFilteredTasks } = useTaskStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDate = (date: Date) => {
    return getFilteredTasks().filter(task => 
      task.dueDate && isSameDay(new Date(task.dueDate), date)
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "priority-high";
      case "Medium": return "priority-medium";
      case "Low": return "priority-low";
      default: return "priority-medium";
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const toggleDayExpansion = (day: Date) => {
    const dayKey = day.toISOString().split('T')[0];
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  const isDayExpanded = (day: Date) => {
    const dayKey = day.toISOString().split('T')[0];
    return expandedDays.has(dayKey);
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {formatDate(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayTasks = getTasksForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[120px] p-2 border-b border-r last:border-r-0",
                    "hover-surface cursor-pointer group",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                    isTodayDate && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  onClick={() => onNewTask(day)}
                  title={`Click to add task for ${formatDate(day, "PPP")}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isTodayDate && "text-primary font-bold"
                    )}>
                      {formatDate(day, "d")}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayTasks.length > 0 && (
                        <Badge variant="secondary" className="text-xs h-4 px-1">
                          {dayTasks.length}
                        </Badge>
                      )}
                      {/* Plus icon appears on hover */}
                      <div className="opacity-0 group-hover:opacity-50 transition-opacity text-muted-foreground">
                        +
                      </div>
                    </div>
                  </div>

                  {/* Task List for the Day */}
                  <div className="space-y-1">
                    {(isDayExpanded(day) ? dayTasks : dayTasks.slice(0, 3)).map((task) => {
                      const isOverdue = new Date(task.dueDate!) < new Date() && task.status !== "Done";
                      
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "text-xs p-1 rounded cursor-pointer transition-colors",
                            "hover:bg-primary/5 border border-transparent",
                            task.status === "Done" && "bg-success/10 text-success border-success/20",
                            task.status === "In Progress" && "bg-accent/10 text-accent border-accent/20",
                            task.status === "Todo" && "bg-muted text-muted-foreground border-muted",
                            isOverdue && "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskView(task);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              getPriorityColor(task.priority)
                            )} />
                            <span className="truncate" title={task.title}>
                              {task.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {dayTasks.length > 3 && (
                      <div 
                        className="text-xs text-center py-1 cursor-pointer hover-surface rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDayExpansion(day);
                        }}
                      >
                        {isDayExpanded(day) ? (
                          <span className="text-muted-foreground">{t('common.showLess')}</span>
                        ) : (
                          <span className="text-primary">+{dayTasks.length - 3} {t('common.more')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full priority-high" />
          <span>{t('tasks.priority.highPriority')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full priority-medium" />
          <span>{t('tasks.priority.mediumPriority')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full priority-low" />
          <span>{t('tasks.priority.lowPriority')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span>{t('sidebar.overdue')}</span>
        </div>
      </div>
    </div>
  );
}
