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
import { ChevronLeft, ChevronRight, FileText, Plus, Sparkles } from 'lucide-react';
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
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.15),_transparent_55%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(244,114,182,0.15),_transparent_55%)]" />

            <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border border-border/60 bg-background/85 px-10 py-12 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 via-pink-400/70 to-purple-500/70 text-primary-foreground shadow-lg shadow-primary/40">
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
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Tự động lưu từng dòng bạn viết, không lo thất lạc nội dung.</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Nhúng task, bảng biểu và link để kết nối mọi dữ liệu.</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Sử dụng slash menu để chèn mọi thứ bằng vài phím gõ.</span>
                </div>
              </div>

              <Button
                onClick={() => void addDocument('Tài liệu mới')}
                size="lg"
                className="gap-2"
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
        ) : activeDocument ? (
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
          <div className="relative flex min-h-[520px] w-full items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-background/85 px-6 py-12 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(34,197,94,0.14),_transparent_55%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(22,163,74,0.18),_transparent_55%)]" />

            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-border/40 bg-background/95 px-8 py-14 text-center shadow-lg shadow-primary/10">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 via-purple-400/70 to-sky-500/70 text-primary-foreground shadow-lg shadow-primary/30">
                <FileText className="h-8 w-8" />
              </span>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Ghi lại kiến thức và chia sẻ với đội ngũ</h2>
                <p className="text-sm leading-relaxed text-muted-foreground/80">
                  Xây dựng kho tri thức chung: ghi chú cuộc họp, tài liệu hướng dẫn hay bản thảo ý tưởng.
                  Bắt đầu bằng việc tạo tài liệu đầu tiên của bạn.
                </p>
              </div>

              <div className="flex flex-col gap-2 text-sm text-muted-foreground/75">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Chèn task, checklist và mention để kết nối mọi thông tin quan trọng.</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Tự động lưu và theo dõi phiên bản cho từng thay đổi.</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Slash menu giúp chèn block, bảng và template chỉ trong vài phím.</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button onClick={() => addDocument('Tài liệu mới')} size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Tạo tài liệu mới
                </Button>
                <Button variant="outline" size="lg" className="gap-2" disabled>
                  <FileText className="h-4 w-4" />
                  Thư viện template
                </Button>
              </div>

              <p className="text-xs text-muted-foreground/70">Mẹo: nhấn <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">Ctrl /</span> để mở slash menu và chèn block nhanh chóng.</p>
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
