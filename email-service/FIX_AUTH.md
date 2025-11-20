# 🔧 Fix Authentication Error

## Current Issue
You're getting "535-5.7.8 Username and Password not accepted" because you're using your **regular Gmail password** instead of an **App Password**.

## Quick Fix

### Step 1: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. If you see "2-Step Verification is off", enable it first at: https://myaccount.google.com/security
3. Select:
   - App: **Mail**
   - Device: **Other (Custom name)** → Type "DevHolic"
4. Click **Generate**
5. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 2: Update .env
Open `email-service/.env` and replace:

```env
EMAIL_PASSWORD=your-16-character-app-password-here
```

**Important:**
- ✅ Use the App Password (16 characters, no spaces)
- ❌ Do NOT use your regular Gmail password
- ❌ Remove any spaces from the password

### Step 3: Test
```bash
cd email-service
npm test
```

## Why App Password?
Gmail requires App Passwords for third-party apps (like DevHolic) to prevent unauthorized access. Your regular password won't work for SMTP authentication.

## Still Having Issues?
- Make sure 2-Step Verification is enabled
- Try generating a new App Password
- Check that there are no extra spaces in `.env`
- Verify the email address in `EMAIL_USER` is correct

