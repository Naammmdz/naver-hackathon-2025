import nodemailer from 'nodemailer';
import { getTaskReminderTemplate } from '../templates/taskReminderTemplate.js';

// Create transporter - configure with your email provider
const createTransporter = () => {
  // Validate email credentials
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    throw new Error('EMAIL_USER is not configured in .env file');
  }
  
  if (!process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD === 'your-app-password') {
    throw new Error('EMAIL_PASSWORD is not configured in .env file. For Gmail, you must use an App Password (not your regular password).');
  }

  // For Gmail
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // MUST be App Password for Gmail
      },
    });
  }

  // For SMTP (generic)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const sendTaskReminder = async ({
  taskId,
  taskTitle,
  taskDescription,
  dueDate,
  recipientEmail,
  recipientName,
}) => {
  let transporter;
  try {
    transporter = createTransporter();
  } catch (error) {
    // Re-throw with more helpful message
    if (error.message.includes('EMAIL_PASSWORD')) {
      throw new Error('Email password not configured. For Gmail, you need to:\n1. Enable 2-Step Verification\n2. Generate an App Password at https://myaccount.google.com/apppasswords\n3. Use the 16-character App Password (not your regular password)');
    }
    throw error;
  }

  const emailHtml = getTaskReminderTemplate({
    taskTitle,
    taskDescription,
    dueDate,
    recipientName,
    taskId,
  });

  const mailOptions = {
    from: `"DevFlow" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `🔔 Task Reminder: ${taskTitle}`,
    html: emailHtml,
    text: `Task Reminder: ${taskTitle}\n\n${taskDescription || 'No description'}\n\nDue Date: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set'}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    // Provide helpful error messages for common issues
    if (error.code === 'EAUTH') {
      if (error.responseCode === 535) {
        throw new Error('Gmail authentication failed. Make sure you are using an App Password (not your regular password).\n\nSteps:\n1. Enable 2-Step Verification: https://myaccount.google.com/security\n2. Generate App Password: https://myaccount.google.com/apppasswords\n3. Copy the 16-character password and use it in EMAIL_PASSWORD');
      }
      throw new Error(`Email authentication failed: ${error.message}\n\nFor Gmail, you must use an App Password. See: https://support.google.com/mail/?p=BadCredentials`);
    }
    throw error;
  }
};

