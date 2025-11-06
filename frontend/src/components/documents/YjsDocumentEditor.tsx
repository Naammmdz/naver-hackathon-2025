import { useHocuspocusProvider } from '@/hooks/useHocuspocusProvider';
import { CursorLayer, getUserColor } from '@/components/documents/CursorLayer';
import { Document } from '@/types/document';
import { Task } from '@/types/task';
import { useAuth } from '@clerk/clerk-react';
import * as Y from 'yjs';
import { useEffect, useCallback, useState } from 'react';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { CustomSlashMenu } from '@/components/documents/LinkTaskSlashItem';

interface YjsDocumentEditorProps {
  document: Document;
  isDark: boolean;
  canEditWorkspace: boolean;
  onTaskClick: (task: Task) => void;
  onChange: (content: any[]) => void;
}

export function YjsDocumentEditor({
  document,
  isDark,
  canEditWorkspace,
  onTaskClick,
  onChange,
}: YjsDocumentEditorProps) {
  const { user } = useAuth();
  const [yContent, setYContent] = useState<Y.XmlFragment | null>(null);
  
  // Initialize Hocuspocus provider
  const { provider, ydoc, isConnected, error } = useHocuspocusProvider({
    documentName: `document-${document.id}`,
    enabled: !!document.id,
  });

  // Set up Yjs awareness for presence
  useEffect(() => {
    if (!provider || !user) return;

    const awareness = provider.awareness;
    const userName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Anonymous';
    const userColor = getUserColor(user.id);

    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
    });

    // Update cursor position on mouse move (simplified)
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      awareness.setLocalStateField('cursor', {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        user: {
          name: userName,
          color: userColor,
        },
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      awareness.setLocalState(null);
    };
  }, [provider, user]);

  // Set up Y.Text for document content
  useEffect(() => {
    if (!ydoc) return;

    // Create Y.XmlFragment for BlockNote content
    const yContent = ydoc.getXmlFragment('content');
    setYContent(yContent);

    // Listen for metadata updates from stateless messages
    const handleMetadataUpdate = (event: CustomEvent) => {
      const { action, payload } = event.detail;
      if (action === 'RENAME' && payload) {
        // Update document title in UI
        // This will be handled by the parent component
        window.dispatchEvent(new CustomEvent('document-metadata-update', {
          detail: { documentId: document.id, title: payload }
        }));
      }
    };

    window.addEventListener('hocuspocus-metadata', handleMetadataUpdate as EventListener);

    return () => {
      window.removeEventListener('hocuspocus-metadata', handleMetadataUpdate as EventListener);
    };
  }, [ydoc, document.id]);

  // Create BlockNote editor with Yjs binding
  const editor = useCreateBlockNote({
    initialContent: document ? ensureTitleBlock(document.content) : undefined,
  });

  // Sync BlockNote content with Yjs (simplified approach)
  // Note: Full Yjs-BlockNote integration requires ProseMirror binding
  // This is a basic implementation that syncs via onChange
  const handleEditorChange = useCallback(() => {
    if (editor) {
      const content = editor.document;
      onChange(content);

      // Sync to Yjs if available (store as JSON string in Y.Text)
      if (yContent && provider && isConnected) {
        try {
          const contentString = JSON.stringify(content);
          // Store in Y.Map for easier sync
          const yMap = ydoc?.getMap('content');
          if (yMap) {
            yMap.set('blocks', contentString);
          }
        } catch (err) {
          console.warn('Failed to sync content to Yjs:', err);
        }
      }
    }
  }, [editor, onChange, yContent, provider, isConnected, ydoc]);

  // Load content from Yjs on connect
  useEffect(() => {
    if (!ydoc || !isConnected || !editor) return;

    const yMap = ydoc.getMap('content');
    const storedContent = yMap.get('blocks');
    
    if (storedContent && typeof storedContent === 'string') {
      try {
        const parsedContent = JSON.parse(storedContent);
        if (Array.isArray(parsedContent) && parsedContent.length > 0) {
          // Update editor content from Yjs
          // Note: This requires BlockNote's replaceBlocks API
          // For now, we'll just log - full integration needs ProseMirror binding
          console.log('Content loaded from Yjs:', parsedContent);
        }
      } catch (err) {
        console.warn('Failed to parse Yjs content:', err);
      }
    }

    // Listen for Yjs updates
    const handleUpdate = () => {
      const updatedContent = yMap.get('blocks');
      if (updatedContent && typeof updatedContent === 'string') {
        try {
          const parsedContent = JSON.parse(updatedContent);
          // Apply update to editor (requires ProseMirror integration for full sync)
          console.log('Yjs content updated:', parsedContent);
        } catch (err) {
          console.warn('Failed to parse updated Yjs content:', err);
        }
      }
    };

    yMap.observe(handleUpdate);

    return () => {
      yMap.unobserve(handleUpdate);
    };
  }, [ydoc, isConnected, editor]);

  const ensureTitleBlock = (content: any[]) => {
    if (!content || content.length === 0) {
      return [
        {
          type: 'heading',
          content: [{ text: document.title || 'Untitled' }],
          props: { level: 1 },
        },
      ];
    }

    const firstBlock = content[0];
    if (firstBlock.type !== 'heading' || firstBlock.props?.level !== 1) {
      const firstBlockText = Array.isArray(firstBlock.content)
        ? firstBlock.content.map((item: any) => item.text || '').join('')
        : String(firstBlock.content || '');

      return [
        {
          type: 'heading',
          content: [{ text: firstBlockText || document.title || 'Untitled' }],
          props: { level: 1 },
        },
        ...content.slice(1),
      ];
    }

    const headingText = Array.isArray(firstBlock.content)
      ? firstBlock.content.map((item: any) => item.text || '').join('')
      : String(firstBlock.content || '');

    if (!headingText.trim()) {
      firstBlock.content = [{ text: document.title || 'Untitled' }];
    }

    return content;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {error && (
        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded">
          Realtime sync error: {error}
        </div>
      )}
      
      {isConnected && (
        <div className="absolute top-2 right-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Connected
        </div>
      )}

      <div className="relative">
        <BlockNoteView
          editor={editor}
          onChange={handleEditorChange}
          theme={isDark ? "dark" : "light"}
          className="rounded-lg border border-border/50 shadow-sm"
          slashMenu={false}
          editable={canEditWorkspace && isConnected}
        >
          {canEditWorkspace && (
            <CustomSlashMenu
              editor={editor}
              docId={document.id}
              docTitle={document.title}
              onTaskClick={onTaskClick}
            />
          )}
        </BlockNoteView>
        
        {provider && <CursorLayer awareness={provider.awareness} currentUser={user} />}
      </div>
    </div>
  );
}

