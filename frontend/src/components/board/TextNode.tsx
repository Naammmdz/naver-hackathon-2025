import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Handle, NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useState } from 'react';

interface TextNodeData {
  text: string;
  fontSize?: number;
  color?: string;
}

export function TextNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as TextNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(nodeData.text || '');
  const { updateNodeData } = useReactFlow();

  const handleSave = () => {
    setIsEditing(false);
    updateNodeData(id, { text });
  };

  return (
    <div className="relative group">
      <Card className={cn(
        "shadow-lg border-2 transition-all duration-200 hover:shadow-xl hover:scale-105 min-w-32",
        "bg-transparent border-transparent"
      )}>
        <CardContent className="p-2 h-full">
          {isEditing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-sm font-medium leading-relaxed"
              placeholder="Type your text..."
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="w-full h-full cursor-pointer text-sm leading-relaxed font-medium hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors"
              style={{
                fontSize: nodeData.fontSize || 14,
                color: nodeData.color || 'inherit'
              }}
            >
              {text || "Click to edit text"}
            </div>
          )}
        </CardContent>
      </Card>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}