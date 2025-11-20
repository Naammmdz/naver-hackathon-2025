import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceFilter } from "@/hooks/use-workspace-filter";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/taskStore";
import type { TaskStatus } from "@/types/task";
import { AlertCircle, Calendar, CheckSquare, ChevronLeft, Clock, Filter, Search, Tag, Zap } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface AppSidebarProps {
  className?: string;
  onSmartCreate?: () => void;
  onToggleCollapse?: () => void;
}

export function AppSidebar({ className, onSmartCreate, onToggleCollapse }: AppSidebarProps) {
  const { t } = useTranslation();
  const {
    tasks,
    filters,
    setFilters,
    clearFilters,
    sidebarCollapsed,
    isLoading,
    error,
  } = useTaskStore((state) => ({
    tasks: state.tasks,
    filters: state.filters,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    sidebarCollapsed: state.sidebarCollapsed,
    isLoading: state.isLoading,
    error: state.error,
  }));

  // Filter tasks by active workspace
  const workspaceFilteredTasks = useWorkspaceFilter(tasks);

  const [tagSearch, setTagSearch] = useState("");

  const counts = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const summary = {
      total: workspaceFilteredTasks.length,
      todo: 0,
      progress: 0,
      done: 0,
      high: 0,
      medium: 0,
      low: 0,
      overdue: 0,
      today: 0,
      thisWeek: 0,
    };

    workspaceFilteredTasks.forEach((task) => {
      summary.todo += task.status === "Todo" ? 1 : 0;
      summary.progress += task.status === "In Progress" ? 1 : 0;
      summary.done += task.status === "Done" ? 1 : 0;

      summary.high += task.priority === "High" ? 1 : 0;
      summary.medium += task.priority === "Medium" ? 1 : 0;
      summary.low += task.priority === "Low" ? 1 : 0;

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        if (due < now) summary.overdue += 1;
        if (due.toDateString() === today.toDateString()) summary.today += 1;
        if (due >= today && due <= weekFromNow) summary.thisWeek += 1;
      }
    });

    return summary;
  }, [workspaceFilteredTasks]);

  const tagCounts = useMemo(() => {
    const countsRecord = new Map<string, number>();
    workspaceFilteredTasks.forEach((task) => {
      task.tags.forEach((tag) => countsRecord.set(tag, (countsRecord.get(tag) ?? 0) + 1));
    });
    return Array.from(countsRecord.entries()).sort((a, b) => b[1] - a[1]);
  }, [workspaceFilteredTasks]);

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) {
      return tagCounts;
    }
    const search = tagSearch.toLowerCase();
    return tagCounts.filter(([tag]) => tag.toLowerCase().includes(search));
  }, [tagCounts, tagSearch]);

  const displayedTags = useMemo(() => filteredTags.slice(0, 8), [filteredTags]);

  const openTaskForm = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("openTaskForm"));
    }
  }, []);

  const handleStatusFilter = useCallback(
    (status: TaskStatus) => {
      const currentStatus = filters.status ?? [];
      const nextStatus = currentStatus.includes(status)
        ? currentStatus.filter((value) => value !== status)
        : [...currentStatus, status];
      setFilters({ status: nextStatus.length > 0 ? nextStatus : undefined });
    },
    [filters.status, setFilters],
  );

  const handlePriorityFilter = useCallback(
    (priority: "High" | "Medium" | "Low") => {
      const currentPriorities = filters.priority ?? [];
      const nextPriorities = currentPriorities.includes(priority)
        ? currentPriorities.filter((value) => value !== priority)
        : [...currentPriorities, priority];
      setFilters({ priority: nextPriorities.length > 0 ? nextPriorities : undefined });
    },
    [filters.priority, setFilters],
  );

  const handleTagFilter = useCallback(
    (tag: string) => {
      const currentTags = filters.tags ?? [];
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((value) => value !== tag)
        : [...currentTags, tag];
      setFilters({ tags: nextTags.length > 0 ? nextTags : undefined });
    },
    [filters.tags, setFilters],
  );

  const quickFilters = useMemo(
    () => [
      {
        id: "all",
        label: t("components.AppSidebar.allTasks"),
        icon: CheckSquare,
        count: counts.total,
        active: !filters.status && !filters.priority && !filters.tags && filters.dueDateFilter === "all",
        onClick: () => {
          clearFilters();
          setTagSearch("");
        },
      },
      {
        id: "overdue",
        label: t("components.AppSidebar.overdue"),
        icon: AlertCircle,
        count: counts.overdue,
        active: filters.dueDateFilter === "overdue",
        onClick: () => setFilters({ dueDateFilter: "overdue" }),
        badgeVariant: counts.overdue > 0 ? "destructive" : "secondary",
      },
      {
        id: "today",
        label: t("components.AppSidebar.today"),
        icon: Calendar,
        count: counts.today,
        active: filters.dueDateFilter === "today",
        onClick: () => setFilters({ dueDateFilter: "today" }),
        badgeVariant: counts.today > 0 ? "default" : "secondary",
      },
      {
        id: "week",
        label: t("components.AppSidebar.sevenDays"),
        icon: Clock,
        count: counts.thisWeek,
        active: filters.dueDateFilter === "thisWeek",
        onClick: () => setFilters({ dueDateFilter: "thisWeek" }),
        badgeVariant: counts.thisWeek > 0 ? "default" : "secondary",
      },
    ],
    [clearFilters, counts, filters.dueDateFilter, filters.priority, filters.status, filters.tags, setFilters, t],
  );

  const priorityPalette = useMemo(
    () => [
      { id: "High", label: t("components.AppSidebar.priorityHigh"), token: "--priority-high", count: counts.high },
      { id: "Medium", label: t("components.AppSidebar.priorityMedium"), token: "--priority-medium", count: counts.medium },
      { id: "Low", label: t("components.AppSidebar.priorityLow"), token: "--priority-low", count: counts.low },
    ],
    [counts.high, counts.low, counts.medium, t],
  );

  const getPriorityColor = useCallback((token: string) => `hsl(var(${token}))`, []);

  const statusPalette = useMemo(
    () => [
      {
        id: "Todo",
        label: t("components.AppSidebar.statusPlanning"),
        count: counts.todo,
        colors: {
          base: "hsl(215 16% 47%)",
          tint: "hsla(215, 16%, 47%, 0.12)",
          border: "hsla(215, 16%, 47%, 0.25)",
        },
      },
      {
        id: "In Progress",
        label: t("components.AppSidebar.statusInProgress"),
        count: counts.progress,
        colors: {
          base: "hsl(38 92% 52%)",
          tint: "hsla(38, 92%, 52%, 0.16)",
          border: "hsla(38, 92%, 52%, 0.28)",
        },
      },
      {
        id: "Done",
        label: t("components.AppSidebar.statusDone"),
        count: counts.done,
        colors: {
          base: "hsl(142 72% 38%)",
          tint: "hsla(142, 72%, 38%, 0.18)",
          border: "hsla(142, 72%, 38%, 0.3)",
        },
      },
    ],
    [counts.done, counts.progress, counts.todo, t],
  );

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative z-10 hidden h-full w-64 flex-col bg-sidebar/90 text-sidebar-foreground rounded-3xl shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:shadow-[0_28px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:flex",
        className,
      )}
    >
      <div className="border-b border-sidebar-border/40 px-3 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-sidebar-foreground">{t("components.AppSidebar.title")}</h2>
          <div className="flex items-center gap-2">
            {onToggleCollapse && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 rounded-full border border-sidebar-border/50 bg-card/80 p-0 text-muted-foreground shadow-sm hover:text-primary hover:border-primary/50"
                onClick={onToggleCollapse}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">{t("components.AppSidebar.hideSidebar")}</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full p-0"
              onClick={onSmartCreate}
              disabled={isLoading}
            >
              <Zap className="h-4 w-4" />
              <span className="sr-only">{t("components.AppSidebar.smartCreate")}</span>
            </Button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-sidebar-foreground/60" />
          <Input
            placeholder={t("components.AppSidebar.searchTaskPlaceholder")}
            value={filters.search ?? ""}
            onChange={(event) => setFilters({ search: event.target.value })}
            className="h-8 rounded-lg border border-transparent bg-sidebar/40 pl-8 pr-3 text-xs focus-visible:ring-sidebar-ring/30 focus-visible:border-sidebar-ring/40"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 pr-1">
        <div className="space-y-4 px-3 py-4">
          <section>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-sidebar-foreground/60" />
              <h3 className="text-sm font-medium text-sidebar-foreground">{t("components.AppSidebar.quickStatus")}</h3>
            </div>
            <div className="mt-2 space-y-1.5">
              {quickFilters.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={item.active ? "secondary" : "ghost"}
                    size="sm"
                    onClick={item.onClick}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-lg px-3 py-1 text-left text-xs",
                      item.active && "border border-primary/30 bg-primary/10 text-primary shadow-sm",
                    )}
                  >
                    <span className="flex items-center gap-2 text-left">
                      <Icon className="h-4 w-4 flex-shrink-0 text-sidebar-foreground/60 group-hover:text-primary" />
                      <span className="whitespace-normal text-left leading-relaxed">
                        {item.label}
                      </span>
                    </span>
                    <Badge
                      variant={(item.badgeVariant as "default" | "secondary" | "destructive") ?? "secondary"}
                      className="ml-2 shrink-0"
                    >
                      {item.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-medium text-foreground">{t("components.AppSidebar.byStatus")}</h3>
            <div className="space-y-1.5 text-xs">
              {statusPalette.map((status) => {
                const isActive = filters.status?.includes(status.id as TaskStatus);
                return (
                  <Button
                    key={status.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusFilter(status.id as TaskStatus)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-1 text-[11px]",
                      isActive
                        ? "border border-transparent"
                        : "border border-transparent hover:bg-muted/40",
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: status.colors.tint,
                            color: status.colors.base,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="whitespace-normal text-left leading-tight text-[inherit]"
                      style={{ color: status.colors.base }}
                    >
                      {status.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-border/50 px-2 py-0.5 text-[10px] font-semibold",
                        isActive && "bg-transparent",
                      )}
                      style={
                        isActive
                          ? {
                              color: "inherit",
                              borderColor: status.colors.border,
                            }
                          : { color: status.colors.base }
                      }
                    >
                      {status.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-medium text-foreground">{t("components.AppSidebar.byPriority")}</h3>
            <div className="space-y-1.5 text-xs">
              {priorityPalette.map((priority) => {
                const isActive = filters.priority?.includes(priority.id as "High" | "Medium" | "Low");
                const priorityColor = getPriorityColor(priority.token);
                return (
                  <Button
                    key={priority.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePriorityFilter(priority.id as "High" | "Medium" | "Low")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-1 text-[11px]",
                      isActive
                        ? "border border-transparent"
                        : "border border-transparent hover:bg-muted/40",
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: `hsl(var(${priority.token}) / 0.18)`,
                            color: `hsl(var(${priority.token}))`,
                          }
                        : undefined
                    }
                    aria-pressed={isActive}
                  >
                    <span
                      className="whitespace-normal text-left leading-tight text-[inherit]"
                      style={{ color: priorityColor }}
                    >
                      {priority.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-border/50 px-2 py-0.5 text-[10px] font-semibold",
                        isActive && "bg-transparent",
                      )}
                      style={
                        isActive
                          ? {
                              color: "inherit",
                              borderColor: `hsl(var(${priority.token}) / 0.35)`,
                            }
                          : { color: priorityColor }
                      }
                    >
                      {priority.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </section>

          {tagCounts.length > 0 && (
            <>
              <Separator />

              <section>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-sidebar-foreground/60" />
                  <h3 className="text-sm font-medium text-sidebar-foreground">{t("components.AppSidebar.byTags")}</h3>
                </div>
                {tagCounts.length > 5 && (
                  <div className="relative mt-3">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-sidebar-foreground/60" />
                    <Input
                      placeholder={t("components.AppSidebar.searchTagsPlaceholder")}
                      value={tagSearch}
                      onChange={(event) => setTagSearch(event.target.value)}
                      className="h-8 rounded-lg border border-transparent bg-sidebar/35 pl-7 pr-2 text-[11px] focus-visible:ring-sidebar-ring/30 focus-visible:border-sidebar-ring/40"
                    />
                  </div>
                )}
                <div className="mt-2 space-y-1 pr-0.5 text-[11px]">
                  {filteredTags.length === 0 ? (
                    <p className="py-3 text-center text-xs text-sidebar-foreground/60">{t("components.AppSidebar.noTagsFound")}</p>
                  ) : (
                    displayedTags.map(([tag, count]) => {
                      const isActive = filters.tags?.includes(tag);
                      return (
                        <Button
                          key={tag}
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => handleTagFilter(tag)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-1 text-[11px]",
                            isActive && "border border-primary/30 bg-primary/10 text-primary",
                          )}
                        >
                          <span className="truncate">{tag}</span>
                          <Badge variant={isActive ? "default" : "secondary"}>{count}</Badge>
                        </Button>
                      );
                    })
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>

    </div>
  );
}
