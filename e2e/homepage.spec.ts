import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should display main title and navigation", async ({ page }) => {
    await page.goto("/");

    // Check main title (h1 with specific class)
    await expect(page.locator("h1.text-6xl")).toBeVisible();
    await expect(page.locator("h1.text-6xl")).toHaveText("QA Toolsmith");

    // Check main description
    await expect(page.getByText("Standaryzuj codzienną pracę")).toBeVisible();

    // Check feature cards are present (h3 elements)
    await expect(
      page.locator("h3", { hasText: "Szablony Raportów" }),
    ).toBeVisible();
    await expect(
      page.locator("h3", { hasText: "Exploration Charters" }),
    ).toBeVisible();
    await expect(page.locator("h3", { hasText: "Baza Wiedzy" })).toBeVisible();
    await expect(
      page.locator("h3", { hasText: "Generatory Danych" }),
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

  test("should display login and register buttons for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/");

    // Check call to action section for non-authenticated users
    await expect(page.locator("a", { hasText: "Zaloguj się" })).toBeVisible();
    await expect(
      page.locator("a", { hasText: "Zarejestruj się" }),
    ).toBeVisible();
  });

  test("should have proper meta tags", async ({ page }) => {
    await page.goto("/");

    // Check title
    await expect(page).toHaveTitle("QA Toolsmith");

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute(
      "content",
      "Standardizuj codzienną pracę testerów z naszymi narzędziami",
    );
  });

  test.skip("should navigate to feature pages", async ({ page }) => {
    await page.goto("/");

    // Test navigation to templates
    await page.getByRole("link", { name: "Przejdź do szablonów" }).click();
    await expect(page).toHaveURL(/\/templates/);
    await page.goBack();

    // Test navigation to charters
    await page.getByRole("link", { name: "Rozpocznij eksplorację" }).click();
    await expect(page).toHaveURL(/\/charters/);
    await page.goBack();

    // Test navigation to knowledge base
    await page.getByRole("link", { name: "Przeglądaj bazę wiedzy" }).click();
    await expect(page).toHaveURL(/\/kb/);
    await page.goBack();

    // Test navigation to generators
    await page.getByRole("link", { name: "Generuj dane testowe" }).click();
    await expect(page).toHaveURL(/\/generators/);
  });
});
