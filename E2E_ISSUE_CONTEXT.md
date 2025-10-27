# E2E Tests Issue - Complete Context for Next Agent

## Problem Summary

E2E tests are failing in CI because the application is trying to connect to `127.0.0.1:54321` (local Supabase instance) instead of using cloud Supabase credentials provided via environment variables.

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:54321
```

**Failing tests:**
- `e2e/registration.spec.ts` - 3 test failures (attempting to register new users)

**Environment Variables Available in CI:**
- ✅ `SUPABASE_URL` - Set (cloud URL)
- ✅ `SUPABASE_KEY` - Set (cloud anon key)
- ✅ `ENV_NAME=production`
- ✅ `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_USERNAME_ID`

## Root Cause Analysis

### Issue: Astro SSR with Node Adapter and Environment Variables

In Astro SSR with Node adapter, there are two runtime environments:
1. **Cloudflare Workers** (production) - uses `import.meta.env` automatically
2. **Node.js Runtime** (CI E2E tests) - requires explicit handling of `process.env`

The problem was that `vite.define` in `astro.config.mjs` performs **build-time substitution**:
- When `process.env.SUPABASE_URL` is undefined at build time → gets embedded as literal `undefined` in the build
- Runtime environment variables are NOT accessible through `import.meta.env` in Node adapter
- Vite strips `process` references during bundling for browser compatibility

### Root Cause Identified

**The CI build was using Cloudflare adapter instead of Node adapter!**

In `.github/workflows/main.yml` E2E job:
```yaml
- name: Build for E2E (Node adapter)
  run: npx astro build  # ❌ This uses ASTRO_TARGET=cloudflare from package.json
```

But `package.json` defines:
```json
"build": "ASTRO_TARGET=cloudflare astro build"
```

So when CI ran `astro build` without environment variables, it was still building with Cloudflare adapter.

## Solution Implemented

### 1. Created separate build script for Node adapter
**File: `package.json`**
```json
"build": "ASTRO_TARGET=cloudflare astro build",
"build:node": "astro build",
"preview": "node scripts/preview.js",
```

### 2. Updated CI workflow to use Node build script
**File: `.github/workflows/main.yml` (line 129)**
```yaml
- name: Build for E2E (Node adapter)
  run: npm run build:node
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
    ENV_NAME: production
```

### 3. Created preview script that loads dotenv
**File: `scripts/preview.js`**

This script:
1. Loads environment variables via `dotenv` at runtime
2. Then imports the Astro entry point
3. Ensures env vars are available in `process.env` before any code needs them

```javascript
import('dotenv').then(({ config }) => {
  config();  // Load env vars from .env file
  console.log('✅ Environment variables loaded via dotenv');
  
  // Now import server entry point
  import('../dist/server/entry.mjs').then((module) => {
    // Entry point auto-starts via serverEntrypointModule['start']
  });
});
```

### 4. Enhanced Supabase client with diagnostic logging
**File: `src/db/supabase.client.ts`**

Added comprehensive debug output showing:
- Where env vars come from (import.meta.env vs process.env)
- Whether they're localhost or cloud URLs
- Whether process is available in globalThis
- Timestamp and environment mode

```typescript
console.log("🔍 DEBUG SUPABASE CLIENT INIT:", {
  timestamp: new Date().toISOString(),
  environment: { mode, prod, dev, envName },
  supabaseUrl: {
    fromImportMeta: "...",
    fromProcessEnv: "...",
    final: "..."
  },
  processAvailable: {...}
});
```

## Current Status

### Changes Made
✅ Fixed build script in `package.json`
✅ Updated CI workflow to use correct build
✅ Created Node runtime wrapper with dotenv loading
✅ Added enhanced diagnostic logging

### Testing Status
✅ `npm run build:node` builds successfully with Node adapter
✅ `npm run preview` starts server and loads env vars via dotenv
✅ Server listens on http://localhost:3000

## How It Works Now

1. **In CI:**
   - CI builds with `npm run build:node` → uses Node adapter
   - CI sets SUPABASE_URL and SUPABASE_KEY as environment variables
   - CI runs `npm run preview` which calls `scripts/preview.js`
   - `preview.js` loads dotenv + imports entry.mjs
   - Supabase client reads env vars from `process.env`

2. **Locally:**
   - `.env` file has SUPABASE_URL and SUPABASE_KEY
   - `npm run build:node` builds with Node adapter
   - `npm run preview` runs `scripts/preview.js`
   - `preview.js` calls `dotenv.config()` which loads `.env`
   - Supabase client has access to env vars

## Files Modified

- `package.json` - Added `build:node` and updated `preview` script
- `.github/workflows/main.yml` - Changed build command to `npm run build:node`
- `src/db/supabase.client.ts` - Enhanced diagnostic logging
- `scripts/preview.js` - **NEW** - Preview script with dotenv loading

## Next Steps

1. Push these changes to the feat/auth-improvements branch
2. CI should now:
   - Build with Node adapter (not Cloudflare)
   - Environment variables should be available via process.env
   - E2E tests should connect to cloud Supabase (not localhost:54321)
3. Monitor CI logs for "🔍 DEBUG SUPABASE CLIENT INIT" output to confirm env vars are being loaded
4. Once E2E tests pass, merge to main

## Useful Resources

- [Astro SSR Documentation](https://docs.astro.build/en/guides/server-side-rendering/)
- [Astro Node Adapter](https://docs.astro.build/en/guides/integrations-guide/node/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [dotenv Documentation](https://github.com/motdotla/dotenv)

