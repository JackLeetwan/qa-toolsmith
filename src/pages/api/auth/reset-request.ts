import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";
import { logger } from "../../../lib/utils/logger";

const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .max(254, "Email jest za długi")
    .transform((val) => val.trim().toLowerCase())
    .refine((val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    }, "Nieprawidłowy format email"),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();
    const { email } = resetRequestSchema.parse(body);

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      runtimeEnv: (
        locals as unknown as { runtime?: { env?: Record<string, string> } }
      ).runtime?.env,
    });

    const envRedirectUrl = import.meta.env?.AUTH_RESET_REDIRECT_URL;
    const redirectUrl =
      envRedirectUrl && envRedirectUrl !== "undefined"
        ? envRedirectUrl
        : undefined;

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
    } catch (supabaseError) {
      // Log the error but don't fail - we want to hide if email exists
      logger.error(
        "Reset password email failed:",
        (supabaseError as Error)?.message || "Unknown error",
      );
    }

    // Always return success to avoid revealing if email exists
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Jeśli konto istnieje, wyślemy instrukcję na e-mail.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
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
        },
      );
    }

    logger.error(
      "Reset request error:",
      (error as Error)?.message || "Unknown error",
    );
    return new Response(
      JSON.stringify({
        error: "UNKNOWN_ERROR",
        message: "Wystąpił błąd podczas żądania resetu hasła.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
