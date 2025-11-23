/**
 * Memory API Client
 * 
 * API client for conversation history and long-term memory (facts)
 */

// AI Service base URL
// If VITE_AI_SERVICE_BASE_URL is set and not empty, use it
// Otherwise, use relative URL in production (via nginx proxy) or localhost in dev
const AI_SERVICE_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_BASE_URL && import.meta.env.VITE_AI_SERVICE_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_AI_SERVICE_BASE_URL.replace(/\/$/, "")
    : import.meta.env.PROD
    ? ""
    : "http://localhost:8000"

const API_PREFIX = "/ai-api/api/v1"

/**
 * Helper function to make API requests
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${AI_SERVICE_BASE_URL}${API_PREFIX}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(
      `API Error (${response.status}): ${errorText || response.statusText}`
    )
  }

  return response.json()
}

// Types
export interface ConversationMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  confidence?: number
}

export interface ConversationHistory {
  session_id: string
  messages: ConversationMessage[]
  total_messages: number
}

export interface LongTermMemory {
  memory_id: string
  knowledge_type: string
  key: string
  value: string
  source: string
  confidence_score: number
  access_count: number
  last_accessed_at?: string
  created_at: string
  metadata?: Record<string, unknown>
}

export interface MemoryListResponse {
  workspace_id: string
  memories: LongTermMemory[]
  total_count: number
  page: number
  page_size: number
}

export interface SessionInfo {
  session_id: string
  user_id: string
  created_at: string
  message_count?: number
  last_message_at?: string
}

export const memoryApi = {
  /**
   * Get conversation history for a session
   */
  getConversationHistory: async (
    sessionId: string,
    limit: number = 50
  ): Promise<ConversationHistory> => {
    const queryParams = new URLSearchParams({ limit: limit.toString() })
    return request<ConversationHistory>(
      `/sessions/${sessionId}/history?${queryParams}`
    )
  },

  /**
   * Get long-term memories (facts) for a workspace
   */
  getLongTermMemories: async (
    workspaceId: string,
    page: number = 1,
    pageSize: number = 20,
    knowledgeType?: string
  ): Promise<MemoryListResponse> => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    })
    if (knowledgeType) {
      queryParams.append("knowledge_type", knowledgeType)
    }
    return request<MemoryListResponse>(
      `/workspaces/${workspaceId}/memories?${queryParams}`
    )
  },

  /**
   * Search long-term memories by keyword
   */
  searchMemories: async (
    workspaceId: string,
    query: string,
    limit: number = 10
  ): Promise<LongTermMemory[]> => {
    return request<LongTermMemory[]>(
      `/workspaces/${workspaceId}/memories/search`,
      {
        method: "POST",
        body: JSON.stringify({ query, limit }),
      }
    )
  },

  /**
   * Delete a conversation session
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await request(`/sessions/${sessionId}`, {
      method: "DELETE",
    })
  },

  /**
   * Create a new session
   */
  createSession: async (userId: string, sessionName?: string): Promise<SessionInfo> => {
    return request<SessionInfo>("/sessions", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, session_name: sessionName }),
    })
  },
}
