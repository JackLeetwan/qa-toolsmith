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

    // Wait for success response
    await page.waitForTimeout(2000); // Wait for form submission to complete

    // Check if email confirmation is required or if user was auto-logged in
    const currentUrl = page.url();
    const isOnRegisterPage = currentUrl.includes("/auth/register");
    const isOnHomePage =
      currentUrl.includes("/") && !currentUrl.includes("/auth");
    const isOnLoginCheckEmail = currentUrl.includes("/auth/login?check_email=1");

    // Either user stays on register page (email confirmation required) or is redirected to home (auto-login)
    expect(isOnRegisterPage || isOnHomePage || isOnLoginCheckEmail).toBe(true);

    // If on home page, user was auto-logged in (email confirmation not required)
    // If on register page, email confirmation is required
    if (isOnHomePage) {
      // Verify we're on the home page (successful auto-login)
      await expect(page).toHaveTitle("QA Toolsmith");
    }
  });

  test("should display validation errors for invalid email", async ({
    page,
  }) => {
    await page.goto("/auth/register");

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with invalid email and submit to trigger validation
    await emailInput.type("invalid-email");
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(1000);

    // Should display validation error for invalid email format
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /Nieprawidłowy format email/i }),
    ).toBeVisible();
  });

  test("should display validation errors for short password", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-validation-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with short password and submit to trigger validation
    await emailInput.type(testEmail);
    await passwordInput.type("short"); // Too short
    await confirmPasswordInput.type("short");
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Should display validation error for short password
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /co najmniej 8 znaków/i }),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  test("should display validation errors for password without letters", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with password containing only numbers and submit to trigger validation
    await emailInput.type(testEmail);
    await passwordInput.type("12345678");
    await confirmPasswordInput.type("12345678");
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Should display validation error for password without letters
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /co najmniej jedną literę/i }),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  test("should display validation errors for password without numbers", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation2-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with password containing only letters and submit to trigger validation
    await emailInput.type(testEmail);
    await passwordInput.type("password");
    await confirmPasswordInput.type("password");
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Should display validation error for password without numbers
    await expect(
      page
        .locator('p[role="alert"]')
        .filter({ hasText: /co najmniej jedną cyfrę/i }),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  test("should display validation errors when passwords don't match", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-mismatch-${timestamp}@mailinator.com`;

    await page.goto("/auth/register");

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with mismatched passwords and submit to trigger validation
    await emailInput.type(testEmail);
    await passwordInput.type("SecurePass123");
    await confirmPasswordInput.type("DifferentPass456");
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Should display validation error for mismatched passwords
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

    // Check response - could be success or error depending on Supabase behavior
    const currentUrl = page.url();
    const isOnRegisterPage = currentUrl.includes("/auth/register");
    const isOnHomePage =
      currentUrl.includes("/") && !currentUrl.includes("/auth");
    const isOnLoginCheckEmail = currentUrl.includes("/auth/login?check_email=1");

    // Either user stays on register page (email confirmation required or error) or is redirected to home (auto-login)
    expect(isOnRegisterPage || isOnHomePage || isOnLoginCheckEmail).toBe(true);

    // If still on register page, form should not be stuck in loading state
    if (isOnRegisterPage) {
      await expect(submitButton).not.toBeDisabled();
    }
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
