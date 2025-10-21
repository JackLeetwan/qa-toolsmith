import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * IBANGeneratorPage represents the IBAN Generator page (/generators/iban)
 * Encapsulates all selectors and actions related to IBAN generation and validation
 */
export class IBANGeneratorPage extends BasePage {
  /**
   * Initializes the IBANGeneratorPage
   * @param page - The Playwright Page instance
   */
  constructor(page: Page) {
    super(page);
  }

  // ============================================================================
  // LOCATORS (get*() methods)
  // ============================================================================

  /**
   * Get the root component locator for the IBAN generator
   * Used to verify component hydration
   */
  getRootComponent(): Locator {
    return this.page.getByTestId("iban-root");
  }

  /**
   * Get the main heading "Generate IBAN"
   */
  getHeading(): Locator {
    return this.page.getByRole("heading", { name: "Generate IBAN" });
  }

  /**
   * Get the "Generate IBAN" button
   */
  getGenerateButton(): Locator {
    return this.page.getByRole("button", { name: /Generate IBAN/i });
  }

  /**
   * Get the copy button (appears after IBAN generation)
   */
  getCopyButton(): Locator {
    return this.page.locator("[data-testid='iban-copy-button']");
  }

  /**
   * Get the copy success toast message
   */
  getCopyToast(): Locator {
    return this.page.getByText("IBAN copied to clipboard", { exact: true });
  }

  /**
   * Get the result content container (displays generated IBAN)
   */
  getResultContent(): Locator {
    return this.page.locator("[data-testid='iban-result-content']");
  }

  // ============================================================================
  // ACTIONS (do*() methods)
  // ============================================================================

  /**
   * Navigate to the IBAN generator page
   */
  async navigate(): Promise<void> {
    await this.goto("/generators/iban");
  }

  /**
   * Wait for the IBAN generator page to be fully loaded and interactive
   * Verifies that the root component, heading, and generate button are visible
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for the root component to be hydrated
    await expect(this.getRootComponent()).toBeVisible({ timeout: 5000 });

    // Wait for the form to load
    await expect(this.getHeading()).toBeVisible({ timeout: 5000 });

    // Wait for the generate button to be ready and interactive
    await expect(this.getGenerateButton()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Setup the page: navigate and grant clipboard permissions
   */
  async setup(): Promise<void> {
    await this.navigate();
    await this.waitForPageLoad();
    await this.grantClipboardPermissions();
  }

  /**
   * Click the generate button to create a new IBAN
   */
  async clickGenerateButton(): Promise<void> {
    const btn = this.getGenerateButton();
    await expect(btn).toBeEnabled({ timeout: 5000 });
    await btn.click();
  }

  /**
   * Click the copy button to copy IBAN to clipboard
   */
  async clickCopyButton(): Promise<void> {
    const btn = this.getCopyButton();
    await expect(btn).toBeVisible({ timeout: 20000 });
    await btn.click();
  }

  /**
   * Wait for the copy toast to appear
   */
  async waitForCopyToastVisible(): Promise<void> {
    await expect(this.getCopyToast()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for the copy toast to disappear
   */
  async waitForCopyToastHidden(): Promise<void> {
    await expect(this.getCopyToast()).toBeHidden({ timeout: 10000 });
  }

  /**
   * Wait for the copy button to be visible after toast disappears
   */
  async waitForCopyButtonVisible(): Promise<void> {
    await expect(this.getCopyButton()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for the generated IBAN result to appear
   */
  async waitForResultVisible(): Promise<void> {
    await expect(this.getResultContent()).toBeVisible({ timeout: 20000 });
  }

  /**
   * Get the text content of the generated IBAN result
   */
  async getResultText(): Promise<string | null> {
    return this.getResultContent().textContent();
  }

  /**
   * Perform a complete copy action: click button, verify toast, wait for disappearance
   */
  async performCopyAction(): Promise<void> {
    await this.clickCopyButton();
    await this.waitForCopyToastVisible();
    await this.waitForCopyToastHidden();
  }

  // ============================================================================
  // VERIFICATION METHODS
  // ============================================================================

  /**
   * Verify that the generate button is visible
   */
  async verifyGenerateButtonVisible(): Promise<void> {
    await expect(this.getGenerateButton()).toBeVisible();
  }

  /**
   * Verify that the copy button is visible
   */
  async verifyCopyButtonVisible(): Promise<void> {
    await expect(this.getCopyButton()).toBeVisible();
  }

  /**
   * Verify that the result content exists and contains a valid IBAN pattern
   * IBAN format: 2 letters + 2 digits + alphanumeric characters
   */
  async verifyResultIsValidIBAN(): Promise<void> {
    const text = await this.getResultText();
    expect(text).toBeTruthy();
    // IBAN format always starts with 2 letters + 2 digits
    expect(text).toMatch(/[A-Z]{2}\d{2}/);
  }
}
