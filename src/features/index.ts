import type { EnvName, FeatureFlags, FeaturePath } from "./types";
import { flags as localFlags } from "./config.local";
import { flags as integrationFlags } from "./config.integration";
import { flags as productionFlags } from "./config.production";

let flags: FeatureFlags | null = null;

/**
 * Returns safe default feature flags with all features disabled.
 * Used when ENV_NAME is null or invalid to prevent accidental feature exposure.
 */
function getSafeDefaultFlags(): FeatureFlags {
  return {
    auth: {
      passwordReset: false,
      emailVerification: false,
      socialLogin: false,
    },
    collections: {
      generators: false,
      charters: false,
      templates: false,
      knowledgeBase: false,
      export: false,
    },
  };
}

function loadFeatureFlags(): FeatureFlags {
  if (flags !== null) {
    return flags;
  }

  const ENV_NAME = import.meta.env.ENV_NAME as EnvName;

  if (!ENV_NAME || !["local", "integration", "production"].includes(ENV_NAME)) {
    // Return safe defaults when ENV_NAME is null or invalid
    flags = getSafeDefaultFlags();
    return flags;
  }

  switch (ENV_NAME) {
    case "local":
      flags = localFlags;
      break;
    case "integration":
      flags = integrationFlags;
      break;
    case "production":
      flags = productionFlags;
      break;
    default:
      // This should never happen due to the check above, but TypeScript requires it
      flags = getSafeDefaultFlags();
      break;
  }

  return flags;
}

export function isFeatureEnabled(path: FeaturePath): boolean {
  const flags = loadFeatureFlags();
  const [namespace, key] = path.split(".") as [keyof FeatureFlags, string];

  if (!(namespace in flags)) {
    return false;
  }

  const namespaceFlags = flags[namespace];
  if (!(key in namespaceFlags)) {
    return false;
  }

  return (namespaceFlags as unknown as Record<string, unknown>)[key] === true;
}

/**
 * Gets feature flags configuration for a specific environment.
 * This function is safe to use in client-side code.
 */
export type { FeaturePath } from "./types";

export function getFeatureFlagsForEnv(
  envName: "local" | "integration" | "production" | null,
): FeatureFlags {
  if (!envName) {
    return getSafeDefaultFlags();
  }

  switch (envName) {
    case "local":
      return localFlags;
    case "integration":
      return integrationFlags;
    case "production":
      return productionFlags;
    default:
      return getSafeDefaultFlags();
  }
}
