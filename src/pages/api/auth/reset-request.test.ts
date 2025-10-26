import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import type { AstroCookies, APIContext } from "astro";
import { POST } from "./reset-request";

interface ResetRequestBody {
  email?: string | null;
}

// Mock createSupabaseServerInstance
const mockSupabaseAuth = {
  resetPasswordForEmail: vi.fn(),
};

const mockCreateSupabaseServerInstance = vi.fn(() => ({
  auth: mockSupabaseAuth,
}));

vi.mock("../../../db/supabase.client.ts", () => ({
  createSupabaseServerInstance: vi.fn(() => mockCreateSupabaseServerInstance()),
}));

// Mock logger
vi.mock("../../../lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock environment variables
vi.mock("import.meta.env", () => ({
  AUTH_RESET_REDIRECT_URL: "https://test.example.com/auth/reset/confirm",
}));

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { logger } from "../../../lib/utils/logger";

// Helper to create mock Request for testing
function createMockRequest(
  url = "https://test.example.com/api/auth/reset-request",
): Request {
  return {
    json: vi.fn(),
    headers: new Headers(),
    url,
  } as unknown as Request;
}

// Helper to create APIContext for testing
function createAPIContext(request: Request, cookies: AstroCookies): APIContext {
  return {
    request,
    cookies,
    url: new URL(request.url),
    site: undefined,
    generator: "Astro v5.0.0",
    params: {},
    props: {},
    redirect: vi.fn(),
    rewrite: vi.fn(),
    locals: {},
    clientAddress: "127.0.0.1",
    originPathname: "/",
    getActionResult: vi.fn(),
    callAction: vi.fn(),
    session: undefined,
    csp: {
      insertDirective: vi.fn(),
      insertStyleResource: vi.fn(),
      insertStyleHash: vi.fn(),
    },
    preferredLocale: undefined,
    preferredLocaleList: [],
    currentLocale: undefined,
    routePattern: "/api/auth/reset-request",
    isPrerendered: false,
  } as unknown as APIContext;
}

describe("Reset Request API Endpoint", () => {
  let mockRequest: Request;
  let mockCookies: AstroCookies;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCookies = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      merge: vi.fn(),
      headers: vi.fn(),
    } as unknown as AstroCookies;

    mockRequest = createMockRequest();

    // Cast to Mock type to access mock methods
    (
      mockRequest.json as Mock<() => Promise<ResetRequestBody>>
    ).mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful reset request", () => {
    it("should send reset email and return success", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        ok: true,
        message: "Jeśli konto istnieje, wyślemy instrukcję na e-mail.",
      });

      expect(response.headers.get("Content-Type")).toBe("application/json");

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(createSupabaseServerInstance).toHaveBeenCalledWith({
        cookies: mockCookies,
        headers: mockRequest.headers,
      });
      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: undefined,
        },
      );
    });

    it("should normalize email to lowercase", async () => {
      const requestBody = {
        email: "USER@EXAMPLE.COM",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: undefined,
        },
      );
    });

    it("should use default redirect URL when env let not set", async () => {
      // Mock environment without AUTH_RESET_REDIRECT_URL
      vi.mocked(import.meta.env).AUTH_RESET_REDIRECT_URL = undefined;

      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: undefined,
        },
      );
    });

    it("should use custom redirect URL from environment", async () => {
      vi.mocked(import.meta.env).AUTH_RESET_REDIRECT_URL =
        "https://custom.example.com/reset";

      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: "https://custom.example.com/reset",
        },
      );
    });

    it("should handle different request origins", async () => {
      vi.mocked(import.meta.env).AUTH_RESET_REDIRECT_URL = undefined;

      mockRequest = createMockRequest(
        "https://different.example.com/api/auth/reset-request",
      );

      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: undefined,
        },
      );
    });
  });

  describe("input validation errors", () => {
    it("should reject missing email", async () => {
      const requestBody = {};

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: "INVALID_INPUT",
        message: "Nieprawidłowe dane wejściowe.",
      });

      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should reject empty email", async () => {
      const requestBody = {
        email: "",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should reject invalid email format", async () => {
      const requestBody = {
        email: "invalid-email",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should reject email too long", async () => {
      const longEmail = "a".repeat(250) + "@example.com"; // Over 254 chars
      const requestBody = {
        email: longEmail,
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should handle invalid JSON in request", async () => {
      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error).toBe("UNKNOWN_ERROR");
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  describe("reset email errors", () => {
    it("should still return success even if email sending fails", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockRejectedValue(
        new Error("Email service down"),
      );

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        ok: true,
        message: "Jeśli konto istnieje, wyślemy instrukcję na e-mail.",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Reset password email failed:",
        "Email service down",
      );
    });

    it("should still return success for any reset password error", async () => {
      const errors = [
        { message: "User not found", status: 400 },
        { message: "Email service unavailable", status: 500 },
        { message: "Rate limit exceeded", status: 429 },
        { message: "Invalid email format", status: 400 },
      ];

      for (const error of errors) {
        (
          mockRequest.json as Mock<() => Promise<ResetRequestBody>>
        ).mockResolvedValue({
          email: "user@example.com",
        });

        mockSupabaseAuth.resetPasswordForEmail.mockRejectedValue(error);

        const response = await POST(createAPIContext(mockRequest, mockCookies));
        const responseBody = await response.json();

        expect(response.status).toBe(200);
        expect(responseBody.ok).toBe(true);
        expect(responseBody.message).toBe(
          "Jeśli konto istnieje, wyślemy instrukcję na e-mail.",
        );
      }
    });
  });

  describe("unexpected errors", () => {
    it("should handle Supabase instance creation failure", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockCreateSupabaseServerInstance.mockImplementation(() => {
        throw new Error("Supabase connection failed");
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error).toBe("UNKNOWN_ERROR");
      expect(responseBody.message).toBe(
        "Wystąpił błąd podczas żądania resetu hasła.",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Reset request error:",
        "Supabase connection failed",
      );
    });

    it("should handle network errors", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockImplementation(() => {
        throw new Error("Network timeout");
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200); // Still returns success for security

      expect(logger.error).toHaveBeenCalledWith(
        "Reset password email failed:",
        "Network timeout",
      );
    });

    it("should handle unexpected exceptions", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockImplementation(() => {
        throw "String error";
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200); // Still returns success
      expect(logger.error).toHaveBeenCalledWith(
        "Reset password email failed:",
        "Unknown error",
      );
    });
  });

  describe("response format", () => {
    it("should return correct content type", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return consistent success response format", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody).toHaveProperty("ok");
      expect(responseBody).toHaveProperty("message");
      expect(typeof responseBody.ok).toBe("boolean");
      expect(typeof responseBody.message).toBe("string");
    });

    it("should return correct error response format", async () => {
      const requestBody = {
        email: "",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody).toHaveProperty("error");
      expect(responseBody).toHaveProperty("message");
      expect(typeof responseBody.error).toBe("string");
      expect(typeof responseBody.message).toBe("string");
    });
  });

  describe("security considerations", () => {
    it("should always return success regardless of email existence", async () => {
      const emails = [
        "existing@example.com",
        "nonexistent@example.com",
        "invalid@example.com",
        "user@nonexistentdomain.com",
      ];

      for (const email of emails) {
        (
          mockRequest.json as Mock<() => Promise<ResetRequestBody>>
        ).mockResolvedValue({ email });
        mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

        const response = await POST(createAPIContext(mockRequest, mockCookies));
        const responseBody = await response.json();

        expect(response.status).toBe(200);
        expect(responseBody.ok).toBe(true);
        expect(responseBody.message).toBe(
          "Jeśli konto istnieje, wyślemy instrukcję na e-mail.",
        );
      }
    });

    it("should not reveal if email exists through error responses", async () => {
      // Even if Supabase throws an error, we return success
      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue({ email: "user@example.com" });
      mockSupabaseAuth.resetPasswordForEmail.mockRejectedValue({
        message: "User not found",
        status: 400,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.ok).toBe(true);
      // No information about whether the user exists
    });

    it("should trim and lowercase email for consistency", async () => {
      const requestBody = {
        email: "  USER@EXAMPLE.COM  ",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: undefined,
        },
      );
    });
  });

  describe("redirect URL handling", () => {
    it("should construct correct default redirect URL", async () => {
      vi.mocked(import.meta.env).AUTH_RESET_REDIRECT_URL = undefined;

      const testUrls = [
        "https://example.com/api/auth/reset-request",
        "https://subdomain.example.com/api/auth/reset-request",
        "http://localhost:3000/api/auth/reset-request",
      ];

      for (const url of testUrls) {
        mockRequest = createMockRequest(url);
        (
          mockRequest.json as Mock<() => Promise<ResetRequestBody>>
        ).mockResolvedValue({ email: "user@example.com" });
        mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

        await POST(createAPIContext(mockRequest, mockCookies));

        expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
          "user@example.com",
          {
            redirectTo: undefined,
          },
        );
      }
    });

    it("should handle URLs with ports", async () => {
      vi.mocked(import.meta.env).AUTH_RESET_REDIRECT_URL = undefined;

      mockRequest = createMockRequest(
        "https://example.com:8080/api/auth/reset-request",
      );
      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue({ email: "user@example.com" });
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: undefined,
        },
      );
    });

    it("should handle URLs with query parameters", async () => {
      vi.mocked(import.meta.env).AUTH_RESET_REDIRECT_URL = undefined;

      mockRequest = createMockRequest(
        "https://example.com/api/auth/reset-request?param=value",
      );
      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue({ email: "user@example.com" });
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        {
          redirectTo: undefined,
        },
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty request body", async () => {
      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue({});

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should handle null email", async () => {
      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue({ email: null });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should handle undefined email", async () => {
      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue({ email: undefined });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should handle email with special characters", async () => {
      const requestBody = {
        email: "user+tag@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user+tag@example.com",
        {
          redirectTo: undefined,
        },
      );
    });

    it("should handle maximum email length", async () => {
      const maxEmail = "a".repeat(242) + "@example.com"; // 254 chars total
      const requestBody = {
        email: maxEmail,
      };

      (
        mockRequest.json as Mock<() => Promise<ResetRequestBody>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue(undefined);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        maxEmail.toLowerCase(),
        {
          redirectTo: undefined,
        },
      );
    });
  });
});
