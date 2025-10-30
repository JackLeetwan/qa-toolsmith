import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// This spec verifies that non-admin users cannot publish KB entries and
// cannot edit/delete public entries, while admins can toggle is_public
// and manage public entries.
//
// Pre-req:
// - Valid credentials in env:
//   E2E_USERNAME / E2E_PASSWORD (non-admin)
//   E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD (admin) - optional; admin tests will be skipped if not set

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/hasło|password/i).fill(password);
  await page.getByRole("button", { name: /zaloguj|login/i }).click();
  // Allow staying briefly on /auth/login with query params post-submit; once session is set, go to /kb
  try {
    await expect(page).toHaveURL(
      /\/(kb|dashboard|home)|\/auth\/login(\?.*)?$/,
      { timeout: 10000 },
    );
  } catch {
    // fallthrough to manual navigation below
  }

  const current = page.url();
  if (/\/auth\/login(\?.*)?$/.test(current)) {
    // Session may already be established; navigate to KB explicitly
    await page.goto("/kb");
    // Do not assert here; the app may still redirect via next param
  }
}

function adminCredsPresent(): boolean {
  return Boolean(
    process.env.E2E_ADMIN_USERNAME && process.env.E2E_ADMIN_PASSWORD,
  );
}

test.describe("KB admin restrictions", () => {
  test("non-admin: create/edit form hides is_public; no edit/delete for public entries", async ({
    page,
  }) => {
    const user = process.env.E2E_USERNAME as string;
    const pass = process.env.E2E_PASSWORD as string;
    expect(user && pass, "E2E_USERNAME/E2E_PASSWORD must be set").toBeTruthy();

    await login(page, user, pass);

    // Go to KB page
    await page.goto("/kb");

    // Click add entry to reveal form
    const addButton = page.getByRole("button", { name: /dodaj wpis/i });
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    // Non-admin should NOT see the public checkbox
    await expect(page.getByLabel(/udostępnij publicznie/i)).toHaveCount(0);

    // For public entries, non-admin should NOT see edit/delete actions
    // We look for any row/card marked 'Publiczne' and ensure there are no corresponding buttons
    const publicBadges = page.getByText(/publiczne/i);
    const count = await publicBadges.count();
    for (let i = 0; i < count; i++) {
      const badge = publicBadges.nth(i);
      const card = badge.locator("ancestor=div[data-slot='card']");
      await expect(card.getByRole("button", { name: /edytuj/i })).toHaveCount(
        0,
      );
      await expect(card.getByRole("button", { name: /usuń/i })).toHaveCount(0);
    }
  });

  test("admin: sees and can toggle is_public in create/edit forms", async ({
    page,
  }) => {
    test.skip(
      !adminCredsPresent(),
      "Admin credentials not provided, skipping admin UI checks",
    );

    const user = process.env.E2E_ADMIN_USERNAME as string;
    const pass = process.env.E2E_ADMIN_PASSWORD as string;

    await login(page, user, pass);
    await page.goto("/kb");

    // Create form shows public toggle
    const addButton = page.getByRole("button", { name: /dodaj wpis/i });
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    const publicCheckbox = page.getByLabel(/udostępnij publicznie/i);
    await expect(publicCheckbox).toBeVisible();

    // Optionally, fill quick entry and verify toggle can be interacted with
    await page.getByLabel(/tytuł/i).fill("E2E Public Entry");
    await page.getByLabel(/^url\b/i).fill("https://example.com/e2e-public");
    await publicCheckbox.check();

    // We don't submit to avoid mutating real data across test runs.
    // If a disposable environment exists, uncomment to submit and follow-up assertions.
    // await page.getByRole("button", { name: /utwórz/i }).click();
  });

  test("admin: can create public entries", async ({ page }) => {
    test.skip(
      !adminCredsPresent(),
      "Admin credentials not provided, skipping admin functionality tests",
    );

    const user = process.env.E2E_ADMIN_USERNAME as string;
    const pass = process.env.E2E_ADMIN_PASSWORD as string;

    await login(page, user, pass);
    await page.goto("/kb");

    const entryTitle = `Admin Public Entry ${Date.now()}`;

    // Create a public entry
    const addButton = page.getByRole("button", { name: /dodaj wpis/i });
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    await page.getByLabel(/tytuł/i).fill(entryTitle);
    await page.getByLabel(/^url\b/i).fill("https://example.com/admin-public");
    await page.getByLabel(/udostępnij publicznie/i).check();

    await page.getByRole("button", { name: /utwórz/i }).click();

    // Verify entry was created
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should see the entry
    await expect(page.getByText(entryTitle)).toBeVisible();

    // Cleanup - delete the entry
    const entryCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: entryTitle });
    await entryCard.getByRole("button", { name: /usuń/i }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /usuń/i })
      .click();

    // Verify entry is gone
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(entryTitle)).not.toBeVisible();
  });

  test("admin: can edit public entries", async ({ page }) => {
    test.skip(
      !adminCredsPresent(),
      "Admin credentials not provided, skipping admin functionality tests",
    );

    const user = process.env.E2E_ADMIN_USERNAME as string;
    const pass = process.env.E2E_ADMIN_PASSWORD as string;

    await login(page, user, pass);
    await page.goto("/kb");

    const originalTitle = `Admin Edit Test ${Date.now()}`;
    const updatedTitle = `Admin Updated ${Date.now()}`;

    // Create a public entry first
    const addButton = page.getByRole("button", { name: /dodaj wpis/i });
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    await page.getByLabel(/tytuł/i).fill(originalTitle);
    await page.getByLabel(/^url\b/i).fill("https://example.com/admin-edit");
    await page.getByLabel(/udostępnij publicznie/i).check();
    await page.getByRole("button", { name: /utwórz/i }).click();

    // Verify entry was created
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(originalTitle)).toBeVisible();

    // Edit the entry
    const entryCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: originalTitle });
    await entryCard.getByRole("button", { name: /edytuj/i }).click();

    await page.getByLabel(/tytuł/i).fill(updatedTitle);
    await page.getByRole("button", { name: /zaktualizuj/i }).click();

    // Verify update
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(updatedTitle)).toBeVisible();
    await expect(page.getByText(originalTitle)).not.toBeVisible();

    // Cleanup
    const updatedCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: updatedTitle });
    await updatedCard.getByRole("button", { name: /usuń/i }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /usuń/i })
      .click();
  });

  test("admin: can toggle is_public on existing entries", async ({ page }) => {
    test.skip(
      !adminCredsPresent(),
      "Admin credentials not provided, skipping admin functionality tests",
    );

    const user = process.env.E2E_ADMIN_USERNAME as string;
    const pass = process.env.E2E_ADMIN_PASSWORD as string;

    await login(page, user, pass);
    await page.goto("/kb");

    const entryTitle = `Admin Toggle Test ${Date.now()}`;

    // Create a private entry first
    const addButton = page.getByRole("button", { name: /dodaj wpis/i });
    if (await addButton.isVisible()) {
      await addButton.click();
    }

    await page.getByLabel(/tytuł/i).fill(entryTitle);
    await page.getByLabel(/^url\b/i).fill("https://example.com/admin-toggle");
    // Leave is_public unchecked (private)
    await page.getByRole("button", { name: /utwórz/i }).click();

    // Verify entry was created
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(entryTitle)).toBeVisible();

    // Edit to make it public
    const entryCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: entryTitle });
    await entryCard.getByRole("button", { name: /edytuj/i }).click();

    await page.getByLabel(/udostępnij publicznie/i).check();
    await page.getByRole("button", { name: /zaktualizuj/i }).click();

    // Verify it's now public (should have public badge)
    await page.reload();
    await page.waitForLoadState("networkidle");
    const updatedCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: entryTitle });
    await expect(updatedCard.getByText(/publiczne/i)).toBeVisible();

    // Cleanup
    await updatedCard.getByRole("button", { name: /usuń/i }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /usuń/i })
      .click();
  });
});
