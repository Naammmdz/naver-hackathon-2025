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

// AI Service configuration
const API_PREFIX = "/api/v1";

// Determine AI service base URL
const getAiServiceBaseUrl = (): string => {
  // Priority 1: Environment variable (for custom deployments)
  // Only use if it's set and not empty
  const envBaseUrl = import.meta.env.VITE_AI_SERVICE_BASE_URL?.trim();
  if (envBaseUrl && envBaseUrl !== "") {
    return envBaseUrl.replace(/\/$/, "");
  }

  // Priority 2: Auto-detect based on current path
  // If we're under /app path (Traefik routing), use /app/ai-api
  // Otherwise use /ai-api (local dev or direct deployment)
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (pathname.startsWith("/app/") || pathname === "/app") {
      return "/app/ai-api";
    }
  }

  // Priority 3: Default to /ai-api (relative URL for nginx proxy)
  return "/ai-api";
};

const AI_SERVICE_BASE_URL = getAiServiceBaseUrl();

/**
 * Helper function to make API requests
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${AI_SERVICE_BASE_URL}${API_PREFIX}${endpoint}`;
  
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
  const url = `${AI_SERVICE_BASE_URL}${API_PREFIX}${endpoint}`;
  
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

