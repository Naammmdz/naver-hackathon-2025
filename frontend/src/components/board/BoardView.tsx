import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './Canvas';

export function BoardView() {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </div>
  );
}