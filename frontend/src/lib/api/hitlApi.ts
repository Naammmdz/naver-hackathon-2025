/**
 * HITL (Human-in-the-Loop) API Client
 * 
 * API client for HITL confirmation and feedback endpoints
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

export interface ActionOption {
  action_key: string
  label: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  reversible: boolean
}

export interface ConfirmationRequest {
  request_id: string
  action_type: string
  severity: "low" | "medium" | "high" | "critical"
  description: string
  estimated_impact: string
  options: ActionOption[]
  created_at: string
  expires_at: string
  time_remaining_seconds: number
}

export interface PendingRequestsResponse {
  workspace_id: string
  user_id: string
  pending_count: number
  requests: ConfirmationRequest[]
}

export interface SubmitResponseRequest {
  request_id: string
  selected_option: string
  user_comment?: string
  modified_params?: Record<string, unknown>
}

export interface SubmitResponseResponse {
  request_id: string
  status: string
  message: string
  execution_result?: Record<string, unknown>
}

export interface SubmitFeedbackRequest {
  workspace_id: string
  user_id: string
  request_id?: string
  agent_name: string
  action_type: string
  rating: number // 1-5
  sentiment: "positive" | "negative" | "neutral"
  comment?: string
  action_data?: Record<string, unknown>
}

export interface SubmitFeedbackResponse {
  feedback_id: number
  message: string
}

export interface HITLHistoryItem {
  request_id: string
  agent_name?: string
  action_type: string
  severity: string
  description: string
  status: string
  selected_option?: string
  rating?: number
  sentiment?: string
  comment?: string
  created_at: string
  processed_at?: string
}

export interface HITLHistoryResponse {
  workspace_id: string
  total_count: number
  items: HITLHistoryItem[]
  page: number
  page_size: number
}

export const hitlApi = {
  /**
   * Get pending confirmation requests for a user
   */
  getPendingRequests: async (
    workspaceId: string,
    userId: string
  ): Promise<PendingRequestsResponse> => {
    return request<PendingRequestsResponse>(
      `/hitl/pending/${workspaceId}/${userId}`
    )
  },

  /**
   * Submit user response to a confirmation request
   */
  submitResponse: async (
    requestData: SubmitResponseRequest
  ): Promise<SubmitResponseResponse> => {
    return request<SubmitResponseResponse>("/hitl/respond", {
      method: "POST",
      body: JSON.stringify(requestData),
    })
  },

  /**
   * Submit feedback on an executed action
   */
  submitFeedback: async (
    requestData: SubmitFeedbackRequest
  ): Promise<SubmitFeedbackResponse> => {
    return request<SubmitFeedbackResponse>("/hitl/feedback", {
      method: "POST",
      body: JSON.stringify(requestData),
    })
  },

  /**
   * Get HITL history for a workspace
   */
  getHistory: async (
    workspaceId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<HITLHistoryResponse> => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    })
    return request<HITLHistoryResponse>(
      `/hitl/history/${workspaceId}?${queryParams}`
    )
  },
}
