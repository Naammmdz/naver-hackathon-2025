/**
 * Utility to store and retrieve reminder settings for tasks
 * Since backend may not support reminder fields yet, we store them in localStorage
 */

export interface ReminderSettings {
  enabled: boolean;
  timeBefore?: number; // minutes before due date
  sent?: boolean; // whether reminder has been sent
}

const getReminderKey = (taskId: string) => `task-reminder-${taskId}`;

export const reminderStorage = {
  get: (taskId: string): ReminderSettings | null => {
    try {
      const stored = localStorage.getItem(getReminderKey(taskId));
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  set: (taskId: string, settings: ReminderSettings): void => {
    try {
      localStorage.setItem(getReminderKey(taskId), JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save reminder settings:', error);
    }
  },

  remove: (taskId: string): void => {
    try {
      localStorage.removeItem(getReminderKey(taskId));
    } catch (error) {
      console.error('Failed to remove reminder settings:', error);
    }
  },

  getAll: (): Record<string, ReminderSettings> => {
    const reminders: Record<string, ReminderSettings> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('task-reminder-')) {
          const taskId = key.replace('task-reminder-', '');
          const value = localStorage.getItem(key);
          if (value) {
            reminders[taskId] = JSON.parse(value);
          }
        }
      }
    } catch (error) {
      console.error('Failed to get all reminder settings:', error);
    }
    return reminders;
  },
};

