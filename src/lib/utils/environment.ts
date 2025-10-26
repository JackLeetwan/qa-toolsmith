import type { EnvName } from "../../features/types";

/**
 * Gets the environment name for client-side components.
 * This function should only be used in client-side React components.
 * For server-side code, use import.meta.env.ENV_NAME directly.
 */
export function getClientEnvName(): EnvName | null {
  const envName = import.meta.env.PUBLIC_ENV_NAME;

  if (!envName || !["local", "integration", "production"].includes(envName)) {
    return null;
  }

  return envName as EnvName;
}
