import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";
import { logger } from "../../../lib/utils/logger";

const signinSchema = z.object({
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
    .min(1, "Hasło jest wymagane")
    .max(72, "Hasło jest za długie"),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const startTime = Date.now();
  logger.debug("🔐 Signin API called at:", new Date().toISOString());

  try {
    const body = await request.json();
    logger.debug("📥 Request body received:", {
      email: body.email ? body.email.split("@")[0] + "@..." : "missing",
      hasPassword: !!body.password,
    });

    const { email, password } = signinSchema.parse(body);
    logger.debug(
      "✅ Input validation passed for email:",
      email.split("@")[0] + "@...",
    );

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      runtimeEnv: (
        locals as unknown as { runtime?: { env?: Record<string, string> } }
      ).runtime?.env,
    });
    logger.debug("🔧 Supabase instance created");

    logger.debug("🔑 Attempting signInWithPassword...");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error("❌ Supabase auth error:", {
        message: error.message,
        status: error.status,
        timestamp: new Date().toISOString(),
      });

      // Always return generic error message to avoid revealing if email exists
      return new Response(
        JSON.stringify({
          error: "INVALID_CREDENTIALS",
          message: "Nieprawidłowe dane logowania.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    logger.debug("✅ Signin successful:", {
      userId: data.user?.id ? data.user.id.substring(0, 8) + "..." : "unknown",
      email: data.user?.email
        ? data.user.email.split("@")[0] + "@..."
        : "unknown",
      sessionExists: !!data.session,
      duration: Date.now() - startTime + "ms",
    });

    return new Response(
      JSON.stringify({
        user: {
          id: data.user?.id || "",
          email: data.user?.email || "",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("❌ Input validation error:", error.errors);
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

    logger.error("❌ Unexpected signin error:", error, {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime + "ms",
    });
    return new Response(
      JSON.stringify({
        error: "UNKNOWN_ERROR",
        message: "Wystąpił błąd podczas logowania.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
