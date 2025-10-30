import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/taskStore";
import type { TaskStatus } from "@/types/task";
import { AlertCircle, Calendar, CheckSquare, Clock, Filter, Search, Tag, Zap } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface AppSidebarProps {
  className?: string;
  onSmartCreate?: () => void;
}

export function AppSidebar({ className, onSmartCreate }: AppSidebarProps) {
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

  const [tagSearch, setTagSearch] = useState("");

  const counts = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const summary = {
      total: tasks.length,
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

    tasks.forEach((task) => {
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
  }, [tasks]);

  const tagCounts = useMemo(() => {
    const countsRecord = new Map<string, number>();
    tasks.forEach((task) => {
      task.tags.forEach((tag) => countsRecord.set(tag, (countsRecord.get(tag) ?? 0) + 1));
    });
    return Array.from(countsRecord.entries()).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

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
        label: "Tất cả công việc",
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
        label: "Quá hạn",
        icon: AlertCircle,
        count: counts.overdue,
        active: filters.dueDateFilter === "overdue",
        onClick: () => setFilters({ dueDateFilter: "overdue" }),
        badgeVariant: counts.overdue > 0 ? "destructive" : "secondary",
      },
      {
        id: "today",
        label: "Hôm nay",
        icon: Calendar,
        count: counts.today,
        active: filters.dueDateFilter === "today",
        onClick: () => setFilters({ dueDateFilter: "today" }),
        badgeVariant: counts.today > 0 ? "default" : "secondary",
      },
      {
        id: "week",
        label: "7 ngày tới",
        icon: Clock,
        count: counts.thisWeek,
        active: filters.dueDateFilter === "thisWeek",
        onClick: () => setFilters({ dueDateFilter: "thisWeek" }),
        badgeVariant: counts.thisWeek > 0 ? "default" : "secondary",
      },
    ],
    [clearFilters, counts, filters.dueDateFilter, filters.priority, filters.status, filters.tags, setFilters],
  );

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative z-10 hidden w-64 flex-col border-r bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 lg:flex",
        className,
      )}
    >
      <div className="border-b px-3 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Task</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 rounded-full p-0"
              onClick={onSmartCreate}
              disabled={isLoading}
            >
              <Zap className="h-4 w-4" />
              <span className="sr-only">Smart Create</span>
            </Button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm task..."
            value={filters.search ?? ""}
            onChange={(event) => setFilters({ search: event.target.value })}
            className="h-8 rounded-lg border-0 bg-muted/60 pl-8 pr-3 text-xs focus:bg-background"
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
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Trạng thái nhanh</h3>
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
                      <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
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
            <h3 className="mb-2 text-sm font-medium text-foreground">Theo tình trạng</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { id: "Todo", label: "Đang lên kế hoạch", count: counts.todo },
                { id: "In Progress", label: "Đang thực hiện", count: counts.progress },
                { id: "Done", label: "Hoàn thành", count: counts.done },
              ].map((status) => {
                const isActive = filters.status?.includes(status.id as TaskStatus);
                return (
                  <Button
                    key={status.id}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleStatusFilter(status.id as TaskStatus)}
                    className={cn("flex w-full items-center justify-between rounded-lg px-3 py-1 text-[11px]", {
                      "border border-primary/30 bg-primary/10 text-primary": isActive,
                    })}
                  >
                    <span className="whitespace-normal text-left leading-tight">{status.label}</span>
                    <Badge variant={isActive ? "default" : "secondary"}>{status.count}</Badge>
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-medium text-foreground">Theo độ ưu tiên</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { id: "High", label: "Cao", hue: "text-destructive", count: counts.high },
                { id: "Medium", label: "Trung bình", hue: "text-amber-500", count: counts.medium },
                { id: "Low", label: "Thấp", hue: "text-muted-foreground", count: counts.low },
              ].map((priority) => {
                const isActive = filters.priority?.includes(priority.id as "High" | "Medium" | "Low");
                return (
                  <Button
                    key={priority.id}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handlePriorityFilter(priority.id as "High" | "Medium" | "Low")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-1 text-[11px]",
                      isActive && "border border-primary/30 bg-primary/10 text-primary",
                    )}
                  >
                    <span className={cn(priority.hue, "whitespace-normal text-left leading-tight")}>
                      {priority.label}
                    </span>
                    <Badge variant={isActive ? "default" : "secondary"}>{priority.count}</Badge>
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
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">Theo thẻ</h3>
                </div>
                {tagCounts.length > 5 && (
                  <div className="relative mt-3">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm thẻ..."
                      value={tagSearch}
                      onChange={(event) => setTagSearch(event.target.value)}
                      className="h-8 rounded-lg bg-muted/50 pl-7 pr-2 text-[11px]"
                    />
                  </div>
                )}
                <div className="mt-2 space-y-1 pr-0.5 text-[11px]">
                  {filteredTags.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">Không tìm thấy thẻ phù hợp.</p>
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
