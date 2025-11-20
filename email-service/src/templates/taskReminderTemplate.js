export const getTaskReminderTemplate = ({
  taskTitle,
  taskDescription,
  dueDate,
  recipientName,
  taskId,
}) => {
  const formattedDueDate = dueDate 
    ? new Date(dueDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Not set';

  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const dueDateColor = isOverdue ? '#ef4444' : '#3b82f6';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Reminder - DevHolic</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      🔔 Task Reminder
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 400;">
                      DevHolic - Your Productivity Companion
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hi <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 16px 0 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                This is a friendly reminder about your task:
              </p>
            </td>
          </tr>

          <!-- Task Card -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 12px; color: #111827; font-size: 22px; font-weight: 600; line-height: 1.3;">
                      ${taskTitle}
                    </h2>
                    ${taskDescription ? `
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      ${taskDescription}
                    </p>
                    ` : ''}
                    
                    <!-- Due Date Badge -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td>
                          <div style="display: inline-block; padding: 8px 16px; background-color: ${dueDateColor}15; border-radius: 6px; border-left: 4px solid ${dueDateColor};">
                            <p style="margin: 0; color: ${dueDateColor}; font-size: 14px; font-weight: 600;">
                              📅 Due Date: ${formattedDueDate}
                              ${isOverdue ? ' <span style="color: #ef4444;">(Overdue)</span>' : ''}
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Call to Action -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks?taskId=${taskId}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      View Task in DevHolic
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                This is an automated reminder from <strong>DevHolic</strong>.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
                You received this email because a reminder was set for this task. 
                To manage your email preferences, please visit your DevHolic settings.
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer Text -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                © ${new Date().getFullYear()} DevHolic. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

