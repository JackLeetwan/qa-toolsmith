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
    const testEmail = `test-registration-${timestamp}@example.com`;
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

    // Wait for success (should redirect to homepage)
    await page.waitForURL(/^(?!.*\/auth\/register).*$/, { timeout: 10000 });

    // Verify we're redirected (either to home or another page, but NOT on register page)
    expect(page.url()).not.toContain("/auth/register");

    // Verify user is logged in by checking for user-related UI elements
    // Note: This depends on your app's post-login state
    // You might see a user menu, profile link, or logout button
  });

  test("should display validation errors for invalid email", async ({
    page,
  }) => {
    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');

    // Fill with invalid email
    await emailInput.fill("invalid-email");

    // Try to submit
    await submitButton.click();

    // Should display validation error (look for the error message specifically)
    await expect(
      page.locator('p[role="alert"]').filter({ hasText: /Nieprawidłowy format email/i }),
    ).toBeVisible({ timeout: 3000 });
  });

  test("should display validation errors for short password", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-validation-${timestamp}@example.com`;

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
    await expect(page.locator('p[role="alert"]').filter({ hasText: /co najmniej 8 znaków/i })).toBeVisible({
      timeout: 3000,
    });
  });

  test("should display validation errors for password without letters", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation-${timestamp}@example.com`;

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
    await expect(page.locator('p[role="alert"]').filter({ hasText: /co najmniej jedną literę/i })).toBeVisible({
      timeout: 3000,
    });
  });

  test("should display validation errors for password without numbers", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation2-${timestamp}@example.com`;

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
    await expect(page.locator('p[role="alert"]').filter({ hasText: /co najmniej jedną cyfrę/i })).toBeVisible({
      timeout: 3000,
    });
  });

  test("should display validation errors when passwords don't match", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-mismatch-${timestamp}@example.com`;

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
    await expect(page.locator('p[role="alert"]').filter({ hasText: /nie są identyczne/i })).toBeVisible({
      timeout: 3000,
    });
  });

  test("should display generic error message for duplicate email", async ({
    page,
  }) => {
    // Use a known existing email (you may need to create this user beforehand)
    // For this test to work, you need a user with this email
    const existingEmail = process.env.E2E_USERNAME || "existing@example.com";
    const testPassword = "SecurePass123";

    await page.goto("/auth/register");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    // Fill form with existing email
    await emailInput.fill(existingEmail);
    await passwordInput.fill(testPassword);
    await confirmPasswordInput.fill(testPassword);

    // Try to submit
    await submitButton.click();

    // Should display generic error message (not revealing that email exists)
    await expect(page.getByText(/Nie udało się utworzyć konta/i)).toBeVisible({
      timeout: 10000,
    });
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
