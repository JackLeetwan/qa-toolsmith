import { z } from "zod";
import type { LoginRequest } from "../../types/types";

/**
 * Zod schema for validating login request body.
 *
 * - email: RFC 5322 compliant, normalized to lowercase
 * - password: min 8, max 128 chars (database constraint)
 */
export const loginRequestSchema = z.object({
  email: z
    .string()
    .email("Email must be a valid RFC 5322 address")
    .max(254, "Email cannot exceed 254 characters")
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters"),
}) satisfies z.ZodSchema<LoginRequest>;

/**
 * Validate login request and return typed result.
 *
 * @param data - Unknown data to validate
 * @returns Validated LoginRequest
 * @throws ZodError if validation fails
 */
export function validateLoginRequest(data: unknown): LoginRequest {
  return loginRequestSchema.parse(data);
}

/**
 * Safe validation with error details.
 * Returns null if invalid, otherwise returns validated request.
 */
export function tryValidateLoginRequest(data: unknown): LoginRequest | null {
  const result = loginRequestSchema.safeParse(data);
  return result.success ? result.data : null;
}
