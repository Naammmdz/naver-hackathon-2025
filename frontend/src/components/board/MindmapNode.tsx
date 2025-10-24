import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Handle, NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useState } from 'react';

interface MindmapNodeData {
  label: string;
  children: string[];
}

export function MindmapNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as MindmapNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const { updateNodeData } = useReactFlow();

  const handleSave = () => {
    setIsEditing(false);
    updateNodeData(id, { label });
  };

  return (
    <div className="relative group">
      <Card className={cn(
        "shadow-lg border-2 transition-all duration-200 hover:shadow-xl hover:scale-105 min-w-48",
        "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800"
      )}>
        <CardHeader className="pb-2">
          {isEditing ? (
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              className="w-full text-center bg-transparent border-none outline-none text-green-800 dark:text-green-200 text-base font-bold"
              placeholder="Enter label..."
              autoFocus
            />
          ) : (
            <CardTitle
              onClick={() => setIsEditing(true)}
              className="text-center text-green-800 dark:text-green-200 text-base font-bold cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            >
              {label}
            </CardTitle>
          )}
          {nodeData.children && nodeData.children.length > 0 && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                {nodeData.children.length} items
              </Badge>
            </div>
          )}
        </CardHeader>

        {nodeData.children && nodeData.children.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {nodeData.children.map((child, index) => (
                <div
                  key={index}
                  className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-sm px-3 py-2 rounded-md border border-green-200 dark:border-green-800 text-center font-medium hover:bg-green-200 dark:hover:bg-green-800/70 transition-colors"
                >
                  {child}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Connection handles for mindmap connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-3 h-3 !bg-green-500 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}