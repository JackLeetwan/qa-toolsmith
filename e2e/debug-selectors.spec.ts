import { test, expect } from "@playwright/test";

test.describe("Debug Selectors", () => {
  test.beforeEach(async () => {
    // Setup for tests
  });

  test("should test selectors on static HTML page", async ({ page }) => {
    // Serve the test HTML file
    await page.goto(`file://${process.cwd()}/e2e/test-page.html`);

    // Re-initialize HomePage with the current page for testing against static HTML
    // homePage = new HomePage(page); // This line is removed

    // Check main title
    await expect(page.locator("h1.text-6xl")).toBeVisible();
    await expect(page.locator("h1.text-6xl")).toHaveText("QA Toolsmith");

    // Check main description
    await expect(page.getByText("Standaryzuj codzienną pracę")).toBeVisible();

    // Check feature cards are present
    await expect(
      page.getByRole("heading", { name: "Szablony Raportów" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Exploration Charters" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Baza Wiedzy" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Generatory Danych" }),
    ).toBeVisible();

    // Check navigation links
    await expect(
      page.getByRole("link", { name: "Przejdź do szablonów" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Rozpocznij eksplorację" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Przeglądaj bazę wiedzy" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Generuj dane testowe" }),
    ).toBeVisible();
  });

  test("should test login/register buttons", async ({ page }) => {
    await page.goto(`file://${process.cwd()}/e2e/test-page.html`);

    // Re-initialize HomePage with the current page for testing against static HTML
    // homePage = new HomePage(page); // This line is removed

    // Check call to action section for non-authenticated users
    await expect(page.getByRole("link", { name: "Zaloguj się" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Zarejestruj się" }),
    ).toBeVisible();
  });

  test("should test meta tags", async ({ page }) => {
    await page.goto(`file://${process.cwd()}/e2e/test-page.html`);

    // Re-initialize HomePage with the current page for testing against static HTML
    // homePage = new HomePage(page); // This line is removed

    // Check title
    await expect(page).toHaveTitle("QA Toolsmith");

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute(
      "content",
      "Standardizuj codzienną pracę testerów z naszymi narzędziami",
    );
  });
});
