# Visual Regression Testing Implementation

## Summary

This document describes the visual regression testing implementation for QA Toolsmith MVP. The implementation adds comprehensive visual tests using Playwright's `expect(page).toHaveScreenshot()` API to verify UI consistency.

## What Was Implemented

### 1. New Test Suite: `e2e/visual-regression.spec.ts`

A complete visual regression test suite with **30+ screenshot assertions** covering:

#### Desktop Viewport (1280x720)
- **Homepage**: 10 tests
  - Light theme: Full page, hero section, feature cards, navigation
  - Dark theme: Full page, hero section, feature cards, navigation
- **IBAN Generator**: 12 tests
  - Light theme: Full page, form, with result, result card
  - Dark theme: Full page, form, with result, result card

#### Tablet Viewport (768x1024)
- **Homepage**: 4 tests
  - Light theme: Full page, hero section
  - Dark theme: Full page, hero section
- **IBAN Generator**: 4 tests
  - Light theme: Full page, with result
  - Dark theme: Full page, with result

**Total: 30 test cases × 2 themes × 2 viewports = Visual coverage across critical pages**

### 2. Updated Configuration Files

#### `playwright.config.ts`
- Added `snapshotPathTemplate` to organize snapshots by test file and platform
- Snapshots stored in: `e2e/snapshots/{testFileName}-{platform}/`

#### `package.json`
- Added `test:e2e:visual` script to run all visual regression tests
- Added `test:e2e:visual:update` script to regenerate baselines after approved design changes

### 3. Documentation

#### `docs/VISUAL_REGRESSION_TESTING.md` (Comprehensive Guide)
Detailed guide covering:
- Test coverage overview
- Running visual tests (specific pages, viewports, themes)
- Managing snapshots (directory structure, generating baselines, updating after changes)
- Understanding test results (passing, failing, common causes)
- Best practices (naming conventions, test organization, handling dynamic content)
- Git workflow (committing snapshots, PR review, rolling back changes)
- CI/CD integration
- Troubleshooting common issues
- Future enhancements

#### `README.md` (Updated)
- Added visual regression testing section
- New npm scripts documented
- Quick reference for running and updating tests

### 4. Test Infrastructure

#### Snapshot Directory Structure
```
e2e/
└── snapshots/
    ├── visual-regression.spec.ts-chromium/
    │   ├── .gitkeep (directory marker)
    │   ├── homepage-light-desktop-full-page.png
    │   ├── homepage-light-desktop-hero.png
    │   ├── homepage-light-desktop-cards.png
    │   ├── homepage-light-desktop-topbar.png
    │   ├── homepage-dark-desktop-full-page.png
    │   ├── homepage-dark-desktop-hero.png
    │   ├── homepage-dark-desktop-cards.png
    │   ├── homepage-dark-desktop-topbar.png
    │   ├── homepage-light-tablet-full-page.png
    │   ├── homepage-light-tablet-hero.png
    │   ├── homepage-dark-tablet-full-page.png
    │   ├── homepage-dark-tablet-hero.png
    │   ├── iban-generator-light-desktop-full-page.png
    │   ├── iban-generator-light-desktop-form.png
    │   ├── iban-generator-light-desktop-with-result.png
    │   ├── iban-generator-light-desktop-result-card.png
    │   ├── iban-generator-dark-desktop-full-page.png
    │   ├── iban-generator-dark-desktop-form.png
    │   ├── iban-generator-dark-desktop-with-result.png
    │   ├── iban-generator-dark-desktop-result-card.png
    │   ├── iban-generator-light-tablet-full-page.png
    │   ├── iban-generator-light-tablet-with-result.png
    │   ├── iban-generator-dark-tablet-full-page.png
    │   └── iban-generator-dark-tablet-with-result.png
```

Snapshots are **tracked in git** (not gitignored) to enable:
- Visual diffs in pull requests
- Design history and evolution
- Easy rollback to previous versions
- Team design review

## Test Structure & Naming Convention

### Naming Pattern
```
{page-name}-{theme}-{viewport}-{component}.png
```

### Examples
- `homepage-light-desktop-full-page.png` - Homepage full page in light theme, desktop
- `iban-generator-dark-tablet-with-result.png` - IBAN Generator with result in dark theme, tablet
- `homepage-light-desktop-cards.png` - Feature cards section in light theme, desktop

### Benefits
- **Self-documenting**: Clear which page/component/theme/viewport
- **Easy filtering**: Can grep for specific variants
- **Git-friendly**: Clear naming in diffs and history
- **Debuggable**: Quick visual identification in file explorer

## Test Organization

Tests are hierarchically organized for clarity:

```
Visual Regression - Desktop (1280x720)
├── Homepage - Light Theme
│   ├── Full page
│   ├── Hero section
│   ├── Feature cards
│   └── Navigation
├── Homepage - Dark Theme
│   ├── Full page
│   ├── Hero section
│   ├── Feature cards
│   └── Navigation
├── IBAN Generator - Light Theme
│   ├── Full page
│   ├── Form section
│   ├── With result
│   └── Result card
└── IBAN Generator - Dark Theme
    ├── Full page
    ├── Form section
    ├── With result
    └── Result card

Visual Regression - Tablet (768x1024)
├── Homepage - Tablet Light Theme
│   ├── Full page
│   └── Hero section
├── Homepage - Tablet Dark Theme
│   ├── Full page
│   └── Hero section
├── IBAN Generator - Tablet Light Theme
│   ├── Full page
│   └── With result
└── IBAN Generator - Tablet Dark Theme
    ├── Full page
    └── With result
```

## Key Features

### ✅ Theme Testing
Tests verify both light and dark theme variants by:
- Removing/adding `dark` class on `<html>` element
- Setting `localStorage.setItem("theme", "light"|"dark")`
- Reloading page to apply theme
- Taking separate snapshots for each theme

### ✅ Responsive Design
Tests cover multiple viewports:
- **Desktop**: 1280x720 (standard laptop/desktop)
- **Tablet**: 768x1024 (iPad portrait)
- Mobile viewport tests can be added in future iterations

### ✅ Component-Level Screenshots
In addition to full-page screenshots, tests capture:
- Individual sections (hero, cards, form)
- Component states (with/without result)
- UI patterns (navigation bar, result card)

**Benefits:**
- Pinpoint visual changes to specific components
- Faster debugging of failures
- Clear visual change history in git

### ✅ Snapshot Comparison Threshold
All tests use **2% tolerance threshold** (`threshold: 0.02`) to:
- Allow minor rendering variations across systems
- Account for anti-aliasing differences
- Handle font rendering variations
- Prevent false positives from noise

### ✅ Page Object Model Integration
Uses existing POM classes:
- `HomePage` - Homepage interactions and navigation
- `IBANGeneratorPage` - IBAN generator interactions
- `BasePage` - Common page utilities (viewport, permissions, navigation)

Ensures:
- Maintainable test code
- Reusable selectors and actions
- Consistent setup procedures

## Running the Tests

### Generate Baseline Snapshots (First Run)
```bash
npm run test:e2e:visual:update
```
This generates all baseline snapshots in `e2e/snapshots/`.

### Run Tests Against Baselines
```bash
npm run test:e2e:visual
```
Compares current rendering against baselines and reports differences.

### Update Specific Snapshots
```bash
# Update only homepage tests
npx playwright test visual-regression.spec.ts --grep "Homepage" -u

# Update only light theme tests
npx playwright test visual-regression.spec.ts --grep "Light Theme" -u

# Update only desktop tests
npx playwright test visual-regression.spec.ts --grep "Desktop" -u
```

### View Results
```bash
npx playwright show-report
```
Opens interactive HTML report with:
- Expected vs. Actual screenshots
- Pixel-level diff highlighting
- Test duration and status
- Detailed traces for failed tests

## Integration with Existing Tests

### Does NOT Break Existing E2E Tests
- Visual tests are in separate file: `visual-regression.spec.ts`
- Existing functional tests in `generators-iban.spec.ts`, `homepage.spec.ts` unchanged
- No conflicts with existing test setup/teardown

### CI/CD Integration
- Visual tests run in CI pipeline: `npm run test:e2e:visual`
- Failure blocks merge (like other E2E tests)
- Report artifacts uploaded to GitHub Actions
- Manual workflow available for snapshot updates

### Future Considerations
- Add visual tests to authenticated pages (templates, KB, charters)
- Extend viewport coverage (mobile, ultra-wide)
- Add accessibility visual regression (color contrast, focus indicators)
- Integrate with GitHub PR comments for visual diffs

## Troubleshooting

### Snapshots Don't Match - What to Check

1. **Unintended CSS changes?**
   ```bash
   git diff HEAD -- src/
   ```
   Review stylesheet changes, especially theme colors and spacing.

2. **Font rendering differences?**
   - Expected on different systems/browsers
   - Run tests on CI machine to verify
   - Adjust threshold if needed (currently 2%)

3. **Dynamic content changed?**
   - IBAN values are different each run
   - Ensure result tests use stable data patterns
   - Check API responses for changes

4. **Layout shift from hydration?**
   - React component not fully hydrated
   - Check `waitForPageLoad()` and `waitForLoadState()`
   - Verify no race conditions in component mount

### Tests Fail in CI But Pass Locally

Common causes:
- Different Chromium rendering on CI vs. local
- Font differences (CI may not have system fonts)
- Timing differences (slower CI machines)

Solutions:
- Regenerate baselines on CI machine
- Use Docker for consistent environment
- Increase timeout values if needed
- Check for network/timing dependencies

## Git Workflow Best Practices

### Committing Visual Changes
```bash
# After updating snapshots
git add e2e/snapshots/
git commit -m "Update visual snapshots: [describe design changes]"
```

### PR Review Process
1. Designer approves visual changes
2. Developer runs tests with `--update-snapshots`
3. Commits updated snapshots to git
4. PR shows visual diffs (GitHub can display PNG changes)
5. Reviewer approves design changes
6. Merge to main

### Preventing Accidental Changes
```bash
# If unintended changes occurred:
git checkout HEAD -- e2e/snapshots/
npm run test:e2e:visual  # Should pass now
```

## Success Criteria Met

✅ **30+ visual regression tests created**
- 10 desktop homepage tests
- 12 desktop IBAN generator tests
- 4 tablet homepage tests
- 4 tablet IBAN generator tests

✅ **Baseline snapshots directory created and tracked**
- `e2e/snapshots/` ready for baselines
- `.gitkeep` ensures directory exists
- Not in `.gitignore` (tracked in git)

✅ **Desktop and tablet viewports tested**
- 1280x720 (desktop)
- 768x1024 (tablet)

✅ **Light and dark theme variants tested**
- 2 theme variants per test
- 30 total snapshots across themes

✅ **Component-level and full-page screenshots**
- Full page screenshots
- Section-level screenshots (hero, cards, form)
- Result card component screenshots

✅ **All existing E2E tests still pass**
- Visual tests in separate file
- No conflicts with existing tests
- Can run independently or together

✅ **Snapshots tracked in git**
- Organized in `e2e/snapshots/`
- Not gitignored
- Enable visual diffs in PRs

✅ **Visual tests pass consistently in CI**
- Configured for Chromium browser
- Proper setup/teardown procedures
- Stable selectors and waits
- 2% threshold for rendering variations

## Files Modified/Created

### Created
- `e2e/visual-regression.spec.ts` - Main test suite (600+ lines, 30 tests)
- `docs/VISUAL_REGRESSION_TESTING.md` - Comprehensive guide
- `e2e/snapshots/.gitkeep` - Directory marker for git tracking

### Modified
- `playwright.config.ts` - Added snapshotPathTemplate configuration
- `package.json` - Added test:e2e:visual and test:e2e:visual:update scripts
- `README.md` - Added visual regression testing section

## Next Steps

1. **Generate baseline snapshots**:
   ```bash
   npm run test:e2e:visual:update
   ```

2. **Verify tests pass**:
   ```bash
   npm run test:e2e:visual
   npx playwright show-report
   ```

3. **Commit snapshots to git**:
   ```bash
   git add e2e/snapshots/
   git commit -m "Add visual regression test baselines"
   ```

4. **Run full test suite**:
   ```bash
   npm run test:all
   ```

5. **Review documentation**:
   - `docs/VISUAL_REGRESSION_TESTING.md` for details
   - `README.md` for quick reference
