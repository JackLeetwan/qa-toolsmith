import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { logger } from "../../../lib/utils/logger";

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    logger.debug("🔍 Auth check endpoint called");

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.error("❌ Auth check error:", userError);
      return new Response(
        JSON.stringify({
          authenticated: false,
          error: userError.message,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (user) {
      logger.debug("✅ Auth check successful:", {
        userId: user.id,
        email: user.email,
      });
      return new Response(
        JSON.stringify({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      logger.debug("❌ Auth check: No authenticated user");
      return new Response(
        JSON.stringify({
          authenticated: false,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    logger.error("❌ Auth check unexpected error:", error);
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
