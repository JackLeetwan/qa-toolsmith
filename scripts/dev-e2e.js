#!/usr/bin/env node

// Script to run Astro server for E2E tests
/* eslint-disable no-console, no-undef */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = { ...process.env };
const envName = env.ENV_NAME || "local";

// Allow overriding ENV_NAME via command line argument for Playwright projects
const overrideEnvName = process.argv[2];
if (overrideEnvName) {
  env.ENV_NAME = overrideEnvName;
  env.PORT = overrideEnvName === "local" ? "3000" : "3001";
  console.log(
    `🚀 Building and starting Astro server (Node adapter) with overridden ENV_NAME: ${overrideEnvName} on port ${env.PORT}`,
  );
} else {
  env.PORT = "3001"; // Default port for safe defaults
  console.log(
    `🚀 Building and starting Astro server (Node adapter) with ENV_NAME: ${envName} on port ${env.PORT}`,
  );
}

// Build with Node adapter first (this is what CI does)
console.log("📦 Building with Node adapter...");
const buildProcess = spawn("npm", ["run", "build:node"], {
  stdio: "inherit",
  env: {
    ...env,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_KEY: env.SUPABASE_KEY,
    ENV_NAME: env.ENV_NAME,
  },
});

buildProcess.on("exit", (code) => {
  if (code !== 0) {
    console.error("❌ Build failed");
    process.exit(code);
  }

  // After build succeeds, run preview with Node adapter
  console.log("✅ Build successful, starting preview server...");
  const previewProcess = spawn("node", ["scripts/preview.js"], {
    stdio: "inherit",
    env: {
      ...env,
      PORT: env.PORT,
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_KEY: env.SUPABASE_KEY,
      ENV_NAME: env.ENV_NAME,
    },
    cwd: path.resolve(__dirname, ".."),
  });

  previewProcess.on("exit", (code) => {
    process.exit(code);
  });
});
