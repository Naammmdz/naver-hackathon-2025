import { CustomSlashMenu } from '@/components/documents/LinkTaskSlashItem';
import { Document } from '@/types/document';
import { Task } from '@/types/task';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { useCallback } from 'react';

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
  // Ensure document always starts with a heading 1
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
      // Extract text content from the first block
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

    // Check if heading content is empty and fill it with document title
    const headingText = Array.isArray(firstBlock.content)
      ? firstBlock.content.map((item: any) => item.text || '').join('')
      : String(firstBlock.content || '');

    if (!headingText.trim()) {
      firstBlock.content = [{ text: document.title || 'Untitled' }];
    }

    return content;
  };

  // Create editor instance
  const editor = useCreateBlockNote({
    initialContent: document ? ensureTitleBlock(document.content) : undefined,
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