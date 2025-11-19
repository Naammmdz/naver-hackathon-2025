/**
 * HITL (Human-in-the-Loop) Confirmation Dialog
 * 
 * Displays confirmation requests from AI agents requiring user approval
 * before executing potentially risky operations.
 */

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, Info, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface ActionOption {
  action_key: string
  label: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  reversible: boolean
}

export interface ConfirmationRequest {
  request_id: string
  action_type: string
  severity: "low" | "medium" | "high" | "critical"
  description: string
  estimated_impact: string
  options: ActionOption[]
  created_at: string
  expires_at: string
  time_remaining_seconds: number
}

interface HITLConfirmationDialogProps {
  /** The confirmation request to display */
  request: ConfirmationRequest | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog closes */
  onClose: () => void
  /** Callback when user submits response */
  onSubmit: (requestId: string, selectedOption: string, comment?: string) => Promise<void>
  /** Loading state during submission */
  isSubmitting?: boolean
}

export function HITLConfirmationDialog({
  request,
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}: HITLConfirmationDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [comment, setComment] = useState("")
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Update time remaining countdown
  useEffect(() => {
    if (!request || !open) return

    setTimeRemaining(request.time_remaining_seconds)

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1
        if (newTime <= 0) {
          clearInterval(interval)
          onClose() // Auto-close on timeout
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [request, open, onClose])

  // Reset state when request changes
  useEffect(() => {
    if (request) {
      setSelectedOption("")
      setComment("")
    }
  }, [request])

  if (!request) return null

  const handleSubmit = async () => {
    if (!selectedOption) return
    await onSubmit(request.request_id, selectedOption, comment || undefined)
    onClose()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-primary/10 text-primary border-primary/20"
      case "medium":
        return "bg-warning/10 text-warning border-warning/20"
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "critical":
        return "bg-destructive text-destructive-foreground border-destructive"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "low":
        return <Info className="h-4 w-4" />
      case "medium":
      case "high":
        return <AlertTriangle className="h-4 w-4" />
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">AI Agent Confirmation Required</DialogTitle>
              <DialogDescription className="mt-2">
                The AI agent has detected a risky operation and needs your approval before proceeding.
              </DialogDescription>
            </div>
            <Badge variant="outline" className={cn("flex items-center gap-1", getSeverityColor(request.severity))}>
              {getSeverityIcon(request.severity)}
              {request.severity.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Time Remaining */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Time remaining: <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
              </span>
            </div>

            {/* Action Description */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Proposed Action
              </h3>
              <p className="text-base">{request.description}</p>
            </div>

            {/* Estimated Impact */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Estimated Impact
              </h3>
              <p className="text-sm text-muted-foreground">{request.estimated_impact}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Choose Your Response
              </Label>
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                {request.options.map((option) => (
                  <div
                    key={option.action_key}
                    className={cn(
                      "relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all",
                      selectedOption === option.action_key
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedOption(option.action_key)}
                  >
                    <RadioGroupItem value={option.action_key} id={option.action_key} className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={option.action_key} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        <Badge variant="outline" className={cn("text-[10px]", getSeverityColor(option.severity))}>
                          {option.severity}
                        </Badge>
                        {option.reversible && (
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Reversible
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Optional Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm">
                Additional Comments (Optional)
              </Label>
              <Textarea
                id="comment"
                placeholder="Provide any additional context or reasoning for your decision..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedOption || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <span className="animate-pulse">Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
