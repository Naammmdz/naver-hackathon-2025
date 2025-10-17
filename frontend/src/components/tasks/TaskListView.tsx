import { format } from "date-fns";
import { useState } from "react";
import { 
  Calendar, 
  CheckSquare, 
  Clock, 
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task } from "@/types/task";
import { useTaskStore } from "@/store/taskStore";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

interface TaskListViewProps {
  onTaskEdit: (task: Task) => void;
  onTaskView: (task: Task) => void;
}

export function TaskListView({ onTaskEdit, onTaskView }: TaskListViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const { 
    getFilteredTasksByStatus, 
    getFilteredTasks,
    selectedTaskIds, 
    toggleTaskSelection, 
    clearSelection, 
    moveTask, 
    deleteTask,
    canMoveTaskToDone
  } = useTaskStore();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "priority-high";
      case "Medium": return "priority-medium";
      case "Low": return "priority-low";
      default: return "priority-medium";
    }
  };

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case "High": return 3;
      case "Medium": return 2;
      case "Low": return 1;
      default: return 2;
    }
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Third click clears the sort
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear sort function
  const clearSort = () => {
    setSortField(null);
    setSortDirection('asc');
  };

  // Sort the tasks
  const sortTasks = (tasks: Task[]) => {
    if (!sortField) return tasks;

    return [...tasks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'task':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          aValue = getPriorityWeight(a.priority);
          bValue = getPriorityWeight(b.priority);
          break;
        case 'dueDate':
          // Handle null/undefined due dates - put them at the end
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return sortDirection === 'asc' ? 1 : -1;
          if (!b.dueDate) return sortDirection === 'asc' ? -1 : 1;
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredTasks = getFilteredTasks();
  const filteredAndSortedTasks = sortTasks(filteredTasks);

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }: { field: string; children: React.ReactNode; className?: string }) => {
    const isActive = sortField === field;
    const tooltipText = isActive 
      ? (sortDirection === 'asc' ? t('tableHeaders.sortAsc') : t('tableHeaders.sortDesc'))
      : `${t('tableHeaders.sortBy')} ${children}`;
    
    return (
      <div 
        className={`flex items-center gap-1 cursor-pointer transition-colors select-none ${
          isActive ? 'text-primary' : 'hover:text-primary'
        } ${className}`}
        onClick={() => handleSort(field)}
        title={tooltipText}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-3 w-3" /> : 
            <ChevronDown className="h-3 w-3" />
        ) : (
          <div className="h-3 w-3 opacity-0 group-hover:opacity-50">
            <ChevronUp className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  const isOverdue = (task: Task) => 
    task.dueDate && new Date(task.dueDate) < new Date();

  const isDueToday = (task: Task) => 
    task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();

  const getSubtaskProgress = (task: Task) => {
    const total = task.subtasks.length;
    if (total === 0) return null;
    const completed = task.subtasks.filter(st => st.done).length;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  return (
    <div className="space-y-4">
      {/* Task Table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted p-3 border-b grid grid-cols-12 gap-2 items-center text-sm font-medium">
          <div className="col-span-1 flex items-center gap-2">
            <Checkbox
              checked={filteredAndSortedTasks.length > 0 && 
                       filteredAndSortedTasks.every(task => selectedTaskIds.includes(task.id))}
              onCheckedChange={(checked) => {
                if (checked) {
                  filteredAndSortedTasks.forEach(task => {
                    if (!selectedTaskIds.includes(task.id)) {
                      toggleTaskSelection(task.id);
                    }
                  });
                } else {
                  clearSelection();
                }
              }}
            />
            {sortField && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSort}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title={t('tableHeaders.clearSort')}
              >
                ×
              </Button>
            )}
          </div>
          
          <div className="col-span-4">
            <SortableHeader field="task">{t('tableHeaders.task')}</SortableHeader>
          </div>
          
          <div className="col-span-2">
            <SortableHeader field="status">{t('tableHeaders.status')}</SortableHeader>
          </div>
          
          <div className="col-span-1">
            <SortableHeader field="priority">{t('tableHeaders.priority')}</SortableHeader>
          </div>
          
          <div className="col-span-2">
            <SortableHeader field="dueDate">{t('tableHeaders.dueDate')}</SortableHeader>
          </div>
          
          <div className="col-span-1">
            <SortableHeader field="updated">{t('tableHeaders.updated')}</SortableHeader>
          </div>
          
          <div className="col-span-1">{t('tableHeaders.actions')}</div>
        </div>

        {/* Task Rows */}
        <div className="divide-y">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('tableHeaders.noTasksYet')}
            </div>
          ) : (
            filteredAndSortedTasks.map((task) => {
              const subtaskProgress = getSubtaskProgress(task);
              const overdue = isOverdue(task);
              const dueToday = isDueToday(task);
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/50 cursor-pointer transition-colors",
                    selectedTaskIds.includes(task.id) && "bg-primary/5",
                    overdue && "border-l-4 border-l-destructive"
                  )}
                  onClick={(e) => {
                    // Only open details if clicking on the task content, not on interactive elements
                    if (!(e.target as HTMLElement).closest('button, input, [role="button"], .dropdown-trigger')) {
                      onTaskView(task);
                    }
                  }}
                >
                  <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                  </div>
                  
                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        getPriorityColor(task.priority)
                      )} />
                      <h3 className="font-medium text-sm truncate">{task.title}</h3>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {task.description}
                      </p>
                    )}
                    {subtaskProgress && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckSquare className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {subtaskProgress.completed}/{subtaskProgress.total}
                        </span>
                      </div>
                    )}
                    {task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {task.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs h-4 px-1">
                            {tag}
                          </Badge>
                        ))}
                        {task.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            +{task.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        task.status === "Done" && "bg-success/10 text-success border-success",
                        task.status === "In Progress" && "bg-accent/10 text-accent border-accent",
                        task.status === "Todo" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {task.status}
                    </Badge>
                  </div>
                  
                  <div className="col-span-1">
                    <Badge variant="secondary" className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                  
                  <div className="col-span-2">
                    {task.dueDate ? (
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        overdue && "text-destructive",
                        dueToday && "text-warning"
                      )}>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(task.dueDate, "MMM d")}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('tableHeaders.noDueDate')}</span>
                    )}
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(task.updatedAt, "MMM d")}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 dropdown-trigger">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onTaskView(task);
                        }}>
                          {t('actions.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          moveTask(task.id, "Todo");
                        }}
                          disabled={task.status === "Todo"}
                        >
                          {t('actions.moveToTodo')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          moveTask(task.id, "In Progress");
                        }}
                          disabled={task.status === "In Progress"}
                        >
                          {t('actions.moveToInProgress')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          if (!canMoveTaskToDone(task.id)) {
                            toast({
                              title: t('taskCard.cannotMoveToDone'),
                              description: t('taskCard.completeSubtasksFirst'),
                              variant: "destructive",
                            });
                            return;
                          }
                          moveTask(task.id, "Done");
                        }}
                          disabled={task.status === "Done"}
                        >
                          {t('actions.moveToDone')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                          className="text-destructive focus:text-destructive"
                        >
                          {t('actions.deleteTask')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}