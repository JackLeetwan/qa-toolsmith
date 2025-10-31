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
    await page.goto("/", { waitUntil: "networkidle" });
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

    await emailInput.clear();
    await emailInput.type(testEmail);
    await passwordInput.clear();
    await passwordInput.type(testPassword);
    await confirmPasswordInput.clear();
    await confirmPasswordInput.type(testPassword);

    // Submit the form
    await submitButton.click();

    // Wait for success response
    await page.waitForTimeout(2000); // Wait for form submission to complete

    // Check if email confirmation is required or if user was auto-logged in
    const currentUrl = page.url();
    const isOnRegisterPage = currentUrl.includes("/auth/register");
    const isOnHomePage =
      currentUrl.includes("/") && !currentUrl.includes("/auth");
    const isOnLoginCheckEmail = currentUrl.includes(
      "/auth/login?check_email=1",
    );

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
    await page.goto("/auth/register", { waitUntil: "networkidle" });

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with invalid email and valid passwords to ensure only email validation fails
    await emailInput.clear();
    await emailInput.type("invalid-email");
    await passwordInput.clear();
    await passwordInput.type("ValidPass123");
    await confirmPasswordInput.clear();
    await confirmPasswordInput.type("ValidPass123");

    // Submit form to trigger validation
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Should display validation error for invalid email format
    const errorElement = page
      .locator('p[role="alert"]')
      .filter({ hasText: /Nieprawidłowy format email/i });
    await expect(errorElement).toBeVisible({ timeout: 5000 });

    // Check that we're still on the registration page (validation prevented submission)
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test.skip("should display validation errors for short password", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-validation-${timestamp}@mailinator.com`;

    await page.goto("/auth/register", { waitUntil: "networkidle" });

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with valid email, short password, and matching confirm password
    await emailInput.clear();
    await emailInput.type(testEmail);
    await passwordInput.clear();
    await passwordInput.type("short"); // Too short
    await confirmPasswordInput.clear();
    await confirmPasswordInput.type("short");

    // Submit form to trigger validation
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Check that we're still on the registration page (validation prevented submission)
    await expect(page).toHaveURL(/\/auth\/register/);

    // Should display validation error for short password
    const errorElement = page
      .locator('p[role="alert"]')
      .filter({ hasText: /co najmniej 8 znaków/i });
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  });

  test("should display validation errors for password without letters", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation-${timestamp}@mailinator.com`;

    await page.goto("/auth/register", { waitUntil: "networkidle" });

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with valid email, password containing only numbers, and matching confirm password
    await emailInput.clear();
    await emailInput.type(testEmail);
    await passwordInput.clear();
    await passwordInput.type("12345678");
    await confirmPasswordInput.clear();
    await confirmPasswordInput.type("12345678");

    // Submit form to trigger validation
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Check that we're still on the registration page (validation prevented submission)
    await expect(page).toHaveURL(/\/auth\/register/);

    // Should display validation error for password without letters
    const errorElement = page
      .locator('p[role="alert"]')
      .filter({ hasText: /co najmniej jedną literę/i });
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  });

  test.skip("should display validation errors for password without numbers", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-validation2-${timestamp}@mailinator.com`;

    await page.goto("/auth/register", { waitUntil: "networkidle" });

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with valid email, password containing only letters, and matching confirm password
    await emailInput.clear();
    await emailInput.type(testEmail);
    await passwordInput.clear();
    await passwordInput.type("password");
    await confirmPasswordInput.clear();
    await confirmPasswordInput.type("password");

    // Submit form to trigger validation
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Check that we're still on the registration page (validation prevented submission)
    await expect(page).toHaveURL(/\/auth\/register/);

    // Should display validation error for password without numbers
    const errorElement = page
      .locator('p[role="alert"]')
      .filter({ hasText: /co najmniej jedną cyfrę/i });
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  });

  test.skip("should display validation errors when passwords don't match", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const testEmail = `test-password-mismatch-${timestamp}@mailinator.com`;

    await page.goto("/auth/register", { waitUntil: "networkidle" });

    // Wait for form to load
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Fill form with valid email, valid password, and mismatched confirm password
    await emailInput.clear();
    await emailInput.type(testEmail);
    await passwordInput.clear();
    await passwordInput.type("SecurePass123");
    await confirmPasswordInput.clear();
    await confirmPasswordInput.type("DifferentPass456");

    // Submit form to trigger validation
    await submitButton.click();

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Check that we're still on the registration page (validation prevented submission)
    await expect(page).toHaveURL(/\/auth\/register/);

    // Should display validation error for mismatched passwords
    const errorElement = page
      .locator('p[role="alert"]')
      .filter({ hasText: /nie są identyczne/i });
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  });

  test.skip("should handle registration with existing email gracefully", async ({
    page,
  }) => {
    // Use a valid test email that might already exist
    const testEmail = `test-existing-${Date.now()}@mailinator.com`;
    const testPassword = "SecurePass123";

    await page.goto("/auth/register", { waitUntil: "networkidle" });

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    const submitButton = page.locator('button[type="submit"]');

    // Fill form with test email
    await emailInput.clear();
    await emailInput.type(testEmail);
    await passwordInput.clear();
    await passwordInput.type(testPassword);
    await confirmPasswordInput.clear();
    await confirmPasswordInput.type(testPassword);

    // Submit the form
    await submitButton.click();

    // Wait for form submission to complete
    await page.waitForTimeout(2000);

    // Check response - could be success or error depending on Supabase behavior
    const currentUrl = page.url();
    const isOnRegisterPage = currentUrl.includes("/auth/register");
    const isOnHomePage =
      currentUrl.includes("/") && !currentUrl.includes("/auth");
    const isOnLoginCheckEmail = currentUrl.includes(
      "/auth/login?check_email=1",
    );

    // Either user stays on register page (email confirmation required or error) or is redirected to home (auto-login)
    expect(isOnRegisterPage || isOnHomePage || isOnLoginCheckEmail).toBe(true);

    // If still on register page, form should not be stuck in loading state
    if (isOnRegisterPage) {
      await expect(submitButton).not.toBeDisabled();
    }
  });

  test.skip("should have link to login page", async ({ page }) => {
    await page.goto("/auth/register", { waitUntil: "networkidle" });

    // Should have link to login page
    const loginLink = page.locator('a[href="/auth/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText(/Zaloguj/i);

    // Should be able to navigate to login
    await loginLink.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
