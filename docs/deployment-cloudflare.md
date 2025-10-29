# Cloudflare Pages Deployment Guide

This guide explains how to deploy QA Toolsmith to Cloudflare Pages in production.

## CI/CD Pipeline

QA Toolsmith uses GitHub Actions for automated testing and deployment to Cloudflare Pages.

### Workflow Structure

The CI/CD is split into two separate workflows for better security and performance:

#### CI Pipeline (`.github/workflows/ci.yml`)

- **Purpose**: Continuous Integration for PR validation
- **Triggers**: Push to `main`/`master`, Pull Requests
- **Jobs**: Lint → Build → Unit Tests → E2E Tests → Status Comment
- **Artifacts**: 30-day retention (push) / 7-day retention (PR)

#### Deployment Pipeline (`.github/workflows/deploy-cloudflare.yml`)

- **Purpose**: Production deployment to Cloudflare Pages
- **Triggers**: Push to `master` branch, Manual dispatch
- **Jobs**: Build → Deploy via Wrangler
- **Strategy**: Direct upload with graceful skip if secrets not configured

### Recommended Flow

```
┌─────────────────┐
│   Open PR       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CI Pipeline   │──► Lint → Build → Test → E2E
│    (ci.yml)     │     │
└────────┬────────┘     │
         │              ▼
         │         Status Comment on PR
         │
         ▼
  ┌─────────────────┐
  │  Merge to       │
  │    master       │
  └────────┬────────┘
           │
           ▼
    ┌──────────────────┐
    │ Deploy Workflow  │──► Build → Deploy to Cloudflare
    │ (deploy-         │     │
    │  cloudflare.yml) │     │
    └──────────────────┘     │
                            ▼
                   Cloudflare Pages Production
```

### Why Separate Workflows?

1. **Separation of Concerns**: CI checks run independently from deployments
2. **Security**: Deployment secrets only exposed during deployment jobs
3. **Performance**: E2E tests not run before deployment (already tested in PR)
4. **Flexibility**: Manual deployment via workflow dispatch
5. **Cost**: Deployment jobs only run when needed

### Required GitHub Secrets

#### CI Pipeline

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `E2E_USERNAME` (optional) - Test user email
- `E2E_PASSWORD` (optional) - Test user password
- `E2E_USERNAME_ID` (optional) - Test user UUID

#### Deployment Pipeline

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_PAGES_PROJECT_NAME` (optional) - Project name, defaults to 'qa-toolsmith'
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENROUTER_API_KEY` (optional) - AI service API key

### Getting Cloudflare Secrets

1. **API Token**: Cloudflare Dashboard → My Profile → API Tokens → Create token with "Cloudflare Pages - Edit" template
2. **Account ID**: Find in Cloudflare Dashboard URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/`
3. **Project Name**: Optional, defaults to `qa-toolsmith` (found in Cloudflare Pages dashboard)

For detailed workflow documentation, see `.github/workflows/README.md`.

## Prerequisites

- Cloudflare account
- Supabase project with database migrations applied
- Git repository (GitHub, GitLab, or Bitbucket)

**📚 For detailed configuration steps:** See `docs/SETUP_GUIDE.md` (Polish) for step-by-step instructions on setting up GitHub Secrets and Cloudflare environment variables.

## Step 1: Fork/Clone Repository

1. Fork the repository or connect your Cloudflare Pages account to your Git repository
2. Ensure your repository contains the complete codebase

## Step 2: Configure Environment Variables in Cloudflare Pages

**📚 For detailed setup instructions:** See `docs/SETUP_GUIDE.md` (Polish), section "KROK 2: Konfiguracja Cloudflare"

Add the following **required** variables in Cloudflare Pages → Settings → Environment Variables:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_KEY` - Supabase service_role key (⚠️ Keep secret)
- `ENV_NAME` - Set to `production`
- `OPENROUTER_API_KEY` - Optional, for AI features

**Key Locations:** Supabase Dashboard → Settings → API

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

## Environment Variables Technical Details

### How It Works

QA Toolsmith uses **`astro:env`** (Astro 5's typed environment variable system) to access environment variables in a type-safe and secure way. The system provides clear separation between server-side and client-side variables, with proper type checking and secret protection.

### Variable Types and Access

Environment variables are accessed through Astro's environment modules:

**Server-side access** (API routes, server components):

```typescript
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  OPENROUTER_API_KEY,
} from "astro:env/server";
```

**Client-side access** (only public variables):

```typescript
import { ENV_NAME } from "astro:env/client";
```

### Variable Schema

The project defines a schema in `astro.config.mjs` specifying:

- **Type safety**: Each variable has a defined type (string, enum, etc.)
- **Access level**: `server` for secrets, `client` for public values, `public` for client-accessible server vars
- **Validation**: Invalid types fail early at runtime

### Important Technical Notes

1. ✅ **Type-safe**: All environment variables are validated against the schema in `astro.config.mjs`
2. ✅ **Secure**: Secrets are only available server-side through `astro:env/server`
3. ✅ **Cloudflare Workers compatible**: Cloudflare bindings (`context.locals.runtime.env`) are used as the primary source, with `astro:env` as a type-safe wrapper
4. ✅ **Node.js fallback**: Local development and E2E tests use fallback to `process.env` when run in Node mode

### Variable Priority

The application uses a three-tier priority system for environment variables:

1. **Cloudflare bindings** (`context.locals.runtime.env`) - primary source in production (Workers)
2. **Astro environment** (`astro:env/server`) - type-safe schema-based access
3. **Node.js fallback** (`process.env`) - for local development and E2E tests

### References

- [Astro: Variable types](https://docs.astro.build/en/guides/environment-variables/#variable-types)
- [Astro × Cloudflare: Env & Secrets](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#environment-variables-and-secrets)

For more details on implementation, see `src/db/supabase.client.ts` and `src/lib/services/health.service.ts`.

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

---

## See Also

### Related Documentation

- **[Tech Stack](./tech-stack.md)** - Complete technology overview and deployment configuration
- **[API Documentation](./api.md)** - API endpoints and authentication details
- **[Setup Guide](./SETUP_GUIDE.md)** - Polish setup instructions with environment configuration
- **[Architecture Overview](../.ai/ARCHITECTURE.md)** - High-level architecture and database design
- **[README](../README.md)** - Project overview and getting started

### Configuration Files

- **`astro.config.mjs`** - Astro configuration with Cloudflare adapter
- **`wrangler.toml`** - Cloudflare Workers configuration
- **`.github/workflows/deploy-cloudflare.yml`** - Deployment CI/CD workflow

### Troubleshooting

- **Environment variables not working**: See [Environment Variables](#environment-variables) section
- **Build fails in CI/CD**: Check [GitHub Actions Secrets](#github-actions-secrets) configuration
- **Deployment fails**: Review [Deployment Workflow](#deployment-workflow) logs
