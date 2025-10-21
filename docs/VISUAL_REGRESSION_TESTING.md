# Visual Regression Testing Guide

## Overview

Visual regression tests verify that the UI appearance remains consistent across versions. This guide documents the strategy for QA Toolsmith's visual regression tests using Playwright's `expect(page).toHaveScreenshot()` API.

## Test Coverage

Visual regression tests cover critical pages and components:

### Pages Tested
- **Homepage** (`/`)
  - Full page layouts
  - Hero section
  - Feature cards
  - Top navigation bar

- **IBAN Generator** (`/generators/iban`)
  - Full page layouts
  - Generator form section
  - Result card with generated IBAN
  - Component-level screenshots

### Viewport Sizes
- **Desktop**: 1280x720 (standard desktop breakpoint)
- **Tablet**: 768x1024 (iPad portrait orientation)

### Theme Variants
- **Light Theme**: Default light mode
- **Dark Theme**: Dark mode with `dark` class applied

## Running Visual Regression Tests

### Run All Visual Tests
```bash
npm run e2e:visual
```

### Run Visual Tests for Specific Page
```bash
# Homepage only
npx playwright test visual-regression.spec.ts --grep "Homepage"

# IBAN Generator only
npx playwright test visual-regression.spec.ts --grep "IBAN Generator"
```

### Run Tests for Specific Viewport
```bash
# Desktop viewport tests only
npx playwright test visual-regression.spec.ts --grep "Desktop"

# Tablet viewport tests only
npx playwright test visual-regression.spec.ts --grep "Tablet"
```

### Run Tests for Specific Theme
```bash
# Light theme tests only
npx playwright test visual-regression.spec.ts --grep "Light Theme"

# Dark theme tests only
npx playwright test visual-regression.spec.ts --grep "Dark Theme"
```

## Managing Snapshots

### Directory Structure
```
e2e/
└── snapshots/
    ├── visual-regression.spec.ts-chromium/
    │   ├── homepage-light-desktop-full-page.png
    │   ├── homepage-light-desktop-hero.png
    │   ├── homepage-dark-desktop-full-page.png
    │   ├── iban-generator-light-desktop-form.png
    │   └── ... (more snapshots)
```

Snapshots are organized by test file and browser platform (chromium).

### Generating Baseline Snapshots

When you first run visual tests or need to regenerate all baselines:

```bash
# Generate all baseline snapshots
npx playwright test visual-regression.spec.ts --update-snapshots

# Or use the short flag
npx playwright test visual-regression.spec.ts -u
```

This creates or overwrites all snapshot files in `e2e/snapshots/`.

### Updating Snapshots After Intentional Design Changes

When design changes are intentional and approved:

1. **Review the proposed changes** in the Playwright report:
   ```bash
   npm run e2e:visual
   npx playwright show-report
   ```

2. **Update snapshots only for affected tests**:
   ```bash
   npx playwright test visual-regression.spec.ts --grep "pattern-matching-changed-tests" -u
   ```

3. **Commit snapshot changes to git** with clear message:
   ```bash
   git add e2e/snapshots/
   git commit -m "Update visual snapshots: [describe design changes]"
   ```

### Snapshot Comparison Threshold

All snapshots are configured with a **2% tolerance threshold** to account for:
- Anti-aliasing differences across rendering
- Minor font rendering variations
- Slight color banding differences

This threshold is set in each test:
```typescript
await expect(page).toHaveScreenshot("name.png", {
  threshold: 0.02, // 2% tolerance
});
```

## Understanding Test Results

### Passing Tests
✅ Visual output matches baseline snapshot within 2% threshold

### Failing Tests
❌ Visual output differs from baseline beyond 2% threshold

#### Common Causes of Failures:
- **Unintended design changes** (CSS modifications, broken layout)
- **Font rendering differences** (different system, browser update)
- **Content changes** (dynamic data, API response differences)
- **Animation/timing issues** (race conditions in page load)

### Analyzing Failures

1. **Open the HTML report**:
   ```bash
   npx playwright show-report
   ```

2. **Compare screenshots**:
   - Expected: Baseline snapshot
   - Actual: Current rendered page
   - Diff: Highlighted differences

3. **Investigate causes**:
   - Check git diff for CSS/markup changes
   - Verify component props and state
   - Review network requests in trace viewer
   - Check browser DevTools for rendering issues

## Best Practices

### Naming Conventions
Snapshot names follow this pattern:
```
{page-name}-{theme}-{viewport}-{component}.png
```

Examples:
- `homepage-light-desktop-full-page.png`
- `iban-generator-dark-tablet-with-result.png`
- `homepage-light-desktop-cards.png`

Benefits:
- Easy to identify which test created each snapshot
- Clear context for review in diffs
- Simple to find specific components

### Test Organization
Tests are organized hierarchically:
```
Visual Regression - Desktop
└── Homepage - Light Theme
    ├── Full page
    ├── Hero section
    ├── Feature cards
    └── Navigation
└── Homepage - Dark Theme
    └── ... (similar breakdown)
└── IBAN Generator - Light Theme
    ├── Full page
    ├── Form section
    ├── With result
    └── Result card
└── IBAN Generator - Dark Theme
    └── ... (similar breakdown)

Visual Regression - Tablet
└── Homepage - Tablet Light Theme
    └── ... (similar breakdown)
└── ... (other tablet tests)
```

### Handling Dynamic Content
Tests avoid capturing dynamic content that changes between runs:
- Generated IBANs are captured in dedicated "result" tests
- Dynamic data in API responses are stable per test
- Timestamps and user-specific content are minimized

### Responsive Design Testing
- Desktop (1280x720): Standard desktop/laptop
- Tablet (768x1024): iPad portrait orientation
- Mobile viewport tests can be added in future iterations

## Git Workflow

### Committing Snapshot Changes

Snapshots are **tracked in git** (not gitignored) because:
- Design review in pull requests
- Visual diff history in git blame
- Easy rollback of unintended changes
- Documentation of design evolution

### Pull Request Review
When snapshots change in a PR:
1. Reviewer can see diff directly in GitHub
2. Playwright reports show visual comparison
3. Discuss intended vs. unintended changes
4. Approve or request adjustments

### Rolling Back Changes
If a visual test fails due to unintended changes:
```bash
# Restore baseline snapshots
git checkout HEAD -- e2e/snapshots/

# Re-run tests
npm run e2e:visual
```

## CI/CD Integration

### GitHub Actions Workflow
Visual regression tests run in CI with:
- ✅ Snapshot comparison enabled
- ✅ Failure reporting with diffs
- ✅ HTML report generation
- ✅ Manual snapshot update workflow (on demand)

### Running Visual Tests in CI
```yaml
# In .github/workflows/e2e-tests.yml
- name: Run visual regression tests
  run: npx playwright test visual-regression.spec.ts

- name: Upload report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### Snapshot Update Workflow (Future)
To update snapshots in CI after design approval:
```bash
# Run tests with snapshot update flag
npx playwright test visual-regression.spec.ts -u

# Commit updated snapshots
git add e2e/snapshots/
git commit -m "Update visual snapshots (authorized via workflow)"
```

## Troubleshooting

### Tests Fail Intermittently
**Cause**: Race conditions or timing issues
**Solution**:
- Check for animations or transitions
- Ensure `waitForLoadState("networkidle")` is called
- Verify element visibility before screenshot

### Snapshots Look Different on CI
**Cause**: Different rendering on CI system
**Solution**:
- Use Docker for consistent rendering environment
- Regenerate snapshots on CI machine
- Adjust threshold if needed (currently 2%)

### Cannot Update Snapshots
**Cause**: Running in CI without write permissions
**Solution**:
- Use `-u` flag locally, commit changes to git
- Or use GitHub Actions workflow for manual updates

### Components Not Fully Rendered
**Cause**: React hydration not complete
**Solution**:
- Use `page.waitForLoadState("networkidle")`
- Add specific waits for critical components
- Check IBANGeneratorPage.waitForPageLoad()

## Future Enhancements

- [ ] Add mobile viewport (375x667) tests
- [ ] Add more page/component coverage
- [ ] Implement visual regression in authenticated pages
- [ ] Add accessibility testing with visual snapshots
- [ ] Create custom diff reporter for PRs
- [ ] Add performance monitoring with screenshots

## References

- [Playwright Visual Comparisons Docs](https://playwright.dev/docs/test-snapshots)
- [Playwright Configuration Options](https://playwright.dev/docs/api/class-testoptions#test-options-snapshot-path-template)
- [@playwright-e2e-testing.mdc](../Cursor%20Rules/playwright-e2e-testing.mdc)
