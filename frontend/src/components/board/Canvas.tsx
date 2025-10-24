import { useBoardStore } from '@/store/boardStore';
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  TLBaseShape,
  Tldraw,
  useEditor
} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect, useState } from 'react';

// Shape utilities and types...
// Text Node Shape
export class TextShapeUtil extends BaseBoxShapeUtil<TLTextShape> {
  static override type = 'text' as const;

  override getDefaultProps(): TLTextShape['props'] {
    return {
      text: 'New text',
      fontSize: 14,
      w: 200,
      h: 50,
    };
  }

  override component(shape: TLTextShape) {
    const { text, fontSize } = shape.props;
    const editor = useEditor();

    const handleTextChange = (newText: string) => {
      editor.updateShape({
        id: shape.id,
        type: 'text',
        props: { ...shape.props, text: newText },
      });
    };

    return (
      <HTMLContainer>
        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none resize-none text-sm"
            style={{ fontSize: `${fontSize}px` }}
            placeholder="Enter text..."
          />
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: TLTextShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}

// Sticky Note Shape
export class StickyNoteShapeUtil extends BaseBoxShapeUtil<TLStickyNoteShape> {
  static override type = 'stickyNote' as const;

  override getDefaultProps(): TLStickyNoteShape['props'] {
    return {
      text: 'New note',
      color: '#fef3c7',
      w: 150,
      h: 120,
    };
  }

  override component(shape: TLStickyNoteShape) {
    const { text, color } = shape.props;
    const editor = useEditor();

    const handleTextChange = (newText: string) => {
      editor.updateShape({
        id: shape.id,
        type: 'stickyNote',
        props: { ...shape.props, text: newText },
      });
    };

    return (
      <HTMLContainer>
        <div
          className="p-3 rounded-lg shadow-md border-2"
          style={{ backgroundColor: color }}
        >
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none resize-none text-sm font-medium"
            placeholder="Write your note..."
          />
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: TLStickyNoteShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} />;
  }
}

// Shape Node (Rectangle, Circle, Triangle, Diamond)
export class ShapeNodeShapeUtil extends BaseBoxShapeUtil<TLShapeNodeShape> {
  static override type = 'shapeNode' as const;

  override getDefaultProps(): TLShapeNodeShape['props'] {
    return {
      shape: 'rectangle',
      fillColor: '#3b82f6',
      strokeColor: '#1e40af',
      strokeWidth: 2,
      w: 100,
      h: 60,
    };
  }

  override component(shape: TLShapeNodeShape) {
    const { shape: shapeType, fillColor, strokeColor, strokeWidth } = shape.props;

    return (
      <HTMLContainer>
        <div className="flex items-center justify-center w-full h-full">
          <svg width="100%" height="100%" viewBox="0 0 100 60">
            {shapeType === 'circle' && (
              <circle cx="50" cy="30" r="25" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            )}
            {shapeType === 'triangle' && (
              <polygon points="50,5 15,55 85,55" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            )}
            {shapeType === 'diamond' && (
              <polygon points="50,5 80,30 50,55 20,30" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            )}
            {shapeType === 'rectangle' && (
              <rect x="10" y="10" width="80" height="40" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} rx="4" />
            )}
          </svg>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: TLShapeNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={4} />;
  }
}

// Comment Node Shape
export class CommentShapeUtil extends BaseBoxShapeUtil<TLCommentShape> {
  static override type = 'comment' as const;

  override getDefaultProps(): TLCommentShape['props'] {
    return {
      text: 'New comment',
      author: 'You',
      timestamp: new Date().toLocaleTimeString(),
      w: 200,
      h: 80,
    };
  }

  override component(shape: TLCommentShape) {
    const { text, author, timestamp } = shape.props;
    const editor = useEditor();

    const handleTextChange = (newText: string) => {
      editor.updateShape({
        id: shape.id,
        type: 'comment',
        props: { ...shape.props, text: newText },
      });
    };

    return (
      <HTMLContainer>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {author.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">{author}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">{timestamp}</div>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none resize-none text-sm"
            placeholder="Write your comment..."
          />
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: TLCommentShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}

// Mindmap Node Shape
export class MindmapNodeShapeUtil extends BaseBoxShapeUtil<TLMindmapNodeShape> {
  static override type = 'mindmapNode' as const;

  override getDefaultProps(): TLMindmapNodeShape['props'] {
    return {
      label: 'New Node',
      children: [],
      level: 0,
      w: 120,
      h: 60,
    };
  }

  override component(shape: TLMindmapNodeShape) {
    const { label, level } = shape.props;
    const editor = useEditor();

    const handleLabelChange = (newLabel: string) => {
      editor.updateShape({
        id: shape.id,
        type: 'mindmapNode',
        props: { ...shape.props, label: newLabel },
      });
    };

    const bgColor = level === 0 ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700' :
                  level === 1 ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' :
                  'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';

    return (
      <HTMLContainer>
        <div className={`p-3 rounded-lg border-2 shadow-sm ${bgColor}`}>
          <input
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-center"
            placeholder="Node label..."
          />
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: TLMindmapNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}

// Task Column Shape
export class TaskColumnShapeUtil extends BaseBoxShapeUtil<TLTaskColumnShape> {
  static override type = 'taskColumn' as const;

  override getDefaultProps(): TLTaskColumnShape['props'] {
    return {
      title: 'New Column',
      tasks: [],
      w: 280,
      h: 400,
    };
  }

  override component(shape: TLTaskColumnShape) {
    const { title, tasks } = shape.props;
    const editor = useEditor();

    const handleTitleChange = (newTitle: string) => {
      editor.updateShape({
        id: shape.id,
        type: 'taskColumn',
        props: { ...shape.props, title: newTitle },
      });
    };

    const addTask = () => {
      const newTask = {
        id: Date.now().toString(),
        text: 'New task',
        completed: false,
      };
      editor.updateShape({
        id: shape.id,
        type: 'taskColumn',
        props: { ...shape.props, tasks: [...tasks, newTask] },
      });
    };

    const updateTask = (taskId: string, updates: Partial<typeof tasks[0]>) => {
      const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      editor.updateShape({
        id: shape.id,
        type: 'taskColumn',
        props: { ...shape.props, tasks: updatedTasks },
      });
    };

    return (
      <HTMLContainer>
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md flex flex-col">
          {/* Column Header */}
          <div className="p-3 border-b border-gray-300 dark:border-gray-600">
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-semibold text-gray-900 dark:text-gray-100"
              placeholder="Column title..."
            />
          </div>

          {/* Tasks */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white dark:bg-gray-700 p-2 rounded border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => updateTask(task.id, { completed: e.target.checked })}
                    className="rounded"
                  />
                  <input
                    value={task.text}
                    onChange={(e) => updateTask(task.id, { text: e.target.value })}
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    placeholder="Task description..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Task Button */}
          <div className="p-2 border-t border-gray-300 dark:border-gray-600">
            <button
              onClick={addTask}
              className="w-full p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              + Add Task
            </button>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: TLTaskColumnShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}

// Shape definitions
export type TLTextShape = TLBaseShape<
  'text',
  {
    text: string;
    fontSize: number;
    w: number;
    h: number;
  }
>;

export type TLStickyNoteShape = TLBaseShape<
  'stickyNote',
  {
    text: string;
    color: string;
    w: number;
    h: number;
  }
>;

export type TLShapeNodeShape = TLBaseShape<
  'shapeNode',
  {
    shape: 'rectangle' | 'circle' | 'triangle' | 'diamond';
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    w: number;
    h: number;
  }
>;

export type TLCommentShape = TLBaseShape<
  'comment',
  {
    text: string;
    author: string;
    timestamp: string;
    w: number;
    h: number;
  }
>;

export type TLMindmapNodeShape = TLBaseShape<
  'mindmapNode',
  {
    label: string;
    children: string[];
    level: number;
    w: number;
    h: number;
  }
>;

export type TLTaskColumnShape = TLBaseShape<
  'taskColumn',
  {
    title: string;
    tasks: Array<{
      id: string;
      text: string;
      completed: boolean;
    }>;
    w: number;
    h: number;
  }
>;

// Shape utilities array
const shapeUtils = [
  TextShapeUtil,
  StickyNoteShapeUtil,
  ShapeNodeShapeUtil,
  CommentShapeUtil,
  MindmapNodeShapeUtil,
  TaskColumnShapeUtil,
];

export function Canvas() {
  const [editor, setEditor] = useState<any>(null);
  const { activeBoardId, boards, updateBoardContent } = useBoardStore();

  // Initialize pages for all boards when editor mounts
  useEffect(() => {
    if (editor && boards.length > 0) {
      const pages = editor.getPages();
      
      // For each board, ensure it has a page
      boards.forEach(board => {
        let boardPage = pages.find((p: any) => p.meta?.boardId === board.id);
        
        if (!boardPage) {
          // Create a new page for this board
          boardPage = editor.createPage({ 
            name: board.title, 
            meta: { boardId: board.id } 
          });
        }
      });
    }
  }, [editor, boards]);

  // Switch to the active board's page
  useEffect(() => {
    if (!editor || !activeBoardId) return;

    const pages = editor.getPages();
    const activePage = pages.find((p: any) => p.meta?.boardId === activeBoardId);
    
    if (activePage && editor.getCurrentPage()?.id !== activePage.id) {
      editor.setCurrentPage(activePage.id);
      
      // Load shapes for this board
      const activeBoard = boards.find(b => b.id === activeBoardId);
      if (activeBoard && activeBoard.nodes && activeBoard.nodes.length > 0) {
        editor.replaceShapes(activeBoard.nodes);
      }
    }
  }, [editor, activeBoardId, boards]);

  // Auto-save board content periodically
  useEffect(() => {
    if (!editor || !activeBoardId) return;

    const interval = setInterval(() => {
      const shapes = editor.getShapes();
      const bindings = editor.getBindings();
      updateBoardContent(activeBoardId, shapes, bindings);
    }, 2000); // Save every 2 seconds

    return () => clearInterval(interval);
  }, [editor, activeBoardId, updateBoardContent]);

  return (
    <div className="w-full h-full relative" style={{ pointerEvents: 'auto' }}>
      <style>{`.tlui-menu-zone { display: none !important; } .tl-watermark_SEE-LICENSE { display: none !important; }`}</style>
      {/* Tldraw Canvas */}
      <div className="w-full h-full">
        <Tldraw
          shapeUtils={shapeUtils}
          onMount={(editorInstance) => {
            setEditor(editorInstance);
            console.log('Tldraw mounted', editorInstance);
          }}
        />
      </div>
    </div>
  );
}