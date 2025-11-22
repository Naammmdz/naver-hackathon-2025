import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocuments } from "@/hooks/useRagApi";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useDocumentStore } from "@/store/documentStore";
import { Loader2, UploadCloud, File, X } from "lucide-react";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { nanoid } from "nanoid";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onUploadSuccess,
}: DocumentUploadDialogProps) {
  const { t } = useTranslation();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { uploadDocument, loading } = useDocuments();
  const { addLocalDocument, removeLocalDocument, currentUserId } = useDocumentStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Auto-fill title if empty
      if (!title) {
        const fileName = selectedFile.name.split(".").slice(0, -1).join(".");
        setTitle(fileName);
      }
    }
  };

  const handleUpload = async () => {
    if (!activeWorkspaceId) {
      toast.error(t("documents.upload.noWorkspace", "No active workspace"));
      return;
    }
    if (!file) {
      toast.error(t("documents.upload.noFile", "Please select a file"));
      return;
    }

    // Create temporary document for optimistic UI
    const tempId = nanoid();
    const tempDoc = {
      id: tempId,
      title: title || file.name,
      content: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: currentUserId || "unknown",
      workspaceId: activeWorkspaceId,
      trashed: false,
      status: 'processing' as const
    };

    // Add to store immediately
    addLocalDocument(tempDoc);
    
    // Close dialog immediately
    onOpenChange(false);
    setFile(null);
    setTitle("");
    
    toast.info(t("documents.upload.processing", "Uploading and processing document..."));

    try {
      await uploadDocument(activeWorkspaceId, file, title || undefined);
      toast.success(t("documents.upload.success", "Document uploaded successfully"));
      onUploadSuccess?.();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(t("documents.upload.error", "Failed to upload document"));
      // Remove the temp document on error
      removeLocalDocument(tempId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("documents.upload.title", "Upload Document")}</DialogTitle>
          <DialogDescription>
            {t(
              "documents.upload.description",
              "Upload a document to index it for AI search. Supported formats: PDF, DOCX, TXT, MD."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* File Upload Area */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="file" className="">
              {t("documents.upload.file", "File")}
            </Label>
            
            {!file ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center gap-2"
                >
                    <div className="p-3 bg-background rounded-full shadow-sm">
                        <UploadCloud className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium">
                        {t("documents.upload.clickToUpload", "Click to upload")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        PDF, DOCX, TXT, MD, HTML
                    </div>
                    <Input
                        ref={fileInputRef}
                        id="file"
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt,.md,.html"
                    />
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 group relative">
                    <div className="p-2 bg-background rounded-md shadow-sm">
                        <File className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </div>

          {/* Title Input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">
              {t("documents.upload.docTitle", "Title")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("documents.upload.titlePlaceholder", "Optional title")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={loading || !file}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.upload", "Upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
