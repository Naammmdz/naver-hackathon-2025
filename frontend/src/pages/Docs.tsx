import DocumentSidebar from '@/components/documents/DocumentSidebar';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/store/documentStore';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { FileText, Plus } from 'lucide-react';
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
    <div className={`flex h-[calc(100vh-3.5rem)] ${isDark ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
      {/* Sidebar */}
      <DocumentSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeDocument ? (
          isTrashedDocument ? (
            <div className="flex-1 flex items-center justify-center bg-muted/10">
              <div className="text-center max-w-md px-6">
                <div className="h-20 w-20 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Document in Trash</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  This document has been moved to trash. You can restore it or permanently delete it.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => restoreDocument(activeDocumentId!)} 
                    variant="outline"
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Restore Document
                  </Button>
                  <Button 
                    onClick={() => addDocument('Untitled')} 
                    size="lg" 
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Editor - Full Width */}
              <div className="flex-1 overflow-auto px-16 py-8">
                <div className="max-w-4xl mx-auto">
                  <BlockNoteView 
                    editor={editor} 
                    onChange={handleChange}
                    theme={isDark ? "dark" : "light"}
                  />
                </div>
              </div>
            </>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center max-w-md px-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">No document selected</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Select a document from the sidebar to start editing, or create a new one to begin writing.
              </p>
              <Button onClick={() => addDocument('Untitled')} size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Document
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
