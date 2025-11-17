# Quick Start Guide

## 1. Install Dependencies ✅
```bash
npm install
```

## 2. Configure Email Settings

Edit `.env` file and set:
- `EMAIL_USER`: Your email address (e.g., `yourname@gmail.com`)
- `EMAIL_PASSWORD`: Your app password (for Gmail) or SMTP password

### For Gmail:
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the generated 16-character password in `EMAIL_PASSWORD`

## 3. Test Email Service (Optional)
```bash
npm test
```
This will send a test email to your configured email address.

## 4. Start the Service
```bash
npm start
```

The service will run on `http://localhost:3001`

## 5. Verify It's Working

Check health endpoint:
```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","service":"email-service"}`

## Troubleshooting

- **EAUTH Error**: Make sure you're using App Password, not regular password
- **Connection timeout**: Check your internet connection and SMTP settings
- **Port already in use**: Change `PORT` in `.env` to a different port

