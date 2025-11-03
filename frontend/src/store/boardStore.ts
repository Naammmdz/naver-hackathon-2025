import { boardApi } from "@/lib/api/boardApi";
import { yjsHelper } from "@/lib/yjs-helper";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Board, BoardSnapshot } from "@/types/board";
import { create } from "zustand";

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  initialize: () => Promise<void>;
  refreshBoards: () => Promise<void>;
  addBoard: (title: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  setActiveBoard: (id: string | null) => void;
  updateBoard: (id: string, updates: Partial<Pick<Board, "title">>) => Promise<void>;
  updateBoardContent: (id: string, snapshot: BoardSnapshot | null) => Promise<void>;
  setCurrentUser: (userId: string | null) => void;
}

const findFallbackActiveBoard = (boards: Board[]): string | null => {
  return boards.length > 0 ? boards[0].id : null;
};

export const useBoardStore = create<BoardState>((set, get) => {
  const canEditWorkspace = () => {
    const workspaceState = useWorkspaceStore.getState();
    if (!workspaceState.activeWorkspaceId) {
      return true;
    }
    // Silently return false without setting error state
    return workspaceState.canEditActiveWorkspace();
  };

  return {
  boards: [],
  activeBoardId: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  currentUserId: null,

  initialize: async () => {
    if (get().isInitialized) {
      return;
    }
    await get().refreshBoards();
    set((state) => ({
      isInitialized: true,
      activeBoardId: state.activeBoardId ?? findFallbackActiveBoard(state.boards),
    }));
  },

  refreshBoards: async () => {
    const userId = get().currentUserId;
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    
    if (!userId || !workspaceId) {
      set({ boards: [], activeBoardId: null, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const boards = await boardApi.listByWorkspace(workspaceId);
      set((state) => {
        const nextActive =
          state.activeBoardId && boards.some((board) => board.id === state.activeBoardId)
            ? state.activeBoardId
            : findFallbackActiveBoard(boards);
        return {
          boards,
          activeBoardId: nextActive,
          isLoading: false,
          error: null,
        };
      });
    } catch (error) {
      console.error("Failed to load boards", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load boards",
      });
    }
  },

  addBoard: async (title: string) => {
    const userId = get().currentUserId;
    if (!userId) {
      set({ error: "Bạn cần đăng nhập để tạo bảng mới.", isLoading: false });
      return;
    }

    if (!canEditWorkspace()) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId ?? undefined;
      const created = await boardApi.create({ title, userId, workspaceId });
      set((state) => ({
        boards: [...state.boards, created],
        activeBoardId: created.id,
        isLoading: false,
      }));
      
      // Sync to Yjs for realtime collaboration
      yjsHelper.syncBoardToYjs(created);
    } catch (error) {
      console.error("Failed to create board", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create board";
      if (errorMessage.includes('403') || errorMessage.includes('500') || errorMessage.includes('permission') || errorMessage.includes('quyền')) {
        // Silently fail for permission errors
        set({ isLoading: false });
      } else {
        set({ isLoading: false, error: errorMessage });
      }
    }
  },

  deleteBoard: async (id: string) => {
    if (!canEditWorkspace()) {
      return;
    }
    const previousBoards = get().boards;
    const previousActive = get().activeBoardId;
    set((state) => {
      const remaining = state.boards.filter((board) => board.id !== id);
      return {
        boards: remaining,
        activeBoardId: state.activeBoardId === id ? findFallbackActiveBoard(remaining) : state.activeBoardId,
      };
    });

    try {
      await boardApi.delete(id);
      
      // Remove from Yjs for realtime collaboration
      yjsHelper.removeBoardFromYjs(id);
    } catch (error) {
      console.error("Failed to delete board", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete board";
      if (errorMessage.includes('403') || errorMessage.includes('500') || errorMessage.includes('permission') || errorMessage.includes('quyền')) {
        // Silently restore previous state without showing error
        set({
          boards: previousBoards,
          activeBoardId: previousActive,
        });
      } else {
        set({
          boards: previousBoards,
          activeBoardId: previousActive,
          error: errorMessage,
        });
      }
    }
  },

  setActiveBoard: (id: string | null) => {
    set({ activeBoardId: id });
  },

  updateBoard: async (id: string, updates: Partial<Pick<Board, "title">>) => {
    if (!canEditWorkspace()) {
      return;
    }
    try {
      const existing = get().boards.find((board) => board.id === id);
      const updated = await boardApi.update(id, {
        id,
        title: updates.title,
        userId: existing?.userId ?? get().currentUserId ?? undefined,
      });
      set((state) => ({
        boards: state.boards.map((board) => (board.id === id ? updated : board)),
      }));
    } catch (error) {
      console.error("Failed to update board", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update board";
      if (errorMessage.includes('403') || errorMessage.includes('500') || errorMessage.includes('permission') || errorMessage.includes('quyền')) {
        // Silently ignore permission errors
      } else {
        set({ error: errorMessage });
      }
    }
  },

  updateBoardContent: async (id: string, snapshot: BoardSnapshot | null) => {
    if (!canEditWorkspace()) {
      return;
    }
    const currentBoard = get().boards.find((board) => board.id === id);
    const previousSnapshot = currentBoard?.snapshot ?? null;
    const previousUpdatedAt = currentBoard?.updatedAt ?? new Date();

    set((state) => ({
      boards: state.boards.map((board) =>
        board.id === id
          ? {
              ...board,
              snapshot,
              updatedAt: new Date(),
            }
          : board,
      ),
    }));

    try {
      const updated = await boardApi.updateSnapshot(id, snapshot);
      set((state) => ({
        boards: state.boards.map((board) => (board.id === id ? updated : board)),
      }));
      
      // Sync to Yjs for realtime collaboration
      yjsHelper.syncBoardToYjs(updated);
    } catch (error) {
      console.error("Failed to update board snapshot", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update board snapshot";
      if (errorMessage.includes('403') || errorMessage.includes('500') || errorMessage.includes('permission') || errorMessage.includes('quyền')) {
        // Silently restore previous snapshot without showing error
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === id
              ? {
                  ...board,
                  snapshot: previousSnapshot,
                  updatedAt: previousUpdatedAt,
                }
              : board,
          ),
        }));
      } else {
        set((state) => ({
          error: errorMessage,
          boards: state.boards.map((board) =>
            board.id === id
              ? {
                  ...board,
                  snapshot: previousSnapshot,
                  updatedAt: previousUpdatedAt,
                }
              : board,
          ),
        }));
      }
    }
  },

  setCurrentUser: (userId) => {
    set((state) => ({
      currentUserId: userId,
      boards:
        userId && userId === state.currentUserId
          ? state.boards
          : [],
      activeBoardId:
        userId && userId === state.currentUserId
          ? state.activeBoardId
          : null,
      isInitialized: false,
      error: null,
      isLoading: false,
    }));
  },
  };
});
