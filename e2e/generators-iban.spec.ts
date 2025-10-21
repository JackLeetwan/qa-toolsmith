import { test, expect } from "@playwright/test";

/**
 * E2E Tests for IBAN Generator Copy Functionality
 *
 * These tests verify that:
 * 1. The copy button has a stable, testable selector (data-testid)
 * 2. The copy toast appears after clicking copy
 * 3. The toast disappears deterministically after 2 seconds (no sleeps needed)
 * 4. The component state is properly managed for sequential copies
 *
 * Key principle: Uses Playwright's built-in retry logic instead of manual timeouts
 */

test.describe("IBAN Generator - Copy Button Stability", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to IBAN generator page
    await page.goto("/generators/iban");

    // Wait for the root component to be hydrated
    await expect(page.getByTestId("iban-root")).toBeVisible({ timeout: 5000 });

    // Wait for the form to load
    await expect(
      page.getByRole("heading", { name: "Generate IBAN" }),
    ).toBeVisible({ timeout: 5000 });

    // Wait for the generate button to be ready and interactive
    const generateBtn = page.getByRole("button", { name: /Generate IBAN/i });
    await expect(generateBtn).toBeVisible({ timeout: 5000 });

    // Grant clipboard permissions upfront
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("copy button should have stable testid selector", async ({ page }) => {
    // This test verifies that the copy button can be reliably selected via data-testid
    const generateBtn = page.getByRole("button", { name: /Generate IBAN/i });

    // Double-check the button is enabled
    await expect(generateBtn).toBeEnabled({ timeout: 5000 });

    // Click the button
    await generateBtn.click();

    // Use data-testid to find copy button - this is our stable selector
    const copyButton = page.locator("[data-testid='iban-copy-button']");

    // Wait up to 20 seconds for the button to appear after generation
    // The component should render the copy button once result is ready
    await expect(copyButton).toBeVisible({ timeout: 20000 });
  });

  test("should show and hide copy toast deterministically", async ({
    page,
  }) => {
    // Generate IBAN first
    const generateBtn = page.getByRole("button", { name: /Generate IBAN/i });
    await generateBtn.click();

    // Wait for copy button with stable selector
    const copyButton = page.locator("[data-testid='iban-copy-button']");
    await expect(copyButton).toBeVisible({ timeout: 20000 });

    // Click copy button
    await copyButton.click();

    // Assert toast appears
    const toast = page.getByText("IBAN copied to clipboard", { exact: true });
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Assert toast disappears
    await expect(toast).toBeHidden({ timeout: 10000 });

    // Verify button is still visible and functional after toast disappears
    await expect(copyButton).toBeVisible({ timeout: 5000 });
  });

  test("should handle multiple sequential copy actions", async ({ page }) => {
    // Generate IBAN
    const generateBtn = page.getByRole("button", { name: /Generate IBAN/i });
    await generateBtn.click();

    const copyButton = page.locator("[data-testid='iban-copy-button']");
    await expect(copyButton).toBeVisible({ timeout: 20000 });

    const toast = page.getByText("IBAN copied to clipboard", { exact: true });

    // First copy action
    await copyButton.click();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toBeHidden({ timeout: 10000 });

    // Verify button is still functional
    await expect(copyButton).toBeVisible({ timeout: 5000 });

    // Second copy action - tests that state properly resets
    await copyButton.click();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toBeHidden({ timeout: 10000 });

    // Button should remain clickable
    await expect(copyButton).toBeVisible({ timeout: 5000 });
  });

  test("result content should have stable testid selector", async ({
    page,
  }) => {
    // Click generate button
    const generateBtn = page.getByRole("button", { name: /Generate IBAN/i });
    await generateBtn.click();

    // Verify result content is accessible via stable selector
    const resultContent = page.locator("[data-testid='iban-result-content']");
    await expect(resultContent).toBeVisible({ timeout: 20000 });

    // Verify content is present (contains IBAN text)
    const text = await resultContent.textContent();
    expect(text).toBeTruthy();
    // IBAN format always starts with 2 letters + 2 digits
    expect(text).toMatch(/[A-Z]{2}\d{2}/);
  });
});
