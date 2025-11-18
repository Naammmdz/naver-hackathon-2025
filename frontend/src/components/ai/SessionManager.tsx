/**
 * Session Management Component
 * 
 * Displays list of past conversation sessions and allows users to
 * continue previous chats or start new ones.
 */

import { useEffect, useState } from "react"
import { Calendar, MessageSquare, Plus, Trash2, MoreVertical, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { memoryApi, type SessionInfo } from "@/lib/api/memoryApi"
import { useUser } from "@clerk/clerk-react"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface SessionManagerProps {
  /** Currently active session ID */
  currentSessionId: string | null
  /** Callback when user selects a session */
  onSessionSelect: (sessionId: string | null) => void
  /** Whether dialog is open */
  open: boolean
  /** Callback when dialog closes */
  onClose: () => void
}

export function SessionManager({
  currentSessionId,
  onSessionSelect,
  open,
  onClose,
}: SessionManagerProps) {
  const { t } = useTranslation()
  const { user } = useUser()
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  // Load sessions (mock for now - in production, this would call an API)
  useEffect(() => {
    if (!open || !user?.id) return

    const loadSessions = async () => {
      setIsLoading(true)
      try {
        // Get sessions from localStorage (fallback)
        const storedSessions = localStorage.getItem('chat-sessions')
        if (storedSessions) {
          const parsed = JSON.parse(storedSessions) as SessionInfo[]
          setSessions(parsed.filter(s => s.user_id === user.id))
        }
      } catch (error) {
        console.error("Failed to load sessions:", error)
        toast.error("Failed to load sessions")
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [open, user?.id])

  const handleNewSession = async () => {
    if (!user?.id) return

    try {
      const newSession = await memoryApi.createSession(user.id)
      
      // Add to local list
      const updatedSessions = [newSession, ...sessions]
      setSessions(updatedSessions)
      
      // Save to localStorage
      localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions))
      
      // Select new session
      onSessionSelect(null) // null means create new
      localStorage.removeItem('global-ai-session-id')
      localStorage.removeItem('global-ai-chat-history')
      
      toast.success("New chat session created!")
      onClose()
    } catch (error) {
      console.error("Failed to create session:", error)
      toast.error("Failed to create new session")
    }
  }

  const handleSelectSession = (sessionId: string) => {
    onSessionSelect(sessionId)
    localStorage.setItem('global-ai-session-id', sessionId)
    toast.success("Session loaded!")
    onClose()
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await memoryApi.deleteSession(sessionId)
      
      // Remove from list
      const updatedSessions = sessions.filter(s => s.session_id !== sessionId)
      setSessions(updatedSessions)
      localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions))
      
      // If deleting current session, clear it
      if (sessionId === currentSessionId) {
        onSessionSelect(null)
        localStorage.removeItem('global-ai-session-id')
        localStorage.removeItem('global-ai-chat-history')
      }
      
      toast.success("Session deleted!")
      setSessionToDelete(null)
    } catch (error) {
      console.error("Failed to delete session:", error)
      toast.error("Failed to delete session")
    }
  }

  const filteredSessions = sessions.filter((session) =>
    searchQuery
      ? session.session_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return t("components.SessionManager.today")
    if (diffDays === 1) return t("components.SessionManager.yesterday")
    if (diffDays < 7) return t("components.SessionManager.daysAgo", { count: diffDays })
    return date.toLocaleDateString()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("components.SessionManager.chatSessions")}
            </DialogTitle>
            <DialogDescription>
              {t("components.SessionManager.viewPastConversations")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and New Session */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("components.SessionManager.searchSessions")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleNewSession} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("components.SessionManager.newSession")}
              </Button>
            </div>

            {/* Sessions List */}
            <ScrollArea className="h-[400px] rounded-md border">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">{t("components.SessionManager.loadingSessions")}</p>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm font-medium mb-2">
                    {searchQuery ? t("components.SessionManager.noMatchingSessions") : t("components.SessionManager.noChatSessionsYet")}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {searchQuery
                      ? t("components.SessionManager.tryDifferentSearchTerm")
                      : t("components.SessionManager.startNewConversation")}
                  </p>
                  {!searchQuery && (
                    <Button onClick={handleNewSession} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t("components.SessionManager.createFirstSession")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.session_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                        session.session_id === currentSessionId
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => handleSelectSession(session.session_id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                          <p className="text-sm font-medium truncate">
                            {session.session_id}
                          </p>
                          {session.session_id === currentSessionId && (
                            <Badge variant="default" className="text-[10px]">
                              {t("components.SessionManager.active")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(session.created_at)}
                          </span>
                          {session.message_count && (
                            <span>{session.message_count} {t("components.SessionManager.messages")}</span>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSessionToDelete(session.session_id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("components.SessionManager.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t("components.SessionManager.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("components.SessionManager.deleteSessionTitle")}</DialogTitle>
            <DialogDescription>
              {t("components.SessionManager.deleteSessionDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToDelete(null)}>
              {t("components.SessionManager.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
            >
              {t("components.SessionManager.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
