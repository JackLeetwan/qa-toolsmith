import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

// Logger for e2e to avoid runtime API mismatches
const log = (...args: unknown[]): void => {
  if (process.env.PW_DEBUG_LOGS) {
    console.log(...args);
  }
};

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

    // Wait for React component to be hydrated and rendered
    // Use client:idle directive, so component loads after page becomes interactive
    await this.page.waitForTimeout(2000);

    // For E2E tests, directly check if the button exists and click it
    // Skip complex login checks since we use mock users
    log("🔍 KbPage Debug: Checking for Add Entry button...");

    // First check what buttons are actually on the page
    const allButtons = await this.page.getByRole("button").allTextContents();
    log("🔍 KbPage Debug: All buttons on page:", allButtons);

    const buttonExists = await this.getAddEntryButton()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    log("🔍 KbPage Debug: 'Dodaj wpis' button exists:", buttonExists);

    if (!buttonExists) {
      // Take a screenshot for debugging
      await this.page.screenshot({ path: "debug-kb-no-button.png" });

      // Debug: Check component content
      const componentLocator = this.page.getByTestId("kb-entries-list");
      const componentText = await componentLocator.textContent();
      log("🔍 KbPage Debug: Component text content:", componentText);

      // Debug: Check page content
      const pageContent = await this.page.locator("body").textContent();
      log(
        "🔍 KbPage Debug: Page content includes 'Dodaj wpis':",
        pageContent?.includes("Dodaj wpis"),
      );
      log(
        "🔍 KbPage Debug: Page content includes 'Knowledge Base':",
        pageContent?.includes("Knowledge Base"),
      );
      log(
        "🔍 KbPage Debug: Page shows authenticated text:",
        pageContent?.includes("Zarządzaj swoją bazą wiedzy"),
      );

      // Check if there are any console errors
      const consoleMessages: string[] = [];
      this.page.on("console", (msg) => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      });
      await this.page.waitForTimeout(1000);
      log("🔍 KbPage Debug: Console messages:", consoleMessages);

      // Try to find any button with "dodaj" in it (case insensitive)
      const dodajButtons = await this.page
        .locator("button")
        .filter({ hasText: /dodaj/i })
        .allTextContents();
      log("🔍 KbPage Debug: Buttons containing 'dodaj':", dodajButtons);

      // If we find buttons with "dodaj", try to click the first one
      if (dodajButtons.length > 0) {
        log(
          "🔍 KbPage Debug: Found buttons with 'dodaj', trying to click the first one",
        );
        await this.page
          .locator("button")
          .filter({ hasText: /dodaj/i })
          .first()
          .click();
      } else {
        throw new Error(
          "Add Entry button not visible - component not rendering correctly",
        );
      }
    }

    log("🔍 KbPage Debug: Clicking Add Entry button...");
    await this.getAddEntryButton().click();

    // Wait for form to appear after clicking - longer timeout for React re-render
    await this.page.waitForTimeout(1000);

    // Debug: Check page content after click
    const pageContentAfterClick = await this.page.locator("body").textContent();
    log(
      "🔍 KbPage Debug: Page content after click includes 'Dodaj nowy wpis':",
      pageContentAfterClick?.includes("Dodaj nowy wpis"),
    );

    // Debug: Check if form elements exist
    const titleInputExists = await this.page
      .locator('input[name="title"]')
      .isVisible()
      .catch(() => false);
    log("🔍 KbPage Debug: Title input visible after click:", titleInputExists);

    // Check if form heading appears first
    log("🔍 KbPage Debug: Checking if form heading is visible...");
    const formHeading = this.page.getByRole("heading", {
      name: /dodaj nowy wpis/i,
    });
    await expect(formHeading).toBeVisible({ timeout: 10000 });

    log(
      "🔍 KbPage Debug: Form heading is visible, now checking title input...",
    );
    await expect(this.getTitleInput()).toBeVisible({ timeout: 5000 });
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
   * Click the submit button (for validation tests where form stays open)
   */
  async clickSubmitButton(): Promise<void> {
    await this.getFormSubmitButton().click();
    // Don't wait for form to close - used for validation error testing
  }

  /**
   * Submit the entry form
   */
  async submitForm(): Promise<void> {
    await this.getFormSubmitButton().click();

    // Wait for form submission to complete by checking that the form heading is no longer visible
    // This ensures the async create/update operation has finished and the form has been hidden
    await expect(
      this.page.getByRole("heading", {
        name: /(dodaj nowy wpis|edytuj wpis)/i,
      }),
    ).not.toBeVisible({ timeout: 10000 });
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
