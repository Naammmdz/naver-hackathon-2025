import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import { useTaskDocStore } from "@/store/taskDocStore";
import { useTaskStore } from "@/store/taskStore";
import { Task } from "@/types/task";
import { TaskDocRelationType } from "@/types/taskDoc";
import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { CheckCircle2, Circle, Clock, Link } from "lucide-react";
import { useState } from "react";

interface LinkTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  docTitle: string;
  editor: BlockNoteEditor;
  onTaskClick: (task: Task) => void;
}

function LinkTaskDialog({ open, onOpenChange, docId, docTitle, editor, onTaskClick }: LinkTaskDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [relationType, setRelationType] = useState<TaskDocRelationType>("reflection");
  const [note, setNote] = useState("");

  const { tasks } = useTaskStore();
  const { addTaskDoc, getTaskDocsByDoc } = useTaskDocStore();

  const linkedTasks = getTaskDocsByDoc(docId);
  const availableTasks = tasks.filter(
    (task) => !linkedTasks.some((td) => td.taskId === task.id)
  );

  const handleLink = () => {
    if (!selectedTaskId) return;

    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;

    // Add to store
    addTaskDoc({
      taskId: selectedTaskId,
      docId,
      relationType,
      note: note || undefined,
      createdBy: "user",
    });

    // Insert mention block into editor
    editor.insertBlocks(
      [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `🔗 Linked task: `,
              styles: { textColor: "gray" },
            },
            {
              type: "text",
              text: `[TASK:${task.id}:${task.title}]`,
              styles: { bold: true, textColor: "blue", underline: true },
            },
          ],
        },
      ],
      editor.getTextCursorPosition().block,
      "after"
    );

    // Reset and close
    setSelectedTaskId("");
    setNote("");
    setRelationType("reflection");
    onOpenChange(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Done":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Task to Document</DialogTitle>
          <DialogDescription>
            Liên kết task với document <strong>{docTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Task</label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn task..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="max-h-[200px]">
                  {availableTasks.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Không có task khả dụng
                    </div>
                  ) : (
                    availableTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="truncate">{task.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
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
            <label className="text-sm font-medium">Ghi chú (Tùy chọn)</label>
            <Textarea
              placeholder="Thêm ghi chú về liên kết này..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleLink} disabled={!selectedTaskId}>
            Link Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Custom slash menu item factory
export function createLinkTaskSlashItem(docId: string, docTitle: string) {
  let dialogOpen = false;
  let setDialogOpen: ((open: boolean) => void) | null = null;
  let currentEditor: BlockNoteEditor | null = null;

  return {
    title: "Link Task",
    onItemClick: (editor: BlockNoteEditor) => {
      currentEditor = editor;
      if (setDialogOpen) {
        setDialogOpen(true);
      }
    },
    aliases: ["task", "link", "liên kết", "nhiệm vụ"],
    group: "Other",
    icon: <Link size={18} />,
    subtext: "Liên kết với task trong workspace",
    // Store dialog state management function
    setDialogHandler: (handler: (open: boolean) => void) => {
      setDialogOpen = handler;
    },
    getDialog: () => ({
      DialogComponent: LinkTaskDialog,
      dialogOpen,
      setDialogOpen: (open: boolean) => {
        dialogOpen = open;
        if (setDialogOpen) setDialogOpen(open);
      },
      docId,
      docTitle,
      editor: currentEditor!,
    }),
  };
}

// Export enhanced slash menu items
export function getCustomSlashMenuItems(editor: BlockNoteEditor, docId: string, docTitle: string) {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  const linkTaskItem = createLinkTaskSlashItem(docId, docTitle);

  return [...defaultItems, linkTaskItem];
}

// Custom slash menu component with dialog support
interface CustomSlashMenuProps {
  editor: BlockNoteEditor;
  docId: string;
  docTitle: string;
  onTaskClick: (task: Task) => void;
}

export function CustomSlashMenu({ editor, docId, docTitle, onTaskClick }: CustomSlashMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const linkTaskItem = {
    title: "Link Task",
    onItemClick: () => {
      setDialogOpen(true);
    },
    aliases: ["task", "link", "liên kết", "nhiệm vụ"],
    group: "Other",
    icon: <Link size={18} />,
    subtext: "Liên kết với task trong workspace",
  };

  const items = [...getDefaultReactSlashMenuItems(editor), linkTaskItem];

  return (
    <>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) => filterSuggestionItems(items, query)}
      />
      <LinkTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        docId={docId}
        docTitle={docTitle}
        editor={editor}
        onTaskClick={onTaskClick}
      />
    </>
  );
}
