const EMAIL_SERVICE_URL = import.meta.env.VITE_EMAIL_SERVICE_URL || '/email-api';

export interface SendReminderRequest {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  recipientEmail: string;
  recipientName?: string;
}

export interface SendReminderResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export async function sendTaskReminder(
  request: SendReminderRequest
): Promise<SendReminderResponse> {
  try {
    const response = await fetch(`${EMAIL_SERVICE_URL}/api/reminders/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send reminder email',
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      message: data.message || 'Reminder email sent successfully',
    };
  } catch (error) {
    console.error('Error sending reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminder email',
    };
  }
}

