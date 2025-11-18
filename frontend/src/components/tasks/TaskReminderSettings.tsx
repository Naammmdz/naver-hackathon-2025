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

interface TaskReminderSettingsProps {
  task: Task;
}

export function TaskReminderSettings({ task }: TaskReminderSettingsProps) {
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
        title: "No due date",
        description: "Please set a due date for the task first",
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
        title: reminderEnabled ? "Reminder enabled" : "Reminder disabled",
        description: reminderEnabled
          ? `You'll receive an email ${formatTimeBefore(minutesBefore)} before the due date`
          : "Reminder has been disabled",
      });
    } catch (error) {
      toast({
        title: "Failed to update reminder",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const formatTimeBefore = (minutes: number): string => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} ${days === 1 ? "day" : "days"}`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  };

  if (!task.dueDate) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Set a due date to enable reminders</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Email Reminder</h4>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="reminder-enabled"
          checked={reminderEnabled}
          onCheckedChange={(checked) => setReminderEnabled(checked === true)}
        />
        <Label htmlFor="reminder-enabled" className="text-sm font-normal cursor-pointer">
          Send reminder email before due date
        </Label>
      </div>

      {reminderEnabled && (
        <div className="space-y-3 pl-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="time-value" className="text-sm text-muted-foreground">
              Remind me
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
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-sm text-muted-foreground">before due date</Label>
          </div>

          <div className="text-xs text-muted-foreground">
            Reminder will be sent on:{" "}
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
        Save Reminder Settings
      </Button>
    </div>
  );
}

