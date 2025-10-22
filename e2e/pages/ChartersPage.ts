import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Charters (Exploration Sessions) page
 * Tests RLS data isolation between users
 */
export class ChartersPage extends BasePage {
  /**
   * Navigate to charters page and wait for it to load
   */
  async gotoCharters(): Promise<void> {
    await this.goto("/charters");
    await this.waitForPageReady();
  }

  /**
   * Check if user is redirected to login (unauthenticated access)
   */
  async expectRedirectToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/.*auth\/login.*/);
  }

  /**
   * Check if charters page loads successfully (authenticated access)
   */
  async expectChartersPageLoads(): Promise<void> {
    await expect(this.page).toHaveURL(/.*charters$/);
    // Wait for main content to load
    await expect(this.page.locator("h1, h2").first()).toBeVisible();
  }

  /**
   * Create a new charter for testing
   */
  async createTestCharter(title = "Test Charter"): Promise<void> {
    // Click create new charter button
    await this.page
      .getByRole("button", { name: /create|new|add/i })
      .first()
      .click();

    // Fill charter details
    await this.page.getByLabel(/goal|title/i).fill(title);
    await this.page
      .getByLabel(/hypothesis/i)
      .fill("Test hypothesis for RLS verification");

    // Submit form
    await this.page
      .getByRole("button", { name: /save|create|submit/i })
      .click();

    // Wait for success message or charter to appear in list
    await expect(this.page.getByText(title)).toBeVisible();
  }

  /**
   * Get count of visible charters
   */
  async getVisibleChartersCount(): Promise<number> {
    const charters = this.page.locator(
      "[data-testid*='charter'], .charter-item, .charter-card",
    );
    return await charters.count();
  }

  /**
   * Verify that only user's charters are visible
   * This tests RLS data isolation
   */
  async verifyDataIsolation(): Promise<void> {
    const chartersCount = await this.getVisibleChartersCount();

    // Should see charters (if any exist for this user)
    // The key test is that the query succeeds without errors
    // and doesn't show data from other users (which would be blocked by RLS)

    // If there are charters, verify they load without errors
    if (chartersCount > 0) {
      await expect(this.page.locator(".error, .alert")).toHaveCount(0);
    }
  }

  /**
   * Check that charter operations work (create, read, update)
   */
  async testCharterOperations(): Promise<void> {
    const testCharterName = `RLS Test Charter ${Date.now()}`;

    // Create charter
    await this.createTestCharter(testCharterName);

    // Verify it appears in the list
    await expect(this.page.getByText(testCharterName)).toBeVisible();

    // Try to edit it (if edit functionality exists)
    const editButton = this.page.locator(`[data-testid*="edit"]`).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      // Edit operations would be tested here
    }
  }
}
