import { useBoardStore } from '@/store/boardStore';
import { useEffect, useRef, useState } from 'react';
import { Canvas } from './Canvas';

export function CanvasContainer() {
  const { boards, addBoard } = useBoardStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const initRef = useRef(false);

  // Create initial board if none exist - only once
  useEffect(() => {
    if (!initRef.current) {
      if (boards.length === 0) {
        initRef.current = true;
        addBoard('Board 1');
      } else {
        initRef.current = true;
        setIsInitialized(true);
      }
    }
  }, []);

  // Watch for boards to be created
  useEffect(() => {
    if (boards.length > 0 && !isInitialized) {
      setIsInitialized(true);
    }
  }, [boards.length, isInitialized]);

  if (!isInitialized) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }

  return <Canvas />;
}
