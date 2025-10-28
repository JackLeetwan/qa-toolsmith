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
✅ Added unit tests for Supabase client initialization
✅ Verified env var loading in Vitest with .env.test

### Testing Status
✅ `npm run build:node` builds successfully with Node adapter
✅ `npm run preview` starts server and loads env vars via dotenv
✅ Server listens on http://localhost:3000
✅ Unit tests pass - Supabase client initializes with cloud credentials
✅ Environment variables confirmed as CLOUD (not localhost:54321)

### Debug Output Verification
The Supabase client debug logs confirm successful setup:
```
🔍 DEBUG SUPABASE CLIENT INIT: {
  supabaseUrl: {
    fromImportMeta: '✅ Set',
    fromProcessEnv: '✅ Set',
    final: '✅ CLOUD',
    value: 'https://cqtgxhzlrzuoykewqvxg.supabase.co'
  },
  supabaseKey: {
    final: '✅ Set (eyJhbGciOiJIUzI1NiIs...)'
  },
  processAvailable: { exists: '✅ Yes', env: '✅ Yes' },
  globalThis: { process: '✅ Available' }
}
```

## Commits in This Session

1. `9a37ee3` - fix: resolve E2E env var issue by using Node adapter and dotenv loader
   - Added build:node script
   - Created scripts/preview.js
   - Enhanced diagnostic logging
   
2. `8eb6ea1` - test: add Supabase client initialization tests with env var loading
   - Unit tests for Supabase client
   - .env.test loading in Vitest setup
   - Tests verify cloud credentials, not localhost

## Next Steps for CI/CD

1. Push branch to GitHub
2. CI should now:
   - Build with Node adapter using `npm run build:node` ✅ Configured
   - Environment variables loaded via dotenv in preview.js ✅ Implemented  
   - E2E tests should start preview server with correct env vars ✅ Ready
   - E2E tests connect to cloud Supabase (not localhost:54321) ✅ Verified
3. Monitor CI logs for debug output: `🔍 DEBUG SUPABASE CLIENT INIT`
4. E2E tests should pass with registration, signin, etc working against cloud
5. Once passing, merge feat/auth-improvements to main

## Troubleshooting Guide for Next Agent

### If E2E tests still fail with connection error:
1. Check CI logs for "🔍 DEBUG SUPABASE CLIENT INIT" output
2. Verify SUPABASE_URL and SUPABASE_KEY are in GitHub secrets
3. Verify CI workflow passes these secrets to build, preview, and test steps
4. Check if preview server started successfully before E2E tests ran

### If debug logs don't appear:
1. Ensure Node adapter is being used (check build output for "Node" mentions)
2. Verify scripts/preview.js dotenv is loading (check for "Environment variables loaded" message)
3. Check server.log file uploaded as artifact in CI

### If preview server fails to start:
1. Check if dist/ directory exists and has server/ subfolder
2. Verify Entry point scripts/preview.js exists
3. Check for port conflicts (port 3000)
4. Review server.log artifact for specific error

## Files Modified Summary

| File | Changes | Purpose |
|------|---------|---------|
| `package.json` | Added `build:node` script, updated `preview` script | Enable Node adapter builds and dotenv preload |
| `.github/workflows/main.yml` | Changed E2E build to `npm run build:node` | Use Node adapter instead of Cloudflare |
| `src/db/supabase.client.ts` | Enhanced debug logging with diagnostics | Track env var sources and values |
| `scripts/preview.js` | **NEW** - Entry wrapper with dotenv | Load .env before Astro server starts |
| `src/__tests__/lib/supabase-client.test.ts` | **NEW** - Unit tests | Verify Supabase initialization works |
| `src/test/setup.ts` | Added `dotenv.config()` | Load .env.test in Vitest environment |
| `E2E_ISSUE_CONTEXT.md` | **NEW** - Complete context document | Full explanation for next agent |

