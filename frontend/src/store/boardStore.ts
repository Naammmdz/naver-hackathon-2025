import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Board {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  snapshot: any; // Tldraw snapshot
}

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  
  // Actions
  addBoard: (title: string) => void;
  deleteBoard: (id: string) => void;
  setActiveBoard: (id: string) => void;
  updateBoard: (id: string, updates: Partial<Board>) => void;
  updateBoardContent: (id: string, snapshot: any) => void;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set) => ({
      boards: [],
      activeBoardId: null,

      addBoard: (title: string) => {
        const newBoard: Board = {
          id: nanoid(),
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snapshot: null,
        };
        
        set((state) => ({
          boards: [...state.boards, newBoard],
          activeBoardId: newBoard.id,
        }));
      },

      deleteBoard: (id: string) => {
        set((state) => {
          const newBoards = state.boards.filter(board => board.id !== id);
          const newActiveBoardId = state.activeBoardId === id 
            ? (newBoards.length > 0 ? newBoards[0].id : null)
            : state.activeBoardId;
          
          return {
            boards: newBoards,
            activeBoardId: newActiveBoardId,
          };
        });
      },

      setActiveBoard: (id: string) => {
        set({ activeBoardId: id });
      },

      updateBoard: (id: string, updates: Partial<Board>) => {
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === id
              ? {
                  ...board,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : board
          ),
        }));
      },

      updateBoardContent: (id: string, snapshot: any) => {
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === id
              ? {
                  ...board,
                  snapshot,
                  updatedAt: new Date().toISOString(),
                }
              : board
          ),
        }));
      },
    }),
    {
      name: 'board-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
