import { Hand, HelpCircle, Minus, Plus, Redo2, Undo2 } from 'lucide-react';
import React, { useEffect } from 'react';

interface CanvasControlsProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onPanToggle?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onHelp?: () => void;
  zoomLevel?: number;
}

const CanvasControls: React.FC<CanvasControlsProps> = React.memo(({
  onUndo = () => console.log('Undo clicked'),
  onRedo = () => console.log('Redo clicked'),
  onPanToggle = () => console.log('Pan toggle clicked'),
  onZoomIn = () => console.log('Zoom in clicked'),
  onZoomOut = () => console.log('Zoom out clicked'),
  onHelp = () => console.log('Help clicked'),
  zoomLevel = 100,
}) => {

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            if (!event.shiftKey) {
              event.preventDefault();
              onUndo();
            }
            break;
          case 'y':
            event.preventDefault();
            onRedo();
            break;
          case '=':
          case '+':
            event.preventDefault();
            onZoomIn();
            break;
          case '-':
            event.preventDefault();
            onZoomOut();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onZoomIn, onZoomOut]);

  const buttonClasses = "w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150";
  const groupClasses = "flex items-center gap-1 bg-white border border-gray-200 rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.08)] px-1 py-1";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {/* Undo/Redo Group */}
      <div className={groupClasses}>
        <button
          className={buttonClasses}
          onClick={onUndo}
          aria-label="Undo (Ctrl+Z)"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} className="text-gray-800" />
        </button>
        <button
          className={buttonClasses}
          onClick={onRedo}
          aria-label="Redo (Ctrl+Y)"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} className="text-gray-800" />
        </button>
      </div>

      {/* Pan Tool */}
      <button
        className={`${buttonClasses} bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.08)]`}
        onClick={onPanToggle}
        aria-label="Pan tool"
        title="Pan tool"
      >
        <Hand size={16} className="text-gray-800" />
      </button>

      {/* Zoom Controls Group */}
      <div className={groupClasses}>
        <button
          className={buttonClasses}
          onClick={onZoomOut}
          aria-label="Zoom out (Ctrl+-)"
          title="Zoom out (Ctrl+-)"
        >
          <Minus size={16} className="text-gray-800" />
        </button>
        <div className="px-2 py-1 text-sm font-medium text-gray-700 select-none min-w-[3rem] text-center">
          {Math.round(zoomLevel)}%
        </div>
        <button
          className={buttonClasses}
          onClick={onZoomIn}
          aria-label="Zoom in (Ctrl++)"
          title="Zoom in (Ctrl++)"
        >
          <Plus size={16} className="text-gray-800" />
        </button>
      </div>

      {/* Help Button */}
      <button
        className={`${buttonClasses} bg-white border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.08)] rounded-full`}
        onClick={onHelp}
        aria-label="Help"
        title="Help"
      >
        <HelpCircle size={16} className="text-gray-800" />
      </button>
    </div>
  );
});

export default CanvasControls;