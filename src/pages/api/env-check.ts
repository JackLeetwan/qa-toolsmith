import type { APIRoute } from "astro";
import { checkEnvironment } from "../../lib/services/health.service";

export const prerender = false;

/**
 * GET /api/env-check
 * Checks if all required environment variables are set
 * Does not expose actual values for security
 * 
 * Response 200:
 * {
 *   supabase_url: true/false,
 *   supabase_key: true/false,
 *   supabase_service_key: true/false,
 *   openrouter_api_key: true/false,
 *   env_name: true/false,
 *   all_set: true/false
 * }
 */
export const GET: APIRoute = async () => {
  try {
    const envStatus = checkEnvironment();
    return new Response(JSON.stringify(envStatus), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL",
          message: "An unexpected server error occurred",
          details: error instanceof Error ? error.message : String(error),
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};

