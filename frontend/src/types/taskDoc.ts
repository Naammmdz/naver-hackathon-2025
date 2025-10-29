import { z } from "zod";

export type TaskDocRelationType = "reference" | "reflection" | "resource";

export const TASK_DOC_RELATION_TYPES = ["reference", "reflection", "resource"] as const;

export const taskDocSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  docId: z.string(),
  relationType: z.enum(TASK_DOC_RELATION_TYPES),
  createdAt: z.date(),
  note: z.string().optional(),
  createdBy: z.string().optional(),
  userId: z.string(),
});

export type TaskDoc = z.infer<typeof taskDocSchema>;

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
