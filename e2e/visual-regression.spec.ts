import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/HomePage";
import { IBANGeneratorPage } from "./pages/IBANGeneratorPage";

/**
 * Visual Regression Tests for Critical UI Pages
 *
 * These tests verify visual appearance and consistency across:
 * - Multiple viewport sizes (desktop, tablet)
 * - Light and dark theme variants
 * - Component-level and full-page screenshots
 *
 * Strategy:
 * - Use meaningful snapshot names for debugging
 * - Test both full page and key component snapshots
 * - Configure threshold for anti-aliasing differences (2%)
 * - Snapshots tracked in git for design review
 *
 * Reference: @playwright-e2e-testing.mdc guideline 6 (Implement visual comparison with expect(page).toHaveScreenshot())
 */

test.describe("Visual Regression - Desktop (1280x720)", () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.describe("Homepage - Light Theme", () => {
    test("should match baseline homepage light theme full page", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      // Wait for full page load
      await page.waitForLoadState("networkidle");

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "homepage-light-desktop-full-page.png",
        {
          fullPage: true,
          threshold: 0.02, // 2% tolerance for anti-aliasing
        },
      );
    });

    test("should match baseline homepage light theme hero section", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      // Get the main hero/header section
      const heroSection = await page.locator("main").first();
      await expect(heroSection).toBeVisible();

      // Take screenshot of hero section only
      await expect(heroSection).toHaveScreenshot(
        "homepage-light-desktop-hero.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline homepage light theme feature cards", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      // Scroll down to feature cards section
      await page
        .locator("h3", { hasText: "Szablony Raportów" })
        .scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Allow scroll animation

      // Get the cards container
      const cardsSection = await page
        .locator("h3", { hasText: "Szablony Raportów" })
        .locator("..")
        .locator("..");

      // Take screenshot of feature cards
      await expect(cardsSection).toHaveScreenshot(
        "homepage-light-desktop-cards.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline homepage light theme navigation", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      // Get the top navigation bar
      const topBar = await page.locator("header").first();
      await expect(topBar).toBeVisible();

      // Take screenshot of navigation
      await expect(topBar).toHaveScreenshot(
        "homepage-light-desktop-topbar.png",
        {
          threshold: 0.02,
        },
      );
    });
  });

  test.describe("Homepage - Dark Theme", () => {
    test("should match baseline homepage dark theme full page", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      // Reload to apply dark theme
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "homepage-dark-desktop-full-page.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });

    test("should match baseline homepage dark theme hero section", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Get the main hero/header section
      const heroSection = await page.locator("main").first();
      await expect(heroSection).toBeVisible();

      // Take screenshot of hero section
      await expect(heroSection).toHaveScreenshot(
        "homepage-dark-desktop-hero.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline homepage dark theme feature cards", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Scroll down to feature cards
      await page
        .locator("h3", { hasText: "Szablony Raportów" })
        .scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Get the cards container
      const cardsSection = await page
        .locator("h3", { hasText: "Szablony Raportów" })
        .locator("..")
        .locator("..");

      // Take screenshot of feature cards
      await expect(cardsSection).toHaveScreenshot(
        "homepage-dark-desktop-cards.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline homepage dark theme navigation", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Get the top navigation bar
      const topBar = await page.locator("header").first();
      await expect(topBar).toBeVisible();

      // Take screenshot of navigation
      await expect(topBar).toHaveScreenshot(
        "homepage-dark-desktop-topbar.png",
        {
          threshold: 0.02,
        },
      );
    });
  });

  test.describe("IBAN Generator - Light Theme", () => {
    test("should match baseline IBAN generator light theme full page", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "iban-generator-light-desktop-full-page.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator light theme form section", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Get the main content area
      const mainContent = await page.locator("main").first();
      await expect(mainContent).toBeVisible();

      // Take screenshot of form
      await expect(mainContent).toHaveScreenshot(
        "iban-generator-light-desktop-form.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator light theme with result", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Generate IBAN with fixed seed for deterministic output
      await ibanPage.setSeed("visual-test-seed");
      await ibanPage.clickGenerateButton();
      await ibanPage.waitForResultVisible();

      // Get the main content area
      const mainContent = await page.locator("main").first();

      // Take screenshot with result displayed
      await expect(mainContent).toHaveScreenshot(
        "iban-generator-light-desktop-with-result.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator light theme result card", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Generate IBAN with fixed seed for deterministic output
      await ibanPage.setSeed("visual-test-seed");
      await ibanPage.clickGenerateButton();
      await ibanPage.waitForResultVisible();

      // Get the result card
      const resultCard = await ibanPage.getResultContent();

      // Take screenshot of result card only
      await expect(resultCard).toHaveScreenshot(
        "iban-generator-light-desktop-result-card.png",
        {
          threshold: 0.02,
        },
      );
    });
  });

  test.describe("IBAN Generator - Dark Theme", () => {
    test("should match baseline IBAN generator dark theme full page", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "iban-generator-dark-desktop-full-page.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator dark theme form section", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Get the main content area
      const mainContent = await page.locator("main").first();
      await expect(mainContent).toBeVisible();

      // Take screenshot of form
      await expect(mainContent).toHaveScreenshot(
        "iban-generator-dark-desktop-form.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator dark theme with result", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Generate IBAN with fixed seed for deterministic output
      await ibanPage.setSeed("visual-test-seed");
      await ibanPage.clickGenerateButton();
      await ibanPage.waitForResultVisible();

      // Get the main content area
      const mainContent = await page.locator("main").first();

      // Take screenshot with result displayed
      await expect(mainContent).toHaveScreenshot(
        "iban-generator-dark-desktop-with-result.png",
        {
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator dark theme result card", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Generate IBAN with fixed seed for deterministic output
      await ibanPage.setSeed("visual-test-seed");
      await ibanPage.clickGenerateButton();
      await ibanPage.waitForResultVisible();

      // Get the result card
      const resultCard = await ibanPage.getResultContent();

      // Take screenshot of result card only
      await expect(resultCard).toHaveScreenshot(
        "iban-generator-dark-desktop-result-card.png",
        {
          threshold: 0.02,
        },
      );
    });
  });
});

test.describe("Visual Regression - Tablet (768x1024)", () => {
  test.beforeEach(async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test.describe("Homepage - Tablet Light Theme", () => {
    test("should match baseline homepage tablet light theme full page", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      await page.waitForLoadState("networkidle");

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "homepage-light-tablet-full-page.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });

    test("should match baseline homepage tablet light theme hero", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      // Get the main hero section
      const heroSection = await page.locator("main").first();
      await expect(heroSection).toBeVisible();

      // Take screenshot
      await expect(heroSection).toHaveScreenshot(
        "homepage-light-tablet-hero.png",
        {
          threshold: 0.02,
        },
      );
    });
  });

  test.describe("Homepage - Tablet Dark Theme", () => {
    test("should match baseline homepage tablet dark theme full page", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "homepage-dark-tablet-full-page.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });

    test("should match baseline homepage tablet dark theme hero", async ({
      page,
    }) => {
      const homePage = new HomePage(page);
      await homePage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Wait for dark theme to be fully applied
      await page.waitForFunction(() => {
        return document.documentElement.classList.contains("dark");
      });

      // Get the main hero section
      const heroSection = await page.locator("main").first();
      await expect(heroSection).toBeVisible();

      // Take screenshot
      await expect(heroSection).toHaveScreenshot(
        "homepage-dark-tablet-hero.png",
        {
          threshold: 0.02,
        },
      );
    });
  });

  test.describe("IBAN Generator - Tablet Light Theme", () => {
    test("should match baseline IBAN generator tablet light theme full page", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "iban-generator-light-tablet-full-page.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator tablet light theme with result", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Ensure light theme
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Generate IBAN with fixed seed for deterministic output
      await ibanPage.setSeed("visual-test-seed");
      await ibanPage.clickGenerateButton();
      await ibanPage.waitForResultVisible();

      // Take full page screenshot with result
      await expect(page).toHaveScreenshot(
        "iban-generator-light-tablet-with-result.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });
  });

  test.describe("IBAN Generator - Tablet Dark Theme", () => {
    test("should match baseline IBAN generator tablet dark theme full page", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Take full page screenshot
      await expect(page).toHaveScreenshot(
        "iban-generator-dark-tablet-full-page.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });

    test("should match baseline IBAN generator tablet dark theme with result", async ({
      page,
    }) => {
      const ibanPage = new IBANGeneratorPage(page);
      await ibanPage.setup();

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      });

      await page.reload();
      await page.waitForLoadState("networkidle");
      await ibanPage.waitForPageLoad();

      // Generate IBAN with fixed seed for deterministic output
      await ibanPage.setSeed("visual-test-seed");
      await ibanPage.clickGenerateButton();
      await ibanPage.waitForResultVisible();

      // Take full page screenshot with result
      await expect(page).toHaveScreenshot(
        "iban-generator-dark-tablet-with-result.png",
        {
          fullPage: true,
          threshold: 0.02,
        },
      );
    });
  });
});
