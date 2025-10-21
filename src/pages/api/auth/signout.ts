import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { logger } from "../../../lib/utils/logger";

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      return new Response(
        JSON.stringify({
          error: "UNKNOWN_ERROR",
          message: "Wystąpił błąd podczas wylogowania.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Signout error:", error);
    return new Response(
      JSON.stringify({
        error: "UNKNOWN_ERROR",
        message: "Wystąpił błąd podczas wylogowania.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
