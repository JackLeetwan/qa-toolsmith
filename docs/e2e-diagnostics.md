# E2E Diagnostics Guide

This guide explains how to investigate and resolve flaky E2E tests, particularly IBAN generator copy functionality.

## Problem: Flaky IBAN Generator Tests

**Symptoms:**
- Tests pass locally but fail randomly in CI
- Timeouts on selector visibility (copy button, toast messages)
- Hydration timing issues on React components

**Root Causes:**
- Component not fully hydrated when test tries to interact
- Selector timing misalignment with actual DOM state
- Network delays affecting async state updates

## Diagnostic Workflow

### 1. Run Tests Locally with Video/Trace

```bash
# Regular E2E run (diagnoses should be automatic for failures)
npm run test:e2e

# Open the HTML report
npx playwright show-report
```

### 2. Inspect the HTML Report

The report shows:
- ✅ **Timeline tab** — Exact step where test fails (e.g., "Wait for text IBAN copied to clipboard")
- ✅ **Screenshots** — DOM snapshot at failure point
- ✅ **Video** — Watch selector interactions in real-time
- ✅ **Trace** — Full network, console, and DOM mutation log

### 3. Trace Browser Deep Dive

Open the trace for a failed test:

```
HTML Report > Failed Test > Traces section > Click trace.zip
```

Trace browser shows:
- **Actions tab** — Hover over each step to see DOM state at that moment
- **Network tab** — Identify slow API responses or resource loads
- **Console tab** — Check for hydration warnings or React errors

### 4. Video Replay

Watch the video to identify:
- Is the button actually rendering?
- Do CSS animations delay visibility?
- Are there visual flickers or re-renders?

## IBAN Generator Specific Checks

When investigating IBAN copy button flakiness:

### A. Hydration Verification

1. Open trace > Actions tab
2. Find step: `Wait for "iban-root" to be visible`
3. Inspect the screenshot — should show fully rendered form
4. Check console for React 19 hydration warnings

### B. Selector Stability

The test uses `data-testid` attributes (most stable):

```typescript
// Good ✅
const copyButton = page.locator("[data-testid='iban-copy-button']");

// Bad ❌
const copyButton = page.locator(".copy-btn");  // Class names change
const copyButton = page.locator("button:nth-child(2)");  // DOM order changes
```

Verify in trace:
1. Actions tab > Find "Wait for [data-testid='iban-copy-button']"
2. Screenshot should clearly show button present

### C. Timeout Tuning

Current timeouts (from `playwright.config.ts`):

```typescript
actionTimeout: 10000,      // Max 10s per action/assertion
navigationTimeout: 30000,  // Max 30s per page load
```

If tests consistently timeout at same step:
1. Check trace > Network tab for slow endpoints
2. Increase specific timeout only (e.g., `toBeVisible({ timeout: 15000 })`)
3. Never increase global actionTimeout above 10s

### D. Toast Disappearance Flakiness

Test expects toast to disappear after 2 seconds (via component's `setTimeout`):

```typescript
// Test assertion
await expect(toast).toBeHidden({ timeout: 5000 });
```

If flaky:
1. Check video — does toast actually disappear?
2. Check trace > Console — React re-render logs
3. Verify component's `setTimeout(2000)` is not being cancelled

## CI Artifact Inspection

When tests fail in CI:

1. Go to GitHub Actions > Failed run
2. Download artifacts:
   - `playwright-html-report.zip` — Full HTML report with traces
   - `test-results/` — JSON and JUnit XML results
3. Extract and open `playwright-report/index.html`
4. Filter to failed IBAN tests and replay traces

## Common Patterns

### Pattern 1: "Timeout waiting for [data-testid]"
- Component didn't render
- Check: Hydration errors in trace console
- Fix: Add explicit wait for component root first

### Pattern 2: "Timeout waiting for toast"
- Copy action failed silently
- Check: Network tab for API errors
- Fix: Verify clipboard permission granted in beforeEach

### Pattern 3: "Timeout waiting for text hidden"
- Toast stayed visible
- Check: Component's setTimeout logic in trace
- Fix: Increase timeout or check for React re-render loops

## Debugging Commands

```bash
# Run single test file in headed mode (see browser)
npx playwright test generators-iban.spec.ts --headed

# Run with UI mode (click through steps)
npm run test:e2e:ui

# Debug specific test (step-by-step)
npx playwright test generators-iban.spec.ts --debug

# Generate fresh traces (force re-run)
npm run test:e2e

# View HTML report
npx playwright show-report
```

## Performance Optimization

If traces show tests are slow but not failing:

1. Check trace > Network tab — API response times
2. Check trace > Actions tab — component render times
3. Increase `actionTimeout` gradually (10s → 12s → 15s)
4. Profile in headed mode: `npm run test:e2e:headed`

## Prevention

Going forward:

- ✅ Always use `data-testid` for stable selectors
- ✅ Never use arbitrary `sleep()` — use Playwright's built-in waits
- ✅ Keep timeouts ≤ 10s (action) and ≤ 30s (navigation)
- ✅ Test locally before pushing to CI
- ✅ Review HTML report after each CI run
