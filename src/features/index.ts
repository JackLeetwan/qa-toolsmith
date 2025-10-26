import type { EnvName, FeatureFlags, FeaturePath } from "./types";
import { flags as localFlags } from "./config.local";
import { flags as integrationFlags } from "./config.integration";
import { flags as productionFlags } from "./config.production";

let flags: FeatureFlags | null = null;

function loadFeatureFlags(): FeatureFlags {
  if (flags !== null) {
    return flags;
  }

  const ENV_NAME = import.meta.env.ENV_NAME as EnvName;

  if (!ENV_NAME || !["local", "integration", "production"].includes(ENV_NAME)) {
    throw new Error(
      `Invalid or missing ENV_NAME: "${ENV_NAME}". Must be one of: local, integration, production`,
    );
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
      throw new Error(`Unexpected ENV_NAME: ${ENV_NAME}`);
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

  return (namespaceFlags as any)[key] === true;
}
