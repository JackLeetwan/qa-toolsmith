import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",

  fullyParallel: process.env.CI ? false : true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { outputFolder: "./playwright-report" }],
    ["json", { outputFile: "./test-results/results.json" }],
    ["junit", { outputFile: "./test-results/junit.xml" }],
  ],

  use: {
    baseURL: "http://localhost:3000",
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
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
