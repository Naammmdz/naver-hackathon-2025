import { DocumentEditor } from '@/components/documents/DocumentEditor';
import DocumentSidebar from '@/components/documents/DocumentSidebar';
import { TaskDetailsDrawer } from '@/components/tasks/TaskDetailsDrawer';
import { Button } from '@/components/ui/button';
import { ReadOnlyBanner } from '@/components/workspace/ReadOnlyBanner';
import { useYjs } from '@/contexts/YjsContext';
import { useToast } from '@/hooks/use-toast';
import { useWorkspaceFilter } from '@/hooks/use-workspace-filter';
import { useDocumentStore } from '@/store/documentStore';
import { useTaskStore } from '@/store/taskStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Task } from '@/types/task';
import { ChevronLeft, ChevronRight, FileText, Plus, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function Docs() {
  const {
    documents,
    activeDocumentId,
    addDocument,
    updateDocument,
    restoreDocument,
    getDocument,
    setActiveDocument,
    isLoading,
  } = useDocumentStore();

  const { tasks } = useTaskStore();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const canEditWorkspace = useWorkspaceStore((state) => state.canEditActiveWorkspace());
  const { toast } = useToast();
  
  // Yjs context for realtime collaboration  
  const { isConnected } = useYjs();
  
  const notifyReadOnly = useCallback(() => {
    toast({
      title: 'Chỉ xem',
      description: 'Bạn chỉ có quyền xem trong workspace này.',
      variant: 'destructive',
    });
  }, [toast]);

  // Filter documents by active workspace
  const filteredDocuments = useWorkspaceFilter(documents);

  const activeDocument = activeDocumentId ? getDocument(activeDocumentId) : null;
  
  // Check if active document belongs to current workspace
  const isDocumentInCurrentWorkspace = activeDocument 
    ? activeDocument.workspaceId === activeWorkspaceId 
    : false;
  
  // Only show active document if it belongs to current workspace
  const displayDocument = activeDocument && isDocumentInCurrentWorkspace ? activeDocument : null;
  
  const isTrashedDocument = displayDocument?.trashed;

  // Clear active document when workspace changes if it doesn't belong to new workspace
  useEffect(() => {
    if (activeDocumentId && activeDocument && !isDocumentInCurrentWorkspace) {
      console.log('[Docs] Clearing active document - does not belong to current workspace');
      setActiveDocument(null);
    }
  }, [activeWorkspaceId, activeDocumentId, activeDocument, isDocumentInCurrentWorkspace, setActiveDocument]);

  // Task detail drawer state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Detect current theme
  const [isDark, setIsDark] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Debounce ref for content saving
  const saveTimeoutRef = useRef<NodeJS.Timeout>();  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemDark);
      setIsDark(shouldBeDark);
    };
    
    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save content to store whenever it changes (called by DocumentEditor)
  const handleChange = useCallback(async (content: any[]) => {
    if (!activeDocumentId || !canEditWorkspace) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save operation by 500ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Save content to store in ALL modes
        // - Non-collaborative: immediate save for local changes
        // - Collaborative: Yjs handles real-time sync, but we also persist to DB
        //   (and let scheduleSave() debounce it)
        updateDocument(activeDocumentId, { content });
        
        // Auto-update title from first heading (always update metadata)
        if (content.length > 0) {
          const firstBlock = content[0] as any;
          if (firstBlock.type === 'heading' && firstBlock.content) {
            const textContent = Array.isArray(firstBlock.content) 
              ? firstBlock.content.map((item: any) => item.text || '').join('')
              : String(firstBlock.content);
            if (textContent.trim() && textContent.trim() !== activeDocument?.title) {
              updateDocument(activeDocumentId, { title: textContent.trim() });
            }
          }
        }
      } catch (e) {
        console.error('Failed to save content:', e);
      }
    }, 500);
  }, [activeDocumentId, canEditWorkspace, updateDocument, activeDocument?.title]);

  // Handle task link clicks
  useEffect(() => {
    const handleTaskLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && target.textContent) {
        const taskMatch = target.textContent.match(/\[TASK:([^:]+):([^\]]+)\]/);
        if (taskMatch) {
          const taskId = taskMatch[1];
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            setSelectedTask(task);
          }
        }
      }
    };

    // Add event listener to editor container
    const editorContainer = document.querySelector('.bn-editor');
    if (editorContainer) {
      editorContainer.addEventListener('click', handleTaskLinkClick);
    }

    return () => {
      if (editorContainer) {
        editorContainer.removeEventListener('click', handleTaskLinkClick);
      }
    };
  }, [tasks]);

  return (
    <div className={`flex h-full ${isDark ? 'bg-[#1f1f1f]' : 'bg-background'}`}>
      {/* Document Sidebar - Collapsible on larger screens */}
      <div className={`hidden lg:block transition-all duration-300 ease-in-out overflow-hidden ${
        isSidebarCollapsed ? 'w-0' : 'w-64'
      }`}>
        <DocumentSidebar />
      </div>

      {/* Drag Handle - Small indicator bar like iPhone navigation */}
      <div
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={`hidden lg:flex relative w-1 flex-shrink-0 cursor-pointer group transition-all duration-200 bg-border hover:bg-primary/60`}
        title={isSidebarCollapsed ? 'Click to show sidebar' : 'Click to hide sidebar'}
      >
        {/* Small navigation bar in the middle */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-8 w-0.5 bg-muted-foreground/40 rounded-full group-hover:bg-primary/80 group-hover:h-10 transition-all duration-200" />
        
        {/* Chevron indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-primary" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {documents.filter((doc) => !doc.trashed).length === 0 ? (
          <div
            className="relative flex h-full min-h-[520px] w-full items-center justify-center overflow-hidden px-6 py-12 transition-colors"
            style={{
              background: isDark
                ? 'linear-gradient(145deg, #0f1117 0%, #111827 55%, #1e293b 100%)'
                : 'linear-gradient(140deg, #f5f3ff 0%, #e0f2fe 45%, #fef3c7 100%)',
            }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -left-24 top-16 h-64 w-64 rounded-full blur-3xl mix-blend-screen opacity-50 dark:opacity-80"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle, rgba(129,140,248,0.55) 0%, transparent 68%)'
                    : 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
                }}
              />
              <div
                className="absolute -right-32 bottom-12 h-72 w-72 rounded-full blur-[120px] mix-blend-screen opacity-40 dark:opacity-70"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle, rgba(236,72,153,0.55) 0%, transparent 75%)'
                    : 'radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 70%)',
                }}
              />
              <div
                className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl mix-blend-screen opacity-35 dark:opacity-60"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(244,114,182,0.35) 0%, transparent 70%)',
                }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(244,114,182,0.18),_transparent_55%)]" />

            <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#38bdf8] via-[#a855f7] to-[#f97316] text-white shadow-lg shadow-pink-500/40">
                <FileText className="h-8 w-8" />
              </span>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Kho kiến thức của bạn đang chờ được viết
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground/80">
                  Ghi chú cuộc họp, tóm tắt dự án, hay ý tưởng chợt đến – tạo tài liệu để mọi người cùng theo dõi và cập nhật.
                </p>
              </div>

              <div className="flex flex-col gap-2 text-sm text-muted-foreground/70">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-300" />
                  <span>Tự động lưu từng dòng bạn viết, không lo thất lạc nội dung.</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-300" />
                  <span>Nhúng task, bảng biểu và link để kết nối mọi dữ liệu.</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                  <span>Sử dụng slash menu để chèn mọi thứ bằng vài phím gõ.</span>
                </div>
              </div>

              <Button
                    onClick={() => {
                      if (!canEditWorkspace) {
                        notifyReadOnly();
                        return;
                      }
                      void addDocument('Tài liệu mới');
                    }}
                size="lg"
                className="gap-2 bg-gradient-to-r from-[#38bdf8] via-[#a855f7] to-[#f97316] hover:from-[#38bdf8]/90 hover:via-[#a855f7]/90 hover:to-[#f97316]/90 text-white shadow-md hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                <Sparkles className="h-4 w-4" />
                Tạo tài liệu đầu tiên
              </Button>

              <p className="text-xs text-muted-foreground/70">
                Hoặc kéo tài liệu đã có vào đây để tiếp tục biên soạn cùng đội ngũ.
              </p>
            </div>
          </div>
        ) : displayDocument ? (
          isTrashedDocument ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-secondary/60 to-muted/20 dark:from-secondary/40 dark:to-muted/20 p-4">
              <div className="text-center max-w-lg px-6">
                <div className="relative mb-8">
                  <div className="h-24 w-24 rounded-3xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto shadow-lg">
                    <FileText className="h-12 w-12 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-4 text-foreground">
                  Document in Trash
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                  This document has been moved to trash. You can restore it or permanently delete it from the sidebar.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    onClick={() => restoreDocument(activeDocumentId!)}
                    variant="outline"
                    size="lg"
                    className="gap-2 border-border hover:bg-muted/60 dark:border-border dark:hover:bg-muted/40"
                  >
                    <FileText className="h-5 w-5" />
                    Restore Document
                  </Button>
                  <Button
                    onClick={() => {
                      if (!canEditWorkspace) {
                        notifyReadOnly();
                        return;
                      }
                      addDocument('Untitled');
                    }}
                    size="lg"
                    className="gap-2 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    Create New
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Document Header */}
              <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
                <div className="space-y-3">
                  {/* Read Only Banner */}
                  <ReadOnlyBanner />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h1 className="text-lg font-semibold truncate">{activeDocument.title}</h1>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          {activeDocument.updatedAt && `Modified ${new Date(activeDocument.updatedAt).toLocaleDateString()}`}
                        </div>
                        {/* Collaboration Status Indicator - show when connected via Yjs */}
                        {isConnected && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              Live
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor Container with DocumentEditor component */}
              <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <DocumentEditor
                    key={`${activeWorkspaceId}-${activeDocumentId}`}
                    document={displayDocument}
                    isDark={isDark}
                    canEditWorkspace={canEditWorkspace}
                    onTaskClick={setSelectedTask}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-6 py-12">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#38bdf8] via-[#a855f7] to-[#f97316] text-white shadow-lg">
                  <FileText className="h-8 w-8" />
                </span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Chọn tài liệu từ sidebar
                </h2>
                <p className="text-sm text-muted-foreground">
                  Chọn một tài liệu từ danh sách bên trái hoặc tạo tài liệu mới
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onEdit={() => {}}
        onDocumentClick={(docId) => {
          setActiveDocument(docId);
          setSelectedTask(null); // Close the drawer after navigation
        }}
      />
    </div>
  );
}
