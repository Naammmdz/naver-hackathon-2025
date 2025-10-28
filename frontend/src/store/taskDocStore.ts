import { taskDocApi } from "@/lib/api/taskDocApi";
import {
  CreateTaskDocInput,
  TaskDoc,
  TaskDocRelationType,
} from "@/types/taskDoc";
import { create } from "zustand";

type TaskDocState = {
  taskDocs: TaskDoc[];
  isLoading: boolean;
  error: string | null;

  loadTaskDocs: () => Promise<void>;
  addTaskDoc: (input: CreateTaskDocInput) => Promise<TaskDoc | undefined>;
  removeTaskDoc: (id: string) => Promise<void>;
  removeTaskDocsByTask: (taskId: string) => Promise<void>;
  removeTaskDocsByDoc: (docId: string) => Promise<void>;
  updateTaskDocNote: (id: string, note: string) => Promise<void>;
  updateTaskDocRelationType: (id: string, relationType: TaskDocRelationType) => Promise<void>;
  linkMultipleDocsToTask: (
    taskId: string,
    docIds: string[],
    relationType: TaskDocRelationType,
    createdBy?: string,
  ) => Promise<void>;

  getTaskDocsByTask: (taskId: string) => TaskDoc[];
  getTaskDocsByDoc: (docId: string) => TaskDoc[];
  getTaskDocsByRelationType: (taskId: string, relationType: TaskDocRelationType) => TaskDoc[];
  getDocsLinkedToTask: (taskId: string) => string[];
  getTasksLinkedToDoc: (docId: string) => string[];
  hasRelation: (taskId: string, docId: string) => boolean;
  getRelation: (taskId: string, docId: string) => TaskDoc | undefined;

  resetStore: () => void;
  exportTaskDocs: () => TaskDoc[];
  importTaskDocs: (taskDocs: TaskDoc[]) => void;
};

const sortByCreatedAt = (taskDocs: TaskDoc[]) =>
  [...taskDocs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

export const useTaskDocStore = create<TaskDocState>((set, get) => {
  const upsertTaskDoc = (taskDoc: TaskDoc) => {
    set((state) => ({
      taskDocs: sortByCreatedAt(
        state.taskDocs.some((td) => td.id === taskDoc.id)
          ? state.taskDocs.map((td) => (td.id === taskDoc.id ? taskDoc : td))
          : [...state.taskDocs, taskDoc],
      ),
    }));
  };

  const removeTaskDocs = (predicate: (taskDoc: TaskDoc) => boolean) => {
    set((state) => ({
      taskDocs: state.taskDocs.filter(predicate),
    }));
  };

  return {
    taskDocs: [],
    isLoading: false,
    error: null,

    loadTaskDocs: async () => {
      set({ isLoading: true, error: null });
      try {
        const taskDocs = await taskDocApi.list();
        set({ taskDocs: sortByCreatedAt(taskDocs), isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
          isLoading: false,
        });
      }
    },

    addTaskDoc: async (input) => {
      try {
        if (get().hasRelation(input.taskId, input.docId)) {
          return get().getRelation(input.taskId, input.docId);
        }

        const created = await taskDocApi.create(input);
        upsertTaskDoc(created);
        return created;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    removeTaskDoc: async (id) => {
      try {
        await taskDocApi.delete(id);
        removeTaskDocs((taskDoc) => taskDoc.id !== id);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    removeTaskDocsByTask: async (taskId) => {
      try {
        await taskDocApi.deleteByTask(taskId);
        removeTaskDocs((taskDoc) => taskDoc.taskId !== taskId);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    removeTaskDocsByDoc: async (docId) => {
      try {
        await taskDocApi.deleteByDoc(docId);
        removeTaskDocs((taskDoc) => taskDoc.docId !== docId);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    updateTaskDocNote: async (id, note) => {
      const existing = get().taskDocs.find((taskDoc) => taskDoc.id === id);
      if (!existing) {
        return;
      }

      try {
        const updated = await taskDocApi.update(id, {
          relationType: existing.relationType,
          note,
          createdBy: existing.createdBy ?? null,
        });
        upsertTaskDoc(updated);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    updateTaskDocRelationType: async (id, relationType) => {
      const existing = get().taskDocs.find((taskDoc) => taskDoc.id === id);
      if (!existing) {
        return;
      }

      try {
        const updated = await taskDocApi.update(id, {
          relationType,
          note: existing.note ?? null,
          createdBy: existing.createdBy ?? null,
        });
        upsertTaskDoc(updated);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    linkMultipleDocsToTask: async (taskId, docIds, relationType, createdBy = "user") => {
      const newDocIds = docIds.filter((docId) => !get().hasRelation(taskId, docId));
      if (newDocIds.length === 0) {
        return;
      }

      try {
        const created = await Promise.all(
          newDocIds.map((docId) =>
            taskDocApi.create({
              taskId,
              docId,
              relationType,
              createdBy,
            }),
          ),
        );
        set((state) => ({
          taskDocs: sortByCreatedAt([...state.taskDocs, ...created]),
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    getTaskDocsByTask: (taskId) =>
      get()
        .taskDocs.filter((taskDoc) => taskDoc.taskId === taskId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),

    getTaskDocsByDoc: (docId) =>
      get()
        .taskDocs.filter((taskDoc) => taskDoc.docId === docId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),

    getTaskDocsByRelationType: (taskId, relationType) =>
      get()
        .taskDocs.filter(
          (taskDoc) => taskDoc.taskId === taskId && taskDoc.relationType === relationType,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),

    getDocsLinkedToTask: (taskId) =>
      get()
        .taskDocs.filter((taskDoc) => taskDoc.taskId === taskId)
        .map((taskDoc) => taskDoc.docId),

    getTasksLinkedToDoc: (docId) =>
      get()
        .taskDocs.filter((taskDoc) => taskDoc.docId === docId)
        .map((taskDoc) => taskDoc.taskId),

    hasRelation: (taskId, docId) =>
      get().taskDocs.some((taskDoc) => taskDoc.taskId === taskId && taskDoc.docId === docId),

    getRelation: (taskId, docId) =>
      get().taskDocs.find((taskDoc) => taskDoc.taskId === taskId && taskDoc.docId === docId),

    resetStore: () => {
      set({ taskDocs: [], error: null, isLoading: false });
    },

    exportTaskDocs: () => get().taskDocs,

    importTaskDocs: (taskDocs) => {
      set({ taskDocs: sortByCreatedAt(taskDocs), error: null });
    },
  };
});

if (typeof window !== "undefined") {
  void useTaskDocStore.getState().loadTaskDocs();
}
