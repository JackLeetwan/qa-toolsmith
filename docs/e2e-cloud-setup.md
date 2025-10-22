# E2E Tests with Cloud Supabase - Setup Guide

## Overview

This guide explains how to configure and run E2E tests with a dedicated cloud Supabase project. This approach ensures:

- **Isolation**: Separate database for E2E tests (not production or local development)
- **Reproducibility**: Consistent test environment with seeded data
- **Stability**: Independent from local Supabase CLI or Docker dependencies
- **CI/CD Ready**: Easy integration with GitHub Actions

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ E2E Test Strategy                                   │
├─────────────────────────────────────────────────────┤
│ Development:  Local Supabase (supabase-cli)        │
│ Unit Tests:   Local Supabase (supabase-cli)        │
│ E2E Tests:    Cloud Supabase (dedicated project)   │
│ Staging:      Cloud Supabase (dedicated project)   │
│ Production:   Cloud Supabase (dedicated project)   │
└─────────────────────────────────────────────────────┘
```

## Step 1: Create Cloud Supabase Project

1. Go to [https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects)
2. Sign up or log in to your account
3. Click **"New project"**
4. Configure the project:
   - **Name**: `qa-toolsmith-e2e`
   - **Database Password**: Choose a strong password and **save it securely** (you'll need it for migrations)
   - **Region**: Select the closest region
   - **Pricing Plan**: Free tier is sufficient for E2E tests

⏳ Wait 2-3 minutes for the project to be provisioned.

## Step 2: Get Project Credentials

After project creation, you'll need two values:

1. **Project URL** (`SUPABASE_URL`)
2. **Public anon key** (`SUPABASE_KEY`)

### How to find them:

1. In the Supabase Dashboard, click **"Connect"** at the top navigation
2. Copy the values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Create Test User

Create a dedicated test user for E2E scenarios:

1. In Supabase Dashboard, go to **Authentication → Users**
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email**: `e2e-test@qa-toolsmith.local` (or your preferred test email)
   - **Password**: Choose a strong password
   - **Auto-confirm user**: ✅ Enable (skip email verification)
4. Click **"Create user"**
5. Copy the **User UID** (shown in the users table)

## Step 4: Configure Environment Variables

1. Copy the example file:

```bash
cp .env.test.example .env.test
```

2. Fill in the actual values in `.env.test`:

```bash
# Supabase Cloud Project for E2E Testing
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# E2E Test User Credentials
E2E_USERNAME_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
E2E_USERNAME=e2e-test@qa-toolsmith.local
E2E_PASSWORD=your-secure-password
```

⚠️ **Security**: `.env.test` is already in `.gitignore`. **Never commit this file to version control.**

## Step 5: Migrate Database Schema

Apply the database schema from local migrations to the cloud project:

1. Link to the cloud project:

```bash
supabase link --project-ref xxxxxxxxxxxxx
```

Replace `xxxxxxxxxxxxx` with your project reference (found in Project Settings → General → Reference ID).

You'll be prompted for the **database password** (from Step 1).

2. Push migrations:

```bash
supabase db push
```

This applies all migrations from `supabase/migrations/` to the cloud database.

3. Verify in Supabase Dashboard:
   - Go to **Database → Tables**
   - Confirm that tables exist: `profiles`, `templates`, `charters`, `kb_entries`, etc.

## Step 6: Run E2E Tests

### Local Execution

Run all E2E tests:

```bash
npm run test:e2e
```

Run with UI mode (interactive):

```bash
npm run test:e2e:ui
```

Run with headed browser (visible):

```bash
npm run test:e2e:headed
```

Debug a specific test:

```bash
npm run test:e2e:debug
```

### CI/CD Execution

E2E tests are automatically run in GitHub Actions on:
- Pull requests
- Pushes to `main` branch

To enable CI/CD, add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

Add each secret:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_KEY`
- `E2E_USERNAME`
- `E2E_PASSWORD`
- `E2E_USERNAME_ID`

## How It Works

### Global Setup (`e2e/setup/global.setup.ts`)

Runs **once before all tests**:

1. ✅ Validates environment variables
2. ✅ Confirms connection to Supabase cloud
3. 🔮 (Future) Pre-authenticates and saves auth state for faster tests

### Global Teardown (`e2e/teardown/global.teardown.ts`)

Runs **once after all tests**:

1. 🔐 Authenticates as test user (required for RLS)
2. 🧹 Deletes all test data from tables:
   - `charter_notes`
   - `kb_notes`
   - `charters`
   - `kb_entries`
   - `drafts`
   - `ai_invocations`
   - `ai_daily_usage`
   - `usage_events`
   - `templates` (user-scoped only)
3. 📊 Logs cleanup results

### Test Execution

Each test runs against the cloud Supabase project:

- **API tests**: Call endpoints directly using `page.request.get()`
- **UI tests**: Navigate pages and interact with components

## Playwright Configuration

Key changes in `playwright.config.ts`:

```typescript
// Load .env.test variables
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

// Use dev:e2e server (Astro with --mode test)
webServer: {
  command: "npm run dev:e2e",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
}

// Global setup/teardown
globalSetup: "./e2e/setup/global.setup.ts",
globalTeardown: "./e2e/teardown/global.teardown.ts",
```

## Cleanup Strategy

### Single-Developer Projects

The current teardown strategy is safe:
- Deletes all data after test completion
- No conflicts with other developers

### Multi-Developer Projects

⚠️ **Warning**: Parallel test runs will conflict if using the same test user.

**Solutions**:

1. **Per-developer test users**: Create separate E2E users for each developer
   - `E2E_USERNAME=e2e-dev1@qa-toolsmith.local`
   - `E2E_USERNAME=e2e-dev2@qa-toolsmith.local`

2. **Supabase Branching**: Use Supabase's branching feature for isolated test databases

3. **Time-based cleanup**: Run cleanup cron job (e.g., nightly at midnight) instead of after each test run

4. **Test data namespacing**: Prefix test data with unique identifiers (e.g., timestamp, developer ID)

## Troubleshooting

### Error: Missing environment variables

**Symptom**: Tests fail with "Missing required environment variables"

**Solution**:
1. Verify `.env.test` exists and has all required variables
2. Check that `playwright.config.ts` loads `.env.test` correctly
3. Restart terminal/IDE to refresh environment

### Error: Authentication failed

**Symptom**: "Authentication failed" in teardown logs

**Solution**:
1. Verify test user exists in Supabase Dashboard
2. Confirm email and password match `.env.test`
3. Check that user is auto-confirmed (no email verification pending)

### Error: Timeout waiting for server

**Symptom**: `webServer` fails to start within 120s

**Solution**:
1. Check port 3000 is not already in use: `lsof -i :3000`
2. Verify `.env.test` has valid Supabase credentials
3. Run `npm run dev:e2e` manually to debug

### Error: RLS policy prevents data deletion

**Symptom**: Teardown logs "Error deleting..." for tables

**Solution**:
1. Ensure teardown authenticates as the same test user that created data
2. Verify RLS policies allow deletion for `user_id = auth.uid()`
3. Check database logs in Supabase Dashboard → Database → Logs

### Error: IBAN generator tests fail

**Symptom**: IBAN API tests return 500 errors

**Solution**:
1. Check that Astro server is running with `--mode test`
2. Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
3. Confirm database schema is migrated (Step 5)

## Best Practices

✅ **DO**:
- Use dedicated cloud project for E2E (not production)
- Rotate test user password regularly
- Keep `.env.test` out of version control
- Run tests before pushing to remote
- Review teardown logs for data cleanup confirmation

❌ **DON'T**:
- Share test user credentials across multiple projects
- Use production database for E2E tests
- Commit `.env.test` to Git
- Skip teardown (leads to data accumulation)
- Run E2E tests with `--headed` in CI (use headless mode)

## Future Optimizations

### 1. Authentication State Caching

**Current**: Tests authenticate via UI when needed (slow)

**Future**: Pre-authenticate in global setup and reuse auth state

```typescript
// Save auth state in global setup
await page.context().storageState({ path: "./e2e/.auth/user.json" });

// Reuse in tests
use: {
  storageState: "./e2e/.auth/user.json"
}
```

**Benefit**: 5-10x faster test execution for authenticated scenarios

### 2. API-based Authentication

**Current**: Login via UI (navigate → fill form → submit)

**Future**: Login via API call

```typescript
const response = await page.request.post("/api/auth/login", {
  data: {
    email: process.env.E2E_USERNAME,
    password: process.env.E2E_PASSWORD,
  },
});

const { access_token } = await response.json();
await page.context().addCookies([
  { name: "auth_token", value: access_token, domain: "localhost", path: "/" },
]);
```

**Benefit**: Skip UI navigation, faster test setup

### 3. Parallel Test Execution

**Current**: Sequential execution in CI (`workers: 1`)

**Future**: Parallel execution with isolated test data

**Benefit**: 3-5x faster CI pipeline

## References

- **Playwright Global Setup/Teardown**: [https://playwright.dev/docs/test-global-setup-teardown](https://playwright.dev/docs/test-global-setup-teardown)
- **Supabase CLI Reference**: [https://supabase.com/docs/reference/cli](https://supabase.com/docs/reference/cli)
- **Supabase Auth**: [https://supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
- **E2E Testing Best Practices**: `docs/TESTING_GUIDELINES.md`
- **E2E Diagnostics**: `docs/e2e-diagnostics.md`
- **Page Object Model Guide**: `docs/e2e-pom-guide.md`

