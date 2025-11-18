import type {
    CreateDocumentInput,
    Document,
    UpdateDocumentInput,
} from "@/types/document";
import { apiAuthContext } from "./authContext";
import { 
  parseDocumentContent, 
  blockNoteToMarkdown, 
  detectContentFormat 
} from "@/lib/utils/markdownConverter";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8989";

interface DocumentApiResponse {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
  icon?: string | null;
  parentId?: string | null;
  trashed?: boolean | null;
  trashedAt?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
}

interface DocumentApiRequest {
  title: string;
  content: string;
  icon?: string | null;
  parentId?: string | null;
  trashed?: boolean | null;
  userId?: string | null;
  workspaceId?: string | null;
}

const toDate = (value?: string | null): Date => {
  if (!value) {
    return new Date();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const parseContent = (value?: string | null): any[] => {
  if (!value) {
    return [];
  }
  
  // Use the smart parser that handles both Markdown and BlockNote JSON
  return parseDocumentContent(value);
};

const serializeContent = (value?: any[]): string => {
  if (!value || value.length === 0) {
    return "";
  }
  
  try {
    // Convert BlockNote blocks to Markdown for storage
    const markdown = blockNoteToMarkdown(value);
    return markdown;
  } catch (error) {
    console.error("[documentApi] Failed to convert BlockNote to Markdown:", error);
    // Fallback: try to preserve as-is
    return JSON.stringify(value);
  }
};

const mapDocumentFromApi = (document: DocumentApiResponse): Document => ({
  id: document.id,
  title: document.title,
  content: parseContent(document.content),
  createdAt: toDate(document.createdAt),
  updatedAt: toDate(document.updatedAt),
  icon: document.icon ?? null,
  parentId: document.parentId ?? null,
  trashed: Boolean(document.trashed),
  trashedAt: document.trashedAt ? toDate(document.trashedAt) : null,
  userId: document.userId ?? apiAuthContext.getCurrentUserId() ?? "",
  workspaceId: document.workspaceId ?? undefined,
});

const serializeDocumentPayload = (
  payload: CreateDocumentInput | UpdateDocumentInput,
  defaults?: Document,
): DocumentApiRequest => ({
  title: payload.title ?? defaults?.title ?? "Untitled",
  content: serializeContent(payload.content ?? defaults?.content ?? []),
  icon:
    payload.icon !== undefined
      ? payload.icon
      : defaults?.icon !== undefined
        ? defaults.icon
        : "📄",
  parentId:
    payload.parentId !== undefined
      ? payload.parentId
      : defaults?.parentId !== undefined
        ? defaults.parentId
        : null,
  trashed: defaults?.trashed ?? false,
  userId: payload.userId ?? defaults?.userId ?? apiAuthContext.getCurrentUserId() ?? undefined,
  workspaceId: payload.workspaceId ?? defaults?.workspaceId ?? undefined,
});

const request = async <T>(
  input: RequestInfo,
  init?: RequestInit,
  parseJson = true,
): Promise<T> => {
  const headers = await apiAuthContext.getAuthHeaders(init?.headers ?? {});
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (!parseJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const documentApi = {
  async list(): Promise<Document[]> {
    const data = await request<DocumentApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents`),
    );
    return data.map(mapDocumentFromApi);
  },

  async listByWorkspace(workspaceId: string): Promise<Document[]> {
    const data = await request<DocumentApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/workspace/${workspaceId}`),
    );
    return data.map(mapDocumentFromApi);
  },

  async listTrashed(): Promise<Document[]> {
    const data = await request<DocumentApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/trashed`),
    );
    return data.map(mapDocumentFromApi);
  },

  async get(id: string): Promise<Document> {
    const data = await request<DocumentApiResponse>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/${id}`),
    );
    return mapDocumentFromApi(data);
  },

  async create(payload: CreateDocumentInput): Promise<Document> {
    const body = serializeDocumentPayload(payload);
    const data = await request<DocumentApiResponse>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents`),
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    return mapDocumentFromApi(data);
  },

  async update(id: string, payload: UpdateDocumentInput, defaults: Document): Promise<Document> {
    const body = serializeDocumentPayload(payload, defaults);
    const data = await request<DocumentApiResponse>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/${id}`),
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
    return mapDocumentFromApi(data);
  },

  async delete(id: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/${id}`),
      { method: "DELETE" },
      false,
    );
  },

  async deletePermanent(id: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/${id}/permanent`),
      { method: "DELETE" },
      false,
    );
  },

  async restore(id: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/${id}/restore`),
      { method: "PATCH" },
      false,
    );
  },

  async search(query: string): Promise<Document[]> {
    const data = await request<DocumentApiResponse[]>(
      apiAuthContext.appendUserIdQuery(
        `${API_BASE_URL}/api/documents/search?q=${encodeURIComponent(query)}`,
      ),
    );
    return data.map(mapDocumentFromApi);
  },

  async listByParent(parentId: string): Promise<Document[]> {
    const data = await request<DocumentApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/documents/parent/${parentId}`),
    );
    return data.map(mapDocumentFromApi);
  },
};
