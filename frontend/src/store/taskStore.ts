import { create } from "zustand";
import { Task, TaskStatus, CreateTaskInput, UpdateTaskInput, TaskFilters, TaskSort, BulkActionPayload } from "@/types/task";
import api from "@/lib/api-config";

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTaskIds: string[];
  filters: TaskFilters;
  sort: TaskSort;
  sidebarCollapsed: boolean;

  fetchTasks: () => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
  reorderTasks: (sourceIndex: number, destinationIndex: number, status: TaskStatus) => Promise<void>;
  
  // Subtask operations
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<{ title: string; done: boolean }>) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;

  // Selection
  toggleTaskSelection: (id: string) => void;
  selectAllTasks: (taskIds: string[]) => void;
  clearSelection: () => void;
  
  // Bulk actions
  executeBulkAction: (payload: BulkActionPayload) => void;

  // Filtering & sorting
  setFilters: (filters: Partial<TaskFilters>) => void;
  setSort: (sort: TaskSort) => void;
  clearFilters: () => void;
  
  // UI state
  toggleSidebar: () => void;

  getTasksByStatus: (status: TaskStatus) => Task[];
  getFilteredTasks: () => Task[];
  getFilteredTasksByStatus: (status: TaskStatus) => Task[];
  getTasksCount: () => { total: number; todo: number; progress: number; done: number };
  getAllTags: () => string[];
  updateTaskStatus: (id: string, status: TaskStatus) => void;
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

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  selectedTaskIds: [],
  filters: defaultFilters,
  sort: defaultSort,
  sidebarCollapsed: false,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get("/tasks");
      set({ tasks: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch tasks", loading: false });
    }
  },

  addTask: async (input) => {
    try {
      const response = await api.post("/tasks", input);
      set((state) => ({
        tasks: [...state.tasks, response.data],
      }));
    } catch (error) {
      console.error("Failed to add task", error);
    }
  },

  updateTask: async (input) => {
    try {
      const response = await api.put(`/tasks/${input.id}`, input);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === input.id ? response.data : task
        ),
      }));
    } catch (error) {
      console.error("Failed to update task", error);
    }
  },

  deleteTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  },

  moveTask: async (id, status) => {
    try {
      await api.patch(`/tasks/${id}/status`, { status });
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, status } : task
        ),
      }));
    } catch (error) {
      console.error("Failed to move task", error);
    }
  },

  reorderTasks: async (sourceIndex, destinationIndex, status) => {
    try {
      await api.patch("/tasks/reorder", {
        status,
        sourceIndex,
        destinationIndex,
      });
      // Optimistic update
      const { tasks } = get();
      const tasksInStatus = tasks.filter((task) => task.status === status);
      const [movedTask] = tasksInStatus.splice(sourceIndex, 1);
      tasksInStatus.splice(destinationIndex, 0, movedTask);
      const otherTasks = tasks.filter((task) => task.status !== status);
      set({ tasks: [...otherTasks, ...tasksInStatus] });
    } catch (error) {
      console.error("Failed to reorder tasks", error);
      // Revert on error if needed
    }
  },

  // Subtask operations (assuming backend handles these)
  addSubtask: (taskId, title) => {
    // This should ideally make an API call
    console.warn("addSubtask not implemented with API yet");
  },
  updateSubtask: (taskId, subtaskId, updates) => {
    // This should ideally make an API call
    console.warn("updateSubtask not implemented with API yet");
  },
  deleteSubtask: (taskId, subtaskId) => {
    // This should ideally make an API call
    console.warn("deleteSubtask not implemented with API yet");
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

  executeBulkAction: (payload) => {
    // This should ideally make an API call
    console.warn("executeBulkAction not implemented with API yet");
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
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

  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },

  getFilteredTasks: () => {
    const { tasks, filters, sort } = get();
    let filteredTasks = [...tasks];

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        filters.status!.includes(task.status)
      );
    }

    if (filters.priority && filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        filters.priority!.includes(task.priority)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        task.tags.some((tag) => filters.tags!.includes(tag))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTasks = filteredTasks.filter((task) =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply due date filter
    if (filters.dueDateFilter && filters.dueDateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      filteredTasks = filteredTasks.filter((task) => {
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        
        switch (filters.dueDateFilter) {
          case "overdue":
            return dueDate < today;
          case "today":
            return dueDate.toDateString() === today.toDateString();
          case "thisWeek":
            return dueDate >= today && dueDate <= weekFromNow;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      let comparison = 0;

      switch (sort.sortBy) {
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "priority": {
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        }
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sort.order === "asc" ? comparison : -comparison;
    });

    return filteredTasks;
  },

  getFilteredTasksByStatus: (status: TaskStatus) => {
    const filtered = get().getFilteredTasks().filter((task) => task.status === status);

    // If tasks have order field, sort by order first, then by regular sort
    return filtered.sort((a, b) => {
      // First check if both have order field
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // If only one has order, prioritize it
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      
      // Otherwise use regular sorting logic
      const sort = get().sort;
      let comparison = 0;

      switch (sort.sortBy) {
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "priority": {
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        }
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sort.order === "asc" ? comparison : -comparison;
    });
  },

  getTasksCount: () => {
    const tasks = get().tasks;
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "Todo").length,
      progress: tasks.filter((t) => t.status === "In Progress").length,
      done: tasks.filter((t) => t.status === "Done").length,
    };
  },

  getAllTags: () => {
    const tasks = get().tasks;
    const allTags = new Set<string>();

    tasks.forEach(task => {
      task.tags.forEach(tag => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  },

  updateTaskStatus: (id, status) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, status, updatedAt: new Date() }
          : task
      ),
    }));
  },
}));
