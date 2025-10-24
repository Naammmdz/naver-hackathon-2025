import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';

interface CommentNodeData {
  text: string;
  author?: string;
  timestamp?: string;
  color?: string;
}

export function CommentNode({ data }: NodeProps) {
  const nodeData = data as unknown as CommentNodeData;

  return (
    <div className="relative group">
      <Card className={cn(
        "shadow-lg border-2 transition-all duration-200 hover:shadow-xl hover:scale-105 min-w-48 max-w-64",
        "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs bg-blue-500 text-white">
                {nodeData.author?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                {nodeData.author || 'Anonymous'}
              </div>
              <div className="text-xs text-blue-500 dark:text-blue-400">
                {nodeData.timestamp || new Date().toLocaleTimeString()}
              </div>
            </div>
            <MessageCircle className="w-4 h-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            {nodeData.text || "Add your comment here..."}
          </div>
        </CardContent>
      </Card>

      {/* Comment tail */}
      <div className="absolute -left-2 top-4 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-blue-200 dark:border-r-blue-800"></div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}