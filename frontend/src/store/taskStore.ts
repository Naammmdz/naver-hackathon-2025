import { BulkActionPayload, CreateTaskInput, Task, TaskFilters, TaskSort, TaskStatus, UpdateTaskInput } from "@/types/task";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface TaskState {
  // State
  tasks: Task[];
  selectedTaskIds: string[];
  filters: TaskFilters;
  sort: TaskSort;
  sidebarCollapsed: boolean;
  
  // Validation helpers
  canMoveTaskToDone: (taskId: string) => boolean;
  
  // Actions
  addTask: (input: CreateTaskInput) => void;
  updateTask: (input: UpdateTaskInput) => void;
  deleteTask: (id: string) => void;
  deleteTasks: (ids: string[]) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  moveTasks: (ids: string[], status: TaskStatus) => void;
  reorderTasks: (sourceIndex: number, destinationIndex: number, status: TaskStatus) => void;
  
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
  
  // Data management
  importTasks: (tasks: Task[]) => void;
  exportTasks: () => Task[];
  resetStore: () => void;
  
  // Getters
  getTasksByStatus: (status: TaskStatus) => Task[];
  getFilteredTasks: () => Task[];
  getFilteredTasksByStatus: (status: TaskStatus) => Task[];
  getTasksCount: () => { total: number; todo: number; progress: number; done: number };
  getAllTags: () => string[];
  updateTaskStatus: (id: string, status: TaskStatus) => void;
}

// Default state
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

// Create sample tasks for demo
const createSampleTasks = (): Task[] => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  return [
    // High Priority Tasks - In Progress
    {
      id: nanoid(),
      title: "Design system implementation",
      description: "Create a comprehensive design system with Tailwind CSS and custom components for the DevFlow project.",
      status: "In Progress",
      priority: "High",
      dueDate: tomorrow,
      tags: ["design", "frontend", "devflow"],
      subtasks: [
        { id: nanoid(), title: "Color palette definition", done: true },
        { id: nanoid(), title: "Component variants", done: false },
        { id: nanoid(), title: "Animation system", done: false },
      ],
      createdAt: new Date(now.getTime() - 86400000), // 1 day ago
      updatedAt: now,
    },
    {
      id: nanoid(),
      title: "Security audit and fixes",
      description: "Conduct comprehensive security review of the application and implement necessary security improvements.",
      status: "In Progress",
      priority: "High",
      dueDate: nextWeek,
      tags: ["security", "backend", "audit"],
      subtasks: [
        { id: nanoid(), title: "Authentication review", done: true },
        { id: nanoid(), title: "API endpoint security", done: false },
        { id: nanoid(), title: "Data validation", done: false },
        { id: nanoid(), title: "Penetration testing", done: false },
      ],
      createdAt: new Date(now.getTime() - 172800000), // 2 days ago
      updatedAt: new Date(now.getTime() - 3600000), // 1 hour ago
    },
    
    // High Priority Tasks - Todo
    {
      id: nanoid(),
      title: "Implement drag and drop functionality",
      description: "Add dnd-kit library for smooth kanban board interactions with keyboard accessibility.",
      status: "Todo",
      priority: "High",
      dueDate: nextWeek,
      tags: ["frontend", "ux", "accessibility"],
      subtasks: [
        { id: nanoid(), title: "Setup dnd-kit", done: false },
        { id: nanoid(), title: "Add drag handles", done: false },
        { id: nanoid(), title: "Keyboard navigation", done: false },
      ],
      createdAt: new Date(now.getTime() - 43200000), // 12 hours ago
      updatedAt: new Date(now.getTime() - 43200000),
    },
    {
      id: nanoid(),
      title: "Database optimization",
      description: "Optimize database queries and implement proper indexing for better performance.",
      status: "Todo",
      priority: "High",
      dueDate: nextWeek,
      tags: ["database", "performance", "backend"],
      subtasks: [
        { id: nanoid(), title: "Query analysis", done: false },
        { id: nanoid(), title: "Index optimization", done: false },
        { id: nanoid(), title: "Connection pooling", done: false },
      ],
      createdAt: new Date(now.getTime() - 7200000), // 2 hours ago
      updatedAt: new Date(now.getTime() - 7200000),
    },

    // Medium Priority Tasks - In Progress
    {
      id: nanoid(),
      title: "Mobile app responsiveness",
      description: "Ensure the application works perfectly on all mobile devices and screen sizes.",
      status: "In Progress",
      priority: "Medium",
      dueDate: nextWeek,
      tags: ["mobile", "responsive", "ui"],
      subtasks: [
        { id: nanoid(), title: "Mobile navigation", done: true },
        { id: nanoid(), title: "Touch interactions", done: false },
        { id: nanoid(), title: "Screen size optimization", done: false },
      ],
      createdAt: new Date(now.getTime() - 259200000), // 3 days ago
      updatedAt: new Date(now.getTime() - 1800000), // 30 minutes ago
    },
    {
      id: nanoid(),
      title: "User onboarding flow",
      description: "Create an intuitive onboarding experience for new users with guided tutorials.",
      status: "In Progress",
      priority: "Medium",
      dueDate: nextMonth,
      tags: ["ux", "onboarding", "tutorial"],
      subtasks: [
        { id: nanoid(), title: "Welcome screen design", done: true },
        { id: nanoid(), title: "Interactive tutorial", done: false },
        { id: nanoid(), title: "Progress tracking", done: false },
      ],
      createdAt: new Date(now.getTime() - 345600000), // 4 days ago
      updatedAt: new Date(now.getTime() - 900000), // 15 minutes ago
    },

    // Medium Priority Tasks - Todo
    {
      id: nanoid(),
      title: "API documentation",
      description: "Create comprehensive API documentation with examples and interactive testing capabilities.",
      status: "Todo",
      priority: "Medium",
      dueDate: nextMonth,
      tags: ["documentation", "api", "backend"],
      subtasks: [
        { id: nanoid(), title: "Endpoint documentation", done: false },
        { id: nanoid(), title: "Code examples", done: false },
        { id: nanoid(), title: "Interactive playground", done: false },
      ],
      createdAt: new Date(now.getTime() - 432000000), // 5 days ago
      updatedAt: new Date(now.getTime() - 432000000),
    },
    {
      id: nanoid(),
      title: "Email notification system",
      description: "Implement email notifications for task deadlines, assignments, and important updates.",
      status: "Todo",
      priority: "Medium",
      dueDate: nextMonth,
      tags: ["email", "notifications", "backend"],
      subtasks: [
        { id: nanoid(), title: "Email templates", done: false },
        { id: nanoid(), title: "Delivery service", done: false },
        { id: nanoid(), title: "User preferences", done: false },
      ],
      createdAt: new Date(now.getTime() - 518400000), // 6 days ago
      updatedAt: new Date(now.getTime() - 518400000),
    },
    {
      id: nanoid(),
      title: "Advanced search functionality",
      description: "Implement powerful search with filters, tags, and full-text search capabilities.",
      status: "Todo",
      priority: "Medium",
      dueDate: nextMonth,
      tags: ["search", "filters", "frontend"],
      subtasks: [
        { id: nanoid(), title: "Search algorithm", done: false },
        { id: nanoid(), title: "Filter interface", done: false },
        { id: nanoid(), title: "Search history", done: false },
      ],
      createdAt: new Date(now.getTime() - 604800000), // 1 week ago
      updatedAt: new Date(now.getTime() - 604800000),
    },

    // Low Priority Tasks - Todo
    {
      id: nanoid(),
      title: "Dark mode implementation",
      description: "Add a dark theme option with smooth transitions and user preference storage.",
      status: "Todo",
      priority: "Low",
      dueDate: undefined,
      tags: ["ui", "theme", "accessibility"],
      subtasks: [
        { id: nanoid(), title: "Dark color scheme", done: false },
        { id: nanoid(), title: "Theme switcher", done: false },
        { id: nanoid(), title: "Transition animations", done: false },
      ],
      createdAt: new Date(now.getTime() - 691200000), // 8 days ago
      updatedAt: new Date(now.getTime() - 691200000),
    },
    {
      id: nanoid(),
      title: "Analytics dashboard",
      description: "Create a comprehensive analytics dashboard showing productivity metrics and task insights.",
      status: "Todo",
      priority: "Low",
      dueDate: undefined,
      tags: ["analytics", "dashboard", "metrics"],
      subtasks: [
        { id: nanoid(), title: "Data collection", done: false },
        { id: nanoid(), title: "Chart components", done: false },
        { id: nanoid(), title: "Report generation", done: false },
      ],
      createdAt: new Date(now.getTime() - 777600000), // 9 days ago
      updatedAt: new Date(now.getTime() - 777600000),
    },
    {
      id: nanoid(),
      title: "Team collaboration features",
      description: "Add team workspaces, task sharing, and collaborative editing capabilities.",
      status: "Todo",
      priority: "Low",
      dueDate: undefined,
      tags: ["collaboration", "team", "sharing"],
      subtasks: [
        { id: nanoid(), title: "Team workspace", done: false },
        { id: nanoid(), title: "Real-time updates", done: false },
        { id: nanoid(), title: "Permission system", done: false },
      ],
      createdAt: new Date(now.getTime() - 864000000), // 10 days ago
      updatedAt: new Date(now.getTime() - 864000000),
    },
    {
      id: nanoid(),
      title: "Export and import functionality",
      description: "Allow users to export tasks to various formats and import from other task management tools.",
      status: "Todo",
      priority: "Low",
      dueDate: undefined,
      tags: ["export", "import", "integration"],
      subtasks: [
        { id: nanoid(), title: "CSV export", done: false },
        { id: nanoid(), title: "JSON import", done: false },
        { id: nanoid(), title: "Third-party integrations", done: false },
      ],
      createdAt: new Date(now.getTime() - 950400000), // 11 days ago
      updatedAt: new Date(now.getTime() - 950400000),
    },

    // Completed Tasks - Done
    {
      id: nanoid(),
      title: "Set up project documentation",
      description: "Write comprehensive README with setup instructions, feature list, and deployment guide.",
      status: "Done",
      priority: "High",
      dueDate: undefined,
      tags: ["documentation", "devflow"],
      subtasks: [
        { id: nanoid(), title: "Feature documentation", done: true },
        { id: nanoid(), title: "Setup instructions", done: true },
        { id: nanoid(), title: "Deployment guide", done: true },
      ],
      createdAt: new Date(now.getTime() - 1036800000), // 12 days ago
      updatedAt: new Date(now.getTime() - 86400000), // 1 day ago
    },
    {
      id: nanoid(),
      title: "Initial project setup",
      description: "Set up the development environment, install dependencies, and configure build tools.",
      status: "Done",
      priority: "High",
      dueDate: undefined,
      tags: ["setup", "development", "configuration"],
      subtasks: [
        { id: nanoid(), title: "Node.js environment", done: true },
        { id: nanoid(), title: "Package dependencies", done: true },
        { id: nanoid(), title: "Build configuration", done: true },
      ],
      createdAt: new Date(now.getTime() - 1209600000), // 14 days ago
      updatedAt: new Date(now.getTime() - 1123200000), // 13 days ago
    },
    {
      id: nanoid(),
      title: "Basic task management features",
      description: "Implement core CRUD operations for tasks with basic filtering and sorting.",
      status: "Done",
      priority: "High",
      dueDate: undefined,
      tags: ["core", "crud", "tasks"],
      subtasks: [
        { id: nanoid(), title: "Create tasks", done: true },
        { id: nanoid(), title: "Update tasks", done: true },
        { id: nanoid(), title: "Delete tasks", done: true },
        { id: nanoid(), title: "List tasks", done: true },
      ],
      createdAt: new Date(now.getTime() - 1123200000), // 13 days ago
      updatedAt: new Date(now.getTime() - 950400000), // 11 days ago
    },
    {
      id: nanoid(),
      title: "UI component library setup",
      description: "Integrate shadcn/ui components and establish consistent design patterns.",
      status: "Done",
      priority: "Medium",
      dueDate: undefined,
      tags: ["ui", "components", "design"],
      subtasks: [
        { id: nanoid(), title: "shadcn/ui installation", done: true },
        { id: nanoid(), title: "Component customization", done: true },
        { id: nanoid(), title: "Theme configuration", done: true },
      ],
      createdAt: new Date(now.getTime() - 1296000000), // 15 days ago
      updatedAt: new Date(now.getTime() - 1036800000), // 12 days ago
    },
    {
      id: nanoid(),
      title: "State management implementation",
      description: "Set up Zustand for global state management with persistence capabilities.",
      status: "Done",
      priority: "Medium",
      dueDate: undefined,
      tags: ["state", "zustand", "persistence"],
      subtasks: [
        { id: nanoid(), title: "Zustand store setup", done: true },
        { id: nanoid(), title: "Task state management", done: true },
        { id: nanoid(), title: "Local storage persistence", done: true },
      ],
      createdAt: new Date(now.getTime() - 1382400000), // 16 days ago
      updatedAt: new Date(now.getTime() - 1209600000), // 14 days ago
    },
    {
      id: nanoid(),
      title: "Responsive layout design",
      description: "Create a responsive layout that works well on desktop, tablet, and mobile devices.",
      status: "Done",
      priority: "Medium",
      dueDate: undefined,
      tags: ["responsive", "layout", "css"],
      subtasks: [
        { id: nanoid(), title: "Mobile-first approach", done: true },
        { id: nanoid(), title: "Breakpoint optimization", done: true },
        { id: nanoid(), title: "Touch-friendly interfaces", done: true },
      ],
      createdAt: new Date(now.getTime() - 1468800000), // 17 days ago
      updatedAt: new Date(now.getTime() - 1296000000), // 15 days ago
    },

    // Personal/Life Tasks
    {
      id: nanoid(),
      title: "Gym workout routine",
      description: "Establish a consistent workout schedule focusing on strength training and cardio.",
      status: "In Progress",
      priority: "Medium",
      dueDate: undefined,
      tags: ["health", "fitness", "personal"],
      subtasks: [
        { id: nanoid(), title: "Monday - Upper body", done: true },
        { id: nanoid(), title: "Wednesday - Lower body", done: false },
        { id: nanoid(), title: "Friday - Cardio", done: false },
      ],
      createdAt: new Date(now.getTime() - 604800000), // 1 week ago
      updatedAt: new Date(now.getTime() - 86400000), // 1 day ago
    },
    {
      id: nanoid(),
      title: "Learn TypeScript advanced features",
      description: "Deep dive into TypeScript generics, utility types, and advanced type manipulation.",
      status: "Todo",
      priority: "Low",
      dueDate: nextMonth,
      tags: ["learning", "typescript", "programming"],
      subtasks: [
        { id: nanoid(), title: "Generics and constraints", done: false },
        { id: nanoid(), title: "Utility types", done: false },
        { id: nanoid(), title: "Conditional types", done: false },
      ],
      createdAt: new Date(now.getTime() - 518400000), // 6 days ago
      updatedAt: new Date(now.getTime() - 518400000),
    },
    {
      id: nanoid(),
      title: "Book reading challenge",
      description: "Read 12 books this year covering technology, business, and personal development.",
      status: "In Progress",
      priority: "Low",
      dueDate: undefined,
      tags: ["reading", "books", "personal"],
      subtasks: [
        { id: nanoid(), title: "Clean Code - Robert Martin", done: true },
        { id: nanoid(), title: "The Pragmatic Programmer", done: true },
        { id: nanoid(), title: "System Design Interview", done: false },
        { id: nanoid(), title: "Atomic Habits", done: false },
      ],
      createdAt: new Date(now.getTime() - 2592000000), // 30 days ago
      updatedAt: new Date(now.getTime() - 172800000), // 2 days ago
    },
    {
      id: nanoid(),
      title: "Home office organization",
      description: "Reorganize and optimize home office space for better productivity and comfort.",
      status: "Done",
      priority: "Low",
      dueDate: undefined,
      tags: ["organization", "home", "productivity"],
      subtasks: [
        { id: nanoid(), title: "Desk organization", done: true },
        { id: nanoid(), title: "Cable management", done: true },
        { id: nanoid(), title: "Lighting improvement", done: true },
      ],
      createdAt: new Date(now.getTime() - 432000000), // 5 days ago
      updatedAt: new Date(now.getTime() - 259200000), // 3 days ago
    },

    // Business/Career Tasks
    {
      id: nanoid(),
      title: "Portfolio website update",
      description: "Refresh personal portfolio with latest projects and improved design.",
      status: "Todo",
      priority: "Medium",
      dueDate: nextWeek,
      tags: ["portfolio", "website", "career"],
      subtasks: [
        { id: nanoid(), title: "New project showcase", done: false },
        { id: nanoid(), title: "Performance optimization", done: false },
        { id: nanoid(), title: "SEO improvements", done: false },
      ],
      createdAt: new Date(now.getTime() - 345600000), // 4 days ago
      updatedAt: new Date(now.getTime() - 345600000),
    },
    {
      id: nanoid(),
      title: "Conference presentation prep",
      description: "Prepare slides and demo for upcoming tech conference presentation on modern web development.",
      status: "In Progress",
      priority: "High",
      dueDate: nextWeek,
      tags: ["presentation", "conference", "speaking"],
      subtasks: [
        { id: nanoid(), title: "Slide deck creation", done: true },
        { id: nanoid(), title: "Live demo preparation", done: false },
        { id: nanoid(), title: "Speaker notes", done: false },
        { id: nanoid(), title: "Practice sessions", done: false },
      ],
      createdAt: new Date(now.getTime() - 777600000), // 9 days ago
      updatedAt: new Date(now.getTime() - 21600000), // 6 hours ago
    },
    {
      id: nanoid(),
      title: "Network with industry professionals",
      description: "Attend virtual meetups and connect with other developers and designers in the field.",
      status: "Todo",
      priority: "Low",
      dueDate: undefined,
      tags: ["networking", "career", "community"],
      subtasks: [
        { id: nanoid(), title: "Join developer communities", done: false },
        { id: nanoid(), title: "Attend virtual meetups", done: false },
        { id: nanoid(), title: "LinkedIn engagement", done: false },
      ],
      createdAt: new Date(now.getTime() - 1209600000), // 14 days ago
      updatedAt: new Date(now.getTime() - 1209600000),
    },
  ];
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      // Initial state
      tasks: [],
      selectedTaskIds: [],
      filters: defaultFilters,
      sort: defaultSort,
      sidebarCollapsed: false,
      
      // Task CRUD operations
      addTask: (input) => {
        const now = new Date();
        const newTask: Task = {
          ...input,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
      },
      
      updateTask: (input) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === input.id
              ? { ...task, ...input, updatedAt: new Date() }
              : task
          ),
        }));
      },
      
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          selectedTaskIds: state.selectedTaskIds.filter((taskId) => taskId !== id),
        }));
      },
      
      deleteTasks: (ids) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => !ids.includes(task.id)),
          selectedTaskIds: state.selectedTaskIds.filter((taskId) => !ids.includes(taskId)),
        }));
      },
      
      moveTask: (id, status) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          
          // Check if trying to move to "Done" with incomplete subtasks
          if (status === "Done" && task) {
            const hasIncompleteSubtasks = task.subtasks.some(subtask => !subtask.done);
            if (hasIncompleteSubtasks) {
              // Don't allow moving to done if there are incomplete subtasks
              console.warn("Cannot move task to Done: incomplete subtasks remain");
              return state; // Return unchanged state
            }
          }
          
          return {
            tasks: state.tasks.map((task) =>
              task.id === id
                ? { ...task, status, updatedAt: new Date() }
                : task
            ),
          };
        });
      },
      
      moveTasks: (ids, status) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            ids.includes(task.id)
              ? { ...task, status, updatedAt: new Date() }
              : task
          ),
        }));
      },
      
      reorderTasks: (sourceIndex, destinationIndex, status) => {
        set((state) => {
          // Get the exact same filtered tasks that the UI is showing
          const currentFilteredTasks = get().getFilteredTasksByStatus(status);
          
          // Validate indices
          if (sourceIndex < 0 || sourceIndex >= currentFilteredTasks.length ||
              destinationIndex < 0 || destinationIndex >= currentFilteredTasks.length) {
            console.warn('Invalid reorder indices:', { sourceIndex, destinationIndex, length: currentFilteredTasks.length });
            return state;
          }
          
          // Create a copy for reordering
          const reorderedTasks = [...currentFilteredTasks];
          const [movedTask] = reorderedTasks.splice(sourceIndex, 1);
          reorderedTasks.splice(destinationIndex, 0, movedTask);
          
          // Update the order field for all tasks in this status to match new positions
          const updatedTasks = state.tasks.map((task) => {
            if (task.status === status) {
              const newIndex = reorderedTasks.findIndex((t) => t.id === task.id);
              if (newIndex !== -1) {
                return { ...task, order: newIndex, updatedAt: new Date() };
              }
            }
            return task;
          });

          return { tasks: updatedTasks };
        });
      },
      
      // Selection management
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
      
      // Bulk actions
      executeBulkAction: (payload) => {
        const { action, taskIds, tag } = payload;
        
        switch (action) {
          case "delete":
            get().deleteTasks(taskIds);
            break;
          case "moveToTodo":
            get().moveTasks(taskIds, "Todo");
            break;
          case "moveToProgress":
            get().moveTasks(taskIds, "In Progress");
            break;
          case "moveToDone":
            get().moveTasks(taskIds, "Done");
            break;
          case "addTag":
            if (tag) {
              set((state) => ({
                tasks: state.tasks.map((task) =>
                  taskIds.includes(task.id)
                    ? { 
                        ...task, 
                        tags: task.tags.includes(tag) ? task.tags : [...task.tags, tag],
                        updatedAt: new Date() 
                      }
                    : task
                ),
              }));
            }
            break;
        }
        
        get().clearSelection();
      },
      
      // Filtering and sorting
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
      
      // UI state
      toggleSidebar: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        }));
      },
      
      // Data management
      importTasks: (tasks) => {
        set({ tasks, selectedTaskIds: [] });
      },
      
      exportTasks: () => {
        return get().tasks;
      },
      
      resetStore: () => {
        set({
          tasks: createSampleTasks(),
          selectedTaskIds: [],
          filters: defaultFilters,
          sort: defaultSort,
          sidebarCollapsed: false,
        });
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
      
      // Subtask operations
      addSubtask: (taskId, title) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === taskId 
            ? {
                ...task,
                subtasks: [...task.subtasks, { id: nanoid(), title, done: false }],
                updatedAt: new Date()
              }
            : task
        )
      })),

      updateSubtask: (taskId, subtaskId, updates) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === taskId 
            ? {
                ...task,
                subtasks: task.subtasks.map(subtask =>
                  subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
                ),
                updatedAt: new Date()
              }
            : task
        )
      })),

      deleteSubtask: (taskId, subtaskId) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === taskId 
            ? {
                ...task,
                subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId),
                updatedAt: new Date()
              }
            : task
        )
      })),
      
      // Computed getters
      getTasksByStatus: (status) => {
        return get().tasks.filter((task) => task.status === status);
      },
      
      canMoveTaskToDone: (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return false;
        
        // Can move to done if all subtasks are completed (or no subtasks exist)
        return task.subtasks.every(subtask => subtask.done);
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
    }),
    {
      name: "devflow-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Initialize with sample tasks if empty
        if (state && state.tasks.length === 0) {
          state.tasks = createSampleTasks();
        }
      },
    }
  )
);