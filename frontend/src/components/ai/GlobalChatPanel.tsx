import { Send, Sparkles, X, Loader2, ExternalLink, Brain, History, GripVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ragApi } from "@/lib/api/ragApi";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useDocumentStore } from "@/store/documentStore";
import { useUIStore } from "@/store/uiStore";
import type { Citation } from "@/types/rag";
import { MermaidCodeBlock } from "@/components/ai/MermaidRenderer";
import { TaskAnalysisDisplay } from "@/components/ai/TaskAnalysisDisplay";
import { MemorySidebar } from "@/components/ai/MemorySidebar";
import { SessionManager } from "@/components/ai/SessionManager";
import { MarkdownRenderer } from "@/components/ai/MarkdownRenderer";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  citations?: Citation[];
  visualization?: string;
  taskAnalysis?: Record<string, unknown>[] | Record<string, unknown>;
  metadata?: Record<string, any>;
  error?: boolean;
};

export const GlobalChatPanel = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const { documents, setActiveDocument } = useDocumentStore();
  
  // UI Store state
  const { isChatOpen, setChatOpen, chatWidth, setChatWidth } = useUIStore();
  const { activeDocumentId, getDocument } = useDocumentStore();

  const defaultMessages: ChatMessage[] = [
    {
      id: "assistant-welcome",
      role: "assistant",
      content: t('components.GlobalChatPanel.welcomeMessage'),
    },
  ];

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memorySidebarOpen, setMemorySidebarOpen] = useState(false);
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('global-ai-chat-history');
        if (stored) {
          const history = JSON.parse(stored);
          // Include welcome message if history exists
          return history.length > 0 ? [...defaultMessages, ...history] : defaultMessages;
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
    return defaultMessages;
  });

  // Resizing logic
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none"; // Prevent text selection while resizing
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Calculate new width based on mouse position from right edge of screen
    const newWidth = window.innerWidth - e.clientX;
    
    // Min width 300px, Max width 800px (or 50% of screen)
    const clampedWidth = Math.max(300, Math.min(newWidth, Math.min(800, window.innerWidth * 0.8)));
    
    setChatWidth(clampedWidth);
  }, [setChatWidth]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove]);

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const closePanel = useCallback(() => setChatOpen(false), [setChatOpen]);

  // Keyboard shortcut to close
  useEffect(() => {
    if (!isChatOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isChatOpen, closePanel]);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading && !!activeWorkspaceId, [input, isLoading, activeWorkspaceId]);

  const handleSend = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSend || !activeWorkspaceId || !user?.id) {
        return;
      }

      const trimmed = input.trim();
      const timestamp = Date.now();
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${timestamp}`,
        role: "user",
        content: trimmed,
        timestamp,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Get current document context
        let documentContext = undefined;
        if (activeDocumentId) {
          const doc = getDocument(activeDocumentId);
          if (doc && doc.content) {
             // Simple block to text conversion
             const contentText = Array.isArray(doc.content) 
                ? doc.content.map((block: any) => {
                    if (Array.isArray(block.content)) {
                        return block.content.map((c: any) => c.text || "").join("");
                    }
                    return "";
                  }).join("\n")
                : "";
                
             documentContext = {
               id: doc.id,
               title: doc.title,
               content: contentText
             };
          }
        }

        // Call Orchestrator API
        const response = await ragApi.queryDocuments(activeWorkspaceId, {
          query: trimmed,
          user_id: user.id,
          session_id: sessionId,
          include_memory: true,
          document_context: documentContext,
        });

        // Save session ID if this is the first message
        if (!sessionId && response.session_id) {
          setSessionId(response.session_id);
          localStorage.setItem('global-ai-session-id', response.session_id);
        }

        // Check if HITL confirmation is required for CRUD operations
        if (response.metadata?.requires_hitl) {
          // CRUD operation detected - show HITL request
          const hitlMessage: ChatMessage = {
            id: `hitl-${timestamp}`,
            role: "assistant",
            content: response.answer || "⏳ This operation requires your approval.",
            timestamp: Date.now(),
            metadata: {
              ...response.metadata,
              is_crud_hitl: true,
              awaiting_confirmation: true,
            },
          };

          setMessages((prev) => [...prev, hitlMessage]);

          // Save to localStorage
          const chatHistory = [...messages.slice(1), userMessage, hitlMessage];
          localStorage.setItem('global-ai-chat-history', JSON.stringify(chatHistory));
          return;
        }

        // Normal query response (not HITL)
        // Add AI response
        const assistantMessage: ChatMessage = {
          id: `assistant-${timestamp}`,
          role: "assistant",
          content: response.answer,
          timestamp: Date.now(),
          citations: response.citations,
          metadata: response.metadata,
          // Extract visualization from metadata (Board Agent)
          visualization: response.metadata?.mermaid_code || response.metadata?.markdown_output,
          // Extract task analysis from metadata (Task Agent)
          taskAnalysis: response.metadata?.query_result || response.metadata?.analysis_data,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Save to localStorage (excluding welcome message)
        const chatHistory = [...messages.slice(1), userMessage, assistantMessage];
        localStorage.setItem('global-ai-chat-history', JSON.stringify(chatHistory));

      } catch (error) {
        console.error('AI query error:', error);
        
        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${timestamp}`,
          role: "assistant",
          content: error instanceof Error 
            ? `⚠️ ${t('components.GlobalChatPanel.errorMessage')}: ${error.message}`
            : t('components.GlobalChatPanel.errorMessage'),
          timestamp: Date.now(),
          error: true,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [canSend, input, activeWorkspaceId, user, sessionId, messages, t],
  );

  // If chat is closed, we render the toggle button
  if (!isChatOpen) {
    return (
      <button
        aria-controls="global-ai-chat-panel"
        aria-expanded={false}
        onClick={() => setChatOpen(true)}
        className={cn(
          "fixed right-0 top-1/2 z-[58] flex -translate-y-1/2 translate-x-[calc(100%-1.5rem)] items-center justify-center rounded-l-lg border border-r-0 border-primary bg-primary px-2 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
          "sm:translate-x-[calc(100%-2rem)]",
        )}
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {t('components.GlobalChatPanel.buttonText')}
      </button>
    );
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        aria-label={t('components.GlobalChatPanel.panelAriaLabel')}
        id="global-ai-chat-panel"
        className={cn(
          "relative z-[40] flex h-full flex-col border-l bg-background text-foreground shadow-xl transition-all duration-200 ease-in-out",
        )}
        style={{ width: chatWidth }}
      >
        {/* Resize Overlay to capture events */}
        {isResizing && (
          <div className="fixed inset-0 z-[100] cursor-col-resize" />
        )}

        {/* Resize Handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50 flex items-center justify-center group"
          onMouseDown={startResizing}
        >
           <div className="h-8 w-1 rounded-full bg-muted-foreground/20 group-hover:bg-primary/80 transition-colors" />
        </div>

        <header className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold leading-tight">{t('components.GlobalChatPanel.headerTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('components.GlobalChatPanel.headerSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setSessionManagerOpen(true)}
              size="icon"
              variant="ghost"
              title="Manage Sessions"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setMemorySidebarOpen(!memorySidebarOpen)}
              size="icon"
              variant="ghost"
              title="View AI Memory"
            >
              <Brain className="h-4 w-4" />
            </Button>
            <Button
              aria-label={t('components.GlobalChatPanel.closeButtonAria')}
              onClick={closePanel}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 text-sm",
                  message.role === "assistant" ? "justify-start" : "justify-end",
                )}
              >
                {message.role === "assistant" && (
                  <img 
                    src="/assets/images/ai-avatar.png" 
                    alt={t('components.GlobalChatPanel.aiAvatarAlt')} 
                    className="mt-1 h-10 w-10 flex-shrink-0 rounded-full object-cover"
                  />
                )}
                <div className="flex flex-col max-w-[75%] min-w-0 break-words">
                  <div
                    className={cn(
                      "rounded-xl px-4 py-2 break-words overflow-hidden",
                      message.role === "assistant"
                        ? message.error 
                          ? "bg-[hsl(var(--destructive-light))] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))]/20"
                          : "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    <MarkdownRenderer content={message.content} />
                  </div>
                  
                  {/* Mermaid Visualization (Board Agent) */}
                  {message.visualization && message.role === "assistant" && (
                    <div className="mt-3">
                      <MermaidCodeBlock
                        markdown={message.visualization}
                        title={message.metadata?.chart_type ? `${message.metadata.chart_type} Chart` : undefined}
                        chartType={message.metadata?.chart_type}
                      />
                    </div>
                  )}
                  
                  {/* Task Analysis Data (Task Agent) */}
                  {message.taskAnalysis && message.role === "assistant" && (
                    <div className="mt-3">
                      <TaskAnalysisDisplay
                        data={message.taskAnalysis}
                        title="Task Analysis Results"
                      />
                    </div>
                  )}
                  
                  {/* Citations Display */}
                  {message.citations && message.citations.length > 0 && (
                    <details className="mt-2 text-xs border rounded-lg p-2 bg-muted/50">
                      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                        📚 {message.citations.length} {message.citations.length === 1 ? 'Source' : 'Sources'}
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {message.citations.map((citation, idx) => {
                          // Find document by ID or name
                          const document = documents.find(
                            (doc) => doc.id === citation.document_id || doc.title === citation.document_name
                          );
                          
                          return (
                            <li key={citation.chunk_id || idx} className="border-l-2 border-primary/30 pl-2 py-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="font-medium text-foreground">
                                    {citation.document_name}
                                    {citation.page_number && (
                                      <span className="text-muted-foreground ml-1">(p. {citation.page_number})</span>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground text-[11px] mt-0.5">
                                    Relevance: {(citation.score * 100).toFixed(1)}%
                                  </div>
                                  {citation.chunk_text && (
                                    <p className="text-muted-foreground mt-1 text-[11px] line-clamp-2">
                                      "{citation.chunk_text.substring(0, 100)}..."
                                    </p>
                                  )}
                                </div>
                                {document && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[11px]"
                                    onClick={() => {
                                      setActiveDocument(document.id);
                                      navigate('/app/docs');
                                      // Don't close panel on navigation anymore, as it's a sidebar
                                      // setChatOpen(false); 
                                    }}
                                    title="Open document"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 text-sm justify-start">
                <img 
                  src="/assets/images/ai-avatar.png" 
                  alt="AI" 
                  className="mt-1 h-10 w-10 flex-shrink-0 rounded-full object-cover"
                />
                <div className="rounded-xl px-4 py-2 bg-muted text-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI đang suy nghĩ...</span>
                </div>
              </div>
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form className="border-t px-5 py-4 flex-shrink-0" onSubmit={handleSend}>
          <label className="sr-only" htmlFor="global-ai-chat-input">
            {t('components.GlobalChatPanel.inputLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-full border border-muted bg-muted/40 px-2.5 py-1.5 shadow-inner">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => {
                // Clear current session and messages
                setSessionId(null);
                setMessages(defaultMessages);
                localStorage.removeItem('global-ai-session-id');
                localStorage.removeItem('global-ai-chat-history');
              }}
              title="Start new conversation"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-background/70 text-muted-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              <span className="text-lg font-semibold leading-none">+</span>
              <span className="sr-only">{t('components.GlobalChatPanel.attachButtonSr')}</span>
            </Button>
            <Textarea
              id="global-ai-chat-input"
              placeholder={activeWorkspaceId ? t('components.GlobalChatPanel.placeholder') : "Please select a workspace first..."}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isLoading || !activeWorkspaceId}
              className="flex-1 h-10 min-h-0 resize-none rounded-full border-0 bg-transparent px-3 py-2 text-sm leading-[1.4] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) {
                    const form = e.currentTarget.form;
                    if (form) {
                      form.requestSubmit();
                    }
                  }
                }
              }}
            />
            <Button
              disabled={!canSend}
              type="submit"
              size="icon"
              className="h-10 w-10 flex-shrink-0 rounded-full shadow-md transition hover:shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">{t('components.GlobalChatPanel.sendButtonSr')}</span>
            </Button>
          </div>
        </form>
      </aside>

      {/* Memory Sidebar */}
      <MemorySidebar
        sessionId={sessionId}
        isOpen={memorySidebarOpen && isChatOpen}
        onClose={() => setMemorySidebarOpen(false)}
      />

      {/* Session Manager */}
      <SessionManager
        currentSessionId={sessionId}
        onSessionSelect={(newSessionId) => {
          if (newSessionId === null) {
            // New session - clear everything
            setSessionId(null);
            setMessages(defaultMessages);
            localStorage.removeItem('global-ai-session-id');
            localStorage.removeItem('global-ai-chat-history');
          } else {
            // Load existing session
            setSessionId(newSessionId);
            // In production, load messages from API here
            const stored = localStorage.getItem('global-ai-chat-history');
            if (stored) {
              try {
                const history = JSON.parse(stored);
                setMessages([...defaultMessages, ...history]);
              } catch (e) {
                console.error('Failed to load chat history:', e);
              }
            }
          }
        }}
        open={sessionManagerOpen}
        onClose={() => setSessionManagerOpen(false)}
      />
    </>
  );
};

export default GlobalChatPanel;
