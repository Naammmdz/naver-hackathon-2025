import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { DocumentEditorDialog } from "@/components/documents/DocumentEditorDialog";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ViewSwitcher, ViewType } from "@/components/layout/ViewSwitcher";
import { Column } from "@/components/tasks/Column";
import { ColumnHeader } from "@/components/tasks/ColumnHeader";
import SmartTaskParser from "@/components/tasks/SmartTaskParser";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDetailsDrawer } from "@/components/tasks/TaskDetailsDrawer";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskListView } from "@/components/tasks/TaskListView";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FocusFlyModal } from "@/features/focusFly/components/FocusFlyModal";
import { useToast } from "@/hooks/use-toast";
import { ParsedTask } from "@/lib/parseNatural";
import { useDocumentStore } from "@/store/documentStore";
import { useTaskStore } from "@/store/taskStore";
import { Task, TaskStatus } from "@/types/task";
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, MouseSensor, PointerSensor, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CheckSquare, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Index({ onViewChange, onSmartCreate }: { onViewChange: (view: 'tasks' | 'docs' | 'board') => void; onSmartCreate?: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setActiveDocument } = useDocumentStore();

  // Listen for smart parser events from the top navigation
  useEffect(() => {
    const handleOpenSmartParser = () => {
      setShowSmartParser(true);
    };

    window.addEventListener('openSmartParser', handleOpenSmartParser);
    return () => window.removeEventListener('openSmartParser', handleOpenSmartParser);
  }, []);

  const COLUMNS: { id: TaskStatus; title: string; description: string }[] = [
    {
      id: "Todo",
      title: t('tasks.todo'),
      description: t('columns.todoDescription'),
    },
    {
      id: "In Progress",
      title: t('tasks.inProgress'),
      description: t('columns.inProgressDescription'),
    },
    {
      id: "Done",
      title: t('tasks.done'),
      description: t('columns.doneDescription'),
    },
  ];

  const {
    tasks,
    sidebarCollapsed,
    moveTask,
    reorderTasks,
    getFilteredTasksByStatus,
    selectedTaskIds,
    clearSelection,
    deleteTask,
    updateTaskStatus,
    addTask,
    isLoading,
    error,
    loadTasks,
    toggleSidebar,
  } = useTaskStore();
  
  const [currentView, setCurrentView] = useState<ViewType>("board");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overTaskId, setOverTaskId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showSmartParser, setShowSmartParser] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("Todo");
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);
  const [isDark, setIsDark] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);

  // Get fresh task from store instead of using stale selectedTask state
  const freshSelectedTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) : null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemDark);
      setIsDark(shouldBeDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

// ============================================================================
// Drag and Drop Handlers
// ============================================================================

const handleDragStart = (event: DragStartEvent) => {
  const task = tasks.find(t => t.id === event.active.id);
  setActiveTask(task || null);
};

const handleDragOver = (event: DragOverEvent) => {
  const { over } = event;
  setOverTaskId(over ? over.id as string : null);
};

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  setActiveTask(null);
  setOverTaskId(null);
  if (!over) return;

  const activeId = active.id as string;
  const overId = over.id as string;

  const draggedTask = tasks.find(t => t.id === activeId);
  if (!draggedTask) return;

  // Nếu drop vào column trống (over.id là column)
  const isColumnDrop = ["Todo", "In Progress", "Done"].includes(overId);
  if (isColumnDrop) {
    if (draggedTask.status !== overId) {
      // Check if trying to move to "Done" with incomplete subtasks
      if (overId === "Done") {
        const hasIncompleteSubtasks = draggedTask.subtasks.some(subtask => !subtask.done);
        if (hasIncompleteSubtasks) {
          toast({
            title: t('tasks.cannotMoveToDone'),
            description: t('tasks.incompleteSubtasks'),
            variant: "destructive",
          });
          return;
        }
      }
      moveTask(activeId, overId as TaskStatus);
    }
    return;
  }

  // Nếu drop lên task khác
  const overTask = tasks.find(t => t.id === overId);
  if (!overTask) return;

  // Nếu cùng cột => reorder
  if (overTask.status === draggedTask.status) {
    reorderTasksInColumn(activeId, overId, overTask.status);
  }
  // Nếu khác cột => move sang cột của task bị đè
  else {
    // Check if trying to move to "Done" with incomplete subtasks
    if (overTask.status === "Done") {
      const hasIncompleteSubtasks = draggedTask.subtasks.some(subtask => !subtask.done);
      if (hasIncompleteSubtasks) {
        toast({
          title: t('tasks.cannotMoveToDone'),
          description: t('tasks.incompleteSubtasks'),
          variant: "destructive",
        });
        return;
      }
    }
    moveTask(activeId, overTask.status);
  }
};  /**
   * Reorders tasks within the same column
   */
  const reorderTasksInColumn = (activeId: string, overId: string, status: TaskStatus) => {
    const columnTasks = getFilteredTasksByStatus(status);
    const activeIndex = columnTasks.findIndex(t => t.id === activeId);
    const overIndex = columnTasks.findIndex(t => t.id === overId);

    if (activeIndex !== overIndex && activeIndex >= 0 && overIndex >= 0) {
      reorderTasks(activeIndex, overIndex, status);
    }
  };

  // Configure drag sensors with minimal distance for immediate activation
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(MouseSensor)
  );

  // ============================================================================
  // Task Management Handlers
  // ============================================================================

  const handleNewTask = useCallback(
    (date?: Date, status?: TaskStatus) => {
      setSelectedTask(null);
      setDefaultStatus(status || "Todo");
      setDefaultDate(date);
      setShowTaskForm(true);
    },
    [],
  );

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setShowTaskForm(true);
  };

  const handleTaskView = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const handleTaskFormClose = () => {
    setShowTaskForm(false);
    setSelectedTask(null);
    setDefaultDate(undefined);
  };

  const handleTaskDetailsClose = () => {
    setShowTaskDetails(false);
    setSelectedTask(null);
  };

  const handleFocusComplete = (taskId: string) => {
    updateTaskStatus(taskId, "Done");
  };

  const handleSmartParserCreate = (parsedTask: ParsedTask) => {
    addTask({
      title: parsedTask.title,
      description: "",
      status: defaultStatus || "Todo",
      priority: parsedTask.priority,
      dueDate: parsedTask.dueAt,
      tags: parsedTask.tags,
      subtasks: [],
    });
    setShowSmartParser(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleOpenTaskForm = () => handleNewTask();
    window.addEventListener("openTaskForm", handleOpenTaskForm);
    return () => window.removeEventListener("openTaskForm", handleOpenTaskForm);
  }, [handleNewTask]);

  // ============================================================================
  // Utilities
  // ============================================================================

  const getColumnTasks = (status: TaskStatus) => {
    return getFilteredTasksByStatus(status);
  };

  const hasTasks = useMemo(() => tasks.length > 0, [tasks.length]);

  const renderEmptyTasksState = () => {
    if (isLoading) {
      return (
        <div className="flex min-h-[520px] items-center justify-center gap-3 rounded-3xl border border-border/60 bg-background/80 px-10 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Đang tải danh sách công việc...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 rounded-3xl border border-destructive/30 bg-destructive/5 px-10 py-12 text-center text-sm text-destructive">
          <p>Không thể tải công việc. Vui lòng thử lại sau ít phút.</p>
          <Button variant="destructive" size="sm" className="gap-2" onClick={() => void loadTasks()}>
            <Sparkles className="h-4 w-4" />
            Thử tải lại
          </Button>
        </div>
      );
    }

    return (
      <div
        className="relative flex h-full min-h-[520px] w-full items-center justify-center overflow-hidden px-6 py-12 transition-colors"
        style={{
          background: isDark
            ? 'linear-gradient(145deg, #0f1117 0%, #111827 55%, #1e293b 100%)'
            : 'linear-gradient(140deg, #f5f3ff 0%, #e0f2fe 45%, #fef3c7 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -left-24 top-20 h-64 w-64 rounded-full blur-3xl mix-blend-screen opacity-45 dark:opacity-75"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(56,189,248,0.55) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 72%)',
            }}
          />
          <div
            className="absolute -right-28 bottom-16 h-72 w-72 rounded-full blur-[120px] mix-blend-screen opacity-40 dark:opacity-70"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(16,185,129,0.55) 0%, transparent 75%)'
                : 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 75%)',
            }}
          />
          <div
            className="absolute left-1/2 top-6 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl mix-blend-screen opacity-35 dark:opacity-55"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(244,114,182,0.45) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(244,114,182,0.3) 0%, transparent 70%)',
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.18),_transparent_55%)]" />

        <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#38bdf8] via-[#a855f7] to-[#f97316] text-white shadow-lg shadow-pink-500/35">
            <CheckSquare className="h-8 w-8" />
          </span>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Biến ý tưởng thành hành động
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground/80">
              Lập kế hoạch, phân công và theo dõi tiến độ của đội nhóm trên một bảng công việc trực quan.
              Tạo task đầu tiên để khởi động mục tiêu tuần này.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground/75">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-300" />
              <span>Auto-save và đồng bộ trạng thái giữa chế độ Kanban, List và Calendar.</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-300" />
              <span>Dùng Smart Parser để tạo task từ mô tả tự nhiên chỉ với vài giây.</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-300" />
              <span>Kéo thả để sắp xếp ưu tiên và tự động cập nhật hạn hoàn thành.</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-[#38bdf8] via-[#a855f7] to-[#f97316] hover:from-[#38bdf8]/90 hover:via-[#a855f7]/90 hover:to-[#f97316]/90 text-white shadow-md hover:shadow-lg transition-all" onClick={() => handleNewTask()}>
              <Sparkles className="h-4 w-4" />
              Tạo task mới
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => setShowSmartParser(true)}
            >
              <Zap className="h-4 w-4" />
              Mở Smart Parser
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Mẹo: nhấn <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">Shift + N</span> để tạo task bất cứ lúc nào.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-background">
      <div
        className={`hidden overflow-hidden transition-all duration-300 ease-out lg:block ${
          sidebarCollapsed ? "w-0" : "w-64"
        }`}
      >
        <AppSidebar className="h-full" onSmartCreate={onSmartCreate} />
      </div>
      <div
        className="group relative hidden w-1 flex-shrink-0 cursor-pointer select-none items-center justify-center bg-border transition hover:bg-primary/60 lg:flex"
        onClick={toggleSidebar}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleSidebar();
          }
        }}
      >
        <div className="absolute left-1/2 top-1/2 hidden h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/40 lg:block" />
        <div className="absolute right-0 top-1/2 flex h-10 w-6 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover:opacity-80">
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-primary" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-primary" />
          )}
        </div>
        <span className="sr-only">Toggle task sidebar</span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <FocusFlyModal onComplete={handleFocusComplete} />

        <div className="relative h-full overflow-auto">
          {hasTasks ? (
            <div className="relative mx-auto h-full max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
              {/* Header with View Switcher */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <ViewSwitcher
                  currentView={currentView}
                  onViewChange={setCurrentView}
                />
                <div className="flex items-center gap-2">
                  {currentView === "list" && (
                    <Button onClick={() => handleNewTask()} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {t('header.newTask')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedTaskIds.length > 0 && (
                <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/50 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center">
                  <span className="font-medium">
                    {t('bulk.selected', { count: selectedTaskIds.length })}
                  </span>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    {t('bulk.clearSelection')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      selectedTaskIds.forEach(id => deleteTask(id));
                      clearSelection();
                    }}
                  >
                    {t('common.delete')} {t('bulk.selected', { count: selectedTaskIds.length })}
                  </Button>
                </div>
              )}

              {/* View Content */}
              <>
                {currentView === "board" && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={rectIntersection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Kanban Board */}
                    <div className="grid grid-cols-1 gap-6 min-h-[600px] md:grid-cols-3">
                      {COLUMNS.map((column) => {
                        const columnTasks = getColumnTasks(column.id);

                        return (
                          <Column key={column.id} column={column}>
                            {/* Column Header */}
                            <ColumnHeader
                              column={column}
                              taskCount={columnTasks.length}
                              onAddTask={() => handleNewTask(undefined, column.id)}
                            />

                            {/* Column Content */}
                            <div className="flex-1 overflow-y-auto p-3">
                              <SortableContext
                                items={columnTasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="min-h-[100px] space-y-3 pb-10">
                                  {columnTasks.map((task) => (
                                    <TaskCard
                                      key={task.id}
                                      task={task}
                                      isSelected={selectedTaskIds.includes(task.id)}
                                      isDragOver={overTaskId === task.id}
                                      onEdit={() => handleTaskEdit(task)}
                                      onView={() => handleTaskView(task)}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </div>
                          </Column>
                        );
                      })}
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay>
                      {activeTask && (
                        <TaskCard
                          task={activeTask}
                          onEdit={() => {}}
                          onView={() => {}}
                          isDragging
                        />
                      )}
                    </DragOverlay>
                  </DndContext>
                )}

                {currentView === "list" && (
                  <TaskListView
                    onTaskEdit={handleTaskEdit}
                    onTaskView={handleTaskView}
                  />
                )}

                {currentView === "calendar" && (
                  <TaskCalendarView
                    onTaskEdit={handleTaskEdit}
                    onTaskView={handleTaskView}
                    onNewTask={handleNewTask}
                  />
                )}

                {currentView === "analytics" && (
                  <AnalyticsView />
                )}
              </>
            </div>
          ) : (
            renderEmptyTasksState()
          )}
        </div>
      </div>

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={showTaskForm}
        onOpenChange={handleTaskFormClose}
        task={selectedTask}
        defaultStatus={defaultStatus}
        defaultDate={defaultDate}
      />

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        open={showTaskDetails}
        onOpenChange={handleTaskDetailsClose}
        task={freshSelectedTask}
        onEdit={() => {
          setShowTaskDetails(false);
          handleTaskEdit(freshSelectedTask!);
        }}
        onDocumentClick={(docId) => {
          setEditingDocumentId(docId);
          setShowTaskDetails(false);
        }}
      />

      {/* Smart Task Parser Dialog */}
      <Dialog open={showSmartParser} onOpenChange={setShowSmartParser}>
        <DialogContent className="sm:max-w-[900px] lg:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {t('smartParser.title', 'Smart Task Parser')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <SmartTaskParser 
              onCreateTask={handleSmartParserCreate}
              onCancel={() => setShowSmartParser(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Editor Dialog */}
      <DocumentEditorDialog
        open={!!editingDocumentId}
        onOpenChange={(open) => !open && setEditingDocumentId(null)}
        documentId={editingDocumentId}
      />
    </div>
  );
}
