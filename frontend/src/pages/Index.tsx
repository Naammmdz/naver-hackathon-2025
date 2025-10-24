import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { DocumentEditorDialog } from "@/components/documents/DocumentEditorDialog";
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
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, PointerSensor, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Index({ onViewChange }: { onViewChange: (view: 'tasks' | 'docs' | 'board') => void }) {
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
    getTasksByStatus,
    getFilteredTasksByStatus,
    selectedTaskIds,
    clearSelection,
    deleteTask,
    updateTaskStatus,
    addTask
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
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);

  // Get fresh task from store instead of using stale selectedTask state
  const freshSelectedTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) : null;

// ============================================================================
// Drag and Drop Handlers
// ============================================================================

const handleDragStart = (event: DragStartEvent) => {
  const task = tasks.find(t => t.id === event.active.id);
  setActiveTask(task || null);
};

const handleDragOver = (event: any) => {
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

  const handleNewTask = (date?: Date, status?: TaskStatus) => {
    setSelectedTask(null);
    setDefaultStatus(status || "Todo");
    setDefaultDate(date);
    setShowTaskForm(true);
  };

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

  // ============================================================================
  // Utilities
  // ============================================================================

  const getColumnTasks = (status: TaskStatus) => {
    return getFilteredTasksByStatus(status);
  };

    return (
    <div className="h-full bg-background overflow-auto">
      <FocusFlyModal onComplete={handleFocusComplete} />
      
      <div className="relative bg-background">
        <div className="h-full p-6 bg-background max-w-7xl mx-auto">
          {/* Header with View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-6">
                <span className="text-sm font-medium">
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
            {currentView === "board" && (
              <DndContext 
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                {/* Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[600px]">
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
                        <div className="flex-1 p-3 overflow-y-auto">
                          <SortableContext
                            items={columnTasks.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3 min-h-[100px] pb-10">
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