# QA Toolsmith Testing Guide

Comprehensive testing guide for QA Toolsmith MVP covering unit tests, E2E tests, API testing, and best practices.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Testing Principles](#testing-principles)
3. [Unit Testing](#unit-testing)
4. [API Testing](#api-testing)
5. [E2E Testing](#e2e-testing)
6. [Manual Testing](#manual-testing)
7. [Contract Testing](#contract-testing)
8. [Page Object Model (POM)](#page-object-model-pom)
9. [Running Tests](#running-tests)
10. [CI/CD Integration](#cicd-integration)
11. [Debugging](#debugging)

---

## Testing Strategy

Multi-layer testing approach using Vitest for unit tests and Playwright for E2E/API tests:

| Test Type | Tool | Purpose | Location |
|-----------|------|---------|----------|
| **Unit Tests** | Vitest | Component logic, utilities, services | `src/__tests__/` |
| **API Tests** | Playwright | Backend validation, contracts | `e2e/*.spec.ts` |
| **E2E Tests** | Playwright | Full user workflows | `e2e/*.spec.ts` |
| **Contract Tests** | Vitest | DTO validation, snake_case | `src/__tests__/contracts/` |
| **RLS Tests** | Vitest | Database security policies | `src/__tests__/rls-*.test.ts` |

**Architecture**: Development uses local Supabase CLI, E2E tests use dedicated cloud Supabase project for isolation and reproducibility.

---

## Testing Principles

### FIRST Principle
Tests should be **Fast**, **Independent**, **Repeatable**, **Self-validating**, and **Timely**.

### Implementation Rules
- **No Sleeps**: Never use `sleep()`, `setTimeout()`, or arbitrary delays
- **No Global ESLint Disables**: Use targeted disables with justification only
- **No TypeScript Config Loosening**: Maintain same type safety as production code
- **Stable Selectors**: Use semantic selectors (`data-testid`, role, accessible names)
- **Test Isolation**: Each test runs in complete isolation with proper cleanup

---

## Unit Testing

**Framework**: Vitest (fast, Vite-native test runner)  
**Location**: `src/__tests__/`  
**Configuration**: `vitest.config.ts`

### Vitest Best Practices

#### Test Doubles and Mocking
- **Leverage the `vi` object** - Use `vi.fn()` for function mocks, `vi.spyOn()` to monitor existing functions, and `vi.stubGlobal()` for global mocks
- **Prefer spies over mocks** when you only need to verify interactions without changing behavior
- **Master `vi.mock()` factory patterns** - Place mock factory functions at the top level of your test file, return typed mock implementations, and use `mockImplementation()` or `mockReturnValue()` for dynamic control during tests
- **Handle optional dependencies** with smart mocking - Use conditional mocking to test code with optional dependencies by implementing `vi.mock()` with the factory pattern for modules that might not be available in all environments

#### Test Structure and Organization
- **Create setup files** for reusable configuration - Define global mocks, custom matchers, and environment setup in dedicated files referenced in your `vitest.config.ts`
- **Structure tests for maintainability** - Group related tests with descriptive `describe` blocks, use explicit assertion messages, and follow the Arrange-Act-Assert pattern to make tests self-documenting
- **Configure jsdom for DOM testing** - Set `environment: 'jsdom'` in your configuration for frontend component tests and combine with testing-library utilities for realistic user interaction simulation

#### Assertions and Coverage
- **Use inline snapshots** for readable assertions - Replace complex equality checks with `expect(value).toMatchInlineSnapshot()` to capture expected output directly in your test file, making changes more visible in code reviews
- **Monitor coverage with purpose** - Configure coverage thresholds in `vitest.config.ts` to ensure critical code paths are tested, but focus on meaningful tests rather than arbitrary coverage percentages
- **Leverage TypeScript type checking** in tests - Enable strict typing in your tests to catch type errors early, use `expectTypeOf()` for type-level assertions, and ensure mocks preserve the original type signatures

#### Development Workflow
- **Make watch mode part of your workflow** - Run `vitest --watch` during development for instant feedback as you modify code, filtering tests with `-t` to focus on specific areas under development
- **Explore UI mode** for complex test suites - Use `vitest --ui` to visually navigate large test suites, inspect test results, and debug failures more efficiently during development

### Test Structure Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { formatIBAN } from '../lib/utils';

describe('formatIBAN', () => {
  it('should format valid IBAN correctly', () => {
    const result = formatIBAN('DE89370400440532013000');
    expect(result).toBe('DE89 3704 0044 0532 0130 00');
  });

  it('should handle edge cases', () => {
    // Arrange
    const shortIban = 'DE89';
    
    // Act
    const result = formatIBAN(shortIban);
    
    // Assert
    expect(result).toMatchInlineSnapshot('"DE89"');
  });
});
```

### Mocking Examples
```typescript
// Mock factory at top level
vi.mock('../lib/services/api', () => ({
  fetchData: vi.fn(),
}));

// Spy on existing functions
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

// Type-safe mocks
const mockApi = vi.mocked(apiService);
mockApi.fetchData.mockResolvedValue({ data: 'test' });
```

### Logger Test Utilities
Handle logger timestamp prefixes in tests using `src/test/logger-test-utils.ts`:

```typescript
import { wrapConsoleSpy } from "../../test/logger-test-utils";

it("should log errors", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
  const wrapper = wrapConsoleSpy(errorSpy);
  expect(wrapper.wasCalledWith("[AuditError] Failed to record login attempt:")).toBe(true);
});
```

### Commands
```bash
npm run test:unit              # Run all unit tests
npm run test:unit:coverage     # Run with coverage
npm run test:unit:watch        # Run in watch mode
vitest --ui                    # Interactive UI mode
vitest --watch -t "formatIBAN" # Watch specific tests
```

---

## API Testing

**Purpose**: Validate backend logic independent of UI using Playwright's `page.request`

### IBAN Generator API
- **Endpoint**: `GET /api/generators/iban`
- **Parameters**: `country` (required: DE|AT|PL), `seed` (optional, max 64 chars)
- **Response**: `IbanGeneratorResponse` type
- **Public**: No authentication required

### Test Example
```typescript
const response = await page.request.get("/api/generators/iban?country=DE");
expect(response.status()).toBe(200);

const body = await response.json();
expect(body).toHaveProperty("iban");
expect(body.country).toBe("DE");
```

### Golden Test Values
Deterministic generation with `seed=1234`:
- DE: `{"iban":"DE50185482443452538353","country":"DE","seed":"1234"}`
- AT: `{"iban":"AT471854824434525383","country":"AT","seed":"1234"}`

---

## E2E Testing

**Framework**: Playwright with Chromium/Desktop Chrome browser only  
**Architecture**: Cloud Supabase project for isolation and reproducibility  
**Configuration**: `playwright.config.ts` with diagnostic artifacts on failure only

### Playwright Guidelines
- **Browser**: Initialize configuration only with Chromium/Desktop Chrome
- **Contexts**: Use browser contexts for isolating test environments
- **Selectors**: Use `data-testid` attributes for resilient test-oriented selectors
- **Locators**: `await page.getByTestId('selectorName')` for data-testid elements
- **API Testing**: Leverage API testing for backend validation
- **Visual Testing**: Implement visual comparison with `expect(page).toHaveScreenshot()`
- **Debugging**: Use codegen tool for test recording and trace viewer for debugging
- **Structure**: Follow 'Arrange', 'Act', 'Assert' approach for simplicity and readability

### Cloud Supabase Setup
1. Create dedicated cloud project: `qa-toolsmith-e2e`
2. Configure `.env.test` with project credentials
3. Apply migrations: `supabase db push`
4. Create test user with auto-confirm enabled

### Configuration
```typescript
// playwright.config.ts
use: {
  trace: "retain-on-failure",        // Full HAR + event timeline
  screenshot: "only-on-failure",    // Snapshot at failure point  
  video: "retain-on-failure",        // Video recordings
  actionTimeout: 10000,              // Max 10s per action
  navigationTimeout: 30000,
}
```

### Commands
```bash
npm run test:e2e               # Run all E2E tests
npm run test:e2e:ui            # Run with UI mode (interactive)
npm run test:e2e:debug         # Run in debug mode (step-through)
npm run test:e2e:headed        # Run with visible browser
```

---

## Manual Testing

### Prerequisites
- Node.js >=18.20.8
- Run `npm run dev` to start application at http://localhost:3000

### Key Test Areas
1. **Generators Hub** (`/generators`): 9 generator cards, responsive layout
2. **IBAN Generator** (`/generators/iban`): Generate/validate modes, deterministic generation with seeds
3. **History**: Desktop sidebar, mobile collapsible, persistence across reloads
4. **Preferences**: Format, country, tab selection persistence
5. **Accessibility**: Keyboard navigation, focus management
6. **Responsive Design**: Mobile (375px), tablet (768px), desktop (1024px+)

### Success Criteria
✅ All functionality works across screen sizes  
✅ No console errors or accessibility violations  
✅ History persists across page reloads  
✅ Deterministic generation works correctly  

---

## Contract Testing

**Purpose**: Validate API responses conform to contracts (snake_case keys, TypeScript types)  
**Location**: `src/__tests__/contracts/dto-contracts.test.ts`

### How It Works
- **Runtime Validation**: `validateSnakeCaseKeys()` validates all keys match snake_case pattern
- **Compile-Time Validation**: `expectTypeOf()` verifies fixture shapes match TypeScript types

### Adding New DTOs
```typescript
const fixtures = {
  myNewDto: (): MyNewDTO => ({
    field_one: "value",
    field_two: 123,
    nested_object: { sub_field: true },
  }),
};

describe("MyNewDTO", () => {
  it("should have all keys in snake_case format", () => {
    const response = fixtures.myNewDto();
    const violations = validateSnakeCaseKeys(response);
    expect(violations).toHaveLength(0);
  });

  it("MyNewDTO fixture matches MyNewDTO type", () => {
    const response = fixtures.myNewDto();
    expectTypeOf(response).toMatchTypeOf<MyNewDTO>();
  });
});
```

### Commands
```bash
npm run test:unit -- src/__tests__/contracts/dto-contracts.test.ts
npm run typecheck
```

---

## Page Object Model (POM)

**Purpose**: Encapsulate selectors and actions for maintainable tests  
**Location**: `e2e/pages/` (not `./e2e/page-objects`)

### Structure
```
e2e/pages/
├── BasePage.ts              # Base class with common functionality
├── HomePage.ts              # Homepage POM
├── IBANGeneratorPage.ts     # IBAN Generator page POM
└── ChartersPage.ts          # Charters page POM
```

### Naming Conventions
- **Locators**: `get*()` methods return `Locator`
- **Actions**: `do*()` methods perform user interactions
- **Verification**: `verify*()` methods assert expectations

### Example
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

### Key Principles
1. **Single Responsibility**: Each page object handles ONE page only
2. **Encapsulation**: Hide implementation details; expose clean methods
3. **Stable Selectors**: Always use semantic selectors (`data-testid`, role, accessible names)
4. **Built-in Waiting**: Use Playwright's built-in waiting mechanisms; never use arbitrary sleeps

## Running Tests

### Unit Tests
```bash
npm run test:unit              # Run all unit tests
npm run test:unit:coverage     # Run with coverage
npm run test:unit:watch        # Run in watch mode
```

### E2E Tests
```bash
npm run test:e2e               # Run all E2E tests
npm run test:e2e:ui            # Run with UI mode (interactive)
npm run test:e2e:debug         # Run in debug mode (step-through)
npm run test:e2e:headed        # Run with visible browser
```

### Contract Tests
```bash
npm run test:unit -- src/__tests__/contracts/dto-contracts.test.ts
npm run typecheck
```

### Code Quality
```bash
npm run lint                   # ESLint checks
npm run typecheck              # TypeScript type checking
```

---

## CI/CD Integration

**GitHub Actions**: API and E2E tests run automatically on `push` to any branch
- **Workers**: 1 (sequential, deterministic)
- **Artifacts**: HTML report, traces, videos (retained on failure only, 30 days)
- **Secrets Required**: `E2E_SUPABASE_URL`, `E2E_SUPABASE_KEY`, `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_USERNAME_ID`

---

## Debugging

### Viewing Diagnostic Artifacts
```bash
npx playwright show-report              # HTML report with timeline
npx playwright show-trace test-results/<test-name>/trace.zip  # Detailed trace
```

### Common Issues
| Issue | Solution |
|-------|----------|
| Type mismatch between fixture and DTO | Ensure all required DTO fields are present |
| Test fails with "Keys not in snake_case" | Change violating key to lowercase with underscores |
| E2E test flakiness | Increase timeout for toast.toBeHidden() or use stable selectors |
| Missing environment variables | Verify `.env.test` exists and has all required variables |

### Debugging Commands
```bash
npx playwright test generators-iban.spec.ts --headed    # See browser
npm run test:e2e:ui                                      # Interactive mode
npx playwright test generators-iban.spec.ts --debug     # Step-by-step
```

### Best Practices
✅ **DO**: Use `data-testid` selectors, Playwright's built-in waits, test locally before CI  
❌ **DON'T**: Use arbitrary `sleep()`, fragile selectors, disable ESLint globally
