import { getClientEnvName } from "@/lib/utils/environment";
import { getFeatureFlagsForEnv } from "@/features";

/**
 * Hook for checking feature flag status in client-side React components.
 * Uses the PUBLIC_ENV_NAME to determine the current environment and check feature status.
 *
 * @param featurePath - The feature path to check (e.g., "collections.generators")
 * @returns boolean indicating if the feature is enabled
 */
export function useFeatureFlag(featurePath: string): boolean {
  const envName = getClientEnvName();
  const flags = getFeatureFlagsForEnv(envName);

  const [namespace, key] = featurePath.split(".") as [
    keyof typeof flags,
    string,
  ];

  if (!(namespace in flags)) {
    return false;
  }

  const namespaceFlags = flags[namespace];
  if (!(key in namespaceFlags)) {
    return false;
  }

  return (namespaceFlags as unknown as Record<string, unknown>)[key] === true;
}
