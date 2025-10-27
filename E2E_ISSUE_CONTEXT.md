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
2. **Node.js Runtime** (CI E2E tests) - requires explicit handling

The problem is that `vite.define` in `astro.config.mjs` performs **build-time substitution**:
- When `process.env.SUPABASE_URL` is undefined at build time → gets embedded as literal `undefined` in the build
- Runtime environment variables are NOT accessible through `import.meta.env` in Node adapter

### Attempted Solutions (Chronological)

#### 1. Initial Approach: Added SUPABASE vars to vite.define ❌
```javascript
define: {
  "import.meta.env.SUPABASE_URL": JSON.stringify(process.env.SUPABASE_URL),
  "import.meta.env.SUPABASE_KEY": JSON.stringify(process.env.SUPABASE_KEY),
}
```
**Problem:** Hardcodes `undefined` at build time, runtime vars inaccessible.

#### 2. Second Approach: Added process.env fallback ❌
```javascript
const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
```
**Problem:** Vite strips `process` references during bundling for browser compatibility.

#### 3. Current Approach: globalThis.process fallback 🟡
```javascript
const nodeProcess = (globalThis as any).process || undefined;
const supabaseUrl = import.meta.env.SUPABASE_URL || nodeProcess?.env?.SUPABASE_URL;
```
**Status:** Still failing - likely need to investigate further.

## Current Implementation

### Key Files Modified

#### 1. `src/db/supabase.client.ts` (Lines 29-52)
```typescript
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  // Try import.meta.env first (works in Cloudflare), fallback to process.env (works in Node adapter runtime)
  // Get process from globalThis to work around Vite bundling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeProcess = (globalThis as any).process || undefined;
  const supabaseUrl = import.meta.env.SUPABASE_URL || nodeProcess?.env?.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY || nodeProcess?.env?.SUPABASE_KEY;

  // Debug logging in all modes to diagnose CI issues
  // eslint-disable-next-line no-console
  console.log("🔍 DEBUG SUPABASE CLIENT:", {
    url: supabaseUrl || "❌ MISSING",
    urlType: supabaseUrl
      ? supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
        ? "⚠️ LOCALHOST"
        : "✅ CLOUD"
      : "N/A",
    key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : "❌ MISSING",
    nodeEnv: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    source: import.meta.env.SUPABASE_URL ? "import.meta.env" : "process.env",
  });

  if (!supabaseUrl || !supabaseKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!supabaseKey) missingVars.push("SUPABASE_KEY");

    throw new Error(
      `Missing Supabase environment variables: ${missingVars.join(", ")}. ` +
        "Please ensure these are set in Cloudflare Pages environment variables.",
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    // ... configuration
  });

  return supabase;
};
```

#### 2. `astro.config.mjs` (Lines 38-43)
```javascript
// Note: We only define ENV_NAME here as it's needed for client-side feature flags
// SUPABASE_URL and SUPABASE_KEY are accessed via process.env fallback in runtime
// (vite.define hardcodes values at build time, making runtime env vars unavailable)
define: {
  "import.meta.env.ENV_NAME": JSON.stringify(process.env.ENV_NAME),
},
```

### CI Configuration

#### `.github/workflows/main.yml` - E2E Job
Environment variables are correctly set in the workflow:
```yaml
- name: Build for E2E (Node adapter)
  run: npx astro build
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
    ENV_NAME: production

- name: Start preview server
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
    ENV_NAME: production

- name: Run E2E tests
  run: npm run test:e2e
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
    ENV_NAME: production
```

## Debugging Notes

### Missing Debug Output

The debug log at line 38-47 in `src/db/supabase.client.ts` is **NOT appearing** in CI logs. This suggests:
1. The build might not include the latest code
2. The code path might not be executing
3. Console.log might be suppressed in the build

### Key Questions to Investigate

1. **Where is `127.0.0.1:54321` coming from?**
   - Is it hardcoded somewhere in Supabase config?
   - Is it a default fallback when env vars are undefined?
   - Check `supabase/config.toml` for localhost references

2. **Why is debug logging not appearing?**
   - Check if the build includes latest code
   - Verify console.log works in Node adapter runtime
   - Check if there's logging suppression

3. **Is `globalThis.process` actually accessible in runtime?**
   - Node.js adapter might need a different approach
   - Consider using Astro's runtime context API

## Potential Solutions to Try

### Solution 1: Use Astro's Runtime Environment API
Astro 5 provides `context.locals.runtime.env` for Cloudflare, but Node adapter might need a different approach.

### Solution 2: Pass Variables via Astro API Context
Instead of global variables, pass env vars explicitly through Astro's context object.

### Solution 3: Use dotenv at Runtime
Load environment variables explicitly using dotenv when running Node adapter:
```typescript
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL;
```

### Solution 4: Conditional Build for E2E
Build with different approach for E2E tests that preserves `process.env` access.

### Solution 5: Check Supabase Client Initialization
Investigate if `@supabase/supabase-js` is falling back to localhost when URL is invalid/undefined.

## Testing Locally

To replicate the issue locally:
```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-anon-key"
export ENV_NAME="production"

# Build with Node adapter (not Cloudflare)
npx astro build
npm run preview

# Run E2E tests
npm run test:e2e
```

## Related Files

- `src/db/supabase.client.ts` - Supabase client initialization
- `astro.config.mjs` - Astro/Vite configuration
- `.github/workflows/main.yml` - CI/CD pipeline
- `src/pages/api/auth/signup.ts` - Endpoint that uses Supabase
- `supabase/config.toml` - Local Supabase configuration (port 54321)
- `e2e/setup/global.setup.ts` - E2E test setup with env var validation

## PR Details

- **Branch:** `feat/auth-improvements`
- **PR:** #5
- **Commits:** 7 commits related to this issue
- **Status:** CI still failing on E2E tests

## Next Steps for Next Agent

1. **Check if debug logs appear** - Search CI output for "🔍 DEBUG SUPABASE CLIENT"
2. **Investigate where 127.0.0.1:54321 comes from** - Search codebase for hardcoded localhost
3. **Try Solution 3** (dotenv at runtime) - Most likely to work in Node runtime
4. **Review Astro Node adapter docs** - Look for official way to access env vars
5. **Consider skipping problematic E2E tests** - If cloud Supabase access isn't critical for MVP

## Useful Resources

- [Astro SSR Documentation](https://docs.astro.build/en/guides/server-side-rendering/)
- [Astro Node Adapter](https://docs.astro.build/en/guides/integrations-guide/node/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/creating-a-client)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

