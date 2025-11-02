import { taskApi } from "@/lib/api/taskApi";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  BulkActionPayload,
  CreateTaskInput,
  Task,
  TaskFilters,
  TaskSort,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/task";
import { create } from "zustand";

interface TaskState {
  tasks: Task[];
  selectedTaskIds: string[];
  filters: TaskFilters;
  sort: TaskSort;
  sidebarCollapsed: boolean;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;

  loadTasks: () => Promise<void>;
  addTask: (input: Omit<CreateTaskInput, "userId">) => Promise<Task | undefined>;
  updateTask: (input: UpdateTaskInput) => Promise<Task | undefined>;
  deleteTask: (id: string) => Promise<void>;
  deleteTasks: (ids: string[]) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
  moveTasks: (ids: string[], status: TaskStatus) => Promise<void>;
  reorderTasks: (sourceIndex: number, destinationIndex: number, status: TaskStatus) => Promise<void>;

  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (
    taskId: string,
    subtaskId: string,
    updates: Partial<{ title: string; done: boolean }>
  ) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  toggleTaskSelection: (id: string) => void;
  selectAllTasks: (taskIds: string[]) => void;
  clearSelection: () => void;
  executeBulkAction: (payload: BulkActionPayload) => Promise<void>;

  setFilters: (filters: Partial<TaskFilters>) => void;
  setSort: (sort: TaskSort) => void;
  clearFilters: () => void;

  toggleSidebar: () => void;
  importTasks: (tasks: Task[]) => void;
  exportTasks: () => Task[];
  resetStore: () => Promise<void>;

  getTasksByStatus: (status: TaskStatus) => Task[];
  getFilteredTasks: () => Task[];
  getFilteredTasksByStatus: (status: TaskStatus) => Task[];
  getTasksCount: () => { total: number; todo: number; progress: number; done: number };
  getAllTags: () => string[];
  canMoveTaskToDone: (taskId: string) => boolean;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  setCurrentUser: (userId: string | null) => void;
}

const defaultFilters: TaskFilters = {
  status: undefined,
  priority: undefined,
  tags: undefined,
  dueDateFilter: "all",
  search: "",
};

const defaultSort: TaskSort = {
  sortBy: "createdAt",
  order: "desc",
};

export const useTaskStore = create<TaskState>((set, get) => {
  const setTasks = (tasks: Task[]) => {
    const userId = get().currentUserId;
    set({
      tasks: userId ? tasks.filter((task) => task.userId === userId) : [],
    });
  };

  const updateTaskInState = (updated: Task) => {
    set((state) => ({
      tasks: state.tasks.some((task) => task.id === updated.id)
        ? state.tasks.map((task) => (task.id === updated.id ? updated : task))
        : [...state.tasks, updated],
    }));
  };

  const removeTaskFromState = (id: string) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      selectedTaskIds: state.selectedTaskIds.filter((taskId) => taskId !== id),
    }));
  };

  const refreshTaskFromApi = async (id: string): Promise<Task> => {
    const refreshed = await taskApi.get(id);
    updateTaskInState(refreshed);
    return refreshed;
  };

  const getNextOrderIndex = (status: TaskStatus): number => {
    const columnTasks = get()
      .tasks.filter((task) => task.status === status)
      .map((task) => task.order ?? 0);
    if (columnTasks.length === 0) {
      return 0;
    }
    return Math.max(...columnTasks) + 1;
  };

  return {
    tasks: [],
    selectedTaskIds: [],
    filters: defaultFilters,
    sort: defaultSort,
    sidebarCollapsed: false,
    isLoading: false,
    error: null,
    currentUserId: null,

    loadTasks: async () => {
      const userId = get().currentUserId;
      if (!userId) {
        set({ tasks: [], isLoading: false });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const tasks = await taskApi.list();
        set({ tasks, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
          isLoading: false,
        });
      }
    },

    addTask: async (input) => {
      const userId = get().currentUserId;
      if (!userId) {
        set({ error: "Bạn cần đăng nhập để tạo công việc mới." });
        return undefined;
      }

      try {
        const order = getNextOrderIndex(input.status);
        const workspaceId = useWorkspaceStore.getState().activeWorkspaceId ?? undefined;
        const created = await taskApi.create({ ...input, order, userId, workspaceId });
        updateTaskInState(created);
        return created;
      } catch (error) {
        console.error('Error creating task:', error);
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    updateTask: async (input) => {
      try {
        const existing = get().tasks.find((task) => task.id === input.id);
        if (!existing) {
          return undefined;
        }
        const payload: UpdateTaskInput = {
          ...existing,
          ...input,
          order: existing.order,
          dueDate: input.dueDate ?? existing.dueDate,
          tags: input.tags ?? existing.tags,
          subtasks: input.subtasks ?? existing.subtasks,
        };
        const updated = await taskApi.update(payload);
        updateTaskInState(updated);
        return updated;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    deleteTask: async (id) => {
      try {
        await taskApi.delete(id);
        removeTaskFromState(id);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    deleteTasks: async (ids) => {
      try {
        await Promise.all(ids.map((id) => taskApi.delete(id)));
        set((state) => ({
          tasks: state.tasks.filter((task) => !ids.includes(task.id)),
          selectedTaskIds: state.selectedTaskIds.filter((taskId) => !ids.includes(taskId)),
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    moveTask: async (id, status) => {
      try {
        await taskApi.move(id, status);
        await refreshTaskFromApi(id);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    moveTasks: async (ids, status) => {
      try {
        await Promise.all(ids.map((id) => taskApi.move(id, status)));
        await get().loadTasks();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    reorderTasks: async (sourceIndex, destinationIndex, status) => {
      const filtered = get().getFilteredTasksByStatus(status);
      const sourceTask = filtered[sourceIndex];
      const targetTask = filtered[destinationIndex];

      if (!sourceTask || !targetTask) {
        return;
      }

      const columnTasks = get()
        .tasks.filter((task) => task.status === status)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const fromIndex = columnTasks.findIndex((task) => task.id === sourceTask.id);
      const toIndex = columnTasks.findIndex((task) => task.id === targetTask.id);

      if (fromIndex === -1 || toIndex === -1) {
        return;
      }

      const updatedColumn = [...columnTasks];
      const [movedTask] = updatedColumn.splice(fromIndex, 1);
      updatedColumn.splice(toIndex, 0, movedTask);

      const updatedColumnWithOrder = updatedColumn.map((task, index) => ({
        ...task,
        order: index,
        updatedAt: new Date(),
      }));

      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.status !== status) {
            return task;
          }
          const updated = updatedColumnWithOrder.find((columnTask) => columnTask.id === task.id);
          return updated ?? task;
        }),
      }));

      try {
        await taskApi.reorder(status, fromIndex, toIndex);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        await get().loadTasks();
      }
    },

    addSubtask: async (taskId, title) => {
      try {
        await taskApi.addSubtask(taskId, title);
        await refreshTaskFromApi(taskId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    updateSubtask: async (taskId, subtaskId, updates) => {
      try {
        await taskApi.updateSubtask(taskId, subtaskId, updates);
        await refreshTaskFromApi(taskId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    deleteSubtask: async (taskId, subtaskId) => {
      try {
        await taskApi.deleteSubtask(taskId, subtaskId);
        await refreshTaskFromApi(taskId);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    toggleTaskSelection: (id) => {
      set((state) => ({
        selectedTaskIds: state.selectedTaskIds.includes(id)
          ? state.selectedTaskIds.filter((taskId) => taskId !== id)
          : [...state.selectedTaskIds, id],
      }));
    },

    selectAllTasks: (taskIds) => {
      set({ selectedTaskIds: taskIds });
    },

    clearSelection: () => {
      set({ selectedTaskIds: [] });
    },

    executeBulkAction: async (payload) => {
      const { action, taskIds, tag } = payload;

      switch (action) {
        case "delete":
          await get().deleteTasks(taskIds);
          break;
        case "moveToTodo":
          await get().moveTasks(taskIds, "Todo");
          break;
        case "moveToProgress":
          await get().moveTasks(taskIds, "In Progress");
          break;
        case "moveToDone":
          await get().moveTasks(taskIds, "Done");
          break;
        case "addTag":
          if (tag) {
            await Promise.all(
              taskIds.map(async (taskId) => {
                const task = get().tasks.find((t) => t.id === taskId);
                if (!task) {
                  return;
                }
                const updatedTags = task.tags.includes(tag) ? task.tags : [...task.tags, tag];
                await get().updateTask({
                  id: task.id,
                  tags: updatedTags,
                } as UpdateTaskInput);
              })
            );
          }
          break;
      }

      get().clearSelection();
    },

    setFilters: (filters) => {
      set((state) => ({
        filters: { ...state.filters, ...filters },
      }));
    },

    setSort: (sort) => {
      set({ sort });
    },

    clearFilters: () => {
      set({ filters: defaultFilters });
    },

    toggleSidebar: () => {
      set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed,
      }));
    },

    importTasks: (tasks) => {
      setTasks(tasks);
      set({ selectedTaskIds: [] });
    },

    exportTasks: () => {
      return get().tasks;
    },

    resetStore: async () => {
      set({
        tasks: [],
        selectedTaskIds: [],
        filters: defaultFilters,
        sort: defaultSort,
        sidebarCollapsed: false,
        error: null,
        isLoading: false,
      });
      await get().loadTasks();
    },

    getTasksByStatus: (status) => {
      return get()
        .tasks.filter((task) => task.status === status)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },

    canMoveTaskToDone: (taskId) => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task) {
        return false;
      }
      return task.subtasks.every((subtask) => subtask.done);
    },

    getFilteredTasks: () => {
      const { tasks, filters, sort } = get();
      const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      
      let filtered = [...tasks];

      // Filter by workspace first
      if (activeWorkspaceId) {
        filtered = filtered.filter((task) => task.workspaceId === activeWorkspaceId);
      }

      if (filters.status && filters.status.length > 0) {
        filtered = filtered.filter((task) => filters.status!.includes(task.status));
      }

      if (filters.priority && filters.priority.length > 0) {
        filtered = filtered.filter((task) => filters.priority!.includes(task.priority));
      }

      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter((task) =>
          task.tags.some((tag) => filters.tags!.includes(tag))
        );
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (task) =>
            task.title.toLowerCase().includes(search) ||
            task.description?.toLowerCase().includes(search)
        );
      }

      if (filters.dueDateFilter && filters.dueDateFilter !== "all") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        filtered = filtered.filter((task) => {
          if (!task.dueDate) {
            return false;
          }
          const dueDate = new Date(task.dueDate);
          switch (filters.dueDateFilter) {
            case "overdue":
              return dueDate < today;
            case "today":
              return dueDate.toDateString() === today.toDateString();
            case "thisWeek":
              return dueDate >= today && dueDate <= nextWeek;
            default:
              return true;
          }
        });
      }

      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sort.sortBy) {
          case "dueDate": {
            if (!a.dueDate && !b.dueDate) {
              comparison = 0;
            } else if (!a.dueDate) {
              comparison = 1;
            } else if (!b.dueDate) {
              comparison = -1;
            } else {
              comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            break;
          }
          case "priority": {
            const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          }
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "createdAt":
          default:
            comparison =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        return sort.order === "asc" ? comparison : -comparison;
      });

      return filtered;
    },

    getFilteredTasksByStatus: (status) => {
      const filtered = get()
        .getFilteredTasks()
        .filter((task) => task.status === status);

      return filtered.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return (a.order ?? 0) - (b.order ?? 0);
        }
        if (a.order !== undefined) {
          return -1;
        }
        if (b.order !== undefined) {
          return 1;
        }
        const sort = get().sort;
        let comparison = 0;
        switch (sort.sortBy) {
          case "dueDate": {
            if (!a.dueDate && !b.dueDate) {
              comparison = 0;
            } else if (!a.dueDate) {
              comparison = 1;
            } else if (!b.dueDate) {
              comparison = -1;
            } else {
              comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            break;
          }
          case "priority": {
            const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          }
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "createdAt":
          default:
            comparison =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        return sort.order === "asc" ? comparison : -comparison;
      });
    },

    getTasksCount: () => {
      const tasks = get().tasks;
      return {
        total: tasks.length,
        todo: tasks.filter((task) => task.status === "Todo").length,
        progress: tasks.filter((task) => task.status === "In Progress").length,
        done: tasks.filter((task) => task.status === "Done").length,
      };
    },

    getAllTags: () => {
      const tags = new Set<string>();
      get().tasks.forEach((task) => {
        task.tags.forEach((tag) => tags.add(tag));
      });
      return Array.from(tags).sort();
    },

    setCurrentUser: (userId) => {
      set((state) => ({
        currentUserId: userId,
        tasks:
          userId && userId === state.currentUserId
            ? state.tasks
            : [],
        selectedTaskIds: [],
        error: null,
        isLoading: false,
      }));
    },

    updateTaskStatus: async (id, status) => {
      await get().moveTask(id, status);
    },
  };
});
