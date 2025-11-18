import dotenv from 'dotenv';
import { sendTaskReminder } from './services/emailService.js';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8989';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '60000'); // Default: 1 minute

/**
 * Fetch tasks that need reminders from the API
 * This is a placeholder - you'll need to implement an endpoint that returns tasks
 * with reminder settings, or fetch all tasks and filter client-side
 */
async function fetchTasksNeedingReminders() {
  try {
    // TODO: Replace with actual API endpoint that returns tasks with reminder settings
    // For now, this is a placeholder that would need to be implemented
    const response = await fetch(`${API_BASE_URL}/api/tasks/reminders`, {
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch tasks: ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

/**
 * Check if a task needs a reminder sent
 */
function shouldSendReminder(task) {
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
async function sendReminderForTask(task, userEmail, userName) {
  try {
    const result = await sendTaskReminder({
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      dueDate: task.dueDate,
      recipientEmail: userEmail,
      recipientName: userName,
    });

    console.log(`✅ Reminder sent for task "${task.title}" to ${userEmail}`);
    return { success: true, taskId: task.id, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send reminder for task "${task.title}":`, error.message);
    return { success: false, taskId: task.id, error: error.message };
  }
}

/**
 * Main scheduler function
 */
async function checkAndSendReminders() {
  console.log(`[${new Date().toISOString()}] Checking for tasks needing reminders...`);

  try {
    const tasks = await fetchTasksNeedingReminders();
    
    if (tasks.length === 0) {
      console.log('No tasks found');
      return;
    }

    console.log(`Found ${tasks.length} task(s) to check`);

    for (const task of tasks) {
      if (shouldSendReminder(task)) {
        // Get user email - this should come from the task or user API
        const userEmail = task.userEmail || process.env.DEFAULT_EMAIL;
        const userName = task.userName || 'User';

        if (!userEmail) {
          console.warn(`⚠️ No email found for task "${task.title}"`);
          continue;
        }

        await sendReminderForTask(task, userEmail, userName);
        
        // Mark reminder as sent (this would need to be saved back to the database)
        // For now, we'll just log it
        console.log(`📝 Marked reminder as sent for task "${task.title}"`);
      }
    }
  } catch (error) {
    console.error('Error in reminder scheduler:', error);
  }
}

/**
 * Start the scheduler
 */
export function startScheduler() {
  console.log('🕐 Starting reminder scheduler...');
  console.log(`⏰ Check interval: ${CHECK_INTERVAL / 1000} seconds`);

  // Run immediately on start
  checkAndSendReminders();

  // Then run at intervals
  setInterval(checkAndSendReminders, CHECK_INTERVAL);
}

