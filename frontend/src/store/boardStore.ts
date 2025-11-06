import { boardApi } from "@/lib/api/boardApi";
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

export const useBoardStore = create<BoardState>((set, get) => ({
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
    if (!userId) {
      set({ boards: [], activeBoardId: null, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      const boardsRaw = activeWorkspaceId ? await boardApi.listByWorkspace(activeWorkspaceId) : await boardApi.list();
      const boards = activeWorkspaceId
        ? boardsRaw.filter((board) => board.workspaceId === activeWorkspaceId)
        : boardsRaw.filter((board) => board.userId === userId);
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

    set({ isLoading: true, error: null });
    try {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId ?? undefined;
      const created = await boardApi.create({ title, userId, workspaceId });
      set((state) => ({
        boards: [...state.boards, created],
        activeBoardId: created.id,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to create board", error);
      set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to create board" });
    }
  },

  deleteBoard: async (id: string) => {
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
    } catch (error) {
      console.error("Failed to delete board", error);
      set({
        boards: previousBoards,
        activeBoardId: previousActive,
        error: error instanceof Error ? error.message : "Failed to delete board",
      });
    }
  },

  setActiveBoard: (id: string | null) => {
    set({ activeBoardId: id });
  },

  updateBoard: async (id: string, updates: Partial<Pick<Board, "title">>) => {
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
      set({ error: error instanceof Error ? error.message : "Failed to update board" });
    }
  },

  updateBoardContent: async (id: string, snapshot: BoardSnapshot | null) => {
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
    } catch (error) {
      console.error("Failed to update board snapshot", error);
      set((state) => ({
        error: error instanceof Error ? error.message : "Failed to update board snapshot",
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
}));
