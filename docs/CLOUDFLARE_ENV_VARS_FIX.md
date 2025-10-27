# Cloudflare Environment Variables - Critical Issue

## Problem

Build log shows:
```
Build environment variables: (none found)
```

**Despite** `ENV_NAME` and `PUBLIC_ENV_NAME` being configured in Cloudflare Dashboard.

## Root Cause

Cloudflare Pages has **two types** of environment variables:
1. **Secret** - Available at **runtime** only (for Workers/API endpoints)
2. **Build Variable** - Available during **build time** (for `npm run build`)

Our feature flags need variables **during build** because Astro server-side rendering happens at build time.

## Solution

### Option 1: Add as Build Variable (RECOMMENDED)

In Cloudflare Dashboard:

1. Go to: Workers & Pages → qa-toolsmith → Settings
2. Scroll to "Builds & deployments" or find "Environment variables"
3. Look for distinction between "Secret" and "Build Variable"
4. Add both variables as **Build Variables**:
   - `ENV_NAME` = `production`
   - `PUBLIC_ENV_NAME` = `production`

### Option 2: Use wrangler.toml (ALTERNATIVE)

Add to `wrangler.toml`:

```toml
name = "qa-toolsmith"
pages_build_output_dir = "dist"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENV_NAME = "production"
PUBLIC_ENV_NAME = "production"
```

**Warning:** This hardcodes values in git. Not ideal for different environments.

### Option 3: Always Use Safe Defaults (FALLBACK)

Change code to not rely on environment variables for feature flags. Instead:

1. Remove `ENV_NAME` check in `src/features/index.ts`
2. Always use production flags
3. Remove `PUBLIC_ENV_NAME` check in `src/lib/utils/environment.ts`

## Verification

After fix, check build logs for:
```
Build environment variables:
  - ENV_NAME=production
  - PUBLIC_ENV_NAME=production
```

## Current Status

- Variables configured in Dashboard: ✅
- Variables available during build: ❌
- Variables available at runtime: ❓ (needs testing)
- Feature flags working: ❌

---

**Next Steps:** Try Option 1 first. If not available in Cloudflare UI, use Option 3 as fallback.

