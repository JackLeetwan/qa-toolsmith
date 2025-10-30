import { test } from "@playwright/test";
import { HomePage } from "./pages/HomePage";

test.describe("Homepage", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.setup();
  });

  test("should display main title and navigation", async () => {
    // Verify main title
    await homePage.verifyMainTitleDisplayed();

    // Verify main description
    await homePage.verifyMainDescriptionDisplayed();

    // Verify all feature cards are present
    await homePage.verifyAllFeatureCardsDisplayed();

    // Verify navigation links are present
    await homePage.verifyAllNavigationLinksDisplayed();
  });

  test("should display login and register buttons for unauthenticated users", async () => {
    // Check call to action section for non-authenticated users
    await homePage.verifyAuthButtonsDisplayed();
  });

  test("should have proper meta tags", async () => {
    // Check title
    await homePage.verifyPageTitle("QA Toolsmith");

    // Check meta description
    await homePage.verifyMetaDescription(
      "Standardizuj codzienną pracę testerów z naszymi narzędziami",
    );
  });
});
