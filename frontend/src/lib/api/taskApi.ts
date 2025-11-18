import type { CreateTaskInput, Subtask, Task, TaskStatus, UpdateTaskInput } from "@/types/task";
import { apiAuthContext } from "./authContext";
import { reminderStorage } from "@/utils/reminderStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8989";

type TaskApiStatus = "Todo" | "In_Progress" | "Done";
type TaskApiPriority = "Low" | "Medium" | "High";

interface SubtaskApiResponse {
  id: string;
  title: string;
  done: boolean;
}

interface TaskApiResponse {
  id: string;
  title: string;
  description?: string | null;
  status: TaskApiStatus;
  priority: TaskApiPriority;
  dueDate?: string | null;
  tags?: string[] | null;
  subtasks?: SubtaskApiResponse[] | null;
  orderIndex?: number | null;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  workspaceId?: string | null;
}

interface TaskApiRequest {
  title: string;
  description?: string | null;
  status: TaskApiStatus;
  priority: TaskApiPriority;
  dueDate?: string | null;
  tags: string[];
  subtasks: Array<{ id?: string; title: string; done: boolean }>;
  orderIndex?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
}

const toDate = (value?: string | null): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const mapStatusFromApi = (status: TaskApiStatus): TaskStatus =>
  status === "In_Progress" ? "In Progress" : status;

const mapStatusToApi = (status: TaskStatus): TaskApiStatus =>
  status === "In Progress" ? "In_Progress" : (status as TaskApiStatus);

const mapSubtaskFromApi = (subtask: SubtaskApiResponse): Subtask => ({
  id: subtask.id,
  title: subtask.title,
  done: Boolean(subtask.done),
});

const mapTaskFromApi = (task: TaskApiResponse): Task => {
  // Load reminder settings from localStorage (since backend may not support it yet)
  const reminderSettings = reminderStorage.get(task.id);

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: mapStatusFromApi(task.status),
    priority: task.priority,
    dueDate: toDate(task.dueDate),
    tags: task.tags ?? [],
    subtasks: (task.subtasks ?? []).map(mapSubtaskFromApi),
    order: task.orderIndex ?? 0,
    createdAt: toDate(task.createdAt) ?? new Date(),
    updatedAt: toDate(task.updatedAt) ?? new Date(),
    userId: task.userId ?? apiAuthContext.getCurrentUserId() ?? "",
    workspaceId: task.workspaceId ?? undefined,
    reminderEnabled: reminderSettings?.enabled ?? false,
    reminderTimeBefore: reminderSettings?.timeBefore,
    reminderSent: reminderSettings?.sent ?? false,
  };
};

const serializeSubtasks = (subtasks: Subtask[]): Array<{ id?: string; title: string; done: boolean }> =>
  subtasks.map((subtask) => ({
    id: subtask.id,
    title: subtask.title,
    done: subtask.done,
  }));

const serializeTaskPayload = (
  payload: Partial<CreateTaskInput & UpdateTaskInput>,
): TaskApiRequest => ({
  title: payload.title ?? "",
  description: payload.description ?? "",
  status: mapStatusToApi((payload.status as TaskStatus) ?? "Todo"),
  priority: payload.priority ?? "Medium",
  dueDate: payload.dueDate ? payload.dueDate.toISOString() : null,
  tags: payload.tags ?? [],
  subtasks: payload.subtasks ? serializeSubtasks(payload.subtasks) : [],
  orderIndex: payload.order ?? null,
  createdAt: payload.createdAt ? payload.createdAt.toISOString() : undefined,
  updatedAt: payload.updatedAt ? payload.updatedAt.toISOString() : undefined,
  userId: payload.userId ?? apiAuthContext.getCurrentUserId() ?? undefined,
  workspaceId: payload.workspaceId ?? undefined,
});

const request = async <T>(input: RequestInfo, init?: RequestInit, parseJson = true): Promise<T> => {
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

export const taskApi = {
  async list(): Promise<Task[]> {
    const data = await request<TaskApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks`),
    );
    return data.map(mapTaskFromApi);
  },

  async listByWorkspace(workspaceId: string): Promise<Task[]> {
    const data = await request<TaskApiResponse[]>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/workspace/${workspaceId}`),
    );
    return data.map(mapTaskFromApi);
  },

  async get(id: string): Promise<Task> {
    const data = await request<TaskApiResponse>(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/${id}`),
    );
    return mapTaskFromApi(data);
  },

  async create(payload: CreateTaskInput): Promise<Task> {
    const body = serializeTaskPayload(payload);
    const data = await request<TaskApiResponse>(apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks`), {
      method: "POST",
      body: JSON.stringify(body),
    });
    return mapTaskFromApi(data);
  },

  async update(payload: UpdateTaskInput): Promise<Task> {
    const { id, ...rest } = payload;
    const body = serializeTaskPayload(rest);
    const data = await request<TaskApiResponse>(apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/${id}`), {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return mapTaskFromApi(data);
  },

  async delete(id: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/${id}`),
      { method: "DELETE" },
      false,
    );
  },

  async move(id: string, status: TaskStatus): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/${id}/status`),
      {
        method: "PATCH",
        body: JSON.stringify({ status: mapStatusToApi(status) }),
      },
      false,
    );
  },

  async reorder(status: TaskStatus, sourceIndex: number, destinationIndex: number): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/reorder`),
      {
        method: "PATCH",
        body: JSON.stringify({
          status: mapStatusToApi(status),
          sourceIndex,
          destinationIndex,
        }),
      },
      false,
    );
  },

  async addSubtask(taskId: string, title: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/${taskId}/subtasks`),
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
      false,
    );
  },

  async updateSubtask(taskId: string, subtaskId: string, updates: Partial<Pick<Subtask, "title" | "done">>): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`),
      {
        method: "PUT",
        body: JSON.stringify(updates),
      },
      false,
    );
  },

  async deleteSubtask(taskId: string, subtaskId: string): Promise<void> {
    await request(
      apiAuthContext.appendUserIdQuery(`${API_BASE_URL}/api/tasks/${taskId}/subtasks/${subtaskId}`),
      {
        method: "DELETE",
      },
      false,
    );
  },
};
