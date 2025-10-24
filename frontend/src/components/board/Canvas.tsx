import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    addEdge,
    Background,
    Connection,
    Edge,
    Node,
    ReactFlow,
    useEdgesState,
    useNodesState,
    useReactFlow,
    Viewport
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    ArrowRight,
    Columns,
    FileText,
    MessageCircle,
    MoreHorizontal,
    MousePointer,
    Network,
    Sparkles,
    Square,
    Type
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CommentNode } from './CommentNode.tsx';
import { MindmapNode } from './MindmapNode.tsx';
import { ShapeNode } from './ShapeNode.tsx';
import { StickyNote as StickyNoteComponent } from './StickyNote.tsx';
import { TaskColumn } from './TaskColumn.tsx';
import { TextNode } from './TextNode.tsx';

// Define node types
const nodeTypes = {
  taskColumn: TaskColumn,
  stickyNote: StickyNoteComponent,
  mindmapNode: MindmapNode,
  textNode: TextNode,
  shapeNode: ShapeNode,
  commentNode: CommentNode,
};

// Define toolbar tools
const tools = [
  { id: 'select', icon: MousePointer, label: 'Select', group: 'basic' },
  { id: 'text', icon: Type, label: 'Text', group: 'basic' },
  { id: 'stickyNote', icon: FileText, label: 'Sticky Note', group: 'elements' },
  { id: 'shape', icon: Square, label: 'Shape', group: 'elements' },
  { id: 'connector', icon: ArrowRight, label: 'Connector', group: 'elements' },
  { id: 'kanban', icon: Columns, label: 'Kanban', group: 'templates' },
  { id: 'mindmap', icon: Network, label: 'Mindmap', group: 'templates' },
  { id: 'comment', icon: MessageCircle, label: 'Comment', group: 'collaboration' },
  { id: 'ai', icon: Sparkles, label: 'AI Assistant', group: 'ai' },
  { id: 'more', icon: MoreHorizontal, label: 'More', group: 'other' },
];

// Initial nodes for the board
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'taskColumn',
    position: { x: 100, y: 100 },
    data: {
      title: 'To Do',
      tasks: [
        { id: 'task-1', title: 'Design new feature', priority: 'high' },
        { id: 'task-2', title: 'Write documentation', priority: 'medium' },
      ]
    },
  },
  {
    id: '2',
    type: 'taskColumn',
    position: { x: 400, y: 100 },
    data: {
      title: 'In Progress',
      tasks: [
        { id: 'task-3', title: 'Implement authentication', priority: 'high' },
      ]
    },
  },
  {
    id: '3',
    type: 'taskColumn',
    position: { x: 700, y: 100 },
    data: {
      title: 'Done',
      tasks: [
        { id: 'task-4', title: 'Setup project structure', priority: 'low' },
      ]
    },
  },
  {
    id: '4',
    type: 'stickyNote',
    position: { x: 200, y: 400 },
    data: { text: 'Important meeting at 3 PM' },
  },
  {
    id: '5',
    type: 'mindmapNode',
    position: { x: 500, y: 400 },
    data: { label: 'Project Planning', children: ['Design', 'Development', 'Testing'] },
  },
];

const initialEdges: Edge[] = [];

export function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeTool, setActiveTool] = useState('select');
  const [connectionMode, setConnectionMode] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(100);

  const { zoomIn, zoomOut, zoomTo, getZoom } = useReactFlow();

  // Update zoom level when viewport changes
  const onMove = useCallback((event: MouseEvent | TouchEvent | null) => {
    const currentZoomLevel = getZoom() * 100;
    setCurrentZoom(currentZoomLevel);
  }, [getZoom]);  // Initialize zoom level
  useEffect(() => {
    setCurrentZoom(getZoom() * 100);
  }, [getZoom]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (connectionMode) {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [connectionMode, setEdges]
  );

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type,
      position,
      data: type === 'taskColumn'
        ? { title: 'New Column', tasks: [] }
        : type === 'stickyNote'
        ? { text: 'New note' }
        : type === 'mindmapNode'
        ? { label: 'New Node', children: [] }
        : type === 'textNode'
        ? { text: 'New text', fontSize: 14 }
        : type === 'shapeNode'
        ? { shape: 'rectangle', width: 100, height: 60, fillColor: '#3b82f6', strokeColor: '#1e40af', strokeWidth: 2 }
        : type === 'commentNode'
        ? { text: 'New comment', author: 'You', timestamp: new Date().toLocaleTimeString() }
        : {},
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes]);

    const handleToolClick = useCallback((toolId: string) => {
    setActiveTool(toolId);

    if (toolId === 'select') {
      setConnectionMode(false);
    } else if (toolId === 'text') {
      const randomX = Math.random() * 300 + 100;
      const randomY = Math.random() * 200 + 100;
      addNode('textNode', { x: randomX, y: randomY });
    } else if (toolId === 'stickyNote') {
      const randomX = Math.random() * 300 + 100;
      const randomY = Math.random() * 200 + 100;
      addNode('stickyNote', { x: randomX, y: randomY });
    } else if (toolId === 'shape') {
      const randomX = Math.random() * 300 + 100;
      const randomY = Math.random() * 200 + 100;
      addNode('shapeNode', { x: randomX, y: randomY });
    } else if (toolId === 'connector') {
      setConnectionMode(true);
    } else if (toolId === 'kanban') {
      const randomX = Math.random() * 300 + 100;
      const randomY = Math.random() * 200 + 100;
      addNode('taskColumn', { x: randomX, y: randomY });
    } else if (toolId === 'mindmap') {
      const randomX = Math.random() * 300 + 100;
      const randomY = Math.random() * 200 + 100;
      addNode('mindmapNode', { x: randomX, y: randomY });
    } else if (toolId === 'comment') {
      const randomX = Math.random() * 300 + 100;
      const randomY = Math.random() * 200 + 100;
      addNode('commentNode', { x: randomX, y: randomY });
    } else if (toolId === 'ai') {
  // AI tool - placeholder for future AI features
    } else if (toolId === 'more') {
  // More tools - placeholder for additional tools menu
    }
  }, [setActiveTool, setConnectionMode, addNode]);

  const renderToolbar = () => {
    const groups = ['basic', 'elements', 'templates', 'collaboration', 'ai', 'other'];

    return (
      <div className="flex flex-col gap-1 p-2">
        {groups.map((group, groupIndex) => (
          <div key={group} className="flex flex-col gap-1">
            {tools
              .filter(tool => tool.group === group)
              .map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;

                return (
                  <TooltipProvider key={tool.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleToolClick(tool.id)}
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group",
                            "hover:bg-white/10 hover:scale-110 active:scale-95",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-lg scale-105"
                              : "text-white/70 hover:text-white"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <p>{tool.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            {groupIndex < groups.length - 1 && (
              <div className="w-6 h-px bg-white/20 mx-auto my-2 rounded-full" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="w-full h-full relative" style={{ pointerEvents: 'auto' }}>
        {/* Left Toolbar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            {renderToolbar()}
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onMove={onMove}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50 dark:bg-gray-900"
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
        >
          <Background gap={20} />
          {/* Controls removed, only mouse wheel zoom available */}
        </ReactFlow>
      </div>
    </TooltipProvider>
  );
}