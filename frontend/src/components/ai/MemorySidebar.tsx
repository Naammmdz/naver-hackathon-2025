/**
 * Memory Sidebar Component
 * 
 * Displays conversation history and extracted facts (long-term memory)
 * in a collapsible sidebar next to the GlobalChatPanel.
 */

import { useEffect, useState } from "react"
import { Brain, Clock, Lightbulb, Search, Trash2, ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { memoryApi, type ConversationMessage, type LongTermMemory } from "@/lib/api/memoryApi"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { toast } from "sonner"

interface MemorySidebarProps {
  /** Current session ID */
  sessionId: string | null
  /** Whether sidebar is visible */
  isOpen: boolean
  /** Callback when sidebar closes */
  onClose: () => void
}

export function MemorySidebar({ sessionId, isOpen, onClose }: MemorySidebarProps) {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId)
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [longTermMemories, setLongTermMemories] = useState<LongTermMemory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingMemories, setIsLoadingMemories] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string[]>(["conversation"])

  // Load conversation history
  useEffect(() => {
    if (!sessionId || !isOpen) return

    const loadHistory = async () => {
      setIsLoadingHistory(true)
      try {
        const history = await memoryApi.getConversationHistory(sessionId)
        setConversationHistory(history.messages)
      } catch (error) {
        console.error("Failed to load conversation history:", error)
        toast.error("Failed to load conversation history")
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [sessionId, isOpen])

  // Load long-term memories
  useEffect(() => {
    if (!activeWorkspaceId || !isOpen) return

    const loadMemories = async () => {
      setIsLoadingMemories(true)
      try {
        const response = await memoryApi.getLongTermMemories(activeWorkspaceId, 1, 50)
        setLongTermMemories(response.memories)
      } catch (error) {
        console.error("Failed to load long-term memories:", error)
        toast.error("Failed to load memories")
      } finally {
        setIsLoadingMemories(false)
      }
    }

    loadMemories()
  }, [activeWorkspaceId, isOpen])

  // Filter memories by search
  const filteredMemories = longTermMemories.filter((memory) =>
    searchQuery
      ? memory.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.value.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  // Group memories by type
  const memoryGroups = filteredMemories.reduce((acc, memory) => {
    const type = memory.knowledge_type || "other"
    if (!acc[type]) acc[type] = []
    acc[type].push(memory)
    return acc
  }, {} as Record<string, LongTermMemory[]>)

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getKnowledgeTypeIcon = (type: string) => {
    switch (type) {
      case "decision":
        return "⚡"
      case "pattern":
        return "🔄"
      case "preference":
        return "❤️"
      case "fact":
        return "📊"
      default:
        return "💡"
    }
  }

  const getKnowledgeTypeColor = (type: string) => {
    switch (type) {
      case "decision":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "pattern":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "preference":
        return "bg-pink-100 text-pink-800 border-pink-200"
      case "fact":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-background border-l shadow-lg z-[85] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">AI Memory</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          value={expandedSection}
          onValueChange={setExpandedSection}
          className="px-4 py-2"
        >
          {/* Conversation History */}
          <AccordionItem value="conversation">
            <AccordionTrigger className="text-sm font-semibold">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Conversation History</span>
                <Badge variant="outline" className="ml-auto">
                  {conversationHistory.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {isLoadingHistory ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Loading...
                </div>
              ) : conversationHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No conversation history yet
                </div>
              ) : (
                <div className="space-y-3">
                  {conversationHistory.map((message, idx) => (
                    <div key={idx} className={cn(
                      "text-xs p-2 rounded-lg",
                      message.role === "user"
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={message.role === "user" ? "default" : "secondary"} className="text-[10px]">
                          {message.role}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-3">
                        {message.content}
                      </p>
                      {message.confidence && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Confidence: {(message.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <Separator className="my-2" />

          {/* Long-Term Memories */}
          <AccordionItem value="memories">
            <AccordionTrigger className="text-sm font-semibold">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span>Learned Facts</span>
                <Badge variant="outline" className="ml-auto">
                  {filteredMemories.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {isLoadingMemories ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Loading...
                </div>
              ) : filteredMemories.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  {searchQuery ? "No matching memories" : "No learned facts yet"}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(memoryGroups).map(([type, memories]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <span>{getKnowledgeTypeIcon(type)}</span>
                        <span className="capitalize">{type}</span>
                        <span className="text-[10px]">({memories.length})</span>
                      </div>
                      {memories.map((memory) => (
                        <div
                          key={memory.memory_id}
                          className="p-2 rounded-lg border bg-card text-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", getKnowledgeTypeColor(memory.knowledge_type))}
                            >
                              {memory.key}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {memory.access_count} uses
                            </span>
                          </div>
                          <p className="text-muted-foreground">{memory.value}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Source: {memory.source}</span>
                            <span>•</span>
                            <span>Confidence: {(memory.confidence_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.reload()}>
          <Sparkles className="h-4 w-4 mr-2" />
          Refresh Memories
        </Button>
      </div>
    </div>
  )
}
