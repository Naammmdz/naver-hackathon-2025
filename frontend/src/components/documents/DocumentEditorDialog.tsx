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
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Block } from "@blocknote/core";

interface DocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
}

const createDefaultHeading = (): Block => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `heading-${Date.now()}`,
  type: "heading",
  props: { level: 1 },
  content: [
    {
      type: "text",
      text: "Untitled",
      styles: {},
    },
  ],
});

const cloneBlocks = (blocks: Block[] | undefined | null): Block[] => {
  if (!blocks || blocks.length === 0) {
    return [createDefaultHeading()];
  }
  try {
    return structuredClone(blocks);
  } catch {
    return JSON.parse(JSON.stringify(blocks)) as Block[];
  }
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const ordered = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]);
    return Object.fromEntries(ordered);
  }
  return value ?? null;
};

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
  const lastAppliedSignatureRef = useRef<string | null>(null);
  const skipNextApplyRef = useRef(false);

  const computeSignature = useCallback((blocks: Block[] | null | undefined) => {
    if (!blocks) {
      return "null";
    }
    try {
      return JSON.stringify(canonicalize(blocks));
    } catch {
      return String(Date.now());
    }
  }, []);

  // Create editor instance with active document content
  const initialContent = useMemo(
    () => cloneBlocks(document?.content as Block[] | undefined | null),
    [document?.content]
  );

  const editor = useCreateBlockNote({
    initialContent,
  });

  // Update editor content when document changes
  useEffect(() => {
    if (!document || !editor) {
      return;
    }

    const normalizedContent = cloneBlocks(document.content as Block[]);
    const signature = computeSignature(normalizedContent);
    if (signature === lastAppliedSignatureRef.current || skipNextApplyRef.current) {
      skipNextApplyRef.current = false;
      return;
    }

    editor.replaceBlocks(editor.document, normalizedContent);
    lastAppliedSignatureRef.current = signature;
  }, [document, editor, computeSignature]);

  // Save content to store whenever it changes
  const handleChange = async () => {
    if (!documentId || !canEditWorkspace) return;
    if (!editor) return;

    try {
      const blocks = cloneBlocks(editor.document as Block[]);
      const signature = computeSignature(blocks);
      lastAppliedSignatureRef.current = signature;
      skipNextApplyRef.current = true;
      updateDocument(documentId, { content: blocks });

      const heading = blocks[0];
      if (heading?.type === "heading" && Array.isArray(heading.content)) {
        const headingText = heading.content
          .map((item) => (typeof item === "object" && "text" in item ? (item.text as string) ?? "" : ""))
          .join("")
          .trim();
        if (headingText && headingText !== document?.title) {
          updateDocument(documentId, { title: headingText });
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
