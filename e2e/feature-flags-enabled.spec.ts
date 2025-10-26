import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Feature Flag Protection - Enabled Features
 *
 * These tests verify that pages load normally when features are enabled.
 * Runs with ENV_NAME=local to enable all features.
 */

test.describe("Feature Flag Page Protection - Enabled", () => {
  test.describe("Generators Feature Protection", () => {
    test("generators pages should load normally when feature is enabled", async ({
      page,
    }) => {
      // This test should only run for projects where features are enabled
      // Check if generators navigation link is visible - if not, features are disabled
      await page.goto("/");
      const generatorsLink = page.locator("nav a[href='/generators']");
      if (!(await generatorsLink.isVisible())) {
        test.skip();
      }
      // Navigate to generators index - should load normally
      await page.goto("/generators");
      await expect(page.locator("h1, h2").first()).toBeVisible();
      expect(page.url()).toBe("http://localhost:3000/generators");

      // Navigate to generators iban page - should load normally
      await page.goto("/generators/iban");
      await expect(page.locator("h1, h2").first()).toBeVisible();
      expect(page.url()).toBe("http://localhost:3000/generators/iban");

      // Navigate to generators dynamic page - should load normally
      await page.goto("/generators/phone");
      await expect(page.locator("h1, h2").first()).toBeVisible();
      expect(page.url()).toBe("http://localhost:3000/generators/phone");
    });
  });
});
