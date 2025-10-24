import { ReactFlowProvider } from '@xyflow/react';
import BoardSidebar from './BoardSidebar';
import { CanvasContainer } from './CanvasContainer';

export function BoardView() {
  return (
    <div className="flex w-full h-full">
      {/* Board Sidebar */}
      <BoardSidebar />
      
      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <CanvasContainer />
        </ReactFlowProvider>
      </div>
    </div>
  );
}