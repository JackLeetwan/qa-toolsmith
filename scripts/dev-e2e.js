#!/usr/bin/env node

// Script to run Astro dev server for E2E tests
/* eslint-disable no-console, no-undef */

import { spawn } from "child_process";

const env = { ...process.env };
const envName = env.ENV_NAME || "local";

// Allow overriding ENV_NAME via command line argument for Playwright projects
const overrideEnvName = process.argv[2];
if (overrideEnvName) {
  env.ENV_NAME = overrideEnvName;
  env.PORT = overrideEnvName === "local" ? "3000" : "3001";
  console.log(
    `🚀 Starting Astro dev server with overridden ENV_NAME: ${overrideEnvName} on port ${env.PORT}`,
  );
} else {
  env.PORT = "3001"; // Default port for safe defaults
  console.log(
    `🚀 Starting Astro dev server with ENV_NAME: ${envName} on port ${env.PORT}`,
  );
}

const child = spawn("npm", ["run", "dev:e2e"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  process.exit(code);
});
