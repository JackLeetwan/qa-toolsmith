import type { APIRoute } from "astro";

export const prerender = false;

/**
 * GET /api/debug-env
 * Temporary debug endpoint to check environment variables
 * REMOVE THIS FILE AFTER DEBUGGING!
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify(
      {
        ENV_NAME: import.meta.env.ENV_NAME || "NOT SET",
        PUBLIC_ENV_NAME: import.meta.env.PUBLIC_ENV_NAME || "NOT SET",
        SUPABASE_URL_set: !!import.meta.env.SUPABASE_URL,
        all_env_keys: Object.keys(import.meta.env).filter((key) =>
          key.includes("ENV")
        ),
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

