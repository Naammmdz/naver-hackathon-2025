import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/taskStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Task, TaskStatus } from "@/types/task";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  defaultDate?: Date;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultStatus = "Todo",
  defaultDate,
}: TaskFormDialogProps) {
  const { addTask, updateTask } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { t } = useTranslation();
  const [newTag, setNewTag] = useState("");

  const taskSchema = z.object({
    title: z.string().min(1, t('form.required')),
    description: z.string().optional(),
    status: z.enum(["Todo", "In Progress", "Done"] as const),
    priority: z.enum(["Low", "Medium", "High"] as const),
    dueDate: z.date().optional(),
    tags: z.array(z.string()),
    assigneeId: z.string().optional(),
  });

  type TaskFormData = z.infer<typeof taskSchema>;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: defaultStatus,
      priority: "Medium",
      tags: [],
      assigneeId: undefined,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        tags: task.tags,
        assigneeId: task.assigneeId || undefined,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        status: defaultStatus,
        priority: "Medium",
        dueDate: defaultDate,
        tags: [],
        assigneeId: undefined,
      });
    }
  }, [task, defaultStatus, defaultDate, form]);

  const onSubmit = async (data: TaskFormData) => {
    if (task) {
      await updateTask({
        id: task.id,
        ...data,
        dueDate: data.dueDate,
      });
    } else {
      const created = await addTask({
        ...data,
        dueDate: data.dueDate,
        subtasks: [],
      });
    }
    onOpenChange(false);
  };

  const addTag = () => {
    if (newTag.trim()) {
      const currentTags = form.getValues("tags");
      if (!currentTags.includes(newTag.trim())) {
        form.setValue("tags", [...currentTags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags");
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {task ? t('tasks.editTask') : t('tasks.createTask')}
          </DialogTitle>
          <DialogDescription>
            {task
              ? t('form.updateTask')
              : t('form.createTask')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.title')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('form.titlePlaceholder')}
                      className="hover-surface focus-visible:ring-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('form.descriptionPlaceholder')}
                      className="min-h-[80px] hover:bg-primary/5 focus-visible:ring-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.status')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="hover-surface focus:ring-primary focus:ring-offset-0">
                          <SelectValue placeholder={t('form.selectStatus')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Todo">{t('tasks.status.todo')}</SelectItem>
                        <SelectItem value="In Progress">{t('tasks.status.inProgress')}</SelectItem>
                        <SelectItem value="Done">{t('tasks.status.done')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.priority')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="hover-surface focus:ring-primary focus:ring-offset-0">
                          <SelectValue placeholder={t('form.selectPriority')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">{t('tasks.priority.low')}</SelectItem>
                        <SelectItem value="Medium">{t('tasks.priority.medium')}</SelectItem>
                        <SelectItem value="High">{t('tasks.priority.high')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.assignee')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="hover-surface focus:ring-primary focus:ring-offset-0">
                        <SelectValue placeholder={t('form.selectAssignee')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">{t('form.unassigned')}</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={undefined} />
                              <AvatarFallback className="text-[10px]">
                                {member.fullName?.slice(0, 2).toUpperCase() || member.userId.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.fullName || member.userId}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('form.dueDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t('form.selectDate')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.tags')}</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('form.tagsPlaceholder')}
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {field.value.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {task ? t('tasks.editTask') : t('tasks.createTask')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
