import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.test for E2E tests
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",

  fullyParallel: process.env.CI ? false : true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 0, // Disable retries in CI to prevent multiple runs
  workers: process.env.CI ? 1 : undefined,

  // Global setup and teardown for E2E tests
  globalSetup: "./e2e/setup/global.setup.ts",
  globalTeardown: "./e2e/teardown/global.teardown.ts",

  reporter: [
    ["html", { outputFolder: "./playwright-report" }],
    ["json", { outputFile: "./test-results/results.json" }],
    ["junit", { outputFile: "./test-results/junit.xml" }],
  ],

  use: {
    // baseURL will be overridden per project
    // Diagnostic configuration: retain traces, screenshots, and videos only for failing tests
    // This enables full investigation of flaky tests without slowing down passing tests
    trace: "retain-on-failure", // Changed from "on-first-retry" to capture all failures
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000, // Max 10s per action (stable selector requirement)
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
      // Default test user for chromium project
    },
    // Feature flags project - disabled in CI due to server configuration issues
    ...(process.env.CI
      ? []
      : [
          {
            name: "feature-flags",
            use: {
              ...devices["Desktop Chrome"],
              baseURL: "http://localhost:3000",
            },
          },
        ]),
    // Safe defaults project - disabled in CI due to server configuration issues
    ...(process.env.CI
      ? []
      : [
          {
            name: "safe-defaults",
            use: {
              ...devices["Desktop Chrome"],
              baseURL: "http://localhost:3001",
            },
          },
        ]),
  ],

  webServer: process.env.CI
    ? undefined // In CI, server is already started by workflow
    : [
        {
          command: "node scripts/dev-e2e.js local",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120000,
        },
        {
          command: "node scripts/dev-e2e.js",
          url: "http://localhost:3001",
          reuseExistingServer: true,
          timeout: 120000,
        },
      ],
});
