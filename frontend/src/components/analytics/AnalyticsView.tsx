import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAnalytics } from "@/hooks/use-analytics";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
    Activity,
    AlertTriangle,
    Award,
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    Tag,
    Target,
    TrendingUp
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

// Simple chart components using CSS and HTML
interface SimpleBarChartProps {
  data: Array<{ date: string; count: number }>;
  color: string;
  height?: number;
}

function SimpleBarChart({ data, color, height = 120 }: SimpleBarChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.slice(-14).map((item, index) => (
        <div key={item.date} className="flex flex-col items-center flex-1 group relative">
          <div
            className={cn("w-full rounded-t-sm transition-opacity hover:opacity-80 cursor-pointer", color)}
            style={{
              height: `${(item.count / maxCount) * (height - 30)}px`,
              minHeight: item.count > 0 ? "2px" : "0px",
            }}
            title={`${formatDate(item.date, "MMM dd")}: ${item.count} task${item.count !== 1 ? 's' : ''}`}
          />
          
          {/* Hover tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded-md text-xs font-medium shadow-md border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            <div className="text-center">
              <div className="font-semibold">{item.count}</div>
              <div className="text-muted-foreground">{formatDate(item.date, "MMM dd")}</div>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-border"></div>
          </div>
          
          <span className="text-xs text-muted-foreground mt-1">
            {formatDate(item.date, "dd")}
          </span>
        </div>
      ))}
    </div>
  );
}

interface StackedBarChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  height?: number;
  showLabels?: boolean;
}

function StackedBarChart({ data, height = 40, showLabels = true }: StackedBarChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="space-y-3">
        <div 
          className="rounded-md bg-muted flex items-center justify-center"
          style={{ height }}
        >
          <span className="text-sm text-muted-foreground">No data</span>
        </div>
        {showLabels && (
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.label}</span>
                <span className="text-sm font-medium">0</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex rounded-md overflow-hidden" style={{ height }}>
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          return (
            <div
              key={index}
              className="flex items-center justify-center text-white text-xs font-medium transition-all hover:opacity-80"
              style={{
                width: `${percentage}%`,
                backgroundColor: item.color,
                minWidth: percentage > 0 ? "1px" : "0px",
              }}
              title={`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`}
            >
              {percentage > 15 ? item.value : ""}
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
              <span className="text-xs text-muted-foreground">
                ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
}

function DonutChart({ data, size = 120 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div 
        className="rounded-full bg-muted flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-sm text-muted-foreground">No data</span>
      </div>
    );
  }
  
  let cumulativePercentage = 0;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 20) / 2}
          fill="transparent"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const dashArray = `${percentage} ${100 - percentage}`;
          const dashOffset = -cumulativePercentage;
          
          cumulativePercentage += percentage;
          
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={(size - 20) / 2}
              fill="transparent"
              stroke={item.color}
              strokeWidth="10"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold">{total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color?: string;
}

function StatCard({ title, value, icon, trend, color = "blue" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className={cn(
                "flex items-center text-xs mt-1",
                trend.isPositive ? "text-primary" : "text-destructive"
              )}>
                <TrendingUp className={cn(
                  "h-3 w-3 mr-1",
                  !trend.isPositive && "rotate-180"
                )} />
                {trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-full",
            color === "blue" && "bg-secondary text-secondary-foreground",
            color === "green" && "bg-primary text-primary-foreground", 
            color === "orange" && "bg-muted text-foreground",
            color === "red" && "bg-destructive text-destructive-foreground"
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsView() {
  const { t } = useTranslation();
  const analytics = useAnalytics();
  
  const statusChartData = useMemo(() => [
    { 
      label: t('tasks.status.todo'), 
      value: analytics.statusBreakdown.todo, 
      color: "hsl(var(--chart-1))" 
    },
    { 
      label: t('tasks.status.inProgress'), 
      value: analytics.statusBreakdown.inProgress, 
      color: "hsl(var(--chart-2))" 
    },
    { 
      label: t('tasks.status.done'), 
      value: analytics.statusBreakdown.done, 
      color: "hsl(var(--chart-3))" 
    },
  ], [analytics.statusBreakdown, t]);
  
  const priorityChartData = useMemo(() => [
    { 
      label: t('tasks.priority.high'), 
      value: analytics.priorityBreakdown.high, 
      color: "hsl(var(--priority-high))" 
    },
    { 
      label: t('tasks.priority.medium'), 
      value: analytics.priorityBreakdown.medium, 
      color: "hsl(var(--priority-medium))" 
    },
    { 
      label: t('tasks.priority.low'), 
      value: analytics.priorityBreakdown.low, 
      color: "hsl(var(--priority-low))" 
    },
  ], [analytics.priorityBreakdown, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
          <p className="text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Activity className="h-3 w-3 mr-1" />
          {t('analytics.productivityScore')}: {analytics.productivityScore}/100
        </Badge>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('analytics.totalTasks')}
          value={analytics.totalTasks}
          icon={<BarChart3 className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={t('analytics.completedTasks')}
          value={analytics.completedTasks}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title={t('analytics.pendingTasks')}
          value={analytics.pendingTasks}
          icon={<Clock className="h-5 w-5" />}
          color="orange"
        />
        <StatCard
          title={t('analytics.overdueTasks')}
          value={analytics.overdueTasks}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t('analytics.statusDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <DonutChart data={statusChartData} />
              <div className="space-y-2">
                {statusChartData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('analytics.priorityDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StackedBarChart data={priorityChartData} height={50} />
          </CardContent>
        </Card>
      </div>

      {/* Productivity Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {t('analytics.completionRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {analytics.completionRate.toFixed(1)}%
              </div>
              <Progress value={analytics.completionRate} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {analytics.completedTasks} {t('analytics.of')} {analytics.totalTasks} {t('analytics.taskCompletionText')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('analytics.averageTaskAge')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {analytics.averageTaskAge.toFixed(1)} {t('analytics.days')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('analytics.averageTaskAgeDescription')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('analytics.completionTime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {analytics.averageCompletionTime.toFixed(1)} {t('analytics.days')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('analytics.averageCompletionDescription')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.tasksCreated')} ({t('analytics.last14Days')})</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={analytics.dailyCreatedTasks} 
              color="bg-gradient-to-t from-[#60a5fa] to-[#3b82f6]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.tasksCompleted')} ({t('analytics.last14Days')})</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart 
              data={analytics.dailyCompletedTasks} 
              color="bg-gradient-to-t from-[#34d399] to-[#10b981]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{analytics.tasksCreatedToday}</div>
            <div className="text-sm text-muted-foreground">{t('analytics.createdToday')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{analytics.tasksCompletedToday}</div>
            <div className="text-sm text-muted-foreground">{t('analytics.completedToday')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{analytics.tasksCreatedThisWeek}</div>
            <div className="text-sm text-muted-foreground">{t('analytics.createdThisWeek')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{analytics.streakDays}</div>
            <div className="text-sm text-muted-foreground">{t('analytics.streakDays')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tags */}
      {analytics.topTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t('analytics.topTags')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.topTags.map((tag, index) => (
                <Badge key={tag.tag} variant="secondary" className="gap-1">
                  {tag.tag}
                  <span className="bg-primary/20 text-primary text-xs px-1 rounded">
                    {tag.count}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
