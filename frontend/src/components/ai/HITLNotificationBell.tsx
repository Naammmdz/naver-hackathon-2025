/**
 * HITL Notification Bell
 * 
 * Displays notification bell for pending HITL confirmation requests.
 * Polls backend for pending requests and shows dialog when clicked.
 */

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@clerk/clerk-react"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { hitlApi, type ConfirmationRequest } from "@/lib/api/hitlApi"
import { HITLConfirmationDialog } from "./HITLConfirmationDialog"
import { toast } from "sonner"

const POLL_INTERVAL_MS = 10000 // Poll every 10 seconds

export function HITLNotificationBell() {
  const { user } = useUser()
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId)
  const [pendingRequests, setPendingRequests] = useState<ConfirmationRequest[]>([])
  const [currentRequest, setCurrentRequest] = useState<ConfirmationRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Poll for pending requests
  useEffect(() => {
    if (!user?.id || !activeWorkspaceId) {
      setPendingRequests([])
      return
    }

    const fetchPendingRequests = async () => {
      try {
        const response = await hitlApi.getPendingRequests(activeWorkspaceId, user.id)
        setPendingRequests(response.requests)

        // Auto-show dialog for critical/high severity requests
        if (response.requests.length > 0 && !isDialogOpen) {
          const urgentRequest = response.requests.find(
            (req) => req.severity === "critical" || req.severity === "high"
          )
          if (urgentRequest && !currentRequest) {
            setCurrentRequest(urgentRequest)
            setIsDialogOpen(true)
          }
        }
      } catch (error) {
        console.error("Failed to fetch pending HITL requests:", error)
      }
    }

    // Initial fetch
    fetchPendingRequests()

    // Set up polling
    const interval = setInterval(fetchPendingRequests, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [user?.id, activeWorkspaceId, isDialogOpen, currentRequest])

  const handleBellClick = () => {
    if (pendingRequests.length > 0) {
      setCurrentRequest(pendingRequests[0])
      setIsDialogOpen(true)
    }
  }

  const handleSubmitResponse = async (
    requestId: string,
    selectedOption: string,
    comment?: string
  ) => {
    setIsSubmitting(true)
    try {
      await hitlApi.submitResponse({
        request_id: requestId,
        selected_option: selectedOption,
        user_comment: comment,
      })

      toast.success("Response submitted successfully!")

      // Remove this request from pending list
      setPendingRequests((prev) => prev.filter((req) => req.request_id !== requestId))

      // Show next request if available
      const remaining = pendingRequests.filter((req) => req.request_id !== requestId)
      if (remaining.length > 0) {
        setCurrentRequest(remaining[0])
      } else {
        setCurrentRequest(null)
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("Failed to submit response:", error)
      toast.error("Failed to submit response. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setCurrentRequest(null)
  }

  if (!user?.id || !activeWorkspaceId) {
    return null
  }

  const pendingCount = pendingRequests.length

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={handleBellClick}
        title={pendingCount > 0 ? `${pendingCount} pending confirmation${pendingCount > 1 ? 's' : ''}` : "No pending confirmations"}
      >
        <Bell className="h-5 w-5" />
        {pendingCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
          >
            {pendingCount > 9 ? "9+" : pendingCount}
          </Badge>
        )}
      </Button>

      <HITLConfirmationDialog
        request={currentRequest}
        open={isDialogOpen}
        onClose={handleDialogClose}
        onSubmit={handleSubmitResponse}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
