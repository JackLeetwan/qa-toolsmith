# Testing Guidelines

This document outlines the testing principles and guardrails for QA Toolsmith.

## Core Principles

### FIRST Principle
Tests should be:
- **Fast**: Execute quickly to enable frequent runs
- **Independent**: No dependencies between tests
- **Repeatable**: Same results every run
- **Self-validating**: Clear pass/fail criteria
- **Timely**: Written before or alongside code

### Test Isolation
- Each test runs in complete isolation
- No shared state between tests
- Clean up after each test (teardown)
- Use proper mocking to avoid external dependencies

## Implementation Rules

### No Sleeps or Arbitrary Waits
- Never use `sleep()`, `setTimeout()`, or arbitrary delays
- Use conditional waits that respond to actual application state
- For E2E tests: rely on Playwright's built-in waiting mechanisms

### No Global ESLint Disables
- Do not disable ESLint rules globally in test files
- Use targeted disables with justification when absolutely necessary
- Prefer code fixes over rule disables

### No TypeScript Config Loosening
- Do not modify `tsconfig.json` to relax type checking for tests
- Tests should maintain the same type safety as production code
- Use proper type assertions and mocks instead of `any`

### Stable Selectors
- Use semantic selectors (data-testid, role, accessible names)
- Avoid fragile selectors (CSS classes, XPath)
- Prefer built-in Playwright locators over custom selectors

## Page Object Model (POM)

The E2E tests follow the **Page Object Model** design pattern to improve maintainability and reduce code duplication.

### Purpose

POM encapsulates all selectors and actions related to a specific page into a dedicated class. This provides:

- **Centralized Selectors**: All locators are in one place, making updates easy
- **Reusable Actions**: Common page interactions are methods that multiple tests can call
- **Improved Readability**: Tests read like user stories, not selector chains
- **Reduced Maintenance**: Selector changes only need to be updated in one location

### Structure

All POM classes are located in `e2e/pages/`:

```
e2e/pages/
├── BasePage.ts              # Base class with common functionality
├── HomePage.ts              # Homepage POM
└── IBANGeneratorPage.ts     # IBAN Generator page POM
```

#### BasePage

The `BasePage` class provides common functionality shared by all page objects:

```typescript
// Navigation
await page.goto(path)

// Permissions
await page.grantClipboardPermissions()

// Utilities
await page.waitForPageReady()
```

All page objects extend `BasePage` to inherit these methods.

#### Naming Conventions

Page Object Model classes follow strict naming conventions for clarity:

##### Locators: `get*()` methods

Return `Locator` objects representing UI elements:

```typescript
// ✅ Good: Clear, semantic naming
getGenerateButton(): Locator
getCopyButton(): Locator
getResultContent(): Locator

// ❌ Avoid: Vague or implementation-specific naming
getBtn(): Locator
getElement(): Locator
```

##### Actions: `do*()` methods (or `click*()`, `fill*()`, etc.)

Perform user interactions:

```typescript
// ✅ Good: Action-focused naming
async clickGenerateButton(): Promise<void>
async fillCountryField(country: string): Promise<void>
async submitForm(): Promise<void>

// ❌ Avoid: Ambiguous naming
async click(): Promise<void>
async input(value: string): Promise<void>
```

##### Verification: `verify*()` methods

Assert expected state:

```typescript
// ✅ Good: Explicit verification
async verifyResultIsValidIBAN(): Promise<void>
async verifyErrorMessageDisplayed(): Promise<void>
async verifyCopyButtonVisible(): Promise<void>

// ❌ Avoid: Incomplete naming
async check(): Promise<void>
async validate(): Promise<void>
```

### Example: IBANGeneratorPage

```typescript
export class IBANGeneratorPage extends BasePage {
  // Locators (return Locator, no execution)
  getGenerateButton(): Locator {
    return this.page.getByRole("button", { name: /Generate IBAN/i });
  }

  // Actions (perform user interactions)
  async clickGenerateButton(): Promise<void> {
    const btn = this.getGenerateButton();
    await expect(btn).toBeEnabled({ timeout: 5000 });
    await btn.click();
  }

  // Verification (assert expectations)
  async verifyResultIsValidIBAN(): Promise<void> {
    const text = await this.getResultText();
    expect(text).toMatch(/[A-Z]{2}\d{2}/);
  }
}
```

### Using POM in Tests

Tests become cleaner and more readable:

#### ❌ Before (inline selectors)

```typescript
test("should copy IBAN", async ({ page }) => {
  const generateBtn = page.getByRole("button", { name: /Generate IBAN/i });
  await generateBtn.click();

  const copyBtn = page.locator("[data-testid='iban-copy-button']");
  await expect(copyBtn).toBeVisible({ timeout: 20000 });
  await copyBtn.click();

  const toast = page.getByText("IBAN copied to clipboard", { exact: true });
  await expect(toast).toBeVisible({ timeout: 5000 });
  await expect(toast).toBeHidden({ timeout: 10000 });
});
```

#### ✅ After (using POM)

```typescript
test("should copy IBAN", async ({ page }) => {
  const ibanPage = new IBANGeneratorPage(page);
  await ibanPage.setup();

  await ibanPage.clickGenerateButton();
  await ibanPage.performCopyAction();
});
```

### Adding New Page Objects

When adding a new tested page:

1. **Create the POM class**:
   ```typescript
   export class MyPage extends BasePage {
     // Locators, actions, verification methods
   }
   ```

2. **Extract all selectors as `get*()` methods**:
   ```typescript
   getSubmitButton(): Locator {
     return this.page.getByRole("button", { name: "Submit" });
   }
   ```

3. **Encapsulate actions as async methods**:
   ```typescript
   async submitForm(): Promise<void> {
     await this.getSubmitButton().click();
   }
   ```

4. **Add verification methods**:
   ```typescript
   async verifyFormSubmitted(): Promise<void> {
     await expect(this.getSuccessMessage()).toBeVisible();
   }
   ```

5. **Use in tests**:
   ```typescript
   test("should submit form", async ({ page }) => {
     const myPage = new MyPage(page);
     await myPage.setup();
     await myPage.submitForm();
     await myPage.verifyFormSubmitted();
   });
   ```

### Benefits of POM

| Issue | POM Solution |
|-------|--------------|
| Selector changes require updating multiple tests | Centralize in one `get*()` method |
| Duplicate click/wait logic across tests | Encapsulate in reusable action method |
| Tests are hard to read and maintain | Read like user stories with method names |
| No clear separation between test logic and selectors | Clean separation: POM = selectors/actions, tests = scenarios |
| Difficult to find which tests use a specific selector | Search for `get*()` method usage |

## E2E Tests with Cloud Supabase

### Overview

E2E tests run against a dedicated cloud Supabase project to ensure:

- **Isolation**: Test data is separate from local development and production
- **Reproducibility**: Consistent database state for all test runs
- **Stability**: No dependencies on local Docker or Supabase CLI
- **CI/CD Compatibility**: Easy integration with GitHub Actions

### Setup Summary

1. **Create Cloud Project**: [https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects)
2. **Configure Environment**: Copy `.env.test.example` to `.env.test` and fill in credentials
3. **Migrate Schema**: Run `supabase link && supabase db push`
4. **Create Test User**: Add user in Supabase Dashboard → Authentication
5. **Run Tests**: `npm run test:e2e`

📘 **Full Setup Guide**: [docs/e2e-cloud-setup.md](./e2e-cloud-setup.md)

### Global Setup and Teardown

#### Global Setup (`e2e/setup/global.setup.ts`)

Runs **once before all tests**:

- ✅ Validates required environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `E2E_USERNAME`, `E2E_PASSWORD`)
- ✅ Confirms connection to cloud Supabase
- 🔮 Future: Pre-authenticate and save auth state for reuse

#### Global Teardown (`e2e/teardown/global.teardown.ts`)

Runs **once after all tests**:

- 🔐 Authenticates as test user (required for RLS policies)
- 🧹 Cleans up test data from all tables:
  - `charter_notes`, `kb_notes` (child tables first)
  - `charters`, `kb_entries`, `drafts`
  - `ai_invocations`, `ai_daily_usage`, `usage_events`
  - `templates` (user-scoped only, not global)
- 📊 Logs cleanup results

**Important**: This teardown deletes **all data** created by the test user. For multi-developer teams, consider:
- Per-developer test users
- Supabase branching
- Time-based cleanup (e.g., nightly cron job)

### Environment Variables

Required in `.env.test`:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
E2E_USERNAME=e2e-test@example.com
E2E_PASSWORD=your-secure-password
E2E_USERNAME_ID=user-uuid-here
```

These are automatically loaded by `playwright.config.ts` using `dotenv`.

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode (step-through)
npm run test:e2e:debug

# Run with visible browser (headed mode)
npm run test:e2e:headed
```

### Development Server for E2E

E2E tests use a dedicated server command that loads `.env.test`:

```bash
# Started automatically by Playwright
npm run dev:e2e
```

This runs `astro dev --mode test`, which:
- Loads environment variables from `.env.test`
- Connects to cloud Supabase instead of local instance
- Runs on port 3000 (configured in `astro.config.mjs`)

## E2E Diagnostic Configuration

### Trace, Video & Screenshot Retention

Playwright is configured to capture diagnostic artifacts **only on test failures** to avoid slowing down passing tests:

- **Traces**: `retain-on-failure` — Full HAR + event timeline for failed tests
- **Videos**: `retain-on-failure` — Video recordings of failed test sessions
- **Screenshots**: `only-on-failure` — Snapshot at failure point
- **Timeouts**: `actionTimeout: 10s`, `navigationTimeout: 30s` — Prevents hanging tests

### Viewing Diagnostic Artifacts Locally

After running `npm run test:e2e`, open the HTML report:
```bash
npx playwright show-report
```

This displays:
- Test timeline with all steps
- Screenshots and videos for failures
- Full trace browser (network, DOM mutations, console logs)

### CI/CD Artifact Publishing

The GitHub Actions workflow automatically publishes:
- HTML report (`playwright-report/`)
- Test results JSON and JUnit XML (`test-results/`)
- Traces, videos, and screenshots (embedded in report)

Artifacts are retained for 30 days. Only failing tests generate artifacts to minimize storage.

## Test Setup

Common utilities are available in `src/test/setup.ts`:
- Console mocking for clean test output
- Clipboard mocking helpers
- Playwright waiting utilities (see E2E README)

## Running Tests

```bash
npm run test:unit    # Unit tests
npm run test:e2e     # E2E tests
npm run lint         # Code quality checks
```

All tests must pass without console noise or warnings.

## DTO Contract Testing

### Purpose

Contract tests validate that API responses conform to agreed-upon contracts:

1. **JSON Key Format**: All API response keys strictly follow `snake_case` convention (regex: `/^[a-z]+(_[a-z0-9]+)*$/`)
2. **TypeScript Type Compatibility**: API response shapes match their corresponding TypeScript DTO types at compile time
3. **No Network Calls**: Tests use local fixtures; no external dependencies

### Location

Contract tests are located in `src/__tests__/contracts/dto-contracts.test.ts`.

### Running Contract Tests

```bash
# Run only contract tests
npm run test:unit -- src/__tests__/contracts/dto-contracts.test.ts

# Run with coverage
npm run test:unit:coverage -- src/__tests__/contracts/dto-contracts.test.ts

# Run with type checking (recommended before deployment)
npm run typecheck
```

### How It Works

#### Runtime Validation (snake_case)

The test suite includes a `validateSnakeCaseKeys()` helper that recursively traverses API response fixtures and validates that all object keys match the snake_case regex pattern. If any key violates the convention, the test reports:

- The exact key name
- Its path in the object hierarchy (e.g., `root.items[0].invalid_key`)
- The violating value

#### Compile-Time Validation (TypeScript Types)

The test suite uses `expectTypeOf()` from Vitest to verify fixture shapes match TypeScript types. These checks execute **only during type checking**, not at runtime:

```bash
npm run typecheck
```

If a fixture's shape diverges from its corresponding DTO type, TypeScript compilation fails with a clear diagnostic.

### Adding New DTOs to Contract Tests

When adding a new API endpoint or DTO:

1. **Create a fixture** in the `fixtures` object:
   ```typescript
   const fixtures = {
     myNewDto: (): MyNewDTO => ({
       field_one: "value",
       field_two: 123,
       nested_object: {
         sub_field: true,
       },
     }),
   };
   ```

2. **Add a snake_case validation test**:
   ```typescript
   describe("MyNewDTO", () => {
     it("should have all keys in snake_case format", () => {
       const response = fixtures.myNewDto();
       const violations = validateSnakeCaseKeys(response);
       expect(violations).toHaveLength(0);
     });
   });
   ```

3. **Add a type compatibility test**:
   ```typescript
   it("MyNewDTO fixture matches MyNewDTO type", () => {
     const response = fixtures.myNewDto();
     expectTypeOf(response).toMatchTypeOf<MyNewDTO>();
   });
   ```

### Common Issues

**Issue**: Type mismatch between fixture and DTO.  
**Solution**: Ensure all required DTO fields are present in the fixture. Check `src/types/types.ts` and referenced `Tables<"table_name">` types in `src/db/database.types.ts`.

**Issue**: Test fails with "Keys not in snake_case".  
**Solution**: Identify the violating key (reported in error), change it to lowercase with underscores. Example: `userId` → `user_id`, `FirstName` → `first_name`.

**Issue**: TypeScript compile error after adding fixture.  
**Solution**: Run `npm run typecheck` to see detailed diagnostics. Ensure your fixture includes all non-optional fields from the DTO definition.
