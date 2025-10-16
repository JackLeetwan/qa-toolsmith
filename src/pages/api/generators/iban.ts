import type { APIRoute } from "astro";
import { z } from "zod";
import { generate } from "../../../lib/services/iban.service.js";

export const prerender = false;

/**
 * Query parameter schema for IBAN generation
 * - country: required, must be 'DE', 'AT', or 'PL'
 * - seed: optional, max 64 chars, alphanumeric + dots/underscores/hyphens
 */
const QuerySchema = z.object({
  country: z.enum(["DE", "AT", "PL"]).optional(),
  seed: z
    .string()
    .max(64, "seed must be at most 64 characters")
    .regex(/^[A-Za-z0-9._-]+$/, "seed must contain only alphanumeric, dots, underscores, or hyphens")
    .optional(),
});

/**
 * GET /api/generators/iban
 * Generates a valid IBAN for the specified country
 *
 * Query parameters:
 * - country: 'DE' | 'AT' | 'PL' (required)
 * - seed: string (optional, max 64 chars, [A-Za-z0-9._-])
 *
 * Response 200:
 * { "iban": "string", "country": "DE"|"AT"|"PL", "seed"?: "string" }
 *
 * Response 400:
 * { "error": { "code": "VALIDATION_ERROR", "message": "..." } }
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const queryParams = {
      country: url.searchParams.get("country") ?? undefined,
      seed: url.searchParams.get("seed") ?? undefined,
    };

    // Validate query parameters
    const parsed = QuerySchema.parse(queryParams);

    // Ensure country is provided
    if (!parsed.country) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Query parameter 'country' is required and must be 'DE', 'AT', or 'PL'",
        400
      );
    }

    // Generate IBAN
    const iban = generate(parsed.country, parsed.seed);

    // Build response payload
    const responsePayload: Record<string, unknown> = {
      iban,
      country: parsed.country,
    };

    // Include seed in response if provided
    if (parsed.seed) {
      responsePayload.seed = parsed.seed;
    }

    // Determine cache headers based on whether seed was provided
    const cacheControl = parsed.seed ? "public, max-age=31536000, immutable" : "no-store";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
    };

    // Add ETag for deterministic responses
    if (parsed.seed) {
      headers.ETag = `"${btoa(`${parsed.country}:${parsed.seed}`)}"`;
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");

      return createErrorResponse("VALIDATION_ERROR", message, 400);
    }

    // Handle unexpected errors
    return createErrorResponse(
      "INTERNAL",
      "An unexpected server error occurred",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
};

/**
 * Create a standardized error response
 * Follows the ErrorResponse interface from src/types/types.ts
 */
function createErrorResponse(code: string, message: string, status: number, details?: string): Response {
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
