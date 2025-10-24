import { CreateTaskDocInput, TaskDoc, TaskDocRelationType } from "@/types/taskDoc";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface TaskDocState {
  // State
  taskDocs: TaskDoc[];
  
  // Actions
  addTaskDoc: (input: CreateTaskDocInput) => void;
  removeTaskDoc: (id: string) => void;
  removeTaskDocsByTask: (taskId: string) => void;
  removeTaskDocsByDoc: (docId: string) => void;
  
  // Getters
  getTaskDocsByTask: (taskId: string) => TaskDoc[];
  getTaskDocsByDoc: (docId: string) => TaskDoc[];
  getTaskDocsByRelationType: (taskId: string, relationType: TaskDocRelationType) => TaskDoc[];
  getDocsLinkedToTask: (taskId: string) => string[]; // Returns array of docIds
  getTasksLinkedToDoc: (docId: string) => string[]; // Returns array of taskIds
  
  // Check if relation exists
  hasRelation: (taskId: string, docId: string) => boolean;
  getRelation: (taskId: string, docId: string) => TaskDoc | undefined;
  
  // Update relation
  updateTaskDocNote: (id: string, note: string) => void;
  updateTaskDocRelationType: (id: string, relationType: TaskDocRelationType) => void;
  
  // Bulk operations
  linkMultipleDocsToTask: (taskId: string, docIds: string[], relationType: TaskDocRelationType, createdBy?: string) => void;
  
  // Data management
  resetStore: () => void;
  exportTaskDocs: () => TaskDoc[];
  importTaskDocs: (taskDocs: TaskDoc[]) => void;
}

export const useTaskDocStore = create<TaskDocState>()(
  persist(
    (set, get) => ({
      // Initial state
      taskDocs: [],
      
      // Add a new task-doc relation
      addTaskDoc: (input) => {
        const now = new Date();
        const newTaskDoc: TaskDoc = {
          ...input,
          id: nanoid(),
          createdAt: now,
        };
        
        // Check if relation already exists
        const existing = get().getRelation(input.taskId, input.docId);
        if (existing) {
          console.warn('Relation already exists between task and doc');
          return;
        }
        
        set((state) => ({
          taskDocs: [...state.taskDocs, newTaskDoc],
        }));
      },
      
      // Remove a task-doc relation by id
      removeTaskDoc: (id) => {
        set((state) => ({
          taskDocs: state.taskDocs.filter((td) => td.id !== id),
        }));
      },
      
      // Remove all relations for a specific task
      removeTaskDocsByTask: (taskId) => {
        set((state) => ({
          taskDocs: state.taskDocs.filter((td) => td.taskId !== taskId),
        }));
      },
      
      // Remove all relations for a specific document
      removeTaskDocsByDoc: (docId) => {
        set((state) => ({
          taskDocs: state.taskDocs.filter((td) => td.docId !== docId),
        }));
      },
      
      // Get all task-doc relations for a specific task
      getTaskDocsByTask: (taskId) => {
        return get().taskDocs.filter((td) => td.taskId === taskId);
      },
      
      // Get all task-doc relations for a specific document
      getTaskDocsByDoc: (docId) => {
        return get().taskDocs.filter((td) => td.docId === docId);
      },
      
      // Get task-doc relations by relation type
      getTaskDocsByRelationType: (taskId, relationType) => {
        return get().taskDocs.filter(
          (td) => td.taskId === taskId && td.relationType === relationType
        );
      },
      
      // Get all document IDs linked to a task
      getDocsLinkedToTask: (taskId) => {
        return get().taskDocs
          .filter((td) => td.taskId === taskId)
          .map((td) => td.docId);
      },
      
      // Get all task IDs linked to a document
      getTasksLinkedToDoc: (docId) => {
        return get().taskDocs
          .filter((td) => td.docId === docId)
          .map((td) => td.taskId);
      },
      
      // Check if a relation exists between task and doc
      hasRelation: (taskId, docId) => {
        return get().taskDocs.some(
          (td) => td.taskId === taskId && td.docId === docId
        );
      },
      
      // Get specific relation between task and doc
      getRelation: (taskId, docId) => {
        return get().taskDocs.find(
          (td) => td.taskId === taskId && td.docId === docId
        );
      },
      
      // Update note for a task-doc relation
      updateTaskDocNote: (id, note) => {
        set((state) => ({
          taskDocs: state.taskDocs.map((td) =>
            td.id === id ? { ...td, note } : td
          ),
        }));
      },
      
      // Update relation type
      updateTaskDocRelationType: (id, relationType) => {
        set((state) => ({
          taskDocs: state.taskDocs.map((td) =>
            td.id === id ? { ...td, relationType } : td
          ),
        }));
      },
      
      // Link multiple documents to a task at once
      linkMultipleDocsToTask: (taskId, docIds, relationType, createdBy = 'user') => {
        const now = new Date();
        const newTaskDocs: TaskDoc[] = docIds
          .filter((docId) => !get().hasRelation(taskId, docId))
          .map((docId) => ({
            id: nanoid(),
            taskId,
            docId,
            relationType,
            createdAt: now,
            createdBy,
          }));
        
        if (newTaskDocs.length > 0) {
          set((state) => ({
            taskDocs: [...state.taskDocs, ...newTaskDocs],
          }));
        }
      },
      
      // Reset store
      resetStore: () => {
        set({ taskDocs: [] });
      },
      
      // Export task-docs
      exportTaskDocs: () => {
        return get().taskDocs;
      },
      
      // Import task-docs
      importTaskDocs: (taskDocs) => {
        set({ taskDocs });
      },
    }),
    {
      name: "taskdoc-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
