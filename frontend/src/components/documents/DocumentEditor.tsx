import { CustomSlashMenu } from '@/components/documents/LinkTaskSlashItem';
import { useYjs } from '@/contexts/YjsContext';
import { Document } from '@/types/document';
import { Task } from '@/types/task';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { useUser } from '@clerk/clerk-react';
import { useCallback, useMemo } from 'react';

interface DocumentEditorProps {
  document: Document;
  isDark: boolean;
  canEditWorkspace: boolean;
  onTaskClick: (task: Task) => void;
  onChange: (content: any[]) => void;
}

export function DocumentEditor({
  document,
  isDark,
  canEditWorkspace,
  onTaskClick,
  onChange,
}: DocumentEditorProps) {
  const { ydoc, provider } = useYjs();
  const { user } = useUser();

  // Generate consistent color for user
  const generateUserColor = useCallback((userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8',
      '#FDCB6E', '#6C5CE7', '#00B894', '#E17055'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Ensure document always starts with a heading 1
  const ensureTitleBlock = (content: any[]) => {
    if (!content || content.length === 0) {
      return [
        {
          type: 'heading',
          content: document.title || 'Untitled',
          props: { level: 1 },
        },
      ];
    }

    const firstBlock = content[0];
    if (firstBlock.type !== 'heading' || firstBlock.props?.level !== 1) {
      return [
        {
          type: 'heading',
          content: firstBlock.content || document.title || 'Untitled',
          props: { level: 1 },
        },
        ...content.slice(1),
      ];
    }

    if (!firstBlock.content || firstBlock.content.length === 0) {
      firstBlock.content = document.title || 'Untitled';
    }

    return content;
  };

  // Prepare collaboration config
  const collaborationConfig = useMemo(() => {
    if (!document.id || !ydoc || !provider) {
      return undefined;
    }

    const fragment = ydoc.getXmlFragment(`doc-content-${document.id}`);

    return {
      provider,
      fragment,
      user: {
        name: user?.fullName || user?.username || 'Anonymous',
        color: generateUserColor(user?.id || 'default'),
      },
    };
  }, [document.id, ydoc, provider, user, generateUserColor]);

  // Create editor with or without collaboration
  // IMPORTANT: Always provide initialContent from DB for immediate display
  // Yjs will sync real-time changes on top of it
  const editor = useCreateBlockNote({
    collaboration: collaborationConfig,
    initialContent: document ? ensureTitleBlock(document.content) : undefined,
  });

  console.log('[DocumentEditor] Created editor for document:', document.id, {
    hasCollaboration: !!collaborationConfig,
    contentLength: document.content?.length || 0,
  });

  // Wrapper to extract content from editor and pass to parent
  const handleEditorChange = useCallback(() => {
    if (editor) {
      const content = editor.document;
      onChange(content);
    }
  }, [editor, onChange]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BlockNoteView
        editor={editor}
        onChange={handleEditorChange}
        theme={isDark ? "dark" : "light"}
        className="rounded-lg border border-border/50 shadow-sm"
        slashMenu={false}
        editable={canEditWorkspace}
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
    </div>
  );
}
