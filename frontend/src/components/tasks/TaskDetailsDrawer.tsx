import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatRelativeDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/taskStore";
import { Task } from "@/types/task";
import { Calendar, CheckSquare, Clock, Edit, Tag, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TaskDocLinker } from "./TaskDocLinker";

interface TaskDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onEdit: () => void;
  onDocumentClick?: (docId: string) => void;
}

export function TaskDetailsDrawer({
  open,
  onOpenChange,
  task,
  onEdit,
  onDocumentClick,
}: TaskDetailsDrawerProps) {
  const { t } = useTranslation();
  const { updateTask, addSubtask, updateSubtask, deleteSubtask } = useTaskStore();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  if (!task) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "priority-high";
      case "Medium": return "priority-medium";
      case "Low": return "priority-low";
      default: return "priority-medium";
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const isDueToday = task.dueDate && 
    new Date(task.dueDate).toDateString() === new Date().toDateString();

  const completedSubtasks = task.subtasks.filter(st => st.done).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
    }
  };

  const handleToggleSubtask = (subtaskId: string, done: boolean) => {
    updateSubtask(task.id, subtaskId, { done });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-3 h-3 rounded-full flex-shrink-0",
                  getPriorityColor(task.priority)
                )} />
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
              <DrawerTitle className="text-xl mb-1">{task.title}</DrawerTitle>
              <DrawerDescription className="text-sm">
                {task.description || "No description provided"}
              </DrawerDescription>
            </div>
            <div className="flex gap-2 ml-4">
                            <Button onClick={onEdit} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                {t('taskDetails.edit')}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 space-y-6 overflow-y-auto flex-1">
          {/* Task Meta Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-1">{t('taskDetails.priority')}</h4>
                <Badge variant="secondary" className="text-xs">
                  {task.priority}
                </Badge>
              </div>
              
              {task.dueDate && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('taskDetails.dueDate')}</h4>
                  <div className={cn(
                    "flex items-center gap-1 text-sm",
                    isOverdue && "text-destructive",
                    isDueToday && "text-warning"
                  )}>
                    <Calendar className="h-3 w-3" />
                    <span>
                      {isOverdue ? t('taskCard.overdue') + " " : isDueToday ? t('taskCard.dueToday') + " " : t('taskCard.due') + " "}
                      {formatRelativeDate(task.dueDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-1">{t('taskDetails.created')}</h4>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeDate(task.createdAt)}</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">{t('taskDetails.lastUpdated')}</h4>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeDate(task.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {t('taskDetails.tags')}
              </h4>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {t('taskDetails.subtasks')}
                {totalSubtasks > 0 && (
                  <span className="text-muted-foreground">
                    ({completedSubtasks}/{totalSubtasks})
                  </span>
                )}
              </h4>
            </div>

            {totalSubtasks > 0 && (
              <div className="mb-3">
                <Progress value={subtaskProgress} className="h-2" />
              </div>
            )}

            <div className="space-y-2 mb-3">
              {task.subtasks.map((subtask) => (
                <div 
                  key={subtask.id} 
                  className="group flex items-center gap-2 p-2 rounded border cursor-pointer hover-surface"
                  onClick={() => handleToggleSubtask(subtask.id, !subtask.done)}
                >
                  <Checkbox
                    checked={subtask.done}
                    onCheckedChange={(checked) => 
                      handleToggleSubtask(subtask.id, !!checked)
                    }
                    onClick={(e) => e.stopPropagation()} // Prevent double triggering
                  />
                  <span className={cn(
                    "flex-1 text-sm select-none",
                    subtask.done && "line-through text-muted-foreground"
                  )}>
                    {subtask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering parent click
                      deleteSubtask(task.id, subtask.id);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={t('taskDetails.addSubtask')}
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddSubtask()}
                className="text-sm"
              />
              <Button onClick={handleAddSubtask} size="sm">
                {t('taskDetails.add')}
              </Button>
            </div>
          </div>

          {/* Linked Documents Section */}
          <Separator className="my-4" />
          <div className="space-y-3">
            <TaskDocLinker taskId={task.id} taskTitle={task.title} onDocumentClick={onDocumentClick} />
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('taskDetails.taskId')}: {task.id.slice(0, 8)}</span>
            <span>{t('taskDetails.createdOn')} {formatRelativeDate(task.createdAt)}</span>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
