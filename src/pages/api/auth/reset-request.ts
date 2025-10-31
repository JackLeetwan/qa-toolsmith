import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";
import { logger } from "../../../lib/utils/logger";
import { AUTH_RESET_REDIRECT_URL } from "astro:env/server";
import { consume } from "../../../lib/services/rate-limiter.service";
import { getTrustedIp } from "../../../lib/helpers/request.helper";

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

    // Rate limiting: 10 attempts per IP per 60 seconds
    const clientIp = getTrustedIp(request);
    logger.debug("🌐 Client IP for rate limiting:", clientIp);

    try {
      await consume(clientIp);
      logger.debug("✅ Rate limit check passed");
    } catch (rateLimitError) {
      logger.warn("🚫 Rate limit exceeded for IP:", clientIp, {
        retryAfter: (rateLimitError as Error & { retryAfter?: number })
          .retryAfter,
      });
      return new Response(
        JSON.stringify({
          error: "RATE_LIMITED",
          message:
            "Zbyt wiele prób resetowania hasła. Spróbuj ponownie później.",
          retryAfter: (rateLimitError as Error & { retryAfter?: number })
            .retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(
              (rateLimitError as Error & { retryAfter?: number }).retryAfter ||
                60,
            ),
          },
        },
      );
    }

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      runtimeEnv: (
        locals as unknown as { runtime?: { env?: Record<string, string> } }
      ).runtime?.env,
    });

    const redirectUrl =
      AUTH_RESET_REDIRECT_URL && AUTH_RESET_REDIRECT_URL !== "undefined"
        ? AUTH_RESET_REDIRECT_URL
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
