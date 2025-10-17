import { useMemo } from "react";
import { useTaskStore } from "@/store/taskStore";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { 
  isToday, 
  isThisWeek, 
  isThisMonth, 
  startOfDay, 
  endOfDay, 
  differenceInDays,
  parseISO
} from "date-fns";

export interface AnalyticsData {
  // Basic counts
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  
  // Status breakdown
  statusBreakdown: {
    todo: number;
    inProgress: number;
    done: number;
  };
  
  // Priority breakdown
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  
  // Time-based analytics
  tasksCreatedToday: number;
  tasksCompletedToday: number;
  tasksCreatedThisWeek: number;
  tasksCompletedThisWeek: number;
  tasksCreatedThisMonth: number;
  tasksCompletedThisMonth: number;
  
  // Productivity metrics
  completionRate: number;
  averageTaskAge: number;
  averageCompletionTime: number;
  
  // Tag analytics
  topTags: Array<{ tag: string; count: number }>;
  
  // Trends (daily data for charts)
  dailyCreatedTasks: Array<{ date: string; count: number }>;
  dailyCompletedTasks: Array<{ date: string; count: number }>;
  
  // Performance indicators
  productivityScore: number;
  streakDays: number;
}

export function useAnalytics(): AnalyticsData {
  const { tasks } = useTaskStore();
  
  return useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    // Helper function to safely parse dates
    const parseDate = (dateValue: Date | string): Date => {
      if (typeof dateValue === 'string') {
        return parseISO(dateValue);
      }
      return dateValue;
    };
    
    // Basic counts
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === "Done").length;
    const pendingTasks = tasks.filter(task => task.status !== "Done").length;
    
    // Overdue tasks
    const overdueTasks = tasks.filter(task => {
      if (!task.dueDate || task.status === "Done") return false;
      const dueDate = parseDate(task.dueDate);
      return dueDate < today;
    }).length;
    
    // Status breakdown
    const statusBreakdown = {
      todo: tasks.filter(task => task.status === "Todo").length,
      inProgress: tasks.filter(task => task.status === "In Progress").length,
      done: completedTasks,
    };
    
    // Priority breakdown
    const priorityBreakdown = {
      high: tasks.filter(task => task.priority === "High").length,
      medium: tasks.filter(task => task.priority === "Medium").length,
      low: tasks.filter(task => task.priority === "Low").length,
    };
    
    // Time-based analytics
    const tasksCreatedToday = tasks.filter(task => isToday(parseDate(task.createdAt))).length;
    const tasksCompletedToday = tasks.filter(task => 
      task.status === "Done" && isToday(parseDate(task.updatedAt))
    ).length;
    
    const tasksCreatedThisWeek = tasks.filter(task => isThisWeek(parseDate(task.createdAt))).length;
    const tasksCompletedThisWeek = tasks.filter(task => 
      task.status === "Done" && isThisWeek(parseDate(task.updatedAt))
    ).length;
    
    const tasksCreatedThisMonth = tasks.filter(task => isThisMonth(parseDate(task.createdAt))).length;
    const tasksCompletedThisMonth = tasks.filter(task => 
      task.status === "Done" && isThisMonth(parseDate(task.updatedAt))
    ).length;
    
    // Productivity metrics
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Average task age (in days)
    const averageTaskAge = tasks.length > 0 
      ? tasks.reduce((acc, task) => acc + differenceInDays(now, parseDate(task.createdAt)), 0) / tasks.length 
      : 0;
    
    // Average completion time (for completed tasks)
    const completedTasksWithTime = tasks.filter(task => task.status === "Done");
    const averageCompletionTime = completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((acc, task) => 
          acc + differenceInDays(parseDate(task.updatedAt), parseDate(task.createdAt)), 0
        ) / completedTasksWithTime.length
      : 0;
    
    // Tag analytics
    const tagCounts = new Map<string, number>();
    tasks.forEach(task => {
      task.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Daily trends (last 30 days)
    const dailyData = new Map<string, { created: number; completed: number }>();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData.set(dateStr, { created: 0, completed: 0 });
    }
    
    // Count tasks for each day
    tasks.forEach(task => {
      const createdDate = parseDate(task.createdAt).toISOString().split('T')[0];
      if (dailyData.has(createdDate)) {
        const data = dailyData.get(createdDate)!;
        data.created++;
      }
      
      if (task.status === "Done") {
        const completedDate = parseDate(task.updatedAt).toISOString().split('T')[0];
        if (dailyData.has(completedDate)) {
          const data = dailyData.get(completedDate)!;
          data.completed++;
        }
      }
    });
    
    const dailyCreatedTasks = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      count: data.created,
    }));
    
    const dailyCompletedTasks = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      count: data.completed,
    }));
    
    // Productivity score (0-100)
    // Based on completion rate, recent activity, and overdue tasks
    const recentActivityScore = Math.min(tasksCompletedThisWeek * 10, 40);
    const completionScore = Math.min(completionRate * 0.4, 40);
    const overduePenalty = Math.max(0, 20 - (overdueTasks * 5));
    const productivityScore = Math.round(recentActivityScore + completionScore + overduePenalty);
    
    // Streak calculation (consecutive days with at least one completed task)
    let streakDays = 0;
    let currentDate = new Date(now);
    
    while (streakDays < 30) { // Max 30 days lookback
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayCompleted = tasks.some(task => 
        task.status === "Done" && 
        parseDate(task.updatedAt).toISOString().split('T')[0] === dateStr
      );
      
      if (!dayCompleted) break;
      
      streakDays++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      statusBreakdown,
      priorityBreakdown,
      tasksCreatedToday,
      tasksCompletedToday,
      tasksCreatedThisWeek,
      tasksCompletedThisWeek,
      tasksCreatedThisMonth,
      tasksCompletedThisMonth,
      completionRate,
      averageTaskAge,
      averageCompletionTime,
      topTags,
      dailyCreatedTasks,
      dailyCompletedTasks,
      productivityScore,
      streakDays,
    };
  }, [tasks]);
}
