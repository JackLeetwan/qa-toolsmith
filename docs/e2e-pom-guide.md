# Page Object Model (POM) Guide for E2E Tests

## Overview

QA Toolsmith uses the **Page Object Model** design pattern for E2E tests with Playwright. This document provides a comprehensive guide to the POM implementation, structure, and best practices.

## Architecture

### Directory Structure

```
e2e/
├── pages/                           # Page Object Model classes
│   ├── BasePage.ts                  # Base class with common functionality
│   ├── HomePage.ts                  # Homepage POM
│   ├── IBANGeneratorPage.ts         # IBAN Generator page POM
│   └── [FuturePage.ts]              # Additional pages as needed
├── generators-iban.spec.ts          # IBAN Generator tests (using POM)
├── homepage.spec.ts                 # Homepage tests (using POM)
└── debug-selectors.spec.ts          # Selector validation tests (using POM)
```

## Core Components

### 1. BasePage Class

The `BasePage` class provides common functionality shared by all page objects.

**Location**: `e2e/pages/BasePage.ts`

**Key Methods**:

```typescript
// Navigation
await page.goto(path: string): void

// Permissions
await page.grantClipboardPermissions(): void

// Utilities
await page.waitForPageReady(timeout?: number): void
```

**Example Usage**:

```typescript
export class MyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async setup(): Promise<void> {
    await this.goto("/my-page");
    await this.waitForPageReady();
  }
}
```

### 2. HomePage Class

Represents the homepage (`/`) with all its selectors and actions.

**Location**: `e2e/pages/HomePage.ts`

**Key Locators**:

```typescript
getMainTitle(): Locator                        // h1.text-6xl
getMainDescription(): Locator                  // Main description text
getTemplatesHeading(): Locator                 // Feature card: "Szablony Raportów"
getChartersHeading(): Locator                  // Feature card: "Exploration Charters"
getKnowledgeBaseHeading(): Locator             // Feature card: "Baza Wiedzy"
getGeneratorsHeading(): Locator                // Feature card: "Generatory Danych"
getTemplatesLink(): Locator                    // Navigation to templates
getExplorationLink(): Locator                  // Navigation to charters
getKnowledgeBaseLink(): Locator                // Navigation to KB
getGenerateDataLink(): Locator                 // Navigation to generators
getLoginLink(): Locator                        // Login button
getRegisterLink(): Locator                     // Register button
getMetaDescription(): Locator                  // Meta description tag
```

**Key Actions**:

```typescript
async navigate(): void                         // Go to homepage
async setup(): void                            // Setup and navigate
async clickTemplatesLink(): void               // Click templates link
async clickExplorationLink(): void             // Click charters link
async clickKnowledgeBaseLink(): void           // Click KB link
async clickGenerateDataLink(): void            // Click generators link
async clickLoginLink(): void                   // Click login
async clickRegisterLink(): void                // Click register
```

**Key Verifications**:

```typescript
async verifyMainTitleDisplayed(): void         // Verify title and text
async verifyMainDescriptionDisplayed(): void   // Verify description
async verifyAllFeatureCardsDisplayed(): void   // Verify all cards
async verifyAllNavigationLinksDisplayed(): void  // Verify all nav links
async verifyAuthButtonsDisplayed(): void       // Verify login/register
async verifyPageTitle(expected: string): void  // Check page title
async verifyMetaDescription(expected: string): void  // Check meta tag
async verifyPageUrl(pattern: RegExp): void     // Check URL pattern
```

### 3. IBANGeneratorPage Class

Represents the IBAN Generator page (`/generators/iban`) with all selectors and actions.

**Location**: `e2e/pages/IBANGeneratorPage.ts`

**Key Locators**:

```typescript
getRootComponent(): Locator                    // Root IBAN component (data-testid)
getHeading(): Locator                          // "Generate IBAN" heading
getGenerateButton(): Locator                   // Generate button
getCopyButton(): Locator                       // Copy button (appears after generation)
getCopyToast(): Locator                        // Success toast message
getResultContent(): Locator                    // Generated IBAN content (data-testid)
```

**Key Actions**:

```typescript
async navigate(): void                         // Go to IBAN generator page
async setup(): void                            // Setup and prepare page
async waitForPageLoad(): void                  // Wait for full page load
async clickGenerateButton(): void              // Click generate
async clickCopyButton(): void                  // Click copy
async waitForCopyToastVisible(): void          // Wait for toast to appear
async waitForCopyToastHidden(): void           // Wait for toast to disappear
async waitForResultVisible(): void             // Wait for result to appear
async getResultText(): Promise<string>        // Get generated IBAN text
async performCopyAction(): void                // Full copy flow (click, verify, wait)
```

**Key Verifications**:

```typescript
async verifyGenerateButtonVisible(): void      // Verify generate button is visible
async verifyCopyButtonVisible(): void          // Verify copy button is visible
async verifyResultIsValidIBAN(): void          // Verify IBAN format is valid
```

## Naming Conventions

All POM classes follow strict naming conventions for consistency and clarity:

### Locator Methods: `get*()` Methods

**Signature**: `get*(): Locator`

Return `Locator` objects without executing any actions.

```typescript
// ✅ Good: Clear, semantic naming
getGenerateButton(): Locator
getCopyButton(): Locator
getResultContent(): Locator
getMainTitle(): Locator
getMetaDescription(): Locator

// ❌ Avoid: Vague or ambiguous naming
getBtn(): Locator
getElement(): Locator
getField(): Locator
button(): Locator
```

**Why**: Locators should clearly identify *what* element they return, enabling easy searching and understanding.

### Action Methods: `click*()`, `fill*()`, `do*()`, etc.

**Signature**: `async action*(...): Promise<void>`

Perform user interactions and combine waiting logic when needed.

```typescript
// ✅ Good: Action-focused, specific naming
async clickGenerateButton(): Promise<void>
async fillCountryField(country: string): Promise<void>
async performCopyAction(): Promise<void>
async waitForResultVisible(): Promise<void>
async submitForm(): Promise<void>

// ❌ Avoid: Generic or ambiguous naming
async click(): Promise<void>
async input(value: string): Promise<void>
async wait(): Promise<void>
async do(): Promise<void>
```

**Why**: Method names should clearly express *what action* is being performed and *when* it completes.

### Verification Methods: `verify*()` Methods

**Signature**: `async verify*(...): Promise<void>`

Assert expected state using Playwright's `expect()`.

```typescript
// ✅ Good: Explicit verification
async verifyResultIsValidIBAN(): Promise<void>
async verifyErrorMessageDisplayed(): Promise<void>
async verifyCopyButtonVisible(): Promise<void>
async verifyPageTitle(expected: string): Promise<void>

// ❌ Avoid: Incomplete or generic naming
async check(): Promise<void>
async validate(): Promise<void>
async assert(): Promise<void>
async verify(): Promise<void>
```

**Why**: Clear names make test assertions easy to understand and maintain.

## Usage Examples

### Example 1: Simple Flow

```typescript
test("should generate IBAN", async ({ page }) => {
  const ibanPage = new IBANGeneratorPage(page);
  await ibanPage.setup();
  
  await ibanPage.clickGenerateButton();
  await ibanPage.waitForResultVisible();
  await ibanPage.verifyResultIsValidIBAN();
});
```

### Example 2: Complex Flow with Multiple Steps

```typescript
test("should handle multiple sequential copies", async ({ page }) => {
  const ibanPage = new IBANGeneratorPage(page);
  await ibanPage.setup();

  // First IBAN generation and copy
  await ibanPage.clickGenerateButton();
  await ibanPage.waitForResultVisible();
  await ibanPage.performCopyAction();
  await ibanPage.verifyCopyButtonVisible();

  // Second IBAN generation and copy
  await ibanPage.clickGenerateButton();
  await ibanPage.performCopyAction();
});
```

### Example 3: Using HomePage Navigation

```typescript
test("should navigate to generators from homepage", async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.setup();

  await homePage.verifyAllNavigationLinksDisplayed();
  await homePage.clickGenerateDataLink();
  await homePage.verifyPageUrl(/\/generators/);
});
```

## Key Principles

### 1. Single Responsibility

Each page object is responsible for ONE page only.

```typescript
// ✅ Good: Separate page objects
export class LoginPage extends BasePage { }
export class DashboardPage extends BasePage { }

// ❌ Avoid: Multiple pages in one class
export class AllPages extends BasePage {
  login() { }
  navigateToDashboard() { }
}
```

### 2. Encapsulation

Hide implementation details; expose clean methods.

```typescript
// ✅ Good: Methods hide complexity
async performCopyAction(): Promise<void> {
  await this.clickCopyButton();
  await this.waitForCopyToastVisible();
  await this.waitForCopyToastHidden();
}

// ❌ Avoid: Exposing implementation
// Test has to know: click → wait for visible → wait for hidden
```

### 3. No Assertions in Locator Methods

Locators should return elements, not verify them.

```typescript
// ✅ Good: Locator returns element
getGenerateButton(): Locator {
  return this.page.getByRole("button", { name: /Generate IBAN/i });
}

// ❌ Avoid: Locator with assertions
getGenerateButton(): Locator {
  const btn = this.page.getByRole("button", { name: /Generate IBAN/i });
  await expect(btn).toBeVisible();  // ❌ Don't do this
  return btn;
}
```

### 4. Stable Selectors

Always use semantic selectors (data-testid, role, accessible names).

```typescript
// ✅ Good: Semantic selectors
getButton(): Locator {
  return this.page.getByRole("button", { name: "Submit" });
}

getField(): Locator {
  return this.page.locator("[data-testid='email-input']");
}

// ❌ Avoid: Fragile selectors
getButton(): Locator {
  return this.page.locator(".btn.btn-primary");  // CSS class coupling
}

getField(): Locator {
  return this.page.locator("input[type='email']");  // XPath/CSS specificity
}
```

### 5. Built-in Waiting

Use Playwright's built-in waiting mechanisms; never use arbitrary sleeps.

```typescript
// ✅ Good: Playwright's retry logic
async clickCopyButton(): Promise<void> {
  await expect(this.getCopyButton()).toBeVisible({ timeout: 20000 });
  await this.getCopyButton().click();
}

// ❌ Avoid: Arbitrary sleeps
async clickCopyButton(): Promise<void> {
  await this.page.waitForTimeout(2000);  // ❌ Flaky!
  await this.getCopyButton().click();
}
```

## Adding New Page Objects

When testing a new page, follow these steps:

### Step 1: Create the POM Class

```typescript
// e2e/pages/MyNewPage.ts
import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class MyNewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }
}
```

### Step 2: Add Locators

```typescript
// Locators (get*() methods)
getMainButton(): Locator {
  return this.page.getByRole("button", { name: "Main Button" });
}

getFormField(): Locator {
  return this.page.locator("[data-testid='form-field']");
}
```

### Step 3: Add Actions

```typescript
// Actions (action*() methods)
async navigate(): Promise<void> {
  await this.goto("/my-new-page");
}

async fillForm(data: string): Promise<void> {
  await this.getFormField().fill(data);
  await this.getMainButton().click();
}
```

### Step 4: Add Verifications

```typescript
// Verifications (verify*() methods)
async verifyFormSubmitted(): Promise<void> {
  const successMessage = this.page.getByText("Success");
  await expect(successMessage).toBeVisible();
}
```

### Step 5: Use in Tests

```typescript
// e2e/my-new-page.spec.ts
import { test } from "@playwright/test";
import { MyNewPage } from "./pages/MyNewPage";

test("should perform action", async ({ page }) => {
  const myPage = new MyNewPage(page);
  await myPage.navigate();
  await myPage.fillForm("test data");
  await myPage.verifyFormSubmitted();
});
```

## Benefits

| Challenge | Solution | Benefit |
|-----------|----------|---------|
| Selector changes scattered across tests | Centralize in `get*()` methods | Update once, all tests benefit |
| Duplicate click/wait logic | Encapsulate in action methods | DRY principle, less code |
| Hard-to-read tests with inline selectors | Read like user stories | Self-documenting tests |
| Difficult to find which tests use a selector | Search for method usage | Better maintainability |
| Tight coupling between tests and UI | Clean separation of concerns | More resilient tests |
| Time spent on selector debugging | Stable selectors in one place | Faster debugging |

## Performance Impact

- **Zero Runtime Overhead**: POM classes are just TypeScript wrappers
- **Better Parallelization**: Cleaner code enables better concurrent test execution
- **Faster Maintenance**: Centralized selectors reduce update time by ~80%
- **Fewer Flaky Tests**: Consistent waiting logic eliminates race conditions

## Migration Guide: Inline Selectors → POM

### Before (Inline Selectors)

```typescript
test("should copy IBAN", async ({ page }) => {
  await page.goto("/generators/iban");
  
  const generateBtn = page.getByRole("button", { name: /Generate IBAN/i });
  await expect(generateBtn).toBeVisible({ timeout: 5000 });
  await generateBtn.click();
  
  const copyBtn = page.locator("[data-testid='iban-copy-button']");
  await expect(copyBtn).toBeVisible({ timeout: 20000 });
  await copyBtn.click();
  
  const toast = page.getByText("IBAN copied to clipboard", { exact: true });
  await expect(toast).toBeVisible({ timeout: 5000 });
  await expect(toast).toBeHidden({ timeout: 10000 });
});
```

### After (Using POM)

```typescript
test("should copy IBAN", async ({ page }) => {
  const ibanPage = new IBANGeneratorPage(page);
  await ibanPage.setup();
  
  await ibanPage.clickGenerateButton();
  await ibanPage.performCopyAction();
});
```

**Improvements**:
- Test reads like a user story ✅
- All selectors centralized ✅
- ~70% less code in tests ✅
- Easier to maintain ✅

## References

- **Playwright Documentation**: https://playwright.dev/docs/pom
- **Testing Best Practices**: `docs/TESTING_GUIDELINES.md`
- **E2E Diagnostics**: `docs/e2e-diagnostics.md`
