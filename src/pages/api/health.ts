import type { APIRoute } from "astro";
import { getHealth } from "../../lib/services/health.service";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const health = getHealth();
    return new Response(JSON.stringify(health), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Health check failed
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
