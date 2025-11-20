/**
 * Task Analysis API Client
 * Client for interacting with the AI Service Task Analysis API
 */

import { apiAuthContext } from "./authContext";

// AI Service base URL - can be configured via environment variable
// In development, use proxy path /ai-api to avoid CORS issues
// In production, use full URL or configure via VITE_AI_SERVICE_BASE_URL
const AI_SERVICE_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_BASE_URL?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "" : "http://localhost:8000");

const API_PREFIX = import.meta.env.DEV ? "/ai-api/api/v1" : "/api/v1";

export interface TaskAnalysisRequest {
  query: string;
  user_id?: string;
  session_id?: string;
}

export interface TaskAnalysisResponse {
  answer: string;
  confidence: number;
  generated_sql: string;
  row_count: number;
  query_time_ms: number;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface ExampleQueriesResponse {
  workspace_id: string;
  categories: Record<string, string[]>;
  total_examples: number;
  note: string;
}

/**
 * Helper function to make API requests
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${AI_SERVICE_BASE_URL}${API_PREFIX}${endpoint}`;
  
  // Get auth headers if needed (though AI service might handle auth differently, 
  // usually we pass the user ID or token)
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

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

  return response.json() as Promise<T>;
}

export const taskAnalysisApi = {
  /**
   * Analyze tasks using natural language
   */
  async analyzeTasks(
    workspaceId: string,
    data: TaskAnalysisRequest
  ): Promise<TaskAnalysisResponse> {
    // Ensure user_id is set if available from auth context
    if (!data.user_id) {
      const currentUserId = apiAuthContext.getCurrentUserId();
      if (currentUserId) {
        data.user_id = currentUserId;
      }
    }

    return request<TaskAnalysisResponse>(
      `/workspaces/${workspaceId}/tasks/analyze`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Get example queries for task analysis
   */
  async getExampleQueries(workspaceId: string): Promise<ExampleQueriesResponse> {
    return request<ExampleQueriesResponse>(
      `/workspaces/${workspaceId}/tasks/examples`
    );
  },
};
