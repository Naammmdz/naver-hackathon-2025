import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useFocusFly } from "@/features/focusFly/FocusFlyProvider";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateLocalized } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/taskStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Task } from "@/types/task";
import { DraggableAttributes } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, Clock, MoreHorizontal, Plane } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  onEdit: () => void;
  onView: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  dragProps?: DraggableAttributes;
}

export function TaskCard({
  task,
  isSelected,
  onEdit,
  onView,
  isDragging,
  isDragOver,
  dragProps
}: TaskCardProps) {
  const { t } = useTranslation();
  const { toggleTaskSelection, deleteTask, moveTask, canMoveTaskToDone } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { startSession } = useFocusFly();
  const { toast } = useToast();

  // Make the card sortable/draggable
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  // ...existing code...

  const completedSubtasks = task.subtasks.filter(st => st.done).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const canMoveToDone = canMoveTaskToDone(task.id);

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const isDueToday = task.dueDate &&
    new Date(task.dueDate).toDateString() === new Date().toDateString();
  const dueStatusColor = isOverdue
    ? "hsl(var(--priority-high))"
    : isDueToday
      ? "hsl(var(--priority-medium))"
      : undefined;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "priority-high";
      case "Medium": return "priority-medium";
      case "Low": return "priority-low";
      default: return "priority-medium";
    }
  };

  const assignee = members.find(m => m.userId === task.assigneeId);

  const handleQuickStatusChange = (newStatus: Task['status']) => {
    if (newStatus === "Done" && !canMoveToDone) {
      toast({
        title: t('taskCard.cannotMoveToDone'),
        description: t('taskCard.completeSubtasksFirst'),
        variant: "destructive",
      });
      return;
    }
    moveTask(task.id, newStatus);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'manipulation' }}
      {...attributes}
      {...listeners}
      {...dragProps}
    >
      <Card
        className={cn(
          "task-card cursor-grab group relative select-none",
          isDragging && "opacity-50 rotate-2 scale-105",
          isSelected && "ring-2 ring-primary shadow-lg",
          isDragOver && "ring-2 ring-primary/60 border-primary/40 bg-primary/5 shadow-md",
          isOverdue && "border-destructive/50",
          "hover:shadow-lg transition-all duration-200"
        )}
        onDoubleClick={() => onView()}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleTaskSelection(task.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0"
              />
              <div className={cn(
                "w-3 h-3 rounded-full flex-shrink-0",
                getPriorityColor(task.priority)
              )} />
              {/* Drag handle: attach listeners/attributes here so buttons remain clickable */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-card-foreground truncate">
                  {task.title}
                </h3>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-100 transition-opacity dropdown-trigger"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  startSession(task.id, task.title);
                }}>
                  <Plane className="mr-2 h-4 w-4" />
                  <span>Focus Fly</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}>
                  {t('actions.viewDetails')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusChange("Todo");
                }}
                  disabled={task.status === "Todo"}
                >
                  {t('actions.moveToTodo')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusChange("In Progress");
                }}
                  disabled={task.status === "In Progress"}
                >
                  {t('actions.moveToInProgress')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusChange("Done");
                }}
                  disabled={task.status === "Done" || !canMoveToDone}
                  title={!canMoveToDone ? t('taskCard.completeSubtasksFirst') : ""}
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

          {/* Description preview */}
          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Due date */}
          {task.dueDate && (
            <div
              className={cn("flex items-center gap-1 mb-3 text-xs")}
              style={dueStatusColor ? { color: dueStatusColor } : undefined}
            >
              <Calendar
                className="h-3 w-3"
                style={dueStatusColor ? { color: dueStatusColor } : undefined}
              />
              <span className="leading-none">
                {isOverdue ? t('taskCard.overdue') + " " : t('taskCard.due') + " "}
                {formatDateLocalized(task.dueDate)}
              </span>
            </div>
          )}

          {/* Subtasks progress */}
          {totalSubtasks > 0 && (
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>{t('taskCard.subtasks')}</span>
                </div>
                <span className="text-muted-foreground">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </div>
              <Progress value={subtaskProgress} className="h-1" />
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 h-5"
                >
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 h-5">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(task.updatedAt, "MMM d")}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-2 py-0.5 h-5",
                task.status === "Done" && "bg-success/10 text-success border-success",
                task.status === "In Progress" && "bg-accent/10 text-accent border-accent",
                task.status === "Todo" && "bg-muted text-muted-foreground"
              )}
            >
              {task.status}
            </Badge>

            {assignee && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 ml-2 border border-background">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-[8px]">
                        {assignee.fullName?.slice(0, 2).toUpperCase() || assignee.userId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{assignee.fullName || assignee.userId}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
