import { Filter, Tag, Calendar, CheckSquare, Clock, AlertCircle, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useTaskStore } from "@/store/taskStore";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { tasks, filters, setFilters, clearFilters, sidebarCollapsed } = useTaskStore();
  const { t } = useTranslation();
  const [tagSearch, setTagSearch] = useState("");
  
  const counts = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "Todo").length,
    progress: tasks.filter(t => t.status === "In Progress").length,
    done: tasks.filter(t => t.status === "Done").length,
    high: tasks.filter(t => t.priority === "High").length,
    medium: tasks.filter(t => t.priority === "Medium").length,
    low: tasks.filter(t => t.priority === "Low").length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
    today: tasks.filter(t => {
      if (!t.dueDate) return false;
      const today = new Date();
      const taskDate = new Date(t.dueDate);
      return taskDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: tasks.filter(t => {
      if (!t.dueDate) return false;
      const now = new Date();
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const taskDate = new Date(t.dueDate);
      return taskDate >= now && taskDate <= weekFromNow;
    }).length,
  };

  // Get unique tags with counts
  const tagCounts = tasks.reduce((acc, task) => {
    task.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const uniqueTags = Object.entries(tagCounts).sort(([,a], [,b]) => b - a);

  // Filter tags based on search
  const filteredTags = uniqueTags.filter(([tag]) => 
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const quickFilters = [
    {
      id: "all",
      label: t('sidebar.allTasks'),
      icon: CheckSquare,
      count: counts.total,
      filter: () => clearFilters(),
      active: !filters.status && !filters.dueDateFilter,
    },
    {
      id: "overdue",
      label: t('sidebar.overdue'),
      icon: AlertCircle,
      count: counts.overdue,
      filter: () => setFilters({ dueDateFilter: "overdue" }),
      active: filters.dueDateFilter === "overdue",
      variant: "destructive" as const,
    },
    {
      id: "today",
      label: t('sidebar.dueToday'),
      icon: Calendar,
      count: counts.today,
      filter: () => setFilters({ dueDateFilter: "today" }),
      active: filters.dueDateFilter === "today",
      variant: "warning" as const,
    },
    {
      id: "week",
      label: t('sidebar.thisWeek'),
      icon: Clock,
      count: counts.thisWeek,
      filter: () => setFilters({ dueDateFilter: "thisWeek" }),
      active: filters.dueDateFilter === "thisWeek",
    },
  ];

  const statusFilters = [
    {
      id: "todo",
      label: t('tasks.status.todo'),
      count: counts.todo,
      status: "Todo" as const,
      className: "text-muted-foreground",
    },
    {
      id: "progress",
      label: t('tasks.status.inProgress'),
      count: counts.progress,
      status: "In Progress" as const,
      className: "text-accent",
    },
    {
      id: "done",
      label: t('tasks.status.done'),
      count: counts.done,
      status: "Done" as const,
      className: "text-success",
    },
  ];

  const priorityFilters = [
    {
      id: "high",
      label: t('tasks.priority.high'),
      count: counts.high,
      priority: "High" as const,
      className: "text-destructive",
    },
    {
      id: "medium",
      label: t('tasks.priority.medium'),
      count: counts.medium,
      priority: "Medium" as const,
      className: "text-warning",
    },
    {
      id: "low",
      label: t('tasks.priority.low'),
      count: counts.low,
      priority: "Low" as const,
      className: "text-muted-foreground",
    },
  ];

  const handleStatusFilter = (status: "Todo" | "In Progress" | "Done") => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter(s => s !== status)
      : [...currentStatus, status];
    
    setFilters({ status: newStatus.length > 0 ? newStatus : undefined });
  };

  const handlePriorityFilter = (priority: "High" | "Medium" | "Low") => {
    const currentPriority = filters.priority || [];
    const newPriority = currentPriority.includes(priority)
      ? currentPriority.filter(p => p !== priority)
      : [...currentPriority, priority];
    
    setFilters({ priority: newPriority.length > 0 ? newPriority : undefined });
  };

  const handleTagFilter = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    setFilters({ tags: newTags.length > 0 ? newTags : undefined });
  };

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <aside className={cn(
      "w-64 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 h-full overflow-y-auto",
      className
    )}>
      <div className="p-4 space-y-6">
        {/* Quick Filters */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{t('sidebar.quickFilters')}</h3>
          </div>
          <div className="space-y-1">
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.id}
                  variant={filter.active ? "secondary" : "ghost"}
                  size="sm"
                  onClick={filter.filter}
                  className={cn(
                    "w-full justify-between h-9",
                    filter.active && "bg-secondary",
                    filter.variant === "destructive" && filter.count > 0 && "text-destructive",
                    filter.variant === "warning" && filter.count > 0 && "text-warning"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{filter.label}</span>
                  </div>
                  <Badge 
                    variant={filter.active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {filter.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Clear Filters - Always visible at top */}
        {(filters.status || filters.priority || filters.tags || filters.dueDateFilter !== "all") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearFilters();
              setTagSearch("");
            }}
            className="w-full"
          >
            {t('sidebar.clearAllFilters')}
          </Button>
        )}

        <Separator />

        {/* Status Filters */}
        <div>
          <h3 className="text-sm font-medium mb-3">{t('sidebar.byStatus')}</h3>
          <div className="space-y-1">
            {statusFilters.map((filter) => {
              const isActive = filters.status?.includes(filter.status);
              return (
                <Button
                  key={filter.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleStatusFilter(filter.status)}
                  className="w-full justify-between h-8"
                >
                  <span className={cn("text-sm", filter.className)}>
                    {filter.label}
                  </span>
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {filter.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Priority Filters */}
        <div>
          <h3 className="text-sm font-medium mb-3">{t('sidebar.byPriority')}</h3>
          <div className="space-y-1">
            {priorityFilters.map((filter) => {
              const isActive = filters.priority?.includes(filter.priority);
              return (
                <Button
                  key={filter.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handlePriorityFilter(filter.priority)}
                  className="w-full justify-between h-8"
                >
                  <span className={cn("text-sm", filter.className)}>
                    {filter.label}
                  </span>
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {filter.count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Tags */}
        {uniqueTags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t('sidebar.byTags')}</h3>
            </div>
            
            {/* Tag Search Input */}
            {uniqueTags.length > 5 && (
              <div className="relative mb-3">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder={t('sidebar.searchTags')}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="pl-7 pr-7 h-8 text-xs"
                />
                {tagSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTagSearch("")}
                    className="absolute right-1 top-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredTags.length === 0 && tagSearch ? (
                <div className="text-xs text-muted-foreground text-center py-2">
                  {t('sidebar.noTagsFound')}
                </div>
              ) : (
                filteredTags.map(([tag, count]) => {
                  const isActive = filters.tags?.includes(tag);
                  return (
                    <Button
                      key={tag}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleTagFilter(tag)}
                      className="w-full justify-between h-8 text-left"
                    >
                      <span className="text-sm truncate">{tag}</span>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-xs ml-2"
                      >
                        {count}
                      </Badge>
                    </Button>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}