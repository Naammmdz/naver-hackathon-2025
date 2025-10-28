import type {
  CreateTaskDocInput,
  TaskDoc,
  TaskDocRelationType,
} from "@/types/taskDoc";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8989";

interface TaskDocApiResponse {
  id: string;
  taskId: string;
  docId: string;
  relationType: TaskDocRelationType;
  createdAt: string;
  note?: string | null;
  createdBy?: string | null;
}

interface TaskDocUpdateRequest {
  relationType: TaskDocRelationType;
  note?: string | null;
  createdBy?: string | null;
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
});

const request = async <T>(
  input: RequestInfo,
  init?: RequestInit,
  parseJson = true,
): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
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
    const data = await request<TaskDocApiResponse[]>(`${API_BASE_URL}/api/task-docs`);
    return data.map(mapTaskDocFromApi);
  },

  async listByTask(taskId: string): Promise<TaskDoc[]> {
    const data = await request<TaskDocApiResponse[]>(
      `${API_BASE_URL}/api/task-docs/task/${taskId}`,
    );
    return data.map(mapTaskDocFromApi);
  },

  async listByDoc(docId: string): Promise<TaskDoc[]> {
    const data = await request<TaskDocApiResponse[]>(
      `${API_BASE_URL}/api/task-docs/document/${docId}`,
    );
    return data.map(mapTaskDocFromApi);
  },

  async create(payload: CreateTaskDocInput): Promise<TaskDoc> {
    const data = await request<TaskDocApiResponse>(`${API_BASE_URL}/api/task-docs`, {
      method: "POST",
      body: JSON.stringify({
        taskId: payload.taskId,
        docId: payload.docId,
        relationType: payload.relationType,
        note: payload.note ?? null,
        createdBy: payload.createdBy ?? null,
      }),
    });
    return mapTaskDocFromApi(data);
  },

  async update(
    id: string,
    payload: TaskDocUpdateRequest,
  ): Promise<TaskDoc> {
    const data = await request<TaskDocApiResponse>(`${API_BASE_URL}/api/task-docs/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        relationType: payload.relationType,
        note: payload.note ?? null,
        createdBy: payload.createdBy ?? null,
      }),
    });
    return mapTaskDocFromApi(data);
  },

  async delete(id: string): Promise<void> {
    await request(`${API_BASE_URL}/api/task-docs/${id}`, { method: "DELETE" }, false);
  },

  async deleteByTask(taskId: string): Promise<void> {
    await request(`${API_BASE_URL}/api/task-docs/task/${taskId}`, { method: "DELETE" }, false);
  },

  async deleteByDoc(docId: string): Promise<void> {
    await request(`${API_BASE_URL}/api/task-docs/document/${docId}`, { method: "DELETE" }, false);
  },
};
