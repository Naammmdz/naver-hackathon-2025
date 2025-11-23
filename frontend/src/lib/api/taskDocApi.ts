import type {
  CreateTaskDocInput,
  TaskDoc,
  TaskDocRelationType,
} from "@/types/taskDoc";
import { apiAuthContext } from "./authContext";

// Use relative URL in production (when VITE_API_BASE_URL is empty or not set)
// Use localhost in development
// If VITE_API_BASE_URL is set to empty string or undefined, use relative URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== ""
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")
    : import.meta.env.PROD
    ? ""
    : "http://localhost:8989";

interface TaskDocApiResponse {
  id: string;
  taskId: string;
  docId: string;
  relationType: TaskDocRelationType;
  createdAt: string;
  note?: string | null;
  createdBy?: string | null;
  userId?: string | null;
}

interface TaskDocUpdateRequest {
  relationType: TaskDocRelationType;
  note?: string | null;
  createdBy?: string | null;
  userId?: string | null;
}

const toDate = (value: string): Date => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const mapTaskDocFromApi = (taskDoc: TaskDocApiResponse): TaskDoc => ({
  id: taskDoc.id,
  taskId: taskDoc.taskId,
  docId: taskDoc.docId,
  relationType: taskDoc.relationType,
  createdAt: toDate(taskDoc.createdAt),
  note: taskDoc.note ?? undefined,
  createdBy: taskDoc.createdBy ?? undefined,
  userId: taskDoc.userId ?? apiAuthContext.getCurrentUserId() ?? "",
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

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const taskDocApi = {
  async list(): Promise<TaskDoc[]> {
    const data = await request<TaskDocApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs`),
    );
    return data.map(mapTaskDocFromApi);
  },

  async listByTask(taskId: string): Promise<TaskDoc[]> {
    const data = await request<TaskDocApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs/task/${taskId}`),
    );
    return data.map(mapTaskDocFromApi);
  },

  async listByDoc(docId: string): Promise<TaskDoc[]> {
    const data = await request<TaskDocApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs/document/${docId}`),
    );
    return data.map(mapTaskDocFromApi);
  },

  async create(payload: CreateTaskDocInput): Promise<TaskDoc> {
    const data = await request<TaskDocApiResponse>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs`),
      {
        method: "POST",
        body: JSON.stringify({
          taskId: payload.taskId,
          docId: payload.docId,
          relationType: payload.relationType,
          note: payload.note ?? null,
          createdBy: payload.createdBy ?? null,
          userId: payload.userId ?? apiAuthContext.getCurrentUserId() ?? null,
        }),
      },
    );
    return mapTaskDocFromApi(data);
  },

  async update(
    id: string,
    payload: TaskDocUpdateRequest,
  ): Promise<TaskDoc> {
    const data = await request<TaskDocApiResponse>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs/${id}`),
      {
        method: "PUT",
        body: JSON.stringify({
          relationType: payload.relationType,
          note: payload.note ?? null,
          createdBy: payload.createdBy ?? null,
          userId: payload.userId ?? apiAuthContext.getCurrentUserId() ?? null,
        }),
      },
    );
    return mapTaskDocFromApi(data);
  },

  async delete(id: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs/${id}`),
      { method: "DELETE" },
      false,
    );
  },

  async deleteByTask(taskId: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs/task/${taskId}`),
      { method: "DELETE" },
      false,
    );
  },

  async deleteByDoc(docId: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/task-docs/document/${docId}`),
      { method: "DELETE" },
      false,
    );
  },
};
