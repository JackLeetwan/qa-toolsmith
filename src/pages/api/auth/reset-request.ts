import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { z } from "zod";
import { logger } from "../../../lib/utils/logger";

const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .max(254, "Email jest za długi")
    .email("Nieprawidłowy format email")
    .transform((val) => val.trim().toLowerCase()),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email } = resetRequestSchema.parse(body);

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const redirectUrl = import.meta.env.AUTH_RESET_REDIRECT_URL || `${new URL(request.url).origin}/auth/reset/confirm`;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    // Always return success to avoid revealing if email exists
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Jeśli konto istnieje, wyślemy instrukcję na e-mail.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "INVALID_INPUT",
          message: "Nieprawidłowe dane wejściowe.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    logger.error("Reset request error:", error);
    return new Response(
      JSON.stringify({
        error: "UNKNOWN_ERROR",
        message: "Wystąpił błąd podczas żądania resetu hasła.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
