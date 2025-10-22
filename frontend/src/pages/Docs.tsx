import DocumentSidebar from '@/components/documents/DocumentSidebar';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/store/documentStore';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { FileText, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Docs() {
  const {
    documents,
    activeDocumentId,
    addDocument,
    updateDocument,
    restoreDocument,
    getDocument,
  } = useDocumentStore();

  const activeDocument = activeDocumentId ? getDocument(activeDocumentId) : null;
  const isTrashedDocument = activeDocument?.trashed;

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
    if (documents.length === 0) {
      addDocument('Getting Started');
    }
  }, []);

  return (
    <div className={`flex h-full ${isDark ? 'bg-[#1f1f1f]' : 'bg-background'}`}>
      {/* Document Sidebar - Collapsible on larger screens */}
      <div className={`hidden lg:block transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
      }`}>
        <DocumentSidebar />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-colors hidden lg:flex"
                      title={isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
                    >
                      {isSidebarCollapsed ? (
                        <PanelLeftOpen className="h-4 w-4" />
                      ) : (
                        <PanelLeftClose className="h-4 w-4" />
                      )}
                    </Button>
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
                <div className="max-w-4xl mx-auto">
                  <BlockNoteView
                    editor={editor}
                    onChange={handleChange}
                    theme={isDark ? "dark" : "light"}
                    className="rounded-lg border border-border/50 shadow-sm"
                  />
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
    </div>
  );
}
