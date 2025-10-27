import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { z } from "zod";
import { logger } from "../../../lib/utils/logger";

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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password } = signupSchema.parse(body);

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { error } = await supabase.auth.signUp({
      email,
      password,
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

    // Auto-login after successful signup (US-001)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      return new Response(
        JSON.stringify({
          error: "UNKNOWN_ERROR",
          message: "Konto utworzone, ale nie udało się zalogować.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          id: signInData.user?.id || "",
          email: signInData.user?.email || "",
        },
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
