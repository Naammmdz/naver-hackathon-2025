/**
 * TaskAnalysisDisplay Component
 * 
 * Displays SQL query results from Task Agent responses.
 * Shows task analysis data in formatted tables with insights.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslation } from "react-i18next"

interface TaskAnalysisData {
  rows?: Record<string, unknown>[]
  results?: Record<string, unknown>[]
  summary?: string
  insights?: string
  risks?: Array<{
    severity: string
    title?: string
    type?: string
    description?: string
    message?: string
    affected_tasks?: number
  }>
  stats?: Record<string, unknown>
  statistics?: Record<string, unknown>
}

interface TaskAnalysisDisplayProps {
  /** Analysis data from Task Agent */
  data: TaskAnalysisData | Record<string, unknown>[] | null | undefined
  /** Optional title */
  title?: string
  /** Optional description */
  description?: string
  /** CSS class for container */
  className?: string
}

export function TaskAnalysisDisplay({
  data,
  title,
  description,
  className = "",
}: TaskAnalysisDisplayProps) {
  const { t } = useTranslation()

  const displayTitle = title || t("components.TaskAnalysisDisplay.taskAnalysis")
  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t("components.TaskAnalysisDisplay.noAnalysisDataAvailable")}</AlertDescription>
      </Alert>
    )
  }

  // Handle different data formats from Task Agent
  const rows = Array.isArray(data) ? data : data.rows || data.results || []
  const summary = !Array.isArray(data) && (data.summary || data.insights) || null
  const risks = !Array.isArray(data) && data.risks || []
  const stats = !Array.isArray(data) && (data.stats || data.statistics) || null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{displayTitle}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-sm text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="text-2xl font-bold">{String(value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Risk Indicators */}
        {risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {t("components.TaskAnalysisDisplay.detectedRisks")}
            </h4>
            <div className="space-y-2">
              {risks.map((risk, idx: number) => (
                <Alert key={idx} variant={risk.severity === "high" ? "destructive" : "default"}>
                  <AlertDescription className="flex items-start gap-2">
                    {risk.severity === "high" ? (
                      <TrendingDown className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-yellow-500 mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium">{risk.title || risk.type}</div>
                      <div className="text-sm">{risk.description || risk.message}</div>
                      {risk.affected_tasks && (
                        <Badge variant="outline" className="mt-1">
                          {risk.affected_tasks} {t("components.TaskAnalysisDisplay.tasksAffected")}
                        </Badge>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {summary && (
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t("components.TaskAnalysisDisplay.aiInsights")}
            </h4>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        )}

        {/* Data Table */}
        {rows.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("components.TaskAnalysisDisplay.queryResults")}</h4>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(rows[0]).map((key) => (
                      <TableHead key={key} className="capitalize">
                        {key.replace(/_/g, " ")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx: number) => (
                    <TableRow key={idx}>
                      {Object.entries(row).map(([key, value]) => (
                        <TableCell key={key}>
                          {renderCellValue(key, value, t)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                {t("components.TaskAnalysisDisplay.showingResults", { count: rows.length })}
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {rows.length === 0 && !summary && !stats && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("components.TaskAnalysisDisplay.noDataToDisplay")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Helper function to render cell values with appropriate formatting
 */
function renderCellValue(key: string, value: unknown, t: (key: string) => string): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">{t("components.TaskAnalysisDisplay.nullValue")}</span>
  }

  // Status badges
  if (key === "status") {
    const statusColors: Record<string, string> = {
      todo: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      in_review: "bg-purple-100 text-purple-800",
      blocked: "bg-red-100 text-red-800",
      done: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
    }
    const color = statusColors[String(value).toLowerCase()] || "bg-gray-100 text-gray-800"
    return (
      <Badge variant="outline" className={color}>
        {String(value).replace(/_/g, " ")}
      </Badge>
    )
  }

  // Priority badges
  if (key === "priority") {
    const priorityColors: Record<string, string> = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    }
    const color = priorityColors[String(value).toLowerCase()] || "bg-gray-100 text-gray-800"
    return (
      <Badge variant="outline" className={color}>
        {String(value)}
      </Badge>
    )
  }

  // Dates
  if (key.includes("date") || key.includes("time") || key.includes("at")) {
    try {
      if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return <span className="text-sm">{date.toLocaleDateString()}</span>
        }
      }
    } catch {
      // Fall through to default
    }
  }

  // Numbers
  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>
  }

  // Booleans
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <span className="text-muted-foreground">{t("components.TaskAnalysisDisplay.nullValue")}</span>
    )
  }

  // Default: string
  return <span className="text-sm">{String(value)}</span>
}
