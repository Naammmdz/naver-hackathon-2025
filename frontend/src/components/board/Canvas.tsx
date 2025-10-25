import { useBoardStore } from '@/store/boardStore';
import { Tldraw, TLEditorSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useCallback, useEffect, useRef, useState } from 'react';

export function Canvas() {
  const { activeBoardId, boards, updateBoardContent } = useBoardStore();
  const [snapshot, setSnapshot] = useState<TLEditorSnapshot | null>(null);
  const [isDark, setIsDark] = useState(false);
  const activeBoardIdRef = useRef(activeBoardId);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const editorRef = useRef<any>(null);

  // Update ref when activeBoardId changes
  useEffect(() => {
    activeBoardIdRef.current = activeBoardId;
  }, [activeBoardId]);

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

  // Update Tldraw theme when app theme changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.user.updateUserPreferences({
        colorScheme: isDark ? 'dark' : 'light'
      });
    }
  }, [isDark]);

  // Load board content when activeBoardId changes
  useEffect(() => {
    if (activeBoardId) {
      const board = boards.find(b => b.id === activeBoardId);
      if (board && board.snapshot) {
        try {
          setSnapshot(board.snapshot);
        } catch (error) {
          console.error('Error loading board snapshot:', error);
          setSnapshot(null);
        }
      } else {
        setSnapshot(null);
      }
    } else {
      setSnapshot(null);
    }
  }, [activeBoardId]); // Only depend on activeBoardId, not boards

  // Auto-save function - using onMount to get editor instance
  const handleMount = useCallback((editor: any) => {
    // Store editor reference for theme updates
    editorRef.current = editor;

    let lastSavedSnapshot = null;

    // Debounced save function
    const debouncedSave = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (activeBoardIdRef.current) {
          try {
            const currentSnapshot = editor.getSnapshot();
            updateBoardContent(activeBoardIdRef.current, currentSnapshot);
          } catch (error) {
            console.error('Error saving board snapshot:', error);
          }
        }
      }, 1000); // Save after 1 second of inactivity
    };

    // Save when content changes
    const unsubscribe = editor.store.listen(() => {
      debouncedSave();
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [updateBoardContent, isDark]);

  return (
    <div className="w-full h-full relative" style={{ pointerEvents: 'auto' }}>
      <style>{`.tlui-menu-zone { display: none !important; } .tl-watermark_SEE-LICENSE { display: none !important; }`}</style>
      <div className="w-full h-full" data-theme={isDark ? 'dark' : 'light'}>
        <Tldraw
          snapshot={snapshot}
          onMount={handleMount}
        />
      </div>
    </div>
  );
}
