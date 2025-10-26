import { create } from 'zustand';
import api from '../lib/api-config';
import { Board } from '../types/board';

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  loading: boolean;
  error: string | null;

  fetchBoards: () => Promise<void>;
  addBoard: (title: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  setActiveBoard: (id: string) => void;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  updateBoardContent: (id: string, snapshot: any) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set) => ({
  boards: [],
  activeBoardId: null,
  loading: false,
  error: null,

  fetchBoards: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/boards');
      set({ boards: response.data, loading: false });
      if (response.data.length > 0) {
        set({ activeBoardId: response.data[0].id });
      }
    } catch (error) {
      set({ error: 'Failed to fetch boards', loading: false });
    }
  },

  addBoard: async (title: string) => {
    try {
      const response = await api.post('/boards', { title });
      set((state) => ({
        boards: [...state.boards, response.data],
        activeBoardId: response.data.id,
      }));
    } catch (error) {
      console.error('Failed to add board', error);
    }
  },

  deleteBoard: async (id: string) => {
    try {
      await api.delete(`/boards/${id}`);
      set((state) => {
        const newBoards = state.boards.filter((board) => board.id !== id);
        const newActiveBoardId =
          state.activeBoardId === id
            ? newBoards.length > 0
              ? newBoards[0].id
              : null
            : state.activeBoardId;
        return {
          boards: newBoards,
          activeBoardId: newActiveBoardId,
        };
      });
    } catch (error) {
      console.error('Failed to delete board', error);
    }
  },

  setActiveBoard: (id: string) => {
    set({ activeBoardId: id });
  },

  updateBoard: async (id: string, updates: Partial<Board>) => {
    try {
      const response = await api.put(`/boards/${id}`, updates);
      set((state) => ({
        boards: state.boards.map((board) =>
          board.id === id ? response.data : board
        ),
      }));
    } catch (error) {
      console.error('Failed to update board', error);
    }
  },

  updateBoardContent: async (id: string, snapshot: any) => {
    try {
      const response = await api.put(`/boards/${id}`, { snapshot: JSON.stringify(snapshot) });
      set((state) => ({
        boards: state.boards.map((board) =>
          board.id === id ? response.data : board
        ),
      }));
    } catch (error) {
      console.error('Failed to update board content', error);
    }
  },
}));
