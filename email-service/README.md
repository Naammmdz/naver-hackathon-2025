# DevFlow Email Service

Email service for sending task reminders using Nodemailer.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure email settings in `.env`:
   - Open `.env` file
   - Set `EMAIL_USER` to your email address
   - Set `EMAIL_PASSWORD` to your app password (for Gmail) or SMTP password
   - Update `FRONTEND_URL` if your frontend runs on a different port

3. Start the service:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The service will run on `http://localhost:3001` by default.

## Gmail Setup

1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to Google Account > Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASSWORD`

## API Endpoints

### POST `/api/reminders/send`

Send a task reminder email.

**Request Body:**
```json
{
  "taskId": "task-123",
  "taskTitle": "Complete project documentation",
  "taskDescription": "Write comprehensive documentation for the new feature",
  "dueDate": "2025-01-20T10:00:00Z",
  "recipientEmail": "user@example.com",
  "recipientName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "<message-id>",
  "message": "Reminder email sent successfully"
}
```

## Email Template

The email template is located in `src/templates/taskReminderTemplate.js` and can be customized as needed.

