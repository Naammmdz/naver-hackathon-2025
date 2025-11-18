import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendTaskReminder } from './services/emailService.js';
import { startScheduler } from './scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-service' });
});

// Send task reminder email
app.post('/api/reminders/send', async (req, res) => {
  try {
    const { taskId, taskTitle, taskDescription, dueDate, recipientEmail, recipientName } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    if (!taskTitle) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const result = await sendTaskReminder({
      taskId,
      taskTitle,
      taskDescription: taskDescription || '',
      dueDate,
      recipientEmail,
      recipientName: recipientName || 'User',
    });

    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Reminder email sent successfully',
    });
  } catch (error) {
    console.error('Error sending reminder email:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to send reminder email';
    let statusCode = 500;
    
    if (error.message.includes('EMAIL_USER') || error.message.includes('EMAIL_PASSWORD')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.code === 'EAUTH' || error.responseCode === 535) {
      statusCode = 401;
      errorMessage = error.message || 'Email authentication failed. Please check your email credentials.';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Email service running on port ${PORT}`);
  
  // Start reminder scheduler if enabled
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    startScheduler();
  }
});

