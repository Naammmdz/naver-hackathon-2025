export type SearchResultType = "task" | "doc" | "board";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  workspaceId?: string | null;
  userId?: string | null;
  updatedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  tookMs: number;
}

