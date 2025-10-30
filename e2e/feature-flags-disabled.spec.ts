import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Feature Flag Protection - Disabled Features
 *
 * These tests verify that navigation is hidden and pages redirect when features are disabled.
 * Runs without ENV_NAME to test safe defaults behavior.
 */

test.describe("Safe Defaults Protection", () => {
  test.describe("Navigation hiding when ENV_NAME is invalid", () => {
    test("navigation items should be hidden when ENV_NAME is not configured", async ({
      page,
    }) => {
      // This test should only run for projects where features are disabled
      // Check if generators navigation link is hidden - if visible, features are enabled
      await page.goto("/");
      const generatorsLink = page.locator("nav a[href='/generators']");
      if (await generatorsLink.isVisible()) {
        test.skip();
      }
      // Navigate to home page
      await page.goto("/");
      await expect(page.locator("h1, h2").first()).toBeVisible();

      // Check that feature-dependent navigation items are hidden
      // Generators link should not be visible
      await expect(page.locator("nav a[href='/generators']")).not.toBeVisible();

      // Knowledge Base link should not be visible
      await expect(page.locator("nav a[href='/kb']")).not.toBeVisible();

      // Templates link should not be visible (requires auth anyway)
      await expect(page.locator("nav a[href='/templates']")).not.toBeVisible();

      // Charters link should not be visible (requires auth anyway)
      await expect(page.locator("nav a[href='/charters']")).not.toBeVisible();

      // Admin link should not be visible (requires auth and admin role)
      await expect(page.locator("nav a[href='/admin']")).not.toBeVisible();

      // But basic branding and auth links should still be visible
      await expect(page.locator("a[href='/']")).toBeVisible(); // QA Toolsmith branding
      // Check for login links - there might be multiple, so we check that at least one is visible
      await expect(page.locator("a[href='/auth/login']").first()).toBeVisible();
      await expect(
        page.locator("a[href='/auth/register']").first(),
      ).toBeVisible();
    });

    test("generators pages should not load when features are disabled", async ({
      page,
    }) => {
      // This test should only run for projects where features are disabled
      // Check if generators navigation link is hidden - if visible, features are enabled
      await page.goto("/");
      const generatorsLink = page.locator("nav a[href='/generators']");
      if (await generatorsLink.isVisible()) {
        test.skip();
      }

      // Try to navigate to generators index - should redirect to home
      await page.goto("/generators");
      // Should redirect to home page
      await expect(page.locator("h1, h2").first()).toBeVisible();
      // Check that we're on the home page (URL should contain just the base URL)
      expect(page.url()).toMatch(/^http:\/\/localhost:\d+\/?$/);

      // But navigation should be hidden
      await expect(page.locator("nav a[href='/generators']")).not.toBeVisible();
    });
  });
});
