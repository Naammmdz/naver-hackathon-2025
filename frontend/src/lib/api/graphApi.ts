import { apiAuthContext } from "./authContext";

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

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
  
  const response = await fetch(
    `${AI_SERVICE_URL}/api/v1/graph?workspace_id=${workspaceId}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch graph data: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch demo graph data (for testing without database)
 */
export async function fetchDemoGraphData(): Promise<GraphData> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/graph/demo`, {
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

