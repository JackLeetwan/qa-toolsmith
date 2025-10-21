import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * HomePage represents the homepage (/)
 * Encapsulates all selectors and actions related to the homepage
 */
export class HomePage extends BasePage {
  /**
   * Initializes the HomePage
   * @param page - The Playwright Page instance
   */
  constructor(page: Page) {
    super(page);
  }

  // ============================================================================
  // PROPERTIES
  // ============================================================================

  /**
   * Get the underlying Playwright Page instance (for accessing page-level methods)
   */
  get pageInstance(): Page {
    return this.page;
  }

  // ============================================================================
  // LOCATORS (get*() methods)
  // ============================================================================

  /**
   * Get the main title (h1.text-6xl with "QA Toolsmith" text)
   */
  getMainTitle(): Locator {
    return this.page.locator("h1.text-6xl");
  }

  /**
   * Get the main description text
   */
  getMainDescription(): Locator {
    return this.page.getByText("Standaryzuj codzienną pracę");
  }

  /**
   * Get the "Szablony Raportów" (Report Templates) heading
   */
  getTemplatesHeading(): Locator {
    return this.page.locator("h3", { hasText: "Szablony Raportów" });
  }

  /**
   * Get the "Exploration Charters" heading
   */
  getChartersHeading(): Locator {
    return this.page.locator("h3", { hasText: "Exploration Charters" });
  }

  /**
   * Get the "Baza Wiedzy" (Knowledge Base) heading
   */
  getKnowledgeBaseHeading(): Locator {
    return this.page.locator("h3", { hasText: "Baza Wiedzy" });
  }

  /**
   * Get the "Generatory Danych" (Data Generators) heading
   */
  getGeneratorsHeading(): Locator {
    return this.page.locator("h3", { hasText: "Generatory Danych" });
  }

  /**
   * Get the "Przejdź do szablonów" (Go to templates) link
   */
  getTemplatesLink(): Locator {
    return this.page.getByRole("link", { name: "Przejdź do szablonów" });
  }

  /**
   * Get the "Rozpocznij eksplorację" (Start exploration) link
   */
  getExplorationLink(): Locator {
    return this.page.getByRole("link", { name: "Rozpocznij eksplorację" });
  }

  /**
   * Get the "Przeglądaj bazę wiedzy" (Browse knowledge base) link
   */
  getKnowledgeBaseLink(): Locator {
    return this.page.getByRole("link", { name: "Przeglądaj bazę wiedzy" });
  }

  /**
   * Get the "Generuj dane testowe" (Generate test data) link
   */
  getGenerateDataLink(): Locator {
    return this.page.getByRole("link", { name: "Generuj dane testowe" });
  }

  /**
   * Get the "Zaloguj się" (Log in) link
   */
  getLoginLink(): Locator {
    return this.page.getByRole("link", { name: "Zaloguj się" });
  }

  /**
   * Get the "Zarejestruj się" (Register) link
   */
  getRegisterLink(): Locator {
    return this.page.getByRole("link", { name: "Zarejestruj się" });
  }

  /**
   * Get the page title meta element
   */
  getPageTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Get the meta description content
   */
  getMetaDescription(): Locator {
    return this.page.locator('meta[name="description"]');
  }

  // ============================================================================
  // ACTIONS (do*() methods)
  // ============================================================================

  /**
   * Navigate to the homepage
   */
  async navigate(): Promise<void> {
    await this.goto("/");
  }

  /**
   * Setup the page: navigate and wait for load
   */
  async setup(): Promise<void> {
    await this.navigate();
  }

  /**
   * Click the templates navigation link
   */
  async clickTemplatesLink(): Promise<void> {
    await this.getTemplatesLink().click();
  }

  /**
   * Click the exploration charters navigation link
   */
  async clickExplorationLink(): Promise<void> {
    await this.getExplorationLink().click();
  }

  /**
   * Click the knowledge base navigation link
   */
  async clickKnowledgeBaseLink(): Promise<void> {
    await this.getKnowledgeBaseLink().click();
  }

  /**
   * Click the generators navigation link
   */
  async clickGenerateDataLink(): Promise<void> {
    await this.getGenerateDataLink().click();
  }

  /**
   * Click the login link
   */
  async clickLoginLink(): Promise<void> {
    await this.getLoginLink().click();
  }

  /**
   * Click the register link
   */
  async clickRegisterLink(): Promise<void> {
    await this.getRegisterLink().click();
  }

  // ============================================================================
  // VERIFICATION METHODS
  // ============================================================================

  /**
   * Verify that the main title is displayed with correct text
   */
  async verifyMainTitleDisplayed(): Promise<void> {
    await expect(this.getMainTitle()).toBeVisible();
    await expect(this.getMainTitle()).toHaveText("QA Toolsmith");
  }

  /**
   * Verify that the main description is displayed
   */
  async verifyMainDescriptionDisplayed(): Promise<void> {
    await expect(this.getMainDescription()).toBeVisible();
  }

  /**
   * Verify that all feature card headings are displayed
   */
  async verifyAllFeatureCardsDisplayed(): Promise<void> {
    await expect(this.getTemplatesHeading()).toBeVisible();
    await expect(this.getChartersHeading()).toBeVisible();
    await expect(this.getKnowledgeBaseHeading()).toBeVisible();
    await expect(this.getGeneratorsHeading()).toBeVisible();
  }

  /**
   * Verify that all navigation links are displayed
   */
  async verifyAllNavigationLinksDisplayed(): Promise<void> {
    await expect(this.getTemplatesLink()).toBeVisible();
    await expect(this.getExplorationLink()).toBeVisible();
    await expect(this.getKnowledgeBaseLink()).toBeVisible();
    await expect(this.getGenerateDataLink()).toBeVisible();
  }

  /**
   * Verify that login and register buttons are displayed (unauthenticated users)
   */
  async verifyAuthButtonsDisplayed(): Promise<void> {
    await expect(this.getLoginLink()).toBeVisible();
    await expect(this.getRegisterLink()).toBeVisible();
  }

  /**
   * Verify the page title
   */
  async verifyPageTitle(expectedTitle: string): Promise<void> {
    const title = await this.getPageTitle();
    expect(title).toBe(expectedTitle);
  }

  /**
   * Verify the meta description
   */
  async verifyMetaDescription(expectedDescription: string): Promise<void> {
    await expect(this.getMetaDescription()).toHaveAttribute(
      "content",
      expectedDescription
    );
  }

  /**
   * Verify the page URL matches expected pattern
   */
  async verifyPageUrl(urlPattern: RegExp): Promise<void> {
    expect(this.page.url()).toMatch(urlPattern);
  }
}
