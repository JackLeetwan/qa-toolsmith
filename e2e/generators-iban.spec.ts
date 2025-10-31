import { test } from "@playwright/test";
import { IBANGeneratorPage } from "./pages/IBANGeneratorPage";

/**
 * E2E Tests for IBAN Generator
 * Critical functionality tests - keep minimal and focused
 */

test.describe("IBAN Generator", () => {
  let ibanPage: IBANGeneratorPage;

  test.beforeEach(async ({ page }) => {
    // Skip tests only when ENV_NAME is explicitly set and not "local"
    if (process.env.ENV_NAME && process.env.ENV_NAME !== "local") {
      test.skip();
    }

    // Initialize the page object
    ibanPage = new IBANGeneratorPage(page);

    // Setup: navigate and prepare the page
    await ibanPage.setup();
  });

  test("should generate and copy IBAN successfully", async () => {
    // Click the generate button
    await ibanPage.clickGenerateButton();

    // Wait for result and verify IBAN was generated
    await ibanPage.waitForResultVisible();
    await ibanPage.verifyResultIsValidIBAN();

    // Verify copy button exists and click it
    await ibanPage.verifyCopyButtonVisible();
    await ibanPage.clickCopyButton();

    // Verify toast appears and disappears
    await ibanPage.waitForCopyToastVisible();
    await ibanPage.waitForCopyToastHidden();
  });

  test("should generate valid IBAN", async () => {
    // Generate IBAN
    await ibanPage.clickGenerateButton();
    await ibanPage.waitForResultVisible();

    // Verify it's a valid IBAN format
    await ibanPage.verifyResultIsValidIBAN();
  });
});
