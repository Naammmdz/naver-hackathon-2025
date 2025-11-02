import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useDocumentStore } from "@/store/documentStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";

interface DocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
}

export function DocumentEditorDialog({
  open,
  onOpenChange,
  documentId,
}: DocumentEditorDialogProps) {
  const {
    getDocument,
    updateDocument,
  } = useDocumentStore();
  const canEditWorkspace = useWorkspaceStore((state) => state.canEditActiveWorkspace());

  const document = documentId ? getDocument(documentId) : null;

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

    const firstBlock = content[0] as any;
    if (firstBlock.type !== 'heading') {
      return [
        {
          type: 'heading',
          content: 'Untitled',
          props: { level: 1 },
        },
        ...content,
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
    initialContent: document ? ensureTitleBlock(document.content) : undefined,
  });

  // Update editor content when document changes
  useEffect(() => {
    if (document && editor) {
      const content = ensureTitleBlock(document.content);
      editor.replaceBlocks(editor.document, content);
    }
  }, [documentId, editor]);

  // Save content to store whenever it changes
  const handleChange = async () => {
    if (!documentId || !canEditWorkspace) return;

    try {
      const content = editor.document;
      updateDocument(documentId, { content });

      // Auto-update title from first heading
      if (content.length > 0) {
        const firstBlock = content[0] as any;
        if (firstBlock.type === 'heading' && firstBlock.content) {
          const textContent = Array.isArray(firstBlock.content)
            ? firstBlock.content.map((item: any) => item.text || '').join('')
            : String(firstBlock.content);
          if (textContent.trim() && textContent.trim() !== document?.title) {
            updateDocument(documentId, { title: textContent.trim() });
          }
        }
      }
    } catch (e) {
      console.error('Failed to save content:', e);
    }
  };

  const handleSave = () => {
    if (!canEditWorkspace) {
      onOpenChange(false);
      return;
    }
    handleChange();
    onOpenChange(false);
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span>📄 {document.title}</span>
          </DialogTitle>
          <DialogDescription>
            {canEditWorkspace
              ? "Edit document content. Changes will be saved automatically."
              : "Bạn đang ở chế độ chỉ xem. Nội dung sẽ không thể chỉnh sửa."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          <div className="h-full min-h-[400px]">
            <BlockNoteView
              editor={editor}
              onChange={handleChange}
              theme="light"
              className="h-full"
              editable={canEditWorkspace}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canEditWorkspace}>
            Save & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
