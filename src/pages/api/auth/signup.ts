import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";
import { logger } from "../../../lib/utils/logger";
import { AUTH_SIGNUP_REDIRECT_URL } from "astro:env/server";
import { consume } from "../../../lib/services/rate-limiter.service";
import { getTrustedIp } from "../../../lib/helpers/request.helper";

export const prerender = false;

const signupSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .max(254, "Email jest za długi")
    .transform((val) => val.trim().toLowerCase())
    .refine((val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    }, "Nieprawidłowy format email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(72, "Hasło jest za długie")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "Hasło musi zawierać co najmniej jedną literę i jedną cyfrę",
    ),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();
    const { email, password } = signupSchema.parse(body);

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
          message: "Zbyt wiele prób rejestracji. Spróbuj ponownie później.",
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
      AUTH_SIGNUP_REDIRECT_URL && AUTH_SIGNUP_REDIRECT_URL !== "undefined"
        ? AUTH_SIGNUP_REDIRECT_URL
        : undefined;

    const { data: signupData, error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined,
    });

    if (error) {
      // Log the actual error for debugging
      logger.error("❌ Signup error from Supabase:", {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
        email: email.split("@")[0] + "@...",
      });

      // ENHANCED: Log to console for CI debugging
      // eslint-disable-next-line no-console
      console.error("🚨 SUPABASE SIGNUP ERROR:", {
        code: error.code,
        message: error.message,
        status: error.status,
        name: error.name,
      });

      // Always return generic error message to avoid revealing if email exists
      return new Response(
        JSON.stringify({
          error: "INVALID_CREDENTIALS",
          message: "Nie udało się utworzyć konta. Sprawdź dane.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Signup successful - now auto-login the user
    logger.debug("✅ Signup successful, attempting auto-login...");

    const { data: signinData, error: signinError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signinError) {
      logger.error("❌ Auto-login failed after signup:", {
        message: signinError.message,
        status: signinError.status,
        code: signinError.code,
        email: email.split("@")[0] + "@...",
      });

      // Return success but indicate email confirmation might be needed
      return new Response(
        JSON.stringify({
          user: {
            id: signupData.user?.id || "",
            email: email,
          },
          emailConfirmationRequired: true,
          message:
            "Konto utworzone. Sprawdź swoją skrzynkę email i potwierdź adres, aby się zalogować.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Both signup and signin successful
    logger.debug("✅ Signup and auto-login successful:", {
      userId: signinData.user?.id
        ? signinData.user.id.substring(0, 8) + "..."
        : "unknown",
      email: signinData.user?.email
        ? signinData.user.email.split("@")[0] + "@..."
        : "unknown",
      sessionExists: !!signinData.session,
    });

    return new Response(
      JSON.stringify({
        user: {
          id: signinData.user?.id || "",
          email: signinData.user?.email || "",
        },
        emailConfirmationRequired: false,
        message: "Konto utworzone i zalogowano pomyślnie.",
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

    logger.error("Signup error:", (error as Error)?.message || "Unknown error");
    return new Response(
      JSON.stringify({
        error: "UNKNOWN_ERROR",
        message: "Wystąpił błąd podczas rejestracji.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
