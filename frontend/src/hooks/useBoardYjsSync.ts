import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { Board, BoardSnapshot } from '@/types/board';
import { useBoardStore } from '@/store/boardStore';

interface UseBoardYjsSyncOptions {
  boardsMap: Y.Map<any> | null;
  boardContentMap: Y.Map<any> | null;
  enabled?: boolean;
}

export function useBoardYjsSync({ 
  boardsMap, 
  boardContentMap,
  enabled = true 
}: UseBoardYjsSyncOptions) {
  const { boards, updateBoard, updateBoardContent, activeBoardId } = useBoardStore();
  const isSyncingRef = useRef(false);
  const lastBoardsRef = useRef<string>(JSON.stringify(boards));

  // Sync boards from Zustand to Yjs
  useEffect(() => {
    if (!enabled || !boardsMap || !boardContentMap || isSyncingRef.current) {
      return;
    }

    const currentBoardsJson = JSON.stringify(boards);
    if (currentBoardsJson === lastBoardsRef.current) {
      return;
    }

    isSyncingRef.current = true;

    try {
      // Update boards in Yjs Map
      boards.forEach((board) => {
        const boardKey = board.id;
        const existing = boardsMap.get(boardKey);
        
        const boardData = {
          ...board,
          createdAt: board.createdAt.toISOString(),
          updatedAt: board.updatedAt.toISOString(),
        };
        
        if (!existing || JSON.stringify(existing) !== JSON.stringify(boardData)) {
          boardsMap.set(boardKey, boardData);
        }

        // Sync board content separately
        if (board.snapshot) {
          const existingContent = boardContentMap.get(boardKey);
          if (!existingContent || JSON.stringify(existingContent) !== JSON.stringify(board.snapshot)) {
            boardContentMap.set(boardKey, board.snapshot);
          }
        }
      });

      lastBoardsRef.current = currentBoardsJson;
    } catch (error) {
      console.error('Failed to sync boards to Yjs:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [boards, boardsMap, boardContentMap, enabled]);

  // Sync boards from Yjs to Zustand
  useEffect(() => {
    if (!enabled || !boardsMap || !boardContentMap) return;

    const handleYjsUpdate = () => {
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;

      try {
        boardsMap.forEach((value, key) => {
          const board: Board = {
            ...value,
            id: key,
            createdAt: new Date(value.createdAt),
            updatedAt: new Date(value.updatedAt),
            snapshot: boardContentMap.get(key) || null,
          };

          // Update board in store
          updateBoard(board.id, {
            title: board.title,
          });

          // Update board content if it exists
          const content = boardContentMap.get(key);
          if (content) {
            updateBoardContent(board.id, content as BoardSnapshot);
          }
        });
      } catch (error) {
        console.error('Failed to sync boards from Yjs:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    boardsMap.observe(handleYjsUpdate);
    boardContentMap.observe(handleYjsUpdate);

    return () => {
      boardsMap.unobserve(handleYjsUpdate);
      boardContentMap.unobserve(handleYjsUpdate);
    };
  }, [boardsMap, boardContentMap, enabled, updateBoard, updateBoardContent]);
}

