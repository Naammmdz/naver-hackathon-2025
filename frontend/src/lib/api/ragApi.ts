/**
 * RAG API Client
 * Client for interacting with the AI Service RAG API
 */

import { apiAuthContext } from "./authContext";
import type {
  WorkspaceCreate,
  WorkspaceUpdate,
  WorkspaceResponse,
  DocumentResponse,
  DocumentListResponse,
  DocumentStats,
  IngestResponse,
  QueryRequest,
  QueryResponse,
  SessionCreate,
  SessionResponse,
  ConversationHistory,
  HealthResponse,
  ReadinessResponse,
} from "@/types/rag";

// Stable API prefix used by FastAPI backend
const API_PREFIX = "/api/v1";
const HEALTH_ENDPOINT = "/health";
const DEFAULT_BASE_FALLBACK = "/ai-api";

const normalizeBaseUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/\/$/, "");
};

const detectPathPrefix = () => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return undefined;
  }
  return `/${segments[0]}`;
};

const buildCandidateBaseUrls = (): string[] => {
  const candidates = new Set<string>();
  const envBase = normalizeBaseUrl(import.meta.env.VITE_AI_SERVICE_BASE_URL);
  if (envBase) {
    candidates.add(envBase);
  }

  const pathPrefix = detectPathPrefix();
  if (pathPrefix && pathPrefix !== "/") {
    candidates.add(`${pathPrefix.replace(/\/$/, "")}/ai-api`);
  }

  candidates.add(DEFAULT_BASE_FALLBACK);
  candidates.add("/app/ai-api");

  return Array.from(candidates);
};

let resolvedBaseUrl: string | null = null;
let resolvingBaseUrlPromise: Promise<string> | null = null;

const resolveBaseUrl = async (): Promise<string> => {
  // During SSR or build, fall back immediately to env/default
  if (typeof window === "undefined") {
    return normalizeBaseUrl(import.meta.env.VITE_AI_SERVICE_BASE_URL) ?? DEFAULT_BASE_FALLBACK;
  }

  const candidates = buildCandidateBaseUrls();

  for (const base of candidates) {
    const target = `${base}${API_PREFIX}${HEALTH_ENDPOINT}`;
    try {
      const response = await fetch(target, { method: "GET" });
      if (response.ok) {
        return base;
      }
    } catch (error) {
      // ignore and try next candidate
    }
  }

  return candidates[0] ?? DEFAULT_BASE_FALLBACK;
};

const getBaseUrl = async (): Promise<string> => {
  if (resolvedBaseUrl) {
    return resolvedBaseUrl;
  }

  if (!resolvingBaseUrlPromise) {
    resolvingBaseUrlPromise = resolveBaseUrl()
      .then((url) => {
        resolvedBaseUrl = url;
        return url;
      })
      .finally(() => {
        resolvingBaseUrlPromise = null;
      });
  }

  return resolvingBaseUrlPromise;
};

/**
 * Helper function to make API requests
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${API_PREFIX}${endpoint}`;
  
  const headers = await apiAuthContext.getAuthHeaders({
    "Content-Type": "application/json",
    ...options.headers,
  });

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Upload file helper
 */
async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${API_PREFIX}${endpoint}`;
  
  const formData = new FormData();
  formData.append("file", file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers = await apiAuthContext.getAuthHeaders(options.headers);
  // Remove Content-Type to let browser set it with boundary for FormData
  if (headers && 'Content-Type' in headers) {
    // @ts-ignore
    delete headers['Content-Type'];
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorMessage = `Upload failed with status ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

/**
 * RAG API Client
 */
export const ragApi = {
  // Health Check
  async healthCheck(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  async readinessCheck(): Promise<ReadinessResponse> {
    return request<ReadinessResponse>("/ready");
  },

  // Workspace Management
  async createWorkspace(data: WorkspaceCreate): Promise<WorkspaceResponse> {
    return request<WorkspaceResponse>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getWorkspace(workspaceId: string): Promise<WorkspaceResponse> {
    return request<WorkspaceResponse>(`/workspaces/${workspaceId}`);
  },

  async listWorkspaces(ownerId?: string): Promise<WorkspaceResponse[]> {
    const query = ownerId ? `?owner_id=${encodeURIComponent(ownerId)}` : "";
    return request<WorkspaceResponse[]>(`/workspaces${query}`);
  },

  async updateWorkspace(
    workspaceId: string,
    data: WorkspaceUpdate
  ): Promise<WorkspaceResponse> {
    return request<WorkspaceResponse>(`/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    return request<void>(`/workspaces/${workspaceId}`, {
      method: "DELETE",
    });
  },

  // Document Management
  async uploadDocument(
    workspaceId: string,
    file: File,
    title?: string
  ): Promise<IngestResponse> {
    const additionalData: Record<string, string> = {};
    if (title) {
      additionalData.title = title;
    }
    return uploadFile<IngestResponse>(
      `/workspaces/${workspaceId}/documents/upload`,
      file,
      additionalData
    );
  },

  async listDocuments(
    workspaceId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<DocumentListResponse> {
    return request<DocumentListResponse>(
      `/workspaces/${workspaceId}/documents?page=${page}&page_size=${pageSize}`
    );
  },

  async getDocument(
    workspaceId: string,
    documentId: string
  ): Promise<DocumentResponse> {
    return request<DocumentResponse>(
      `/workspaces/${workspaceId}/documents/${documentId}`
    );
  },

  async deleteDocument(
    workspaceId: string,
    documentId: string
  ): Promise<void> {
    return request<void>(
      `/workspaces/${workspaceId}/documents/${documentId}`,
      {
        method: "DELETE",
      }
    );
  },

  async getDocumentStats(workspaceId: string): Promise<DocumentStats> {
    return request<DocumentStats>(
      `/workspaces/${workspaceId}/documents/stats`
    );
  },

  // Query/RAG
  async queryDocuments(
    workspaceId: string,
    requestData: QueryRequest
  ): Promise<QueryResponse> {
    return request<QueryResponse>(
      `/workspaces/${workspaceId}/query`,
      {
        method: "POST",
        body: JSON.stringify(requestData),
      }
    );
  },

  // Session Management
  async createSession(data?: SessionCreate): Promise<SessionResponse> {
    return request<SessionResponse>("/sessions", {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  async getConversationHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<ConversationHistory> {
    return request<ConversationHistory>(
      `/sessions/${sessionId}/history?limit=${limit}`
    );
  },

  async deleteSession(sessionId: string): Promise<void> {
    return request<void>(`/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },
};

