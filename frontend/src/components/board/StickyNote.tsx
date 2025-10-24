import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Handle, NodeProps, Position, useReactFlow } from '@xyflow/react';
import { useState } from 'react';

interface StickyNoteData {
  text: string;
}

export function StickyNote({ id, data }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const noteData = data as unknown as StickyNoteData;
  const [text, setText] = useState(noteData.text);
  const { updateNodeData } = useReactFlow();

  const handleSave = () => {
    setIsEditing(false);
    updateNodeData(id, { text });
  };

  return (
    <div className="relative group">
      <Card className={cn(
        "w-48 min-h-32 shadow-lg border-2 transition-all duration-200 hover:shadow-xl hover:scale-105",
        "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800"
      )}>
        <CardContent className="p-3 h-full">
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
              placeholder="Type your note..."
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="w-full h-full cursor-pointer text-sm leading-relaxed font-medium hover:bg-yellow-100/50 dark:hover:bg-yellow-900/30 rounded p-1 -m-1 transition-colors"
            >
              {text || "Click to edit..."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced pin effect */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full shadow-lg border-2 border-background z-10"></div>
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-400 rounded-full shadow-md border border-background"></div>
      <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-300 rounded-full"></div>

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