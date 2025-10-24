import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Handle, NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
}

interface TaskColumnData {
  title: string;
  tasks: Task[];
}

export function TaskColumn({ id, data }: NodeProps) {
  const columnData = data as unknown as TaskColumnData;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(columnData.title);
  const { updateNodeData } = useReactFlow();

  const handleSave = () => {
    setIsEditing(false);
    updateNodeData(id, { title });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getColumnColor = (title: string) => {
    switch (title.toLowerCase()) {
      case 'to do': return 'border-l-blue-500';
      case 'in progress': return 'border-l-yellow-500';
      case 'done': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <Card className={cn("w-72 min-h-96 shadow-lg border-l-4", getColumnColor(title))}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          {isEditing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              className="flex-1 bg-transparent border-none outline-none text-lg font-semibold"
              placeholder="Column title..."
              autoFocus
            />
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              className="flex-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            >
              {title}
            </span>
          )}
          <Badge variant="secondary" className="text-xs">
            {columnData.tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {columnData.tasks.map((task) => (
          <div
            key={task.id}
            className="p-3 bg-muted/50 hover:bg-muted rounded-lg border transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-sm font-medium flex-1 leading-tight">{task.title}</span>
              <Badge
                variant={getPriorityColor(task.priority)}
                className="text-xs shrink-0"
              >
                {task.priority}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Task
            </div>
          </div>
        ))}
        {columnData.tasks.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            No tasks yet
            <br />
            <span className="text-xs">Drop tasks here</span>
          </div>
        )}
      </CardContent>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />
    </Card>
  );
}