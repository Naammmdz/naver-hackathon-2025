import { apiAuthContext } from "@/lib/api/authContext";
import type { SearchResponse } from "@/types/search";

// Use relative URL in production (when VITE_API_BASE_URL is empty or not set)
// Use localhost in development
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")
    : import.meta.env.PROD
    ? ""
    : "http://localhost:8989";

const buildUrl = (path: string, params: Record<string, string | number | undefined | null>) => {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });
  return apiAuthContext.appendUserIdQuery(url.toString());
};

const request = async <T>(input: RequestInfo): Promise<T> => {
  const headers = await apiAuthContext.getAuthHeaders({});
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Search request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

export type SearchFilterType = "all" | "task" | "doc" | "board";

interface SearchParams {
  query: string;
  type?: SearchFilterType;
  workspaceId?: string | null;
  page?: number;
  size?: number;
}

export const searchApi = {
  async search(params: SearchParams): Promise<SearchResponse> {
    const url = buildUrl("/api/search", {
      q: params.query.trim(),
      type: params.type ?? "all",
      workspaceId: params.workspaceId ?? undefined,
      page: params.page ?? 0,
      size: params.size ?? 10,
    });
    return await request<SearchResponse>(url);
  },
};

