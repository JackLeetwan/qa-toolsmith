#!/usr/bin/env node

// Script to run Astro dev server WITHOUT ENV_NAME for safe defaults E2E tests

import { spawn } from "child_process";

const env = { ...process.env };
// Remove ENV_NAME to test safe defaults
delete env.ENV_NAME;

console.log(
  `🚀 Starting Astro dev server WITHOUT ENV_NAME (safe defaults test)`,
);

const child = spawn("npm", ["run", "dev:e2e"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  process.exit(code);
});
