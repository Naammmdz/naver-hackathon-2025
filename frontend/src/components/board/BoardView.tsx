import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BoardSidebar from './BoardSidebar';
import { CanvasContainer } from './CanvasContainer';

export function BoardView() {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDragHint, setShowDragHint] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div 
      className="flex w-full h-full bg-background"
    >
      {/* Board Sidebar */}
      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          isSidebarOpen ? 'w-64' : 'w-0'
        }`}
      >
        <BoardSidebar />
      </div>

      {/* Drag Handle - Small indicator bar like iPhone navigation */}
      <div
        onClick={toggleSidebar}
        onMouseEnter={() => setShowDragHint(true)}
        onMouseLeave={() => setShowDragHint(false)}
        className={`relative w-1 flex-shrink-0 cursor-pointer group transition-all duration-200 bg-border hover:bg-primary/60`}
        title={isSidebarOpen ? t('components.BoardView.hideSidebarTitle') : t('components.BoardView.showSidebarTitle')}
      >
        {/* Small navigation bar in the middle */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-8 w-0.5 bg-muted-foreground/40 rounded-full group-hover:bg-primary/80 group-hover:h-10 transition-all duration-200" />
        
        {/* Chevron indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isSidebarOpen ? (
            <ChevronLeft className="w-4 h-4 text-primary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden relative">
        <CanvasContainer />
      </div>

      {/* Show sidebar button when hidden */}
      {!isSidebarOpen && (
        <div className="text-xs text-muted-foreground/50 pointer-events-none absolute left-4 top-4">
          {t('components.BoardView.showSidebarHint')}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {isSidebarOpen && (
        <div className="absolute right-4 top-4 text-xs text-muted-foreground/50 pointer-events-none">
          {t('components.BoardView.hideSidebarShortcut')}
        </div>
      )}
    </div>
  );
}
