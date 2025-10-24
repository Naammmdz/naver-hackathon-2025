import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@/types/task";
import { Plus } from "lucide-react";

type ColumnHeaderProps = {
  column: { id: TaskStatus; title: string; description: string };
  taskCount: number;
  onAddTask: () => void;
};

export function ColumnHeader({ column, taskCount, onAddTask }: ColumnHeaderProps) {
  const getHeaderStyles = (status: TaskStatus) => {
    const baseStyles = "border-l-4";
    const statusStyles: Record<TaskStatus, string> = {
      "Todo": "border-l-muted-foreground",
      "In Progress": "border-l-primary",
      "Done": "border-l-success",
    };
    return statusStyles[status];
  };

  const getCountStyles = (status: TaskStatus) => {
    const statusStyles: Record<TaskStatus, string> = {
      "Todo": "bg-muted text-muted-foreground",
      "In Progress": "bg-primary/10 text-primary",
      "Done": "bg-success/10 text-success",
    };
    return statusStyles[status];
  };

  return (
    <div className={cn("p-4 border-b bg-card rounded-t-lg transition-colors", getHeaderStyles(column.id))}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-sm">{column.title}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-primary/10"
            onClick={onAddTask}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCountStyles(column.id))}>
            {taskCount}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{column.description}</p>
    </div>
  );
}