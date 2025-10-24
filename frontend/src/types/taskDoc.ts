import { z } from "zod";

// Task-Document relation types
export type TaskDocRelationType = "reference" | "reflection" | "resource";

// TaskDoc schema for linking tasks with documents
export const taskDocSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  docId: z.string(),
  relationType: z.enum(["reference", "reflection", "resource"]),
  createdAt: z.date(),
  // Optional metadata
  note: z.string().optional(), // Additional context about the relation
  createdBy: z.string().optional(), // 'user' or 'ai'
});

export type TaskDoc = z.infer<typeof taskDocSchema>;

// Create TaskDoc input
export const createTaskDocSchema = taskDocSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateTaskDocInput = z.infer<typeof createTaskDocSchema>;

// Relation type descriptions for UI
export const RELATION_TYPE_LABELS: Record<TaskDocRelationType, { label: string; description: string; icon: string }> = {
  reference: {
    label: "Reference",
    description: "Liên kết tự động hoặc tham chiếu chung",
    icon: "Link",
  },
  reflection: {
    label: "Reflection", 
    description: "Document này là ghi chú/suy ngẫm về task",
    icon: "FileText",
  },
  resource: {
    label: "Resource",
    description: "Document này là tài liệu/hướng dẫn cho task",
    icon: "BookOpen",
  },
};
