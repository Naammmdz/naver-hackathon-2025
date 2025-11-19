import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import BoardSidebar from './BoardSidebar';
import { CanvasContainer } from './CanvasContainer';
import { cn } from '@/lib/utils';

export function BoardView() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div 
      className="flex w-full h-full bg-background"
    >
      {/* Board Sidebar */}
      <div
        className={`relative transition-all duration-300 ease-out overflow-hidden ${
          isSidebarOpen ? 'w-64' : 'w-0'
        }`}
      >
        {isSidebarOpen && (
          <BoardSidebar
            onCollapse={toggleSidebar}
          />
        )}
      </div>

      {!isSidebarOpen && (
        <div className="flex w-12 items-start justify-center pt-4">
          <button
            type="button"
        onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sidebar-border/60 bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:text-primary hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all"
            title="Hiện sidebar board"
            aria-label="Show board sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden relative">
        <CanvasContainer />
      </div>

      {/* Show sidebar button when hidden */}
      {!isSidebarOpen && (
        <div className="text-xs text-muted-foreground/50 pointer-events-none absolute left-4 top-4">
          Click handle to show
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {isSidebarOpen && (
        <div className="absolute right-4 top-4 text-xs text-muted-foreground/50 pointer-events-none">
          Ctrl+B to hide
        </div>
      )}
    </div>
  );
}
