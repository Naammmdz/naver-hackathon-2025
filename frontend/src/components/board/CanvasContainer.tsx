import { useBoardStore } from '@/store/boardStore';
import { useEffect, useState } from 'react';
import { Canvas } from './Canvas';

export function CanvasContainer() {
  const { boards, activeBoardId, addBoard } = useBoardStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Create initial board if none exist
  useEffect(() => {
    if (boards.length === 0 && !isInitialized) {
      addBoard('Board 1');
      setIsInitialized(true);
    } else if (boards.length > 0 && !isInitialized) {
      setIsInitialized(true);
    }
  }, [boards.length, addBoard, isInitialized]);

  if (!isInitialized) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }

  return <Canvas />;
}
