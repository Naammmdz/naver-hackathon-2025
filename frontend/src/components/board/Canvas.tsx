import { useBoardStore } from '@/store/boardStore';
import { Excalidraw } from '@excalidraw/excalidraw';
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState } from 'react';

export function Canvas() {
  const { activeBoardId, boards, updateBoardContent } = useBoardStore();
  const [initialData, setInitialData] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);
  const activeBoardIdRef = useRef(activeBoardId);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Detect current theme (watch for documentElement 'dark' class or saved preference)
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark) || document.documentElement.classList.contains('dark');
      setIsDark(shouldBeDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Load board content when activeBoardId changes
  useEffect(() => {
    if (activeBoardId) {
      const board = boards.find(b => b.id === activeBoardId);
      if (board && board.snapshot) {
        try {
          if (!board.snapshot.appState || !board.snapshot.appState.collaborators) {
            const newSnapshot = {
              ...board.snapshot,
              appState: {
                ...(board.snapshot.appState || {}),
                collaborators: [],
                zenModeEnabled: false,
              },
            };
            setInitialData(newSnapshot);
          } else {
            setInitialData({
              ...board.snapshot,
              appState: {
                ...board.snapshot.appState,
                zenModeEnabled: false,
              },
            });
          }
        } catch (error) {
          console.error('Error loading board snapshot:', error);
          setInitialData(null);
        }
      } else {
        setInitialData(null);
      }
    } else {
      setInitialData(null);
    }
  }, [activeBoardId, boards]);

  const onChange = (elements: any, appState: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (activeBoardIdRef.current) {
        try {
          const sceneData = {
            elements: elements,
            appState: appState,
          };
          updateBoardContent(activeBoardIdRef.current, sceneData);
        } catch (error) {
          console.error('Error saving board snapshot:', error);
        }
      }
    }, 1000); // Save after 1 second of inactivity
  }


  return (
    <div 
      className="w-full h-full relative"
      onClick={(e) => e.stopPropagation()}
    >
      <Excalidraw
        initialData={initialData}
        onChange={onChange}
        theme={isDark ? 'dark' : 'light'}
      />
    </div>
  );
}