# E2E Environment Variable Debugging - Summary & Solution

## Problem
E2E tests were failing with `Error: connect ECONNREFUSED 127.0.0.1:54321` - the application was trying to connect to a local Supabase instance instead of the cloud instance configured via environment variables.

## Root Cause
The CI workflow was building with the **Cloudflare adapter** instead of the **Node adapter**. This prevented environment variables from being accessible in the runtime.

```
📌 Key Issue:
   package.json: "build": "ASTRO_TARGET=cloudflare astro build"
   CI workflow: "Build for E2E (Node adapter)" → run: npx astro build
   
   Result: CI built with Cloudflare, not Node! ❌
```

## Solution Implemented

### 1. **Created Separate Build Scripts**
```json
// package.json
"build": "ASTRO_TARGET=cloudflare astro build",     // Production (Cloudflare)
"build:node": "astro build",                         // E2E/Preview (Node)
"preview": "node scripts/preview.js",                // Loads dotenv first
```

### 2. **Updated CI Workflow**
```yaml
# .github/workflows/main.yml
- name: Build for E2E (Node adapter)
  run: npm run build:node  # ✅ Now uses Node adapter
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
    ENV_NAME: production
```

### 3. **Created dotenv Preloader**
```javascript
// scripts/preview.js
import('dotenv').then(({ config }) => {
  config();  // Load .env file
  console.log('✅ Environment variables loaded via dotenv');
  
  import('../dist/server/entry.mjs').then(() => {
    // Entry point auto-starts server
  });
});
```

### 4. **Enhanced Diagnostics**
```typescript
// src/db/supabase.client.ts
console.log("🔍 DEBUG SUPABASE CLIENT INIT:", {
  supabaseUrl: {
    fromImportMeta: "✅ Set",
    fromProcessEnv: "✅ Set",  
    final: "✅ CLOUD",
    value: "https://cloud-url.supabase.co"
  },
  processAvailable: { exists: "✅ Yes", env: "✅ Yes" }
});
```

### 5. **Added Unit Tests**
```typescript
// src/__tests__/lib/supabase-client.test.ts
- Verify env vars are set and accessible
- Test Supabase client initialization succeeds
- Test error handling when env vars missing
```

### 6. **Fixed Vitest Setup**
```typescript
// src/test/setup.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });  // Load test env vars
```

## Verification

✅ **All unit tests pass** with cloud credentials:
```
✓ src/__tests__/lib/supabase-client.test.ts (3 tests) 28ms
```

✅ **Debug output confirms**:
```
fromProcessEnv: '✅ Set'
final: '✅ CLOUD'
value: 'https://cqtgxhzlrzuoykewqvxg.supabase.co'
```

✅ **Preview server starts** with:
```
✅ Environment variables loaded via dotenv
✅ Astro server entry loaded
Server listening on http://localhost:3000
```

## How It Works Now

### In CI:
1. Build with `npm run build:node` → Node adapter (not Cloudflare)
2. Environment variables set as GitHub secrets
3. Run `npm run preview` → scripts/preview.js starts
4. dotenv loads SUPABASE_URL and SUPABASE_KEY from environment
5. E2E tests hit localhost:3000 which connects to cloud Supabase

### Locally:
1. `.env` file has SUPABASE_URL and SUPABASE_KEY
2. `npm run build:node` builds with Node adapter
3. `npm run preview` calls scripts/preview.js
4. dotenv loads env vars from `.env`
5. Server connects to cloud Supabase

## Files Changed

| File | Role |
|------|------|
| `package.json` | Separate build scripts for Node vs Cloudflare |
| `.github/workflows/main.yml` | Use Node build for E2E |
| `scripts/preview.js` | Dotenv preloader + entry wrapper |
| `src/db/supabase.client.ts` | Enhanced debug logging |
| `src/test/setup.ts` | Load .env.test for tests |
| `src/__tests__/lib/supabase-client.test.ts` | Verification tests |
| `E2E_ISSUE_CONTEXT.md` | Complete technical context |

## Key Learnings

### Problem Recognition
- CI was silently using wrong adapter without error
- `import.meta.env` doesn't work with Node adapter + runtime vars
- Vite strips `process` references for browser compatibility

### Solution Strategy
- Use separate build targets for different runtimes
- Load env vars at Node startup time (not build time)
- Add diagnostic logging to track var sources
- Test locally before pushing to CI

### Best Practices
1. **Don't hardcode env vars at build time** - use runtime loading for Node
2. **Add diagnostic logging** - makes debugging 100x easier
3. **Test locally first** - replicate CI environment locally
4. **Separate concerns** - one build for Cloudflare, one for Node

## Next Steps

### For Next Agent (Testing CI)
1. Push branch to GitHub
2. Monitor CI logs for debug output
3. Verify E2E tests pass (no localhost:54321 errors)
4. Merge to main once confirmed

### For Future Improvements
- Consider environment-specific configs
- Add health check endpoint that shows env var status
- Document E2E setup in README
- Consider automated env var validation in CI

## Testing Checklist

- [x] Unit tests pass with cloud credentials
- [x] Preview server starts and loads env vars
- [x] Debug logging shows correct sources
- [x] Locally replicates CI setup
- [ ] CI builds successfully with Node adapter (await)
- [ ] E2E tests connect to cloud Supabase (await)
- [ ] Registration/signin tests pass (await)
- [ ] All E2E tests pass (await)

## Resources

- [Astro SSR Guide](https://docs.astro.build/en/guides/server-side-rendering/)
- [Astro Node Adapter](https://docs.astro.build/en/guides/integrations-guide/node/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## Questions?

See `E2E_ISSUE_CONTEXT.md` for complete technical details and troubleshooting guide.
