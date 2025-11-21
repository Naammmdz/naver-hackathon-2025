import { DocumentEditor } from '@/components/documents/DocumentEditor';
import DocumentSidebar from '@/components/documents/DocumentSidebar';
import { TaskDetailsDrawer } from '@/components/tasks/TaskDetailsDrawer';
import { GraphView } from '@/components/GraphView';
import { Button } from '@/components/ui/button';
import { useWorkspaceFilter } from '@/hooks/use-workspace-filter';
import { cn } from '@/lib/utils';
import { buildDocumentGraph } from '@/lib/graph/buildDocumentGraph';
import { useBoardStore } from '@/store/boardStore';
import { useDocumentStore } from '@/store/documentStore';
import { useTaskStore } from '@/store/taskStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Task } from '@/types/task';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { DebouncedFunc } from 'lodash';
import { debounce } from 'lodash';
import { ChevronLeft, ChevronRight, FileText, Plus, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
export default function Docs() {
  const { t } = useTranslation();
  const {
    documents,
    activeDocumentId,
    addDocument,
    updateDocument,
    restoreDocument,
    getDocument,
    setActiveDocument,
    isLoading,
    setDocumentContentLocal,
    setDocumentTitleLocal,
  } = useDocumentStore();

  const { tasks } = useTaskStore();
  const setActiveBoard = useBoardStore((state) => state.setActiveBoard);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  // Filter documents by active workspace
  const filteredDocuments = useWorkspaceFilter(documents);
  const documentGraphData = useMemo(() => buildDocumentGraph(filteredDocuments), [filteredDocuments]);

  // Get active document first (before using it in useEffect)
  const activeDocument = activeDocumentId ? getDocument(activeDocumentId) : null;
  
  // Backup content to prevent data loss from errors
  const contentBackupRef = useRef<Map<string, any[]>>(new Map());
  
  // Debounced title update handler to avoid too many API calls
  const titleUpdateTimerRef = useRef<number | null>(null);
  const pendingTitleRef = useRef<string | null>(null);
  
  // Debounced onChange handler to avoid too many updates
  const onChangeRef = useRef<DebouncedFunc<(content: any[]) => void>>();
  useEffect(() => {
    // Backup current content
    if (activeDocumentId && activeDocument?.content) {
      const currentContent = activeDocument.content;
      if (Array.isArray(currentContent) && currentContent.length > 0) {
        contentBackupRef.current.set(activeDocumentId, JSON.parse(JSON.stringify(currentContent)));
      }
    }
    
    onChangeRef.current = debounce((content: any[]) => {
      try {
        // CRITICAL: Prevent applying empty content if we had content before
        // This prevents data loss from Yjs/Prosemirror errors
        if (!content || !Array.isArray(content) || content.length === 0) {
          const backup = contentBackupRef.current.get(activeDocumentId!);
          if (backup && backup.length > 0) {
            console.warn('[BlockNote] Prevented applying empty content, using backup');
            // Don't apply empty content - keep existing content
            return;
          }
        }
        
        // Validate content before applying
        const hasValidContent = Array.isArray(content) && content.length > 0;
        const currentDoc = activeDocumentId ? getDocument(activeDocumentId) : null;
        const hadContent = currentDoc?.content && Array.isArray(currentDoc.content) && currentDoc.content.length > 0;
        
        // If we had content before but now it's empty, reject the update
        if (hadContent && !hasValidContent) {
          console.warn('[BlockNote] Rejected empty content update - document had content before');
          return;
        }
        
        // Update backup if content is valid
        if (hasValidContent) {
          contentBackupRef.current.set(activeDocumentId!, JSON.parse(JSON.stringify(content)));
        }
        
        // Check if Yjs is active - if so, use local update to avoid API calls
        // BlockNote collaboration will sync via Yjs automatically
        const isYjsActive = (window as any).__WORKSPACE_YJS_ACTIVE;
        
        if (isYjsActive) {
          // Use local update when Yjs is active to avoid API feedback loops
          setDocumentContentLocal(activeDocumentId!, content);
          // Persist snapshot to backend via API to keep DB/search in sync
          const currentDoc = activeDocumentId ? getDocument(activeDocumentId) : null;
          if (currentDoc) {
            import('@/lib/api/documentApi').then(({ documentApi }) => {
              documentApi.update(activeDocumentId!, { content }, currentDoc).catch((error) => {
                if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                  console.warn('[Docs] Unauthorized error autosaving document content, token may have expired');
                } else {
                  console.error('[Docs] Failed to autosave document content:', error);
                }
              });
            });
          }
        } else {
          // Fallback to API update when Yjs is not available
          updateDocument(activeDocumentId!, { content }).catch((error) => {
            // Handle 401 errors gracefully
            if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
              console.warn('[Docs] Unauthorized error updating document content, token may have expired');
            } else {
              console.error('[Docs] Failed to update document content:', error);
            }
          });
        }
        
        // Auto-update title from first heading
        // Always sync title from heading, regardless of Yjs status
        // When Yjs is active, title also syncs via documentsMap, but we still update API for consistency
        if (content.length > 0) {
          const firstBlock = content[0] as any;
          if (firstBlock.type === 'heading' && firstBlock.content) {
            // Extract text from heading content
            const textContent = Array.isArray(firstBlock.content) 
              ? firstBlock.content.map((item: any) => {
                  // Handle inline content objects
                  if (item && typeof item === 'object' && 'text' in item) {
                    return item.text || '';
                  }
                  // Handle string content
                  if (typeof item === 'string') {
                    return item;
                  }
                  return '';
                }).join('')
              : String(firstBlock.content || '');
            
            const trimmedTitle = textContent.trim();
            
            // Update title if it changed and is not empty
            // If heading is empty, it will be restored to document title by DocumentEditor
            if (trimmedTitle && trimmedTitle !== currentDoc?.title) {
              // Store pending title for debounced update
              pendingTitleRef.current = trimmedTitle;
              
              // Clear existing timer
              if (titleUpdateTimerRef.current) {
                clearTimeout(titleUpdateTimerRef.current);
              }
              
              // Debounce title update to avoid too many API calls
              titleUpdateTimerRef.current = window.setTimeout(() => {
                const titleToUpdate = pendingTitleRef.current;
                if (titleToUpdate && activeDocumentId) {
                  // When Yjs is active, update title locally first to prevent editor re-render
                  // Then persist to backend via API
                  if (isYjsActive) {
                    // Update title locally to prevent editor re-render and cursor loss
                    setDocumentTitleLocal(activeDocumentId, titleToUpdate);
                    
                    // Persist to backend via API (without updating store again to avoid re-render)
                    // Use documentApi directly to avoid triggering Zustand update
                    import('@/lib/api/documentApi').then(({ documentApi }) => {
                      const currentDoc = getDocument(activeDocumentId);
                      if (currentDoc) {
                        documentApi.update(activeDocumentId, { title: titleToUpdate }, currentDoc).catch((error) => {
                          // Handle 401 errors gracefully
                          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                            console.warn('[Docs] Unauthorized error updating document title, token may have expired');
                            // Retry after a short delay
                            setTimeout(() => {
                              const retryDoc = getDocument(activeDocumentId);
                              if (retryDoc) {
                                documentApi.update(activeDocumentId, { title: titleToUpdate }, retryDoc).catch((retryError) => {
                                  console.warn('[Docs] Retry also failed:', retryError);
                                });
                              }
                            }, 1000);
                          } else {
                            console.error('[Docs] Failed to update document title:', error);
                          }
                        });
                      }
                    });
                  } else {
                    // When Yjs is not active, use normal updateDocument
                    updateDocument(activeDocumentId, { title: titleToUpdate }).catch((error) => {
                      // Handle 401 errors gracefully
                      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                        console.warn('[Docs] Unauthorized error updating document title, token may have expired');
                        // Retry after a short delay
                        setTimeout(() => {
                          updateDocument(activeDocumentId, { title: titleToUpdate }).catch((retryError) => {
                            console.warn('[Docs] Retry also failed:', retryError);
                          });
                        }, 1000);
                      } else {
                        console.error('[Docs] Failed to update document title:', error);
                      }
                    });
                  }
                  pendingTitleRef.current = null;
                }
              }, 500); // Debounce 500ms for title updates
            }
          }
        }
      } catch (e) {
        console.error('Failed to save content:', e);
      }
    }, 300); // Debounce 300ms to reduce updates
    
    return () => {
      onChangeRef.current?.cancel();
      if (titleUpdateTimerRef.current) {
        clearTimeout(titleUpdateTimerRef.current);
      }
    };
  }, [activeDocumentId, activeDocument?.title, setDocumentContentLocal, updateDocument, getDocument]);
  
  const handleDocumentChange = useCallback((content: any[]) => {
    onChangeRef.current?.(content);
  }, []);
  
  // Check if active document belongs to current workspace
  const isDocumentInCurrentWorkspace = activeDocument 
    ? activeDocument.workspaceId === activeWorkspaceId 
    : false;
  
  // Only show active document if it belongs to current workspace
  const displayDocument = activeDocument && isDocumentInCurrentWorkspace ? activeDocument : null;
  
  const isTrashedDocument = displayDocument?.trashed;

  // Task detail drawer state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Detect current theme
  const [isDark, setIsDark] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  
  useEffect(() => {
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
      <div
        className={`relative hidden lg:block transition-all duration-300 ease-in-out overflow-hidden ${
        isSidebarCollapsed ? 'w-0' : 'w-64'
        }`}
      >
        {!isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className={cn(
              'group flex h-8 w-8 items-center justify-center rounded-full border border-sidebar-border/50 bg-card/85 text-muted-foreground shadow-sm backdrop-blur hover:text-primary hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all',
              'absolute top-4 right-3 z-10'
            )}
            aria-label={t("components.Docs.hideSidebar")}
            title={t("components.Docs.hideSidebar")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {!isSidebarCollapsed && (
          <DocumentSidebar
            onCollapse={() => setIsSidebarCollapsed(true)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
      </div>

      {isSidebarCollapsed && (
        <div className="hidden lg:flex w-12 items-start justify-center pt-4">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sidebar-border/60 bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:text-primary hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all"
            aria-label={t("components.Docs.showSidebar")}
            title={t("components.Docs.showSidebar")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content with comments */}
      <div className="flex-1 flex overflow-hidden">
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
                  {t("components.Docs.emptyStateTitle")}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground/80">
                  {t("components.Docs.emptyStateDescription")}
                </p>
              </div>

              <div className="flex flex-col gap-2 text-sm text-muted-foreground/70">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-300" />
                  <span>{t("components.Docs.autoSaveFeature")}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-300" />
                  <span>{t("components.Docs.embedContentFeature")}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                  <span>{t("components.Docs.slashMenuFeature")}</span>
                </div>
              </div>

              <Button
                onClick={() => void addDocument(t("components.Docs.newDocumentTitle"))}
                size="lg"
                className="gap-2 bg-gradient-to-r from-[#38bdf8] via-[#a855f7] to-[#f97316] hover:from-[#38bdf8]/90 hover:via-[#a855f7]/90 hover:to-[#f97316]/90 text-white shadow-md hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                <Sparkles className="h-4 w-4" />
                {t("components.Docs.newDocumentButton")}
              </Button>

              <p className="text-xs text-muted-foreground/70">
                {t("components.Docs.dropDocumentHint")}
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
                  {t("components.Docs.documentInTrashTitle")}
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                  {t("components.Docs.documentInTrashDescription")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    onClick={() => restoreDocument(activeDocumentId!)}
                    variant="outline"
                    size="lg"
                    className="gap-2 border-border hover:bg-muted/60 dark:border-border dark:hover:bg-muted/40"
                  >
                    <FileText className="h-5 w-5" />
                    {t("components.Docs.restoreDocument")}
                  </Button>
                  <Button
                    onClick={() => addDocument(t("components.Docs.untitled"))}
                    size="lg"
                    className="gap-2 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    {t("components.Docs.createNew")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Document Header */}
              <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <h1 className="text-lg font-semibold truncate">{activeDocument.title}</h1>
                    <div className="text-xs text-muted-foreground">
                      {activeDocument.updatedAt && `${t("components.Docs.modified")} ${new Date(activeDocument.updatedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  {viewMode === 'editor' && (
                    <Button variant="ghost" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      {t("components.Docs.share")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Content Container */}
              <div className="flex-1 overflow-hidden">
                {viewMode === 'editor' ? (
                  <div className="h-full overflow-auto px-4 sm:px-6 lg:px-8 py-6 relative">
                <DocumentEditor
                  key={activeDocument.id}
                  document={activeDocument}
                  isDark={isDark}
                  canEditWorkspace={true}
                  onTaskClick={setSelectedTask}
                  onChange={handleDocumentChange}
                />
                  </div>
                ) : (
                  <div className="h-full">
                    <GraphView
                      data={documentGraphData}
                      onNodeClick={(node) => {
                        const nodeId = node.id || '';

                        if (node.type === "note" || node.type === "folder" || nodeId.startsWith("doc_")) {
                          const docId = nodeId.startsWith("doc_") ? nodeId.replace("doc_", "") : nodeId;
                          setActiveDocument(docId);
                          setViewMode('editor');
                        } else if (nodeId.startsWith("board_")) {
                          const boardId = nodeId.replace("board_", "");
                          setActiveBoard(boardId);
                        }
                      }}
                    />
                  </div>
                )}
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
                  {t("components.Docs.selectDocumentTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("components.Docs.selectDocumentDescription")}
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
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
