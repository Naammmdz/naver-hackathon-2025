import { useTaskStore } from "@/store/taskStore";
import { reminderStorage } from "@/utils/reminderStorage";
import { sendTaskReminder } from "./emailService";

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Check if a task needs a reminder sent
 */
function shouldSendReminder(task: any): boolean {
  if (!task.reminderEnabled || task.reminderSent || !task.dueDate) {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const reminderTime = task.reminderTimeBefore || 60; // Default: 1 hour in minutes

  // Calculate when reminder should be sent
  const reminderDate = new Date(dueDate.getTime() - reminderTime * 60 * 1000);

  // Check if current time is past reminder time but before due date
  return now >= reminderDate && now < dueDate;
}

/**
 * Send reminder for a task
 */
async function sendReminderForTask(
  task: any,
  userEmail: string,
  userName: string
): Promise<{ success: boolean; taskId: string }> {
  try {
    const result = await sendTaskReminder({
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      dueDate: task.dueDate ? (typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString()) : undefined,
      recipientEmail: userEmail,
      recipientName: userName,
    });

    if (result.success) {
      // Mark reminder as sent
      const settings = reminderStorage.get(task.id);
      if (settings) {
        reminderStorage.set(task.id, {
          ...settings,
          sent: true,
        });
      }

      // Update task in store
      const { updateTask } = useTaskStore.getState();
      await updateTask({
        id: task.id,
        reminderSent: true,
      });

      console.log(`✅ Reminder sent for task "${task.title}" to ${userEmail}`);
      return { success: true, taskId: task.id };
    } else {
      console.error(`❌ Failed to send reminder for task "${task.title}":`, result.error);
      return { success: false, taskId: task.id };
    }
  } catch (error) {
    console.error(`❌ Error sending reminder for task "${task.title}":`, error);
    return { success: false, taskId: task.id };
  }
}

/**
 * Check and send reminders for all tasks
 */
export async function checkAndSendReminders(): Promise<void> {
  try {
    const { tasks } = useTaskStore.getState();
    const userEmail = localStorage.getItem('userEmail') || '';
    const userName = localStorage.getItem('userName') || 'User';

    if (!userEmail) {
      console.warn('⚠️ No user email found, skipping reminder check');
      return;
    }

    const tasksNeedingReminders = tasks.filter(shouldSendReminder);

    if (tasksNeedingReminders.length === 0) {
      return;
    }

    console.log(`📧 Found ${tasksNeedingReminders.length} task(s) needing reminders`);

    for (const task of tasksNeedingReminders) {
      await sendReminderForTask(task, userEmail, userName);
    }
  } catch (error) {
    console.error('Error in reminder scheduler:', error);
  }
}

/**
 * Start the reminder scheduler
 */
export function startReminderScheduler(): () => void {
  console.log('🕐 Starting reminder scheduler...');
  console.log(`⏰ Check interval: ${CHECK_INTERVAL / 1000} seconds`);

  // Run immediately on start
  checkAndSendReminders();

  // Then run at intervals
  const intervalId = setInterval(checkAndSendReminders, CHECK_INTERVAL);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('🛑 Reminder scheduler stopped');
  };
}

