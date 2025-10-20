import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { ViewSwitcher, ViewType } from "@/components/layout/ViewSwitcher";
import SmartTaskParser from "@/components/tasks/SmartTaskParser";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDetailsDrawer } from "@/components/tasks/TaskDetailsDrawer";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskListView } from "@/components/tasks/TaskListView";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FocusFlyModal } from "@/features/focusFly/components/FocusFlyModal";
import { ParsedTask } from "@/lib/parseNatural";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/taskStore";
import { Task, TaskStatus } from "@/types/task";
import { closestCenter, DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function DroppableColumnHeader({ column, taskCount, onAddTask }: { column: { id: TaskStatus; title: string; description: string }, taskCount: number, onAddTask: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${column.id}-header` });
  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "p-4 border-b bg-card rounded-t-lg transition-colors",
        column.id === "Todo" && "border-l-4 border-l-muted-foreground",
        column.id === "In Progress" && "border-l-4 border-l-primary", 
        column.id === "Done" && "border-l-4 border-l-success",
        isOver && "bg-primary/10"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-sm">{column.title}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-primary/10"
            onClick={onAddTask}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            column.id === "Todo" && "bg-muted text-muted-foreground",
            column.id === "In Progress" && "bg-primary/10 text-primary",
            column.id === "Done" && "bg-success/10 text-success"
          )}>
            {taskCount}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {column.description}
      </p>
    </div>
  );
}

function DroppableColumn({ column, tasks, children }: { column: { id: TaskStatus; title: string; description: string }, tasks: Task[], children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg border h-full transition-colors",
        isOver && "bg-primary/10 border-2 border-dashed border-primary"
      )}
    >
      {children}
    </div>
  );
}

export default function Index() {
  const { t } = useTranslation();
  
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
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showSmartParser, setShowSmartParser] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("Todo");
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);

  // Get fresh task from store instead of using stale selectedTask state
  const freshSelectedTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) : null;

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Handle reordering within the same column (task over another task)
    const overTask = tasks.find(t => t.id === overId);
    if (overTask && activeTask.status === overTask.status) {
      const columnTasks = getFilteredTasksByStatus(activeTask.status);
      const activeIndex = columnTasks.findIndex(t => t.id === activeId);
      const overIndex = columnTasks.findIndex(t => t.id === overId);
      
      if (activeIndex !== overIndex && activeIndex >= 0 && overIndex >= 0) {
        reorderTasks(activeIndex, overIndex, activeTask.status);
      }
      return;
    }

    // Check if dropping on a column header (ends with -header)
    if (overId.endsWith('-header')) {
      const targetColumnId = overId.replace('-header', '') as TaskStatus;
      const targetColumn = COLUMNS.find(col => col.id === targetColumnId);
      if (targetColumn && activeTask.status !== targetColumn.id) {
        moveTask(activeId, targetColumn.id);
        return;
      }
    }

    // Check if dropping on a column (when dragging to empty area or column drop zone)
    const targetColumn = COLUMNS.find(col => col.id === overId);
    if (targetColumn && activeTask.status !== targetColumn.id) {
      moveTask(activeId, targetColumn.id);
      return;
    }
  };

  // Sensors: use a small activation distance so clicks aren't mistaken for drags
  // Use immediate activation for responsive dragging
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(MouseSensor)
  );

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
    // Convert ParsedTask to our task format
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
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                {/* Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[600px]">
          {COLUMNS.map((column) => {
                    const columnTasks = getColumnTasks(column.id);
                    
                    return (
            <DroppableColumn key={column.id} column={column} tasks={columnTasks}>
                        {/* Column Header */}
                        <DroppableColumnHeader 
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
                            <div className="space-y-3">
                              {columnTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  isSelected={selectedTaskIds.includes(task.id)}
                                  onEdit={() => handleTaskEdit(task)}
                                  onView={() => handleTaskView(task)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </div>
                      </DroppableColumn>
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
    </div>
  );
}