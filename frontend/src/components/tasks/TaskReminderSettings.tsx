import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTaskStore } from "@/store/taskStore";
import { Task } from "@/types/task";
import { reminderStorage } from "@/utils/reminderStorage";
import { Bell, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface TaskReminderSettingsProps {
  task: Task;
}

export function TaskReminderSettings({ task }: TaskReminderSettingsProps) {
  const { t } = useTranslation();
  const { updateTask } = useTaskStore();
  const { toast } = useToast();
  const [reminderEnabled, setReminderEnabled] = useState(task.reminderEnabled ?? false);
  const [timeValue, setTimeValue] = useState<number>(() => {
    if (task.reminderTimeBefore) {
      // Convert minutes to hours if >= 60, otherwise keep as minutes
      return task.reminderTimeBefore >= 60 
        ? Math.floor(task.reminderTimeBefore / 60)
        : task.reminderTimeBefore;
    }
    return 1; // Default: 1 hour
  });
  const [timeUnit, setTimeUnit] = useState<"minutes" | "hours" | "days">(() => {
    if (task.reminderTimeBefore) {
      if (task.reminderTimeBefore >= 1440) return "days";
      if (task.reminderTimeBefore >= 60) return "hours";
      return "minutes";
    }
    return "hours";
  });

  useEffect(() => {
    setReminderEnabled(task.reminderEnabled ?? false);
    if (task.reminderTimeBefore) {
      const minutes = task.reminderTimeBefore;
      if (minutes >= 1440) {
        setTimeValue(Math.floor(minutes / 1440));
        setTimeUnit("days");
      } else if (minutes >= 60) {
        setTimeValue(Math.floor(minutes / 60));
        setTimeUnit("hours");
      } else {
        setTimeValue(minutes);
        setTimeUnit("minutes");
      }
    }
  }, [task]);

  const handleSave = async () => {
    if (!task.dueDate) {
      toast({
        title: t("components.TaskReminderSettings.noDueDate"),
        description: t("components.TaskReminderSettings.pleaseSetDueDateFirst"),
        variant: "destructive",
      });
      return;
    }

    // Convert to minutes
    let minutesBefore = 0;
    switch (timeUnit) {
      case "days":
        minutesBefore = timeValue * 24 * 60;
        break;
      case "hours":
        minutesBefore = timeValue * 60;
        break;
      case "minutes":
        minutesBefore = timeValue;
        break;
    }

    try {
      // Save reminder settings to localStorage
      reminderStorage.set(task.id, {
        enabled: reminderEnabled,
        timeBefore: reminderEnabled ? minutesBefore : undefined,
        sent: false, // Reset when changing settings
      });

      // Update task in store (reminder fields are stored locally)
      await updateTask({
        id: task.id,
        reminderEnabled,
        reminderTimeBefore: reminderEnabled ? minutesBefore : undefined,
        reminderSent: false,
      });

      toast({
        title: reminderEnabled ? t("components.TaskReminderSettings.reminderEnabled") : t("components.TaskReminderSettings.reminderDisabled"),
        description: reminderEnabled
          ? `${t("components.TaskReminderSettings.youWillReceiveEmail")} ${formatTimeBefore(minutesBefore)} ${t("components.TaskReminderSettings.beforeDueDate")}`
          : t("components.TaskReminderSettings.reminderHasBeenDisabled"),
      });
    } catch (error) {
      toast({
        title: t("components.TaskReminderSettings.failedToUpdateReminder"),
        description: error instanceof Error ? error.message : t("components.TaskReminderSettings.pleaseTryAgain"),
        variant: "destructive",
      });
    }
  };

  const formatTimeBefore = (minutes: number): string => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} ${days === 1 ? t("common.day") : t("common.days")}`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${hours === 1 ? t("common.hour") : t("common.hours")}`;
    }
    return `${minutes} ${minutes === 1 ? t("common.minute") : t("common.minutes")}`;
  };

  if (!task.dueDate) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{t("components.TaskReminderSettings.setDueDateToEnableReminders")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">{t("components.TaskReminderSettings.emailReminder")}</h4>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="reminder-enabled"
          checked={reminderEnabled}
          onCheckedChange={(checked) => setReminderEnabled(checked === true)}
        />
        <Label htmlFor="reminder-enabled" className="text-sm font-normal cursor-pointer">
          {t("components.TaskReminderSettings.sendReminderEmailBeforeDueDate")}
        </Label>
      </div>

      {reminderEnabled && (
        <div className="space-y-3 pl-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="time-value" className="text-sm text-muted-foreground">
              {t("components.TaskReminderSettings.remindMe")}
            </Label>
            <Input
              id="time-value"
              type="number"
              min="1"
              value={timeValue}
              onChange={(e) => setTimeValue(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <Select value={timeUnit} onValueChange={(value: "minutes" | "hours" | "days") => setTimeUnit(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">{t("components.TaskReminderSettings.minutes")}</SelectItem>
                <SelectItem value="hours">{t("components.TaskReminderSettings.hours")}</SelectItem>
                <SelectItem value="days">{t("components.TaskReminderSettings.days")}</SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-sm text-muted-foreground">{t("components.TaskReminderSettings.beforeDueDate")}</Label>
          </div>

          <div className="text-xs text-muted-foreground">
            {t("components.TaskReminderSettings.reminderWillBeSentOn")}{" "}
            <span className="font-medium">
              {(() => {
                const dueDate = new Date(task.dueDate!);
                const reminderDate = new Date(dueDate.getTime() - (timeUnit === "days" ? timeValue * 24 * 60 : timeUnit === "hours" ? timeValue * 60 : timeValue) * 60 * 1000);
                return reminderDate.toLocaleString();
              })()}
            </span>
          </div>
        </div>
      )}

      <Button onClick={handleSave} size="sm" className="w-full">
        {t("components.TaskReminderSettings.saveReminderSettings")}
      </Button>
    </div>
  );
}

