import type { ErrorCode, ErrorResponse } from "../../types/types";
import type { Json } from "../../db/database.types";
import { ZodError } from "zod";

export interface AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: Record<string, unknown>;
  retryAfter?: number;
}

/**
 * Check if an error is an AppError with proper structure.
 */
export function isAppError(err: unknown): err is AppError {
  const obj = err as unknown as Record<string, unknown>;
  return err instanceof Error && typeof obj.status === "number" && typeof obj.code === "string";
}

/**
 * Map error to user-friendly message.
 *
 * Hides internal details for security; provides actionable feedback for known errors.
 */
export function mapErrorToMessage(err: unknown): string {
  if (isAppError(err)) {
    switch (err.code) {
      case "VALIDATION_ERROR":
        return "Invalid request: please check your input and try again.";
      case "INVALID_CREDENTIALS":
        return "Email or password is incorrect.";
      case "RATE_LIMITED":
        return "Too many login attempts. Please try again later.";
      case "UNAUTHENTICATED":
        return "You must be logged in to perform this action.";
      case "FORBIDDEN_FIELD":
        return "You do not have permission to modify this field.";
      case "EMAIL_TAKEN":
        return "This email address is already in use.";
      case "INTERNAL":
        return "An unexpected error occurred. Please try again or contact support.";
      default:
        return "An error occurred. Please try again.";
    }
  }

  if (err instanceof ZodError) {
    return `Invalid request: ${err.errors.map((e) => e.message).join("; ")}`;
  }

  if (err instanceof Error) {
    return "An unexpected error occurred. Please try again.";
  }

  return "An unknown error occurred.";
}

/**
 * Create a standardized error response.
 */
export function createErrorResponse(code: ErrorCode, message: string, details?: Record<string, Json>): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
    },
  };
}

/**
 * Extract validation error details from ZodError.
 */
export function extractZodErrorDetails(err: ZodError): Record<string, string> {
  const details: Record<string, string> = {};

  for (const issue of err.errors) {
    const field = issue.path.join(".");
    details[field] = issue.message;
  }

  return details;
}

/**
 * Create a standard error response with HTTP status code.
 */
export function errorToHttpResponse(err: unknown): {
  status: number;
  body: ErrorResponse;
  headers?: Record<string, string>;
} {
  if (isAppError(err)) {
    return {
      status: err.status,
      body: createErrorResponse(err.code, mapErrorToMessage(err)),
      headers: err.retryAfter ? { "Retry-After": String(err.retryAfter) } : undefined,
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: createErrorResponse("VALIDATION_ERROR", mapErrorToMessage(err), extractZodErrorDetails(err)),
    };
  }

  // Unknown error
  return {
    status: 500,
    body: createErrorResponse("INTERNAL", "An unexpected error occurred. Please try again."),
  };
}
