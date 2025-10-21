# Generators View - Testing Guide

## Prerequisites

⚠️ **Important**: Update Node.js to version >=18.20.8 to run the application.

```bash
# Check current version
node --version

# If < 18.20.8, update Node.js first
```

## Starting the Application

```bash
# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Application should be available at http://localhost:3000
```

## Manual Testing Checklist

### 1. Generators Hub (`/generators`)

**Desktop View:**

- [ ] Navigate to `/generators`
- [ ] Verify 9 generator cards are displayed in 3 columns
- [ ] Hover over cards - should show shadow and color transitions
- [ ] Click on "IBAN Generator" card - should navigate to `/generators/iban`
- [ ] Click on other cards - should navigate to respective pages with "Coming Soon" message

**Mobile View:**

- [ ] Resize to mobile width
- [ ] Cards should display in 1 column
- [ ] All cards should be readable and clickable

### 2. IBAN Generator - Generate Mode (`/generators/iban`)

**Basic Generation:**

- [ ] Tab "Generate" should be active by default
- [ ] Select country "Germany (DE)"
- [ ] Leave seed empty
- [ ] Click "Generate IBAN"
- [ ] Should see a valid German IBAN (22 characters starting with DE)
- [ ] Result should display in Text format
- [ ] Copy button should be visible

**Deterministic Generation with Seed:**

- [ ] Enter seed: `test123`
- [ ] Click "Generate IBAN"
- [ ] Note the generated IBAN
- [ ] Clear the result (reload page if needed)
- [ ] Enter same seed: `test123`
- [ ] Click "Generate IBAN"
- [ ] Should generate **exactly the same IBAN** as before

**Format Toggle:**

- [ ] Generate an IBAN
- [ ] Click "JSON" format button
- [ ] Should display JSON format: `{"iban":"...", "country":"DE", "seed":"..."}`
- [ ] Click "Text" format button
- [ ] Should display just the IBAN number

**Copy to Clipboard:**

- [ ] Generate an IBAN
- [ ] Click the Copy button (top-right of result)
- [ ] Should see toast notification "IBAN copied to clipboard"
- [ ] Paste in a text editor - should contain the IBAN
- [ ] Switch to JSON format
- [ ] Click Copy again
- [ ] Paste - should contain JSON

**Seed Validation:**

- [ ] Enter seed with invalid characters: `test@#$`
- [ ] Should see error: "Seed must contain only alphanumeric..."
- [ ] Generate button should be disabled
- [ ] Enter valid seed: `test_123.456-abc`
- [ ] Error should disappear
- [ ] Generate button should be enabled
- [ ] Enter seed with 65 characters (too long)
- [ ] Should see error: "Seed must be at most 64 characters"

**Country Switching:**

- [ ] Generate IBAN for Germany (DE) - should be 22 chars
- [ ] Switch to Austria (AT)
- [ ] Generate IBAN - should be 20 chars starting with AT

### 3. IBAN Generator - Validate Mode

**Valid IBAN:**

- [ ] Switch to "Validate" tab
- [ ] Enter valid German IBAN: `DE89370400440532013000`
- [ ] Click "Validate IBAN"
- [ ] Should show green "Valid IBAN" message
- [ ] Should see "This IBAN passed all validation checks"

**Invalid IBAN - Bad Checksum:**

- [ ] Enter IBAN with wrong checksum: `DE00370400440532013000`
- [ ] Click "Validate IBAN"
- [ ] Should show red "Invalid IBAN" message
- [ ] Should see reason: "Invalid checksum (mod-97 validation failed)"

**Invalid IBAN - Wrong Format:**

- [ ] Enter short IBAN: `DE1234`
- [ ] Should see inline error before clicking validate
- [ ] Enter IBAN with special characters: `DE89@#$%`
- [ ] Should see error about invalid characters
- [ ] Enter IBAN starting with numbers: `12DE370400440532013000`
- [ ] Click validate - should see error about country code

**IBAN Normalization:**

- [ ] Enter IBAN with spaces: `DE89 3704 0044 0532 0130 00`
- [ ] Click "Validate IBAN"
- [ ] Should work correctly (spaces removed automatically)
- [ ] Enter lowercase iban: `de89370400440532013000`
- [ ] Should work correctly (converted to uppercase)

**Paste Functionality:**

- [ ] Copy an IBAN with spaces: `DE89 3704 0044 0532 0130 00`
- [ ] Paste into the input field
- [ ] Should automatically remove spaces

### 4. History (Desktop)

**Adding to History:**

- [ ] Generate 3 different IBANs (use different seeds: `a`, `b`, `c`)
- [ ] Check right sidebar - should show "History (3)"
- [ ] All 3 items should be listed with timestamps

**Rehydrating from History:**

- [ ] Click on a history item
- [ ] Should switch to Generate tab
- [ ] Result should appear with the clicked IBAN
- [ ] Country and seed should match the history item

**History Limit:**

- [ ] Generate 11 IBANs (use seeds: `1`, `2`, `3`, ..., `11`)
- [ ] History should show only 10 most recent items
- [ ] Oldest item should be removed (FIFO)

**Clear History:**

- [ ] Click "Clear History" button
- [ ] Should show confirmation dialog
- [ ] Click "Cancel" - history should remain
- [ ] Click "Clear History" again
- [ ] Click "Clear" in dialog - history should be empty
- [ ] Should show "No history yet" message

**History Persistence:**

- [ ] Generate 2-3 IBANs
- [ ] Reload the page (F5)
- [ ] History should still be there
- [ ] Close and reopen the tab
- [ ] History should persist

### 5. History (Mobile)

**Collapsible Behavior:**

- [ ] Resize to mobile width (<1024px)
- [ ] History should show as collapsed with chevron icon
- [ ] Click to expand - should show history list
- [ ] Click again - should collapse

### 6. Preferences Persistence

**Format Preference:**

- [ ] Set format to "JSON"
- [ ] Reload page
- [ ] Format should still be "JSON"

**Country Preference:**

- [ ] Select "Austria (AT)"
- [ ] Reload page
- [ ] Country should still be "AT"

**Tab Preference:**

- [ ] Switch to "Validate" tab
- [ ] Reload page
- [ ] Should open on "Validate" tab

### 7. Loading States

**Generate:**

- [ ] Click "Generate IBAN" button
- [ ] Button should show spinner: "Generating..."
- [ ] Button should be disabled during loading

**Validate:**

- [ ] Click "Validate IBAN" button
- [ ] Button should show spinner: "Validating..."
- [ ] Button should be disabled during loading

### 8. Accessibility (Keyboard Navigation)

**Tab Navigation:**

- [ ] Use Tab key to navigate through form elements
- [ ] All interactive elements should be reachable
- [ ] Focus should be visible (ring around element)

**Form Submission:**

- [ ] Focus on any input field
- [ ] Press Enter
- [ ] Should submit the form (generate/validate)

**History Keyboard:**

- [ ] Tab to history items
- [ ] Press Enter on a history item
- [ ] Should rehydrate the result

### 9. Breadcrumb Navigation

- [ ] Check breadcrumb: "Home / Generators / IBAN Generator"
- [ ] Click "Home" - should navigate to home page
- [ ] Click "Generators" - should navigate to generators hub
- [ ] Current page should be highlighted

### 10. Error Handling

**Network Error Simulation:**

- [ ] Turn off internet connection
- [ ] Try to generate IBAN
- [ ] Should show error message
- [ ] Turn on internet
- [ ] Try again - should work

**Invalid API Response:**

- [ ] This would require backend modification
- [ ] Skip for now

### 11. Responsive Design

**Breakpoints to Test:**

- [ ] Mobile: 375px width (iPhone SE)
- [ ] Tablet: 768px width (iPad)
- [ ] Desktop: 1024px width
- [ ] Large Desktop: 1920px width

**Check at each breakpoint:**

- [ ] Layout doesn't break
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] History is accessible (collapsed on mobile, sidebar on desktop)

### 12. Other Generators

**Test Placeholders:**

- [ ] Navigate to `/generators/phone`
- [ ] Should show "Coming Soon" message
- [ ] Try all other kinds: `address`, `plates`, `email`, `company`, `card`, `guid`, `string`
- [ ] All should show appropriate "Coming Soon" message

## Known Issues

- **Node.js Version**: Requires >=18.20.8 (environment has 18.19.1)
- Generic generators are intentionally placeholders (MVP scope)

## Success Criteria

✅ All checklist items pass
✅ No console errors
✅ No accessibility violations
✅ Responsive on all screen sizes
✅ History persists across page reloads
✅ Deterministic generation works correctly
✅ Validation is accurate
