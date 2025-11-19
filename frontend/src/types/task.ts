import { z } from "zod";

// Task status enum (UI-friendly labels)
export type TaskStatus = "Todo" | "In Progress" | "Done";

// Task priority enum  
export type TaskPriority = "Low" | "Medium" | "High";

// Subtask schema
export const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Subtask title is required"),
  done: z.boolean().default(false),
});

export type Subtask = z.infer<typeof subtaskSchema>;

// Task schema with validation
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Task title is required").max(200, "Title too long"),
  description: z.string().optional(),
  status: z.enum(["Todo", "In Progress", "Done"]).default("Todo"),
  priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  subtasks: z.array(subtaskSchema).default([]),
  order: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
  workspaceId: z.string().optional(), // Add workspace support
  assigneeId: z.string().optional(), // Add assignee support
});

export type Task = z.infer<typeof taskSchema>;

// Create task input (without id, timestamps)
export const createTaskSchema = taskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// Update task input (partial, except id)
export const updateTaskSchema = taskSchema.partial().required({ id: true });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Filter options
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  dueDateFilter?: "overdue" | "today" | "thisWeek" | "all";
  search?: string;
}

// Sort options
export type TaskSortBy = "dueDate" | "priority" | "createdAt" | "title";
export type SortOrder = "asc" | "desc";

export interface TaskSort {
  sortBy: TaskSortBy;
  order: SortOrder;
}

// Drag and drop types
export interface DragEndEvent {
  active: { id: string };
  over: { id: string } | null;
}

// Bulk action types
export type BulkAction = "delete" | "moveToTodo" | "moveToProgress" | "moveToDone" | "addTag";

export interface BulkActionPayload {
  action: BulkAction;
  taskIds: string[];
  tag?: string; // for addTag action
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  Todo: "Todo",
  "In Progress": "In Progress",
  Done: "Done",
};

export const TASK_STATUS_LIST: TaskStatus[] = ["Todo", "In Progress", "Done"];
