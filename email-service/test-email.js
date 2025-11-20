import dotenv from 'dotenv';
import { sendTaskReminder } from './src/services/emailService.js';

dotenv.config();

// Test email sending
async function testEmail() {
  console.log('🧪 Testing Email Service...\n');
  
  // Check if email credentials are set
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    console.error('❌ Please configure EMAIL_USER in .env file');
    process.exit(1);
  }
  
  if (!process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD === 'your-app-password') {
    console.error('❌ Please configure EMAIL_PASSWORD in .env file');
    process.exit(1);
  }
  
  console.log(`📧 Sending test email to: ${process.env.EMAIL_USER}\n`);
  
  try {
    const result = await sendTaskReminder({
      taskId: 'test-task-123',
      taskTitle: 'Test Task Reminder',
      taskDescription: 'This is a test reminder email from DevHolic email service.',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      recipientEmail: process.env.EMAIL_USER,
      recipientName: 'Test User',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${result.messageId}\n`);
    console.log('Check your inbox for the test email.');
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error(error.message);
    
    if (error.code === 'EAUTH' || error.message.includes('535')) {
      console.error('\n🔧 Troubleshooting:');
      console.error('1. Make sure 2-Step Verification is enabled');
      console.error('2. Generate App Password at: https://myaccount.google.com/apppasswords');
      console.error('3. Use the 16-character App Password (not your regular password)');
      console.error('4. Check that EMAIL_USER and EMAIL_PASSWORD are set correctly in .env');
      console.error('\n📖 See GMAIL_SETUP.md for detailed instructions');
    } else if (error.message.includes('EMAIL_USER') || error.message.includes('EMAIL_PASSWORD')) {
      console.error('\n💡 Configure your email credentials in .env file');
    }
    
    process.exit(1);
  }
}

testEmail();

