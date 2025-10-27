import type { HealthDTO } from "../../types/types";

/**
 * Checks application health status
 * @returns Application health status
 */
export function getHealth(): HealthDTO {
  // Basic health check - no external dependencies
  // More complex checks can be added in the future
  return { status: "ok" };
}

/**
 * Checks if required environment variables are set (without exposing values)
 * @returns Object with boolean flags for each required variable
 */
export function checkEnvironment(): {
  supabase_url: boolean;
  supabase_key: boolean;
  supabase_service_key: boolean;
  openrouter_api_key: boolean;
  env_name: boolean;
  all_set: boolean;
} {
  const supabaseUrl = !!import.meta.env.SUPABASE_URL;
  const supabaseKey = !!import.meta.env.SUPABASE_KEY;
  const supabaseServiceKey = !!import.meta.env.SUPABASE_SERVICE_KEY;
  const openrouterApiKey = !!import.meta.env.OPENROUTER_API_KEY;
  const envName = !!import.meta.env.ENV_NAME;

  return {
    supabase_url: supabaseUrl,
    supabase_key: supabaseKey,
    supabase_service_key: supabaseServiceKey,
    openrouter_api_key: openrouterApiKey,
    env_name: envName,
    all_set: supabaseUrl && supabaseKey && supabaseServiceKey && openrouterApiKey && envName,
  };
}
