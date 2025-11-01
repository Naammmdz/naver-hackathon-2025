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
import { useTaskDocStore } from "@/store/taskDocStore";
import { useTaskStore } from "@/store/taskStore";
import { RELATION_TYPE_LABELS, TaskDocRelationType } from "@/types/taskDoc";
import { CheckCircle2, Circle, Clock, Plus, X } from "lucide-react";
import { useState } from "react";

interface DocTaskLinkerProps {
  docId: string;
  docTitle: string;
}

export function DocTaskLinker({ docId, docTitle }: DocTaskLinkerProps) {
  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [relationType, setRelationType] = useState<TaskDocRelationType>("reflection"); // Default to reflection for doc->task
  const [note, setNote] = useState("");

  const { tasks } = useTaskStore();
  const {
    addTaskDoc,
    removeTaskDoc,
    getTaskDocsByDoc,
  } = useTaskDocStore();

  const linkedTasks = getTaskDocsByDoc(docId);
  const availableTasks = tasks.filter(
    (task) => !linkedTasks.some((td) => td.taskId === task.id)
  );

  const handleLink = async () => {
    if (!selectedTaskId) return;

    const created = await addTaskDoc({
      taskId: selectedTaskId,
      docId,
      relationType,
      note: note || undefined,
      createdBy: "user",
    });

    if (!created) {
      return;
    }

    setSelectedTaskId("");
    setNote("");
    setRelationType("reflection"); // Reset to reflection for doc->task
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Done":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "In Progress":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-destructive";
      case "Medium":
        return "text-foreground";
      case "Low":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getRelationColor = (type: TaskDocRelationType) => {
    switch (type) {
      case "reference":
        return "bg-secondary text-secondary-foreground";
      case "reflection":
        return "bg-muted text-foreground";
      case "resource":
        return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Related Tasks</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Link Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Link Task to Document</DialogTitle>
              <DialogDescription>
                Connect a task to <strong>{docTitle}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Task Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Task</label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a task..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="max-h-[200px]">
                      {availableTasks.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No tasks available
                        </div>
                      ) : (
                        availableTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <span className="truncate">{task.title}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              {/* Relation Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Relation Type</label>
                <Select
                  value={relationType}
                  onValueChange={(value) => setRelationType(value as TaskDocRelationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELATION_TYPE_LABELS).map(([type, info]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{info.label}</span>
                          <span className="text-xs text-muted-foreground">{info.description}</span>
                        </div>
                      </SelectItem>
                    ))}
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
              <Button onClick={handleLink} disabled={!selectedTaskId}>
                Link Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Linked Tasks List */}
      {linkedTasks.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
          No tasks linked yet
        </div>
      ) : (
        <div className="space-y-2">
          {linkedTasks.map((taskDoc) => {
            const task = tasks.find((t) => t.id === taskDoc.taskId);
            if (!task) return null;

            return (
            <div
                key={taskDoc.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover-card"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusIcon(task.status)}
                    <span className="font-medium text-sm truncate">{task.title}</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getRelationColor(taskDoc.relationType)}`}
                    >
                      {RELATION_TYPE_LABELS[taskDoc.relationType].label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  {taskDoc.note && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      Note: {taskDoc.note}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.status}</span>
                    {task.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">{task.tags.slice(0, 2).join(", ")}</span>
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
