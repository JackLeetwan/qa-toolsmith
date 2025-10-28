import { ENV_NAME } from "astro:env/client";
import type { EnvName } from "../../features/types";

/**
 * Gets the environment name for client-side components.
 * This function should only be used in client-side React components.
 * Uses astro:env/client for type-safe environment variable access.
 * For server-side code, use astro:env/server.
 */
export function getClientEnvName(): EnvName | null {
  const envName = ENV_NAME;

  if (!envName || !["local", "integration", "production"].includes(envName)) {
    return null;
  }

  return envName as EnvName;
}
