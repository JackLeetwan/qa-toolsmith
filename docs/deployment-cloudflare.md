# Cloudflare Pages Deployment Guide

This guide explains how to deploy QA Toolsmith to Cloudflare Pages in production.

## Prerequisites

- Cloudflare account
- Supabase project with database migrations applied
- Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Fork/Clone Repository

1. Fork the repository or connect your Cloudflare Pages account to your Git repository
2. Ensure your repository contains the complete codebase

## Step 2: Configure Environment Variables in Cloudflare Pages

In Cloudflare Pages dashboard:

1. Go to your project → Settings → Environment Variables
2. Add the following **required** variables:

### Production Environment Variables

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MzAyMDAsImV4cCI6MjAzMzQwNjIwMH0.your-key
SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzgzMDIwMCwiZXhwIjoyMDMzNDA2MjAwfQ.your-key
ENV_NAME = production
OPENROUTER_API_KEY = sk-or-v1-your-key
```

**Important Notes:**

- `SUPABASE_KEY` is the **anon/public** key (starts with `eyJhbG...` and has role `anon`)
- `SUPABASE_SERVICE_KEY` is the **service_role** key (starts with `eyJhbG...` and has role `service_role`)
- Keys can be found in Supabase Dashboard → Settings → API
- Never commit these keys to git
- `ENV_NAME` is configured as a public environment variable in `astro.config.mjs` and is used for both server-side and client-side feature flags

## Step 3: Build Settings

In Cloudflare Pages Settings → Builds:

### Build Configuration

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (leave empty)
- **Node.js version:** `22.14.0` (or compatible)

### Framework Preset

Select **"Astro"** as the framework preset if available, or keep on "None" and configure manually.

## Step 4: Deploy

1. Push your code to the connected Git repository
2. Cloudflare Pages will automatically build and deploy
3. Monitor the deployment in the "Deployments" tab

## Step 5: Verify Deployment

After deployment, verify that everything works:

### 1. Check Health Endpoint

```bash
curl https://your-project.pages.dev/api/health
# Expected: {"status":"ok"}
```

### 2. Check Environment Variables

```bash
curl https://your-project.pages.dev/api/env-check
# Expected: {"supabase_url":true,"supabase_key":true,..."all_set":true}
```

### 3. Test Homepage

Visit `https://your-project.pages.dev` in your browser. You should see the landing page.

### 4. Test Authentication

1. Visit `/auth/register` and create an account
2. Log in at `/auth/login`
3. Verify profile page works

## Troubleshooting

### HTTP 500 Error on All Routes

**Problem:** Missing or incorrect environment variables

**Solution:**
1. Run the environment check endpoint: `https://your-project.pages.dev/api/env-check`
2. Verify all variables show `true`
3. If any show `false`, check Cloudflare Pages settings
4. Ensure variable names match exactly (case-sensitive)
5. Redeploy after fixing variables

### "Missing Supabase environment variables" Error

**Problem:** Variables not accessible at runtime

**Solution:**
1. Verify variables are set in Cloudflare Pages (not .env file)
2. Check that you're using `SUPABASE_KEY` (not `SUPABASE_ANON_KEY`)
3. Ensure you've selected the correct environment (Production)
4. Redeploy after fixing

### Build Fails

**Problem:** Build errors during deployment

**Solution:**
1. Check build logs in Cloudflare Pages dashboard
2. Ensure Node.js version matches (22.14.0)
3. Verify all dependencies are in `package.json`
4. Test build locally: `npm run build`

### Authentication Not Working

**Problem:** Login/register returns errors

**Solution:**
1. Verify Supabase keys are correct
2. Check Supabase project is running
3. Ensure migrations are applied: `supabase db push`
4. Check browser console for specific errors

### Feature Flags Not Working / Navigation Hidden

**Problem:** Navigation links (Generators, etc.) are hidden or feature flags not working

**Solution:**
1. Verify `ENV_NAME` is set to `production` in Cloudflare Pages environment variables
2. Check the environment check endpoint: `https://your-project.pages.dev/api/env-check`
3. Ensure `ENV_NAME` shows `true` in the response
4. The `ENV_NAME` variable is configured to be accessible from both server-side and client-side code via `astro.config.mjs`
5. Redeploy after verifying the variable is set correctly

## Custom Domain Setup

1. In Cloudflare Pages dashboard → Custom domains
2. Add your domain
3. Follow DNS setup instructions
4. SSL certificates are automatically provisioned

## Monitoring

- **Logs:** Cloudflare Pages → Deployments → View logs
- **Analytics:** Cloudflare Dashboard → Analytics
- **Error Tracking:** Check browser console and server logs

## Security Best Practices

1. ✅ Never commit `.env` files to git
2. ✅ Use environment variables for all secrets
3. ✅ Regularly rotate API keys
4. ✅ Enable Cloudflare security features (WAF, DDoS protection)
5. ✅ Use Supabase RLS (Row Level Security) policies

## Support

For deployment issues:
1. Check this documentation
2. Review Cloudflare Pages logs
3. Test `/api/env-check` endpoint
4. Contact project maintainers

