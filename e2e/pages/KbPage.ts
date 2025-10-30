import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * KbPage represents the Knowledge Base page (/kb)
 * Encapsulates all selectors and actions related to the KB page
 */
export class KbPage extends BasePage {
  // ============================================================================
  // PROPERTIES
  // ============================================================================

  /**
   * Get the underlying Playwright Page instance
   */
  get pageInstance(): Page {
    return this.page;
  }

  // ============================================================================
  // LOCATORS (get*() methods)
  // ============================================================================

  /**
   * Get the "Dodaj wpis" (Add entry) button
   */
  getAddEntryButton(): Locator {
    // Try accessible name first, then test id
    const byRole = this.page.getByRole("button", { name: /dodaj wpis/i });
    const byTestId = this.page.getByTestId("kb-add-entry");
    return byRole.or(byTestId);
  }

  /**
   * Get the empty state message
   */
  getEmptyStateMessage(): Locator {
    return this.page.getByText("Brak wpisów do wyświetlenia");
  }

  /**
   * Get the login CTA link
   */
  getLoginCtaLink(): Locator {
    return this.page.getByRole("link", {
      name: /zaloguj się aby dodać własne wpisy/i,
    });
  }

  /**
   * Get entry card by title
   */
  getEntryByTitle(title: string): Locator {
    return this.page.locator('[data-slot="card"]').filter({ hasText: title });
  }

  /**
   * Get edit button for an entry
   */
  getEditButton(entryTitle: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ hasText: entryTitle })
      .getByRole("button", { name: /edytuj/i });
  }

  /**
   * Get delete button for an entry
   */
  getDeleteButton(entryTitle: string): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ hasText: entryTitle })
      .getByRole("button", { name: /usuń/i });
  }

  /**
   * Get the form title input
   */
  getTitleInput(): Locator {
    // Try multiple selectors for robustness
    const byLabel = this.page.getByLabel(/tytuł/i);
    const byId = this.page.locator('input[id="title"]');
    return byLabel.or(byId);
  }

  /**
   * Get the form URL input
   */
  getUrlInput(): Locator {
    return this.page.getByLabel(/url/i);
  }

  /**
   * Get the tag input field
   */
  getTagInput(): Locator {
    return this.page.getByPlaceholder(/dodaj tag/i);
  }

  /**
   * Get the public checkbox
   */
  getPublicCheckbox(): Locator {
    return this.page.getByLabel(/udostępnij publicznie/i);
  }

  /**
   * Get the form submit button
   */
  getFormSubmitButton(): Locator {
    return this.page.getByRole("button", { name: /(utwórz|zaktualizuj)/i });
  }

  /**
   * Get the form cancel button
   */
  getFormCancelButton(): Locator {
    return this.page.getByRole("button", { name: /anuluj/i });
  }

  /**
   * Get the delete confirmation dialog
   */
  getDeleteDialog(): Locator {
    return this.page.getByRole("alertdialog");
  }

  /**
   * Get the delete confirm button in dialog
   */
  getDeleteConfirmButton(): Locator {
    return this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: /usuń/i });
  }

  /**
   * Get the "Załaduj więcej" (Load more) button
   */
  getLoadMoreButton(): Locator {
    return this.page.getByRole("button", { name: /załaduj więcej/i });
  }

  /**
   * Get toast notification by text
   */
  getToastByText(text: string): Locator {
    return this.page.locator('[role="status"]', { hasText: text });
  }

  // ============================================================================
  // ACTIONS (do*() methods)
  // ============================================================================

  /**
   * Navigate to the KB page
   */
  async navigate(): Promise<void> {
    await this.goto("/kb");
  }

  /**
   * Setup the page: navigate and wait for load
   */
  async setup(): Promise<void> {
    await this.navigate();
    // Wait for page to load
    await this.page.waitForLoadState("networkidle");
    // Wait for React hydration - ensure KbEntriesList component is mounted
    await this.page.waitForLoadState("domcontentloaded");
    // Additional wait for React hydration to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the "Dodaj wpis" button
   */
  async clickAddEntry(): Promise<void> {
    // Ensure page is fully loaded and React is hydrated
    await this.page.waitForLoadState("networkidle");

    // Debug: Check if page has the correct content
    await expect(
      this.page.getByRole("heading", { name: "Knowledge Base" }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check if the React component is present on the page
    const componentExists = await this.page
      .getByTestId("kb-entries-list")
      .isVisible()
      .catch(() => false);
    console.log("🔍 KbPage Debug: Component exists:", componentExists);

    if (!componentExists) {
      // Take a screenshot for debugging
      await this.page.screenshot({ path: "debug-kb-no-component.png" });
      throw new Error("KbEntriesList component not found on page");
    }

    // Wait for React component to be hydrated and rendered
    await this.page.waitForTimeout(2000);

    // For E2E tests, directly check if the button exists and click it
    // Skip complex login checks since we use mock users
    const buttonExists = await this.getAddEntryButton()
      .isVisible()
      .catch(() => false);
    console.log("🔍 KbPage Debug: Button exists:", buttonExists);

    if (!buttonExists) {
      // Take a screenshot for debugging
      await this.page.screenshot({ path: "debug-kb-no-button.png" });

      // Debug: Check component content
      const componentLocator = this.page.getByTestId("kb-entries-list");
      const componentText = await componentLocator.textContent();
      console.log("🔍 KbPage Debug: Component text content:", componentText);

      // Debug: Check page content
      const pageContent = await this.page.locator("body").textContent();
      console.log(
        "🔍 KbPage Debug: Page content includes 'Dodaj wpis':",
        pageContent?.includes("Dodaj wpis"),
      );
      console.log(
        "🔍 KbPage Debug: Page content includes 'Knowledge Base':",
        pageContent?.includes("Knowledge Base"),
      );

      // Check if there are any console errors
      const consoleMessages: string[] = [];
      this.page.on("console", (msg) => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      });
      await this.page.waitForTimeout(1000);
      console.log("🔍 KbPage Debug: Console messages:", consoleMessages);

      throw new Error(
        "Add Entry button not visible - component not rendering correctly",
      );
    }

    await this.getAddEntryButton().click();

    // Wait for form to appear after clicking - longer timeout for React re-render
    await this.page.waitForTimeout(3000); // Give React more time to re-render in headless mode

    await expect(this.getTitleInput()).toBeVisible({ timeout: 15000 });
  }

  /**
   * Fill the entry form
   */
  async fillEntryForm(data: {
    title: string;
    url: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<void> {
    await this.getTitleInput().fill(data.title);
    await this.getUrlInput().fill(data.url);

    if (data.tags) {
      for (const tag of data.tags) {
        await this.getTagInput().fill(tag);
        await this.getTagInput().press("Enter");
      }
    }

    if (data.isPublic) {
      await this.getPublicCheckbox().check();
    }
  }

  /**
   * Submit the entry form
   */
  async submitForm(): Promise<void> {
    await this.getFormSubmitButton().click();
  }

  /**
   * Edit an entry by title
   */
  async editEntry(
    title: string,
    updates: {
      title?: string;
      url?: string;
      tags?: string[];
      isPublic?: boolean;
    },
  ): Promise<void> {
    await this.getEditButton(title).click();

    if (updates.title) {
      await this.getTitleInput().fill(updates.title);
    }
    if (updates.url) {
      await this.getUrlInput().fill(updates.url);
    }
    if (updates.tags) {
      // Clear existing tags and add new ones
      const existingTags = this.page.locator('[aria-label*="Usuń tag"]');
      const count = await existingTags.count();
      for (let i = 0; i < count; i++) {
        await existingTags.first().click();
      }
      for (const tag of updates.tags) {
        await this.getTagInput().fill(tag);
        await this.getTagInput().press("Enter");
      }
    }
    if (updates.isPublic !== undefined) {
      const checkbox = this.getPublicCheckbox();
      // Only interact with checkbox if it exists (admin users only)
      if (await checkbox.isVisible().catch(() => false)) {
        if (updates.isPublic) {
          await checkbox.check();
        } else {
          await checkbox.uncheck();
        }
      }
    }

    await this.submitForm();
  }

  /**
   * Delete an entry by title
   */
  async deleteEntry(title: string): Promise<void> {
    await this.getDeleteButton(title).click();
    await expect(this.getDeleteDialog()).toBeVisible();
    await this.getDeleteConfirmButton().click();
  }

  /**
   * Wait for toast notification to appear
   */
  async waitForToast(text: string, timeout = 5000): Promise<void> {
    await expect(this.getToastByText(text)).toBeVisible({ timeout });
  }

  // ============================================================================
  // VERIFICATION METHODS
  // ============================================================================

  /**
   * Verify that entry is displayed
   */
  async verifyEntryDisplayed(title: string): Promise<void> {
    await expect(this.page.getByText(title)).toBeVisible();
  }

  /**
   * Verify that entry is not displayed
   */
  async verifyEntryNotDisplayed(title: string): Promise<void> {
    await expect(this.page.getByText(title)).not.toBeVisible();
  }

  /**
   * Verify that edit button is visible for entry
   */
  async verifyEditButtonVisible(title: string): Promise<void> {
    await expect(this.getEditButton(title)).toBeVisible();
  }

  /**
   * Verify that edit button is not visible for entry
   */
  async verifyEditButtonNotVisible(title: string): Promise<void> {
    await expect(this.getEditButton(title)).not.toBeVisible();
  }

  /**
   * Verify that delete button is visible for entry
   */
  async verifyDeleteButtonVisible(title: string): Promise<void> {
    await expect(this.getDeleteButton(title)).toBeVisible();
  }

  /**
   * Verify that delete button is not visible for entry
   */
  async verifyDeleteButtonNotVisible(title: string): Promise<void> {
    await expect(this.getDeleteButton(title)).not.toBeVisible();
  }

  /**
   * Verify that "Dodaj wpis" button is visible
   */
  async verifyAddEntryButtonVisible(): Promise<void> {
    await expect(this.getAddEntryButton()).toBeVisible();
  }

  /**
   * Verify that "Dodaj wpis" button is not visible
   */
  async verifyAddEntryButtonNotVisible(): Promise<void> {
    await expect(this.getAddEntryButton()).not.toBeVisible();
  }

  /**
   * Verify that login CTA is displayed
   */
  async verifyLoginCtaDisplayed(): Promise<void> {
    await expect(this.getLoginCtaLink()).toBeVisible();
  }

  /**
   * Verify the page URL
   */
  async verifyPageUrl(urlPattern: RegExp): Promise<void> {
    expect(this.page.url()).toMatch(urlPattern);
  }
}
