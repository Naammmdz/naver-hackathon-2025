# OpenAI API Setup Guide

## Setting up OpenAI API for Task Parser

### 1. Get Your OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account
3. Create a new API key
4. Copy the key (starts with `sk-`)

### 2. Configure the Application
1. Open the `.env` file in your project root
2. Replace `your_openai_api_key_here` with your actual API key:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Environment Variables Security & Deployment

#### For Local Development:
- The `.env` file is used for local development only
- **Never commit your actual API key to Git/GitHub**

#### For Netlify Deployment:
1. **Go to your Netlify dashboard**
2. **Select your project**
3. **Go to Site settings → Environment variables**
4. **Add a new environment variable:**
   - **Key**: `VITE_OPENAI_API_KEY`
   - **Value**: `sk-your-actual-api-key-here`
5. **Save and redeploy your site**

#### Git Security:
- Add `.env` to your `.gitignore` file to prevent committing API keys:
  ```gitignore
  # Environment variables
  .env
  .env.local
  .env.production
  ```

### 4. Usage
- The Smart Task Parser will automatically use AI enhancement when a valid API key is configured
- If no API key is provided, it falls back to local natural language parsing
- Users will see an "AI Ready" badge when OpenAI is available, or "Local Only" when using fallback

### 5. Cost Considerations
- OpenAI API usage is charged per token
- Task parsing typically uses 50-200 tokens per request
- Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

### 6. Rate Limits
- Free tier: 3 RPM (requests per minute)
- Paid tiers: Higher limits based on your plan
- The app includes automatic error handling for rate limits

## Netlify Deployment Steps

### 1. Secure Your Repository
```bash
# Add .env to .gitignore if not already added
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
```

### 2. Configure Environment Variables in Netlify
1. **Login to Netlify Dashboard**
2. **Go to your site**
3. **Navigate to**: Site settings → Environment variables
4. **Click "Add a variable"**
5. **Set**:
   - **Key**: `VITE_OPENAI_API_KEY`
   - **Value**: Your actual OpenAI API key (starts with `sk-`)
   - **Scopes**: Both "Builds" and "Functions" (if available)
6. **Save**

### 3. Redeploy Your Site
- Go to **Deploys** tab
- Click **"Trigger deploy" → "Deploy site"**
- Or push a new commit to trigger automatic deployment

### 4. Verify Deployment
- Check the build logs for any environment variable errors
- Test the Smart Task Parser on your live site
- Look for "AI Ready" badge indicating successful API key configuration

### 5. Quick Setup Commands
```bash
# 1. Ensure .env is not tracked by git
git rm --cached .env 2>/dev/null || true

# 2. Check if .env is properly ignored
git status  # .env should not appear in untracked files

# 3. Push your code (without the API key)
git add .
git commit -m "Update Smart Task Parser with server-side API configuration"
git push origin main
```

## ⚠️ Important Security Notes

1. **Your `.env` file is already properly ignored by Git** ✅
2. **The API key in your local `.env` will NOT be deployed to Netlify**
3. **You MUST configure the API key in Netlify's dashboard manually**
4. **Never commit API keys to your repository**

## Troubleshooting Netlify Deployment

### "API key invalid" error
- Verify your API key is correct in the `.env` file
- Ensure there are no extra spaces or quotes around the key
- Check that your OpenAI account has API access

### "Rate limit exceeded" error
- You've hit your usage limits
- Wait a minute and try again
- Consider upgrading your OpenAI plan for higher limits

### AI features not working
- Check that `VITE_OPENAI_API_KEY` is set in your `.env` file
- Restart your development server after adding the API key
- Verify the key starts with `sk-` and has no extra characters