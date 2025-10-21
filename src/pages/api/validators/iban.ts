import type { APIRoute } from "astro";
import { z } from "zod";
import { validateIban } from "../../../lib/utils/iban-validator.js";
import type { ErrorCode } from "../../../types/types.js";

export const prerender = false;

/**
 * Query parameter schema for IBAN validation
 * - iban: required, will be normalized (spaces removed, uppercased)
 */
const QuerySchema = z.object({
  iban: z.string().min(1, "iban parameter is required"),
});

/**
 * GET /api/validators/iban
 * Validates an IBAN checksum and format
 *
 * Query parameters:
 * - iban: string (required, will be normalized)
 *
 * Response 200:
 * { "valid": true } or { "valid": false, "reason": "..." }
 *
 * Response 400:
 * { "error": { "code": "VALIDATION_ERROR", "message": "..." } }
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const queryParams = {
      iban: url.searchParams.get("iban") ?? undefined,
    };

    // Validate query parameters
    const parsed = QuerySchema.parse(queryParams);

    if (!parsed.iban) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Query parameter 'iban' is required",
        400,
      );
    }

    // Validate IBAN
    const result = validateIban(parsed.iban);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Validation results can be cached briefly
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");

      return createErrorResponse("VALIDATION_ERROR", message, 400);
    }

    // Handle unexpected errors
    return createErrorResponse(
      "INTERNAL",
      "An unexpected server error occurred",
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
};

/**
 * Create a standardized error response
 * Follows the ErrorResponse interface from src/types/types.ts
 */
function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: string,
): Response {
  const payload: Record<string, unknown> = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    (payload.error as Record<string, unknown>).details = { internal: details };
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
