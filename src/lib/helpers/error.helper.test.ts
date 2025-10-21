import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  isAppError,
  mapErrorToMessage,
  createErrorResponse,
  extractZodErrorDetails,
  errorToHttpResponse,
  type AppError,
} from "./error.helper";

interface TestError extends Error {
  status?: unknown;
  code?: unknown;
}
import type { ErrorCode, ErrorResponse } from "../../types/types";

describe("Error Helper", () => {
  describe("isAppError", () => {
    it("should return true for valid AppError", () => {
      const appError: AppError = new Error("Test error") as AppError;
      appError.status = 400;
      appError.code = "VALIDATION_ERROR";

      expect(isAppError(appError)).toBe(true);
    });

    it("should return false for regular Error", () => {
      const regularError = new Error("Regular error");
      expect(isAppError(regularError)).toBe(false);
    });

    it("should return false for non-Error objects", () => {
      const nonErrorValues = [null, undefined, "string", 123, {}, [], true];

      nonErrorValues.forEach((value) => {
        expect(isAppError(value)).toBe(false);
      });
    });

    it("should return false when status is not a number", () => {
      const invalidError = new Error("Test") as TestError;
      invalidError.status = "400"; // String instead of number
      invalidError.code = "VALIDATION_ERROR";

      expect(isAppError(invalidError)).toBe(false);
    });

    it("should return false when code is not a string", () => {
      const invalidError = new Error("Test") as TestError;
      invalidError.status = 400;
      invalidError.code = 123; // Number instead of string

      expect(isAppError(invalidError)).toBe(false);
    });

    it("should return false when status is missing", () => {
      const invalidError = new Error("Test") as TestError;
      invalidError.code = "VALIDATION_ERROR";
      // status is missing

      expect(isAppError(invalidError)).toBe(false);
    });

    it("should return false when code is missing", () => {
      const invalidError = new Error("Test") as TestError;
      invalidError.status = 400;
      // code is missing

      expect(isAppError(invalidError)).toBe(false);
    });

    it("should handle AppError with additional properties", () => {
      const appError: AppError = new Error("Test error") as AppError;
      appError.status = 429;
      appError.code = "RATE_LIMITED";
      appError.details = { field: "email" };
      appError.retryAfter = 60;

      expect(isAppError(appError)).toBe(true);
    });

    it("should handle prototype chain correctly", () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public status: number,
          public code: string,
        ) {
          super(message);
        }
      }

      const customError = new CustomError("Custom", 400, "VALIDATION_ERROR");
      expect(isAppError(customError)).toBe(true);
    });
  });

  describe("mapErrorToMessage", () => {
    describe("AppError mapping", () => {
      it("should map VALIDATION_ERROR", () => {
        const error: AppError = new Error("Validation failed") as AppError;
        error.status = 400;
        error.code = "VALIDATION_ERROR";

        expect(mapErrorToMessage(error)).toBe(
          "Invalid request: please check your input and try again.",
        );
      });

      it("should map INVALID_CREDENTIALS", () => {
        const error: AppError = new Error("Bad credentials") as AppError;
        error.status = 401;
        error.code = "INVALID_CREDENTIALS";

        expect(mapErrorToMessage(error)).toBe(
          "Email or password is incorrect.",
        );
      });

      it("should map RATE_LIMITED", () => {
        const error: AppError = new Error("Rate limited") as AppError;
        error.status = 429;
        error.code = "RATE_LIMITED";

        expect(mapErrorToMessage(error)).toBe(
          "Too many login attempts. Please try again later.",
        );
      });

      it("should map UNAUTHENTICATED", () => {
        const error: AppError = new Error("Not authenticated") as AppError;
        error.status = 401;
        error.code = "UNAUTHENTICATED";

        expect(mapErrorToMessage(error)).toBe(
          "You must be logged in to perform this action.",
        );
      });

      it("should map FORBIDDEN_FIELD", () => {
        const error: AppError = new Error("Forbidden") as AppError;
        error.status = 403;
        error.code = "FORBIDDEN_FIELD";

        expect(mapErrorToMessage(error)).toBe(
          "You do not have permission to modify this field.",
        );
      });

      it("should map EMAIL_TAKEN", () => {
        const error: AppError = new Error("Email taken") as AppError;
        error.status = 409;
        error.code = "EMAIL_TAKEN";

        expect(mapErrorToMessage(error)).toBe(
          "This email address is already in use.",
        );
      });

      it("should map INTERNAL", () => {
        const error: AppError = new Error("Internal error") as AppError;
        error.status = 500;
        error.code = "INTERNAL";

        expect(mapErrorToMessage(error)).toBe(
          "An unexpected error occurred. Please try again or contact support.",
        );
      });

      it("should map unknown AppError codes", () => {
        const error: AppError = new Error("Unknown error") as AppError;
        error.status = 500;
        error.code = "UNKNOWN_CODE" as ErrorCode;

        expect(mapErrorToMessage(error)).toBe(
          "An error occurred. Please try again.",
        );
      });
    });

    describe("ZodError mapping", () => {
      it("should map single ZodError", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["email"],
            message: "Expected string, received number",
          },
        ]);

        const message = mapErrorToMessage(zodError);
        expect(message).toBe(
          "Invalid request: Expected string, received number",
        );
      });

      it("should map multiple ZodError issues", () => {
        const zodError = new ZodError([
          {
            code: "too_small",
            minimum: 8,
            type: "string",
            inclusive: true,
            path: ["password"],
            message: "Password must be at least 8 characters",
          },
          {
            code: "invalid_string",
            validation: "email",
            path: ["email"],
            message: "Invalid email format",
          },
        ]);

        const message = mapErrorToMessage(zodError);
        expect(message).toBe(
          "Invalid request: Password must be at least 8 characters; Invalid email format",
        );
      });

      it("should handle empty ZodError", () => {
        const zodError = new ZodError([]);
        const message = mapErrorToMessage(zodError);
        expect(message).toBe("Invalid request: ");
      });
    });

    describe("other error types", () => {
      it("should map regular Error", () => {
        const error = new Error("Some error");
        expect(mapErrorToMessage(error)).toBe(
          "An unexpected error occurred. Please try again.",
        );
      });

      it("should map string error", () => {
        expect(mapErrorToMessage("string error")).toBe(
          "An unknown error occurred.",
        );
      });

      it("should map null", () => {
        expect(mapErrorToMessage(null)).toBe("An unknown error occurred.");
      });

      it("should map undefined", () => {
        expect(mapErrorToMessage(undefined)).toBe("An unknown error occurred.");
      });

      it("should map number", () => {
        expect(mapErrorToMessage(123)).toBe("An unknown error occurred.");
      });

      it("should map object", () => {
        expect(mapErrorToMessage({ error: "message" })).toBe(
          "An unknown error occurred.",
        );
      });
    });
  });

  describe("createErrorResponse", () => {
    it("should create basic error response", () => {
      const response = createErrorResponse("VALIDATION_ERROR", "Invalid input");

      expect(response).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
        },
      });
    });

    it("should include details when provided", () => {
      const details = { field: "email", reason: "invalid format" };
      const response = createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid email",
        details,
      );

      expect(response).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email",
          details,
        },
      });
    });

    it("should exclude empty details object", () => {
      const response = createErrorResponse("INTERNAL", "Server error", {});

      expect(response).toEqual({
        error: {
          code: "INTERNAL",
          message: "Server error",
        },
      });
    });

    it("should handle all error codes", () => {
      const errorCodes: ErrorCode[] = [
        "VALIDATION_ERROR",
        "INVALID_CREDENTIALS",
        "UNAUTHENTICATED",
        "NO_CHANGES",
        "FORBIDDEN_FIELD",
        "EMAIL_TAKEN",
        "INTERNAL",
        "RATE_LIMITED",
      ];

      errorCodes.forEach((code) => {
        const response = createErrorResponse(code, "Test message");
        expect(response.error.code).toBe(code);
        expect(response.error.message).toBe("Test message");
      });
    });

    it("should handle complex details", () => {
      const complexDetails = {
        nested: { object: true },
        array: [1, 2, 3],
        string: "value",
        number: 42,
        boolean: true,
        null: null,
      };

      const response = createErrorResponse(
        "VALIDATION_ERROR",
        "Complex error",
        complexDetails,
      );
      expect(response.error.details).toEqual(complexDetails);
    });
  });

  describe("extractZodErrorDetails", () => {
    it("should extract simple field errors", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["email"],
          message: "Expected string, received number",
        },
        {
          code: "too_small",
          minimum: 8,
          type: "string",
          inclusive: true,
          path: ["password"],
          message: "String must contain at least 8 character(s)",
        },
      ]);

      const details = extractZodErrorDetails(zodError);
      expect(details).toEqual({
        email: "Expected string, received number",
        password: "String must contain at least 8 character(s)",
      });
    });

    it("should handle nested paths", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["user", "profile", "email"],
          message: "Expected string",
        },
        {
          code: "too_small",
          minimum: 1,
          type: "array",
          inclusive: true,
          path: ["items", 0, "name"],
          message: "Array must contain at least 1 element(s)",
        },
      ]);

      const details = extractZodErrorDetails(zodError);
      expect(details).toEqual({
        "user.profile.email": "Expected string",
        "items.0.name": "Array must contain at least 1 element(s)",
      });
    });

    it("should handle empty path", () => {
      const zodError = new ZodError([
        {
          code: "custom",
          path: [],
          message: "Root level error",
        },
      ]);

      const details = extractZodErrorDetails(zodError);
      expect(details).toEqual({
        "": "Root level error",
      });
    });

    it("should handle duplicate paths (last wins)", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["email"],
          message: "First error",
        },
        {
          code: "invalid_string",
          validation: "email",
          path: ["email"],
          message: "Second error",
        },
      ]);

      const details = extractZodErrorDetails(zodError);
      expect(details).toEqual({
        email: "Second error",
      });
    });

    it("should handle empty ZodError", () => {
      const zodError = new ZodError([]);
      const details = extractZodErrorDetails(zodError);
      expect(details).toEqual({});
    });

    it("should handle complex path types", () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["field", 0, "nested", "deep"],
          message: "Complex path error",
        },
      ]);

      const details = extractZodErrorDetails(zodError);
      expect(details).toEqual({
        "field.0.nested.deep": "Complex path error",
      });
    });
  });

  describe("errorToHttpResponse", () => {
    describe("AppError conversion", () => {
      it("should convert basic AppError", () => {
        const error: AppError = new Error("Validation failed") as AppError;
        error.status = 400;
        error.code = "VALIDATION_ERROR";

        const response = errorToHttpResponse(error);
        expect(response).toEqual({
          status: 400,
          body: {
            error: {
              code: "VALIDATION_ERROR",
              message:
                "Invalid request: please check your input and try again.",
            },
          },
        });
      });

      it("should include Retry-After header for rate limited errors", () => {
        const error: AppError = new Error("Rate limited") as AppError;
        error.status = 429;
        error.code = "RATE_LIMITED";
        error.retryAfter = 60;

        const response = errorToHttpResponse(error);
        expect(response).toEqual({
          status: 429,
          body: {
            error: {
              code: "RATE_LIMITED",
              message: "Too many login attempts. Please try again later.",
            },
          },
          headers: {
            "Retry-After": "60",
          },
        });
      });

      it("should handle AppError with details", () => {
        const error: AppError = new Error("Custom error") as AppError;
        error.status = 403;
        error.code = "FORBIDDEN_FIELD";
        error.details = { field: "adminOnly" };

        const response = errorToHttpResponse(error);
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe("FORBIDDEN_FIELD");
      });
    });

    describe("ZodError conversion", () => {
      it("should convert ZodError with details", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["email"],
            message: "Expected string, received number",
          },
        ]);

        const response = errorToHttpResponse(zodError);
        expect(response).toEqual({
          status: 400,
          body: {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request: Expected string, received number",
              details: {
                email: "Expected string, received number",
              },
            },
          },
        });
      });

      it("should handle ZodError with multiple issues", () => {
        const zodError = new ZodError([
          {
            code: "too_small",
            minimum: 8,
            type: "string",
            inclusive: true,
            path: ["password"],
            message: "Password too short",
          },
          {
            code: "invalid_string",
            validation: "email",
            path: ["email"],
            message: "Invalid email",
          },
        ]);

        const response = errorToHttpResponse(zodError);
        expect(response.status).toBe(400);
        expect(response.body.error.details).toEqual({
          password: "Password too short",
          email: "Invalid email",
        });
      });
    });

    describe("unknown error conversion", () => {
      it("should convert unknown error to 500", () => {
        const response = errorToHttpResponse("string error");
        expect(response).toEqual({
          status: 500,
          body: {
            error: {
              code: "INTERNAL",
              message: "An unexpected error occurred. Please try again.",
            },
          },
        });
      });

      it("should convert null to 500", () => {
        const response = errorToHttpResponse(null);
        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe("INTERNAL");
      });

      it("should convert undefined to 500", () => {
        const response = errorToHttpResponse(undefined);
        expect(response.status).toBe(500);
      });

      it("should convert regular Error to 500", () => {
        const error = new Error("Regular error");
        const response = errorToHttpResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.error.message).toBe(
          "An unexpected error occurred. Please try again.",
        );
      });
    });

    describe("integration tests", () => {
      it("should work end-to-end with AppError", () => {
        const appError: AppError = new Error("Test") as AppError;
        appError.status = 401;
        appError.code = "INVALID_CREDENTIALS";
        appError.retryAfter = 30;

        const response = errorToHttpResponse(appError);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
        expect(response.body.error.message).toBe(
          "Email or password is incorrect.",
        );
        expect(response.headers).toEqual({ "Retry-After": "30" });
      });

      it("should work end-to-end with ZodError", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "undefined",
            path: ["name"],
            message: "Name is required",
          },
        ]);

        const response = errorToHttpResponse(zodError);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
        expect(response.body.error.details).toEqual({
          name: "Name is required",
        });
        expect(response.headers).toBeUndefined();
      });
    });
  });

  describe("type safety", () => {
    it("should maintain type safety with ErrorResponse", () => {
      const response: ErrorResponse = createErrorResponse(
        "VALIDATION_ERROR",
        "Test message",
        { field: "value" },
      );

      expect(response.error.code).toBe("VALIDATION_ERROR");
      expect(response.error.message).toBe("Test message");
      expect(response.error.details).toEqual({ field: "value" });
    });

    it("should handle all ErrorCode values", () => {
      const codes: ErrorCode[] = [
        "VALIDATION_ERROR",
        "INVALID_CREDENTIALS",
        "UNAUTHENTICATED",
        "NO_CHANGES",
        "FORBIDDEN_FIELD",
        "EMAIL_TAKEN",
        "INTERNAL",
        "RATE_LIMITED",
      ];

      codes.forEach((code) => {
        const error: AppError = new Error("Test") as AppError;
        error.status = 400;
        error.code = code;

        expect(isAppError(error)).toBe(true);
        expect(mapErrorToMessage(error)).toBeDefined();
        expect(typeof mapErrorToMessage(error)).toBe("string");
      });
    });
  });
});
