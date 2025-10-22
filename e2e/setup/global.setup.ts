/* eslint-disable no-console */
/**
 * Global setup for E2E tests
 *
 * This function runs once before all tests and performs:
 * 1. Environment variable validation
 * 2. Optional: Authentication state preparation (for future optimization)
 *
 * Reference: Playwright Global Setup
 * https://playwright.dev/docs/test-global-setup-teardown
 */
async function globalSetup() {
  console.log("🚀 Starting E2E Global Setup...");
  console.log("🔍 Environment check:");
  console.log(`   - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - SUPABASE_KEY: ${process.env.SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - E2E_USERNAME: ${process.env.E2E_USERNAME ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - E2E_PASSWORD: ${process.env.E2E_PASSWORD ? '✅ Set' : '❌ Missing'}`);

  // Validate required environment variables
  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "E2E_USERNAME",
    "E2E_PASSWORD",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error(
      "\n💡 Make sure you have created .env.test file based on .env.test.example",
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  console.log("✅ Environment variables validated");
  console.log(`📍 Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`👤 Test user: ${process.env.E2E_USERNAME}`);

  // Future optimization: Pre-authenticate and store auth state
  // This would eliminate the need for login steps in each test
  // For now, we keep it simple and authenticate within tests when needed

  // Example implementation (commented out for future use):
  /*
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto("/login");
  await page.fill('[data-testid="email-input"]', process.env.E2E_USERNAME!);
  await page.fill('[data-testid="password-input"]', process.env.E2E_PASSWORD!);
  await page.click('[data-testid="login-button"]');
  
  // Wait for authentication to complete
  await page.waitForURL("/dashboard");
  
  // Save authentication state for reuse
  await page.context().storageState({ path: "./e2e/.auth/user.json" });
  
  await browser.close();
  console.log("✅ Authentication state saved");
  */

  console.log("✅ Global setup completed");
}

export default globalSetup;
