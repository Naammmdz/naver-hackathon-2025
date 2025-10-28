import DocumentSidebar from '@/components/documents/DocumentSidebar';
import { CustomSlashMenu } from '@/components/documents/LinkTaskSlashItem';
import { TaskDetailsDrawer } from '@/components/tasks/TaskDetailsDrawer';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/store/documentStore';
import { useTaskStore } from '@/store/taskStore';
import { Task } from '@/types/task';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

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

  const activeDocument = activeDocumentId ? getDocument(activeDocumentId) : null;
  const isTrashedDocument = activeDocument?.trashed;

  // Task detail drawer state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Detect current theme
  const [isDark, setIsDark] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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

  // Ensure document always starts with a heading 1
  const ensureTitleBlock = (content: any[]) => {
    if (!content || content.length === 0) {
      return [
        {
          type: 'heading',
          content: 'Untitled',
          props: { level: 1 },
        },
      ];
    }
    
    // Ensure first block is always a heading 1
    const firstBlock = content[0];
    if (firstBlock.type !== 'heading' || firstBlock.props?.level !== 1) {
      return [
        {
          type: 'heading',
          content: firstBlock.content || 'Untitled',
          props: { level: 1 },
        },
        ...content.slice(1),
      ];
    }
    
    // Ensure heading 1 always has content
    if (!firstBlock.content || firstBlock.content.length === 0) {
      firstBlock.content = 'Untitled';
    }
    
    return content;
  };

  // Create editor instance with active document content
  const editor = useCreateBlockNote({
    initialContent: activeDocument ? ensureTitleBlock(activeDocument.content) : undefined,
  });

  // Update editor content when active document changes
  useEffect(() => {
    if (activeDocument && editor) {
      const content = ensureTitleBlock(activeDocument.content);
      editor.replaceBlocks(editor.document, content);
    }
  }, [activeDocumentId]);

  // Save content to store whenever it changes
  const handleChange = async () => {
    if (!activeDocumentId) return;
    
    try {
      const content = editor.document;
      updateDocument(activeDocumentId, { content });
      
      // Auto-update title from first heading
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
  };

  // Create first document if none exists
  useEffect(() => {
    if (!isLoading && documents.length === 0) {
      void addDocument('Getting Started');
    }
  }, [documents.length, isLoading]);

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
        {activeDocument ? (
          isTrashedDocument ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-orange-50/50 to-orange-100/20 dark:from-orange-950/20 dark:to-orange-900/10 p-4">
              <div className="text-center max-w-lg px-6">
                <div className="relative mb-8">
                  <div className="h-24 w-24 rounded-3xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto shadow-lg">
                    <FileText className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-4 text-orange-900 dark:text-orange-100">
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
                    className="gap-2 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/50"
                  >
                    <FileText className="h-5 w-5" />
                    Restore Document
                  </Button>
                  <Button
                    onClick={() => addDocument('Untitled')}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold truncate">{activeDocument.title}</h1>
                    <div className="text-xs text-muted-foreground">
                      {activeDocument.updatedAt && `Modified ${new Date(activeDocument.updatedAt).toLocaleDateString()}`}
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

              {/* Editor Container */}
              <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Editor with Custom Slash Menu */}
                  <BlockNoteView
                    editor={editor}
                    onChange={handleChange}
                    theme={isDark ? "dark" : "light"}
                    className="rounded-lg border border-border/50 shadow-sm"
                    slashMenu={false}
                  >
                    <CustomSlashMenu 
                      editor={editor} 
                      docId={activeDocument.id} 
                      docTitle={activeDocument.title}
                      onTaskClick={setSelectedTask}
                    />
                  </BlockNoteView>
                </div>
              </div>
            </>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/5 p-4">
            <div className="text-center max-w-lg px-6">
              <div className="relative mb-8">
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto shadow-lg">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Start Writing
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                Create your first document and bring your ideas to life. Use the sidebar to organize your thoughts and collaborate with your team.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button onClick={() => addDocument('Untitled')} size="lg" className="gap-2 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-5 w-5" />
                  Create Document
                </Button>
                <Button variant="outline" size="lg" className="gap-2 hover:bg-muted/50 transition-all">
                  <FileText className="h-5 w-5" />
                  Browse Templates
                </Button>
              </div>
              <div className="mt-8 text-sm text-muted-foreground">
                <p>💡 Tip: Use keyboard shortcuts for faster editing</p>
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
