/**
 * Preview script for Node adapter
 * Handles environment variable loading for both local and CI environments
 * - Priority 1: dotenv from .env file (for local development)
 * - Priority 2: process.env variables (for CI/CD from GitHub Actions)
 */

const startServer = () => {
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!isCI) {
    console.log("\n🔍 Final Environment Check:");
    const urlDisplay = supabaseUrl
      ? supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
        ? `⚠️ LOCALHOST (${supabaseUrl})`
        : `✅ CLOUD (${supabaseUrl.split(".")[0]}.supabase.co)`
      : "❌ MISSING";

    console.log(`  - SUPABASE_URL: ${urlDisplay}`);
    console.log(
      `  - SUPABASE_KEY: ${process.env.SUPABASE_KEY ? "✅ Set" : "❌ MISSING"}`,
    );
    console.log(
      `  - ENV_NAME: ${process.env.ENV_NAME || "⚠️ Not set (defaults to development)"}`,
    );
    console.log(`  - PORT: ${process.env.PORT || 3000}\n`);
  }

  // Verify minimum required variables
  if (!supabaseUrl || !process.env.SUPABASE_KEY) {
    console.error("❌ CRITICAL: Missing required environment variables!");
    if (!supabaseUrl) {
      console.error("   - SUPABASE_URL is not set");
      console.error(
        '     Make sure GitHub secret "SUPABASE_URL" is configured',
      );
      console.error(
        "     It should be the cloud URL (e.g., https://xxxxx.supabase.co)",
      );
    }
    if (!process.env.SUPABASE_KEY) {
      console.error("   - SUPABASE_KEY is not set");
      console.error(
        '     Make sure GitHub secret "SUPABASE_KEY" is configured',
      );
    }
    process.exit(1);
  }

  // Warn if using localhost
  if (supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")) {
    if (!isCI) {
      console.warn("⚠️  WARNING: SUPABASE_URL points to localhost!");
      console.warn(
        "    This will only work if Supabase emulator is running locally.",
      );
      console.warn(
        "    For CI/CD, ensure SUPABASE_URL points to your cloud project.",
      );
    } else {
      console.warn("⚠️  WARNING: SUPABASE_URL points to localhost in CI!");
    }
  }

  if (!isCI) {
    console.log("✅ All required environment variables are set");
    console.log("🚀 Starting Astro server...\n");
  }

  // Now import and start the Astro server
  import("../dist/server/entry.mjs")
    .then(() => {
      if (!isCI) {
        console.log("✅ Astro server entry loaded and started");
      }
    })
    .catch((err) => {
      console.error("❌ Failed to load server:", err);
      process.exit(1);
    });
};

// Step 1: Always try to load dotenv (for local development)
const isCI = process.env.CI === "true";
if (!isCI) {
  console.log("📚 Attempting to load .env file via dotenv...");
}

import("dotenv")
  .then(({ config }) => {
    const result = config();
    if (!isCI) {
      if (result.parsed) {
        console.log(
          `✅ Loaded .env file with ${Object.keys(result.parsed).length} variables`,
        );
      } else {
        console.log("ℹ️  No .env file found (expected in CI/CD environment)");
      }
    }

    // Step 2: After dotenv attempt, start server with whatever env vars we have
    startServer();
  })
  .catch(() => {
    if (!isCI) {
      console.warn("⚠️  dotenv module not available, continuing without it");
    }
    // Still try to start server - process.env should have CI/CD variables
    startServer();
  });
