import { apiAuthContext } from "./authContext";

// AI Service base URL - use relative URL in production (via nginx proxy)
// If VITE_AI_SERVICE_BASE_URL is set and not empty, use it
// Otherwise, use relative URL in production (via nginx proxy) or localhost in dev
const AI_SERVICE_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_BASE_URL && import.meta.env.VITE_AI_SERVICE_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_AI_SERVICE_BASE_URL.replace(/\/$/, "")
    : import.meta.env.PROD
    ? ""
    : "http://localhost:8000";

const API_PREFIX = import.meta.env.DEV ? "/ai-api/api/v1" : "/ai-api/api/v1";

interface GraphNode {
  id: string;
  label: string;
  type: "project" | "folder" | "note" | "tag";
  folder?: string;
}

interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Fetch graph data for a workspace
 */
export async function fetchGraphData(workspaceId: string): Promise<GraphData> {
  const headers = await apiAuthContext.getAuthHeaders({
    "Content-Type": "application/json",
  });
  
  try {
  const response = await fetch(
    `${AI_SERVICE_BASE_URL}${API_PREFIX}/graph?workspace_id=${workspaceId}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch graph data: ${response.statusText}`);
  }

  return response.json();
  } catch (error) {
    console.warn("[graphApi] Failed to fetch workspace graph data", error);
    throw error;
  }
}

/**
 * Fetch demo graph data (for testing without database)
 */
export async function fetchDemoGraphData(): Promise<GraphData> {
  const response = await fetch(`${AI_SERVICE_BASE_URL}${API_PREFIX}/graph/demo`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch demo graph data: ${response.statusText}`);
  }

  return response.json();
}

