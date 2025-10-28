import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentStore } from "@/store/documentStore";
import { useTaskDocStore } from "@/store/taskDocStore";
import { RELATION_TYPE_LABELS, TaskDocRelationType } from "@/types/taskDoc";
import { BookOpen, FileText, Link as LinkIcon, Plus, X } from "lucide-react";
import { useState } from "react";

interface TaskDocLinkerProps {
  taskId: string;
  taskTitle: string;
  onDocumentClick?: (docId: string) => void;
}

export function TaskDocLinker({ taskId, taskTitle, onDocumentClick }: TaskDocLinkerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [relationType, setRelationType] = useState<TaskDocRelationType>("resource"); // Default to resource for task->doc
  const [note, setNote] = useState("");

  const { documents, getDocument } = useDocumentStore();
  const {
    addTaskDoc,
    removeTaskDoc,
    getTaskDocsByTask,
  } = useTaskDocStore();

  const linkedDocs = getTaskDocsByTask(taskId);
  const availableDocs = documents.filter(
    (doc) => !doc.trashed && !linkedDocs.some((td) => td.docId === doc.id)
  );

  const handleLink = async () => {
    if (!selectedDocId) return;

    const created = await addTaskDoc({
      taskId,
      docId: selectedDocId,
      relationType,
      note: note || undefined,
      createdBy: "user",
    });

    if (!created) {
      return;
    }

    setSelectedDocId("");
    setNote("");
    setRelationType("resource"); // Reset to resource for task->doc
  };

  const getRelationIcon = (type: TaskDocRelationType) => {
    switch (type) {
      case "reference":
        return <LinkIcon className="h-3 w-3" />;
      case "reflection":
        return <FileText className="h-3 w-3" />;
      case "resource":
        return <BookOpen className="h-3 w-3" />;
    }
  };

  const getRelationColor = (type: TaskDocRelationType) => {
    switch (type) {
      case "reference":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "reflection":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "resource":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Linked Documents</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Link Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Link Document to Task</DialogTitle>
              <DialogDescription>
                Connect a document to <strong>{taskTitle}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Document Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Document</label>
                <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a document..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="max-h-[200px]">
                      {availableDocs.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No documents available
                        </div>
                      ) : (
                        availableDocs.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="truncate">{doc.title}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Note */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Note (Optional)</label>
                <Textarea
                  placeholder="Add a note about this relation..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLink} disabled={!selectedDocId}>
                Link Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Linked Documents List */}
      {linkedDocs.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
          No documents linked yet
        </div>
      ) : (
        <div className="space-y-2">
          {linkedDocs.map((taskDoc) => {
            const doc = getDocument(taskDoc.docId);
            if (!doc) return null;

            return (
              <div
                key={taskDoc.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover-card"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span 
                      className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => onDocumentClick?.(doc.id)}
                    >
                      {doc.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs gap-1 ${getRelationColor(taskDoc.relationType)}`}
                    >
                      {getRelationIcon(taskDoc.relationType)}
                      {RELATION_TYPE_LABELS[taskDoc.relationType].label}
                    </Badge>
                  </div>

                  {taskDoc.note && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{taskDoc.note}</p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(taskDoc.createdAt).toLocaleDateString("vi-VN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {taskDoc.createdBy && (
                      <>
                        <span>•</span>
                        <span>{taskDoc.createdBy === "ai" ? "AI suggested" : "User added"}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={async () => {
                      await removeTaskDoc(taskDoc.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove link</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
