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
import { useWorkspaceYjs } from "@/hooks/useWorkspaceYjs";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
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
  const { getDocument, updateDocument } = useDocumentStore();
  const document = documentId ? getDocument(documentId) : null;

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { isConnected } = useWorkspaceYjs({
    workspaceId: activeWorkspaceId,
    enabled: !!activeWorkspaceId,
  });

  // fallback: ensure title updates still saved to store via onChange
  const handleChange = async (content: any[]) => {
    if (!documentId) return;
    try {
      updateDocument(documentId, { content });
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

  useEffect(() => {
    if (!open) return;
    // no-op: keep for future side effects
  }, [open]);

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span>📄 {document.title}</span>
          </DialogTitle>
          <DialogDescription>
            Edit document content. Changes sync in realtime.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 px-2 pb-2">
          <DocumentEditor
            document={document}
            isDark={false}
            canEditWorkspace={true && isConnected}
            onTaskClick={() => {}}
            onChange={handleChange}
          />
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}