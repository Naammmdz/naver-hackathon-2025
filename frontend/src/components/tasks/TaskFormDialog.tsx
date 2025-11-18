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
import { Task, TaskStatus } from "@/types/task";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X, Bell, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { reminderStorage } from "@/utils/reminderStorage";

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
  const { t } = useTranslation();
  const [newTag, setNewTag] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimeValue, setReminderTimeValue] = useState<number>(1);
  const [reminderTimeUnit, setReminderTimeUnit] = useState<"minutes" | "hours" | "days">("hours");
  const [dueTime, setDueTime] = useState<string>("09:00");

  const taskSchema = z.object({
    title: z.string().min(1, t('form.required')),
    description: z.string().optional(),
    status: z.enum(["Todo", "In Progress", "Done"] as const),
    priority: z.enum(["Low", "Medium", "High"] as const),
    dueDate: z.date().optional(),
    tags: z.array(z.string()),
    reminderEnabled: z.boolean().optional(),
    reminderTimeBefore: z.number().optional(),
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
      reminderEnabled: false,
      reminderTimeBefore: undefined,
    },
  });

  useEffect(() => {
    if (task) {
      const reminderSettings = reminderStorage.get(task.id);
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        tags: task.tags,
        reminderEnabled: reminderSettings?.enabled ?? false,
        reminderTimeBefore: reminderSettings?.timeBefore,
      });
      setReminderEnabled(reminderSettings?.enabled ?? false);
      if (reminderSettings?.timeBefore) {
        const minutes = reminderSettings.timeBefore;
        if (minutes >= 1440) {
          setReminderTimeValue(Math.floor(minutes / 1440));
          setReminderTimeUnit("days");
        } else if (minutes >= 60) {
          setReminderTimeValue(Math.floor(minutes / 60));
          setReminderTimeUnit("hours");
        } else {
          setReminderTimeValue(minutes);
          setReminderTimeUnit("minutes");
        }
      }
      // Set time from task dueDate
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setDueTime(`${hours}:${minutes}`);
      }
    } else {
      form.reset({
        title: "",
        description: "",
        status: defaultStatus,
        priority: "Medium",
        dueDate: defaultDate,
        tags: [],
        reminderEnabled: false,
        reminderTimeBefore: undefined,
      });
      setReminderEnabled(false);
      setReminderTimeValue(1);
      setReminderTimeUnit("hours");
      setDueTime("09:00");
    }
  }, [task, defaultStatus, defaultDate, form]);

  const onSubmit = async (data: TaskFormData) => {
    // Calculate reminder time in minutes
    let reminderTimeBefore: number | undefined = undefined;
    if (reminderEnabled && data.dueDate) {
      switch (reminderTimeUnit) {
        case "days":
          reminderTimeBefore = reminderTimeValue * 24 * 60;
          break;
        case "hours":
          reminderTimeBefore = reminderTimeValue * 60;
          break;
        case "minutes":
          reminderTimeBefore = reminderTimeValue;
          break;
      }
    }

    if (task) {
      const updated = await updateTask({
        id: task.id,
        ...data,
        dueDate: data.dueDate,
        reminderEnabled: reminderEnabled && !!data.dueDate,
        reminderTimeBefore,
        reminderSent: false,
      });
      
      // Save reminder settings to localStorage
      if (updated && data.dueDate) {
        reminderStorage.set(updated.id, {
          enabled: reminderEnabled && !!data.dueDate,
          timeBefore: reminderTimeBefore,
          sent: false,
        });
      }
    } else {
      const created = await addTask({
        ...data,
        dueDate: data.dueDate,
        subtasks: [],
        reminderEnabled: reminderEnabled && !!data.dueDate,
        reminderTimeBefore,
        reminderSent: false,
      });
      
      // Save reminder settings to localStorage
      if (created && data.dueDate) {
        reminderStorage.set(created.id, {
          enabled: reminderEnabled && !!data.dueDate,
          timeBefore: reminderTimeBefore,
          sent: false,
        });
      }
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
              name="dueDate"
              render={({ field }) => {
                const handleDateChange = (date: Date | undefined) => {
                  if (date) {
                    // Set time from time input
                    const [hours, minutes] = dueTime.split(':').map(Number);
                    const newDate = new Date(date);
                    newDate.setHours(hours || 9, minutes || 0, 0, 0);
                    field.onChange(newDate);
                  } else {
                    field.onChange(undefined);
                  }
                };

                const handleTimeChange = (time: string) => {
                  setDueTime(time);
                  if (field.value) {
                    const [hours, minutes] = time.split(':').map(Number);
                    const newDate = new Date(field.value);
                    newDate.setHours(hours || 9, minutes || 0, 0, 0);
                    field.onChange(newDate);
                  }
                };

                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('form.dueDate')}</FormLabel>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "flex-1 pl-3 text-left font-normal",
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
                            onSelect={handleDateChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormControl>
                        <Input
                          type="time"
                          value={dueTime}
                          onChange={(e) => handleTimeChange(e.target.value)}
                          className="w-32"
                          placeholder="09:00"
                        />
                      </FormControl>
                    </div>
                    {field.value && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(field.value, "PPP 'at' p")}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
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

            {/* Reminder Settings */}
            {form.watch("dueDate") && (
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Email Reminder</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="form-reminder-enabled"
                    checked={reminderEnabled}
                    onCheckedChange={(checked) => setReminderEnabled(checked === true)}
                  />
                  <Label htmlFor="form-reminder-enabled" className="text-sm font-normal cursor-pointer">
                    Send reminder email before due date
                  </Label>
                </div>

                {reminderEnabled && (
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="form-time-value" className="text-sm text-muted-foreground whitespace-nowrap">
                        Remind me
                      </Label>
                      <Input
                        id="form-time-value"
                        type="number"
                        min="1"
                        value={reminderTimeValue}
                        onChange={(e) => setReminderTimeValue(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Select 
                        value={reminderTimeUnit} 
                        onValueChange={(value: "minutes" | "hours" | "days") => setReminderTimeUnit(value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">before due date</Label>
                    </div>

                    {form.watch("dueDate") && (
                      <div className="text-xs text-muted-foreground">
                        Reminder will be sent on:{" "}
                        <span className="font-medium">
                          {(() => {
                            const dueDate = form.watch("dueDate")!;
                            const minutes = reminderTimeUnit === "days" 
                              ? reminderTimeValue * 24 * 60 
                              : reminderTimeUnit === "hours" 
                              ? reminderTimeValue * 60 
                              : reminderTimeValue;
                            const reminderDate = new Date(dueDate.getTime() - minutes * 60 * 1000);
                            return reminderDate.toLocaleString();
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
