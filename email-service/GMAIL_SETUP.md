# Gmail Setup Guide

## ⚠️ Important: You MUST use App Password, NOT your regular password!

Gmail no longer allows "Less secure app access". You must use an **App Password**.

## Step-by-Step Instructions

### 1. Enable 2-Step Verification

1. Go to: https://myaccount.google.com/security
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the prompts to enable it (you'll need your phone)

### 2. Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "DevHolic Email Service"
4. Click **Generate**
5. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

### 3. Configure .env

Open `email-service/.env` and set:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop  # The 16-character App Password (no spaces)
```

**Important:**
- ✅ Use the 16-character App Password
- ❌ Do NOT use your regular Gmail password
- ❌ Do NOT include spaces in the password

### 4. Test

```bash
cd email-service
npm test
```

## Troubleshooting

### Error: "535-5.7.8 Username and Password not accepted"

**Cause:** You're using your regular Gmail password instead of App Password.

**Solution:**
1. Make sure 2-Step Verification is enabled
2. Generate a new App Password
3. Copy the entire 16-character password (no spaces)
4. Update `.env` file
5. Restart the email service

### Error: "EAUTH"

**Cause:** Authentication failed.

**Solutions:**
- Verify you're using App Password (not regular password)
- Make sure there are no extra spaces in `.env` file
- Try generating a new App Password
- Check that 2-Step Verification is enabled

### Still having issues?

1. Verify your email in `.env` is correct
2. Make sure App Password is exactly 16 characters (no spaces)
3. Try generating a new App Password
4. Check that the email service is running: `npm start`

