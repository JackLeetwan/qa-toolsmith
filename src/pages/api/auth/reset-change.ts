import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { z } from "zod";
import { logger } from "../../../lib/utils/logger";

const resetChangeSchema = z.object({
  access_token: z.string().min(1, "Token dostępu jest wymagany"),
  new_password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(72, "Hasło jest za długie")
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, "Hasło musi zawierać co najmniej jedną literę i jedną cyfrę"),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { new_password } = resetChangeSchema.parse(body);

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      return new Response(
        JSON.stringify({
          error: "INVALID_CREDENTIALS",
          message: "Nie udało się ustawić nowego hasła.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Hasło zaktualizowane.",
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

    logger.error("Reset change error:", error);
    return new Response(
      JSON.stringify({
        error: "UNKNOWN_ERROR",
        message: "Wystąpił błąd podczas zmiany hasła.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
