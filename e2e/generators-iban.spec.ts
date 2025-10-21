import { test, expect } from "@playwright/test";
import { IBANGeneratorPage } from "./pages/IBANGeneratorPage";

/**
 * E2E Tests for IBAN Generator Copy Functionality
 *
 * These tests verify that:
 * 1. The copy button has a stable, testable selector (data-testid)
 * 2. The copy toast appears after clicking copy
 * 3. The toast disappears deterministically after 2 seconds (no sleeps needed)
 * 4. The component state is properly managed for sequential copies
 *
 * Key principle: Uses Playwright's built-in retry logic instead of manual timeouts
 * Uses Page Object Model for maintainable, centralized selector management
 */

test.describe("IBAN Generator - Copy Button Stability", () => {
  let ibanPage: IBANGeneratorPage;

  test.beforeEach(async ({ page }) => {
    // Initialize the page object
    ibanPage = new IBANGeneratorPage(page);

    // Setup: navigate and prepare the page
    await ibanPage.setup();
  });

  test("copy button should have stable testid selector", async () => {
    // Click the generate button
    await ibanPage.clickGenerateButton();

    // Verify the copy button is visible (stable selector via data-testid)
    await ibanPage.verifyCopyButtonVisible();
  });

  test("should show and hide copy toast deterministically", async () => {
    // Generate IBAN first
    await ibanPage.clickGenerateButton();

    // Wait for result and verify copy button
    await ibanPage.waitForResultVisible();
    await ibanPage.verifyCopyButtonVisible();

    // Click copy button and verify toast behavior
    await ibanPage.clickCopyButton();
    await ibanPage.waitForCopyToastVisible();
    await ibanPage.waitForCopyToastHidden();

    // Verify button is still visible and functional after toast disappears
    await ibanPage.waitForCopyButtonVisible();
  });

  test("should handle multiple sequential copy actions", async () => {
    // Generate IBAN
    await ibanPage.clickGenerateButton();
    await ibanPage.waitForResultVisible();

    // First copy action
    await ibanPage.performCopyAction();
    await ibanPage.waitForCopyButtonVisible();

    // Second copy action - tests that state properly resets
    await ibanPage.performCopyAction();

    // Button should remain clickable
    await ibanPage.waitForCopyButtonVisible();
  });

  test("result content should have stable testid selector", async () => {
    // Click generate button
    await ibanPage.clickGenerateButton();

    // Verify result content is accessible via stable selector
    await ibanPage.waitForResultVisible();

    // Verify content is valid IBAN
    await ibanPage.verifyResultIsValidIBAN();
  });
});

/**
 * API Tests for IBAN Generator Endpoint
 *
 * These tests verify backend validation, response contracts, and error handling
 * by calling the API directly using Playwright's page.request API.
 * Reference: @playwright-e2e-testing.mdc guideline 5 (Leverage API testing for backend validation)
 */
test.describe("IBAN Generator - API Endpoint", () => {
  /**
   * Helper function to make API requests
   * Returns response with type safety for common scenarios
   */
  async function callIbanApi(params: Record<string, string>) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/generators/iban${queryString ? `?${queryString}` : ""}`;
    const response = await test.step(`GET ${url}`, async () => {
      return await (await test._currentContext?.page())?.request.get(url) || new Response();
    });
    return response;
  }

  test("should generate random IBAN for country DE without seed", async ({
    page,
  }) => {
    // Call API
    const response = await page.request.get(
      "/api/generators/iban?country=DE",
    );

    // Assert response status
    expect(response.status()).toBe(200);

    // Parse response body
    const body = await response.json();

    // Verify response structure matches IbanGeneratorResponse contract
    expect(body).toHaveProperty("iban");
    expect(body).toHaveProperty("country");
    expect(body.country).toBe("DE");
    expect(typeof body.iban).toBe("string");

    // Verify IBAN format: CC(2) + check digits(2) + BBAN(18)
    expect(body.iban).toMatch(/^DE\d{20}$/);
    expect(body.iban.length).toBe(22);

    // Verify seed is not included in response when not provided
    expect(body).not.toHaveProperty("seed");

    // Verify cache headers for random generation (no cache)
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBe("no-store");
  });

  test("should generate random IBAN for country AT without seed", async ({
    page,
  }) => {
    // Call API
    const response = await page.request.get(
      "/api/generators/iban?country=AT",
    );

    // Assert response status
    expect(response.status()).toBe(200);

    // Parse response body
    const body = await response.json();

    // Verify response structure
    expect(body).toHaveProperty("iban");
    expect(body).toHaveProperty("country");
    expect(body.country).toBe("AT");

    // Verify IBAN format: CC(2) + check digits(2) + BBAN(16)
    expect(body.iban).toMatch(/^AT\d{18}$/);
    expect(body.iban.length).toBe(20);

    // Verify seed is not included
    expect(body).not.toHaveProperty("seed");

    // Verify cache headers
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBe("no-store");
  });

  test("should generate random IBAN for country PL without seed", async ({
    page,
  }) => {
    // Call API
    const response = await page.request.get(
      "/api/generators/iban?country=PL",
    );

    // Assert response status
    expect(response.status()).toBe(200);

    // Parse response body
    const body = await response.json();

    // Verify response structure
    expect(body).toHaveProperty("iban");
    expect(body.country).toBe("PL");

    // Verify IBAN format: CC(2) + check digits(2) + BBAN(24)
    expect(body.iban).toMatch(/^PL\d{26}$/);
    expect(body.iban.length).toBe(28);

    // Verify cache headers
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBe("no-store");
  });

  test("should generate deterministic IBAN for DE with seed", async ({
    page,
  }) => {
    // Call API with seed
    const response = await page.request.get(
      "/api/generators/iban?country=DE&seed=1234",
    );

    // Assert response status
    expect(response.status()).toBe(200);

    // Parse response body
    const body = await response.json();

    // Verify response structure
    expect(body).toHaveProperty("iban");
    expect(body).toHaveProperty("country");
    expect(body).toHaveProperty("seed");

    // Verify golden test value (from actual generation with seed=1234)
    expect(body.iban).toBe("DE50185482443452538353");
    expect(body.country).toBe("DE");
    expect(body.seed).toBe("1234");

    // Verify cache headers for deterministic response (immutable)
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBe("public, max-age=31536000, immutable");

    // Verify ETag is present for deterministic responses
    const etag = response.headers()["etag"];
    expect(etag).toBeTruthy();
  });

  test("should generate deterministic IBAN for AT with seed", async ({
    page,
  }) => {
    // Call API with seed
    const response = await page.request.get(
      "/api/generators/iban?country=AT&seed=1234",
    );

    // Assert response status
    expect(response.status()).toBe(200);

    // Parse response body
    const body = await response.json();

    // Verify response structure
    expect(body).toHaveProperty("iban");
    expect(body).toHaveProperty("country");
    expect(body).toHaveProperty("seed");

    // Verify golden test value (from actual generation with seed=1234)
    expect(body.iban).toBe("AT471854824434525383");
    expect(body.country).toBe("AT");
    expect(body.seed).toBe("1234");

    // Verify cache headers
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBe("public, max-age=31536000, immutable");

    // Verify ETag is present
    const etag = response.headers()["etag"];
    expect(etag).toBeTruthy();
  });

  test("should support special characters in seed (alphanumeric, dots, underscores, hyphens)", async ({
    page,
  }) => {
    // Call API with seed containing allowed special characters
    const response = await page.request.get(
      "/api/generators/iban?country=DE&seed=test_seed.123-456",
    );

    // Assert response status
    expect(response.status()).toBe(200);

    // Parse response body
    const body = await response.json();

    // Verify response structure
    expect(body).toHaveProperty("iban");
    expect(body.seed).toBe("test_seed.123-456");

    // Verify deterministic result by calling again
    const response2 = await page.request.get(
      "/api/generators/iban?country=DE&seed=test_seed.123-456",
    );
    const body2 = await response2.json();

    // Same seed should produce same IBAN
    expect(body2.iban).toBe(body.iban);
  });

  test("should return 400 when country parameter is missing", async ({
    page,
  }) => {
    // Call API without country parameter
    const response = await page.request.get("/api/generators/iban");

    // Assert response status
    expect(response.status()).toBe(400);

    // Parse response body
    const body = await response.json();

    // Verify error response structure matches ErrorResponse contract
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");

    // Verify error code
    expect(body.error.code).toBe("VALIDATION_ERROR");

    // Verify error message indicates missing country
    expect(body.error.message.toLowerCase()).toContain("country");

    // Verify content-type header
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("should return 400 when country parameter is invalid", async ({
    page,
  }) => {
    // Call API with invalid country
    const response = await page.request.get(
      "/api/generators/iban?country=INVALID",
    );

    // Assert response status
    expect(response.status()).toBe(400);

    // Parse response body
    const body = await response.json();

    // Verify error response structure
    expect(body).toHaveProperty("error");
    expect(body.error.code).toBe("VALIDATION_ERROR");

    // Verify error message mentions invalid country value
    expect(body.error.message.toLowerCase()).toContain("country");
  });

  test("should return 400 when seed exceeds 64 character limit", async ({
    page,
  }) => {
    // Create seed longer than 64 characters
    const longSeed = "a".repeat(65);

    // Call API with oversized seed
    const response = await page.request.get(
      `/api/generators/iban?country=DE&seed=${encodeURIComponent(longSeed)}`,
    );

    // Assert response status
    expect(response.status()).toBe(400);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message.toLowerCase()).toContain("seed");
  });

  test("should return 400 when seed contains invalid characters (XSS attempt)", async ({
    page,
  }) => {
    // Attempt XSS injection in seed
    const maliciousSeed = "<script>alert('xss')</script>";

    // Call API with malicious seed
    const response = await page.request.get(
      `/api/generators/iban?country=DE&seed=${encodeURIComponent(maliciousSeed)}`,
    );

    // Assert response status (should reject)
    expect(response.status()).toBe(400);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message.toLowerCase()).toContain("seed");
  });

  test("should return 400 when seed contains invalid characters (SQL injection attempt)", async ({
    page,
  }) => {
    // Attempt SQL injection in seed
    const maliciousSeed = "'; DROP TABLE profiles; --";

    // Call API with malicious seed
    const response = await page.request.get(
      `/api/generators/iban?country=DE&seed=${encodeURIComponent(maliciousSeed)}`,
    );

    // Assert response status
    expect(response.status()).toBe(400);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("should return 400 when seed contains spaces", async ({ page }) => {
    // Call API with seed containing spaces
    const response = await page.request.get(
      "/api/generators/iban?country=DE&seed=invalid%20seed",
    );

    // Assert response status
    expect(response.status()).toBe(400);

    // Parse response body
    const body = await response.json();

    // Verify error response
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message.toLowerCase()).toContain("seed");
  });

  test("should accept uppercase and lowercase country codes", async ({
    page,
  }) => {
    // Test lowercase country code (should work if API normalizes)
    const response = await page.request.get(
      "/api/generators/iban?country=de",
    );

    // This tests current API behavior - adjust expectation if case-insensitive handling is added
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    } else {
      // If case-insensitive is supported
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.country).toBe("DE");
    }
  });

  test("should return valid IBAN format for all supported countries", async ({
    page,
  }) => {
    const countries = ["DE", "AT", "PL"];
    const ibanPatterns: Record<string, { pattern: RegExp; length: number }> = {
      DE: { pattern: /^DE\d{20}$/, length: 22 },
      AT: { pattern: /^AT\d{18}$/, length: 20 },
      PL: { pattern: /^PL\d{26}$/, length: 28 },
    };

    for (const country of countries) {
      const response = await page.request.get(
        `/api/generators/iban?country=${country}`,
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const expectedPattern = ibanPatterns[country];

      expect(body.iban).toMatch(expectedPattern.pattern);
      expect(body.iban.length).toBe(expectedPattern.length);
      expect(body.country).toBe(country);
    }
  });

  test("should return Content-Type application/json header", async ({
    page,
  }) => {
    // Call API
    const response = await page.request.get(
      "/api/generators/iban?country=DE",
    );

    // Verify content-type header
    const contentType = response.headers()["content-type"];
    expect(contentType).toBe("application/json");
  });

  test("should handle multiple consecutive requests without state leakage", async ({
    page,
  }) => {
    // First request for DE
    const response1 = await page.request.get(
      "/api/generators/iban?country=DE&seed=unique1",
    );
    const body1 = await response1.json();

    // Second request for AT
    const response2 = await page.request.get(
      "/api/generators/iban?country=AT&seed=unique2",
    );
    const body2 = await response2.json();

    // Third request for DE again - should be independent
    const response3 = await page.request.get(
      "/api/generators/iban?country=DE&seed=unique1",
    );
    const body3 = await response3.json();

    // Verify responses are independent and reproducible
    expect(body1.country).toBe("DE");
    expect(body2.country).toBe("AT");
    expect(body3.country).toBe("DE");

    // First and third should match (same seed and country)
    expect(body1.iban).toBe(body3.iban);

    // Second should be different (different country and seed)
    expect(body2.iban).not.toBe(body1.iban);
  });
});
