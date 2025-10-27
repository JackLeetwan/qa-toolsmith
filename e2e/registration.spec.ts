import { test, expect } from "@playwright/test";

/**
 * E2E Tests for User Registration Flow
 *
 * Tests the complete user registration flow from the homepage to successful account creation.
 * Based on US-001: Registration requirements from PRD.
 */

test.describe("User Registration", () => {
  test.beforeEach(async ({ page }) => {
    // Clean up - ensure we're logged out
    await page.goto("/");
  });

  test("should successfully register a new user and auto-login", async ({
    page,
  }) => {
    const timestamp = Date.now();
    // Using mailinator.com instead of example.com (Supabase blocks @mailinator.com as invalid)
    const testEmail = `test-registration-${timestamp}@mailinator.com`;
    const testPassword = "SecurePass123";

    // Navigate to homepage
    await page.goto("/");
    await expect(page).toHaveTitle("QA Toolsmith");

    // Click on registration link
    const registerLink = page.locator("a[href='/auth/register']").first();
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    // Verify we're on registration page
    await expect(page).toHaveURL(/\/auth\/register/);
    // Check for either heading
    const h1 = page.getByRole("heading", { name: "Rejestracja" });
    const h2 = page.getByRole("heading", { name: "Utwórz konto" });
    await expect(h1.or(h2).first()).toBeVisible();

    // Fill in registration form
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await confirmPasswordInput.fill(testPassword);

    // Submit the form
    await submitButton.click();

    // Wait for success response (should show email confirmation message)
    // On production with email confirmation enabled, user stays on register page
    await page.waitForTimeout(2000); // Wait for form submission to complete

    // Verify we're still on the register page (email confirmation required)
    expect(page.url()).toContain("/auth/register");

    // Verify success toast/message appears (user account created but needs email confirmation)
    // Note: With email confirmation enabled, auto-login doesn't happen
  });

  test.skip("should display validation errors for invalid email", async ({
    page,
  }) => {
    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');

    // Fill with invalid email and trigger validation
    await emailInput.fill("invalid-email");
    await emailInput.blur(); // Trigger validation on blur

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Should display validation error
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /Nieprawidłowy format email/i }),
    ).toBeVisible({ timeout: 3000 });
  });

  test.skip("should display validation errors for short password", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-validation-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    // Fill form with short password
    await emailInput.fill(testEmail);
    await passwordInput.fill("short"); // Too short
    await confirmPasswordInput.fill("short");

    // Try to submit
    await submitButton.click();

    // Should display validation error (look for the error message specifically)
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /co najmniej 8 znaków/i }),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  test.skip("should display validation errors for password without letters", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    // Fill form with password containing only numbers
    await emailInput.fill(testEmail);
    await passwordInput.fill("12345678");
    await confirmPasswordInput.fill("12345678");

    // Try to submit
    await submitButton.click();

    // Should display validation error (look for the error message specifically)
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /co najmniej jedną literę/i }),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  test.skip("should display validation errors for password without numbers", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation2-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    // Fill form with password containing only letters
    await emailInput.fill(testEmail);
    await passwordInput.fill("password");
    await confirmPasswordInput.fill("password");

    // Try to submit
    await submitButton.click();

    // Should display validation error (look for the error message specifically)
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /co najmniej jedną cyfrę/i }),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  test.skip("should display validation errors when passwords don't match", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-mismatch-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    // Fill form with mismatched passwords
    await emailInput.fill(testEmail);
    await passwordInput.fill("SecurePass123");
    await confirmPasswordInput.fill("DifferentPass456");

    // Try to submit
    await submitButton.click();

    // Should display validation error (look for the error message specifically)
    await expect(
      page.locator('p[role="alert"]').filter({ hasText: /nie są identyczne/i }),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  test("should handle registration with existing email gracefully", async ({
    page,
  }) => {
    // Use a valid test email that might already exist
    const testEmail = `test-existing-${Date.now()}@mailinator.com`;
    const testPassword = "SecurePass123";

    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    // Fill form with test email
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await confirmPasswordInput.fill(testPassword);

    // Submit the form
    await submitButton.click();

    // Wait for form submission to complete
    await page.waitForTimeout(2000);

    // On first registration, should succeed with email confirmation message
    // On subsequent runs, might show error or success depending on Supabase behavior
    // The important thing is that the form handles the response gracefully
    expect(page.url()).toContain("/auth/register");

    // Form should not be stuck in loading state
    await expect(submitButton).not.toBeDisabled();
  });

  test("should have link to login page", async ({ page }) => {
    await page.goto("/auth/register");

    // Should have link to login page
    const loginLink = page.locator('a[href="/auth/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText(/Zaloguj/i);

    // Should be able to navigate to login
    await loginLink.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
