import { searchApi, type SearchFilterType } from "@/lib/api/searchApi";
import type { SearchResult } from "@/types/search";
import { create } from "zustand";
import { useWorkspaceStore } from "@/store/workspaceStore";

const RECENT_QUERIES_KEY = "DevHolic.search.recent";
const MAX_RECENT = 8;

const loadRecentQueries = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(RECENT_QUERIES_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

const persistRecentQueries = (queries: string[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(queries.slice(0, MAX_RECENT)));
  } catch {
    // Ignore quota/storage errors
  }
};

interface SearchState {
  isOpen: boolean;
  query: string;
  type: SearchFilterType;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  recentQueries: string[];
  tookMs: number | null;
  total: number;
  openWithPrefill: (options?: { query?: string; initialType?: SearchFilterType }) => void;
  close: () => void;
  setQuery: (value: string) => void;
  setType: (type: SearchFilterType) => void;
  executeSearch: (options?: { query?: string; type?: SearchFilterType }) => Promise<void>;
  selectResult: (result: SearchResult) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: "",
  type: "all",
  results: [],
  isLoading: false,
  error: null,
  recentQueries: loadRecentQueries(),
  tookMs: null,
  total: 0,

  openWithPrefill: (options) => {
    set((state) => ({
      isOpen: true,
      query: options?.query ?? state.query ?? "",
      type: options?.initialType ?? state.type ?? "all",
    }));
  },

  close: () => {
    set({ isOpen: false });
  },

  setQuery: (value) => set({ query: value }),

  setType: (type) => set({ type }),

  executeSearch: async (options) => {
    const query = options?.query ?? get().query;
    const trimmed = query.trim();
    if (!trimmed) {
      set({ error: "Vui lòng nhập từ khóa tìm kiếm." });
      return;
    }
    const type = options?.type ?? get().type;
    set({ isLoading: true, error: null });
    try {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId ?? null;
      const response = await searchApi.search({
        query: trimmed,
        type,
        workspaceId,
      });
      const normalizedResults = response.results.map((result) => {
        const rawType = (result.type as string).toLowerCase();
        const normalizedType =
          rawType === "task"
            ? "task"
            : rawType === "document"
              ? "doc"
              : rawType === "board"
                ? "board"
                : (rawType as SearchResult["type"]);
        return {
          ...result,
          type: normalizedType,
        };
      });
      set({
        results: normalizedResults,
        isLoading: false,
        query: trimmed,
        type,
        tookMs: response.tookMs,
        total: response.total,
      });
      const updatedRecent = [trimmed, ...get().recentQueries.filter((q) => q !== trimmed)].slice(0, MAX_RECENT);
      set({ recentQueries: updatedRecent });
      persistRecentQueries(updatedRecent);
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Không thể tìm kiếm lúc này.",
      });
    }
  },

  selectResult: (result) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<SearchResult>("globalSearchNavigate", {
          detail: result,
        }),
      );
    }
    set({ isOpen: false });
  },
}));

