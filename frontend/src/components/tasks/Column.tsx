import { cn } from "@/lib/utils";
import { TaskStatus } from "@/types/task";
import { useDroppable } from "@dnd-kit/core";

type ColumnProps = {
  column: { id: TaskStatus; title: string; description: string };
  children?: React.ReactNode;
};

export function Column({ column, children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg border transition-all",
        isOver && "bg-primary/10 border-primary/40 border-2 border-dashed"
      )}
    >
      {children}
    </div>
  );
}