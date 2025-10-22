import type { Page } from "@playwright/test";

/**
 * BasePage provides common functionality for all Page Object Model classes.
 * It encapsulates the Page instance and provides utility methods for waiting and navigation.
 */
export class BasePage {
  /**
   * The Playwright Page instance
   */
  protected page: Page;

  /**
   * Initializes the BasePage with a Playwright Page instance
   * @param page - The Playwright Page instance
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL path
   * @param path - The URL path to navigate to (e.g., '/generators/iban')
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Grant clipboard permissions (required for copy button tests)
   */
  async grantClipboardPermissions(): Promise<void> {
    await this.page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
  }

  /**
   * Wait for page to be in a ready state
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForPageReady(timeout = 5000): Promise<void> {
    await this.page.waitForLoadState("networkidle", { timeout });
  }
}
