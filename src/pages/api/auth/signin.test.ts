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
import type { LoginRequest } from "../../../types/types";
import { POST } from "./signin";

// Mock createSupabaseServerInstance
const mockSupabaseAuth = {
  signInWithPassword: vi.fn(),
};

const mockCreateSupabaseServerInstance = vi.fn(() => ({
  auth: mockSupabaseAuth,
}));

vi.mock("../../../db/supabase.client", () => ({
  createSupabaseServerInstance: vi.fn(() => mockCreateSupabaseServerInstance()),
}));

vi.mock("../../../lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { logger } from "../../../lib/utils/logger";

// Type the mocked logger
const mockLogger = vi.mocked(logger);

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
    routePattern: "/api/auth/signin",
    isPrerendered: false,
  } as unknown as APIContext;
}

describe("Signin API Endpoint", () => {
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

    mockRequest = {
      json: vi.fn(),
      url: "http://localhost:4321/api/auth/signin",
      headers: new Headers(),
    } as unknown as Request;

    // Cast to Mock type to access mock methods
    (
      mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
    ).mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful signin", () => {
    it("should sign in user successfully", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "securepassword123",
      };

      const mockUser = {
        id: "user-uuid-123",
        email: "user@example.com",
      };

      const mockSession = {
        access_token: "jwt-token",
        expires_in: 3600,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        user: {
          id: "user-uuid-123",
          email: "user@example.com",
        },
      });

      expect(response.headers.get("Content-Type")).toBe("application/json");

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(createSupabaseServerInstance).toHaveBeenCalledWith({
        cookies: mockCookies,
        headers: mockRequest.headers,
      });
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "securepassword123",
      });
    });

    it("should normalize email to lowercase", async () => {
      const requestBody = {
        email: "USER@EXAMPLE.COM",
        password: "password123",
      };

      const mockUser = {
        id: "user-uuid-123",
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });

    it("should handle user without email in response", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-uuid-123",
        email: null,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody.user.email).toBe("");
    });

    it("should handle user without id in response", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      const mockUser = {
        id: null,
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody.user.id).toBe("");
    });
  });

  describe("input validation errors", () => {
    it("should reject missing email", async () => {
      const requestBody = {
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: "INVALID_INPUT",
        message: "Nieprawidłowe dane wejściowe.",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "❌ Input validation error:",
        expect.any(Array),
      );
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should reject missing password", async () => {
      const requestBody = {
        email: "user@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should reject empty email", async () => {
      const requestBody = {
        email: "",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should reject empty password", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should reject invalid email format", async () => {
      const requestBody = {
        email: "invalid-email",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should reject email too long", async () => {
      const longEmail = "a".repeat(250) + "@example.com"; // Over 254 chars
      const requestBody = {
        email: longEmail,
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should reject password too long", async () => {
      const longPassword = "a".repeat(73); // Over 72 chars
      const requestBody = {
        email: "user@example.com",
        password: longPassword,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should handle invalid JSON in request", async () => {
      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error).toBe("UNKNOWN_ERROR");
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe("authentication errors", () => {
    it("should return generic error for invalid credentials", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "wrongpassword",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "Invalid login credentials",
          status: 400,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: "INVALID_CREDENTIALS",
        message: "Nieprawidłowe dane logowania.",
      });

      expect(logger.error).toHaveBeenCalledWith("❌ Supabase auth error:", {
        message: "Invalid login credentials",
        status: 400,
        timestamp: expect.any(String),
      });
    });

    it("should return generic error for email not confirmed", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "Email not confirmed",
          status: 400,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should return generic error for user not found", async () => {
      const requestBody = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "User not found",
          status: 400,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      // Always return the same error message for security
      const responseBody = await response.json();
      expect(responseBody.error).toBe("INVALID_CREDENTIALS");
    });

    it("should return generic error for any auth error", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: "Some other auth error",
          status: 500,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.error).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("unexpected errors", () => {
    it("should handle Supabase instance creation failure", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockCreateSupabaseServerInstance.mockImplementation(() => {
        throw new Error("Supabase connection failed");
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error).toBe("UNKNOWN_ERROR");
      expect(responseBody.message).toBe("Wystąpił błąd podczas logowania.");

      expect(logger.error).toHaveBeenCalledWith(
        "❌ Unexpected signin error:",
        expect.any(Error),
        {
          timestamp: expect.any(String),
          duration: expect.any(String),
        },
      );
    });

    it("should handle network errors during auth", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(
        new Error("Network timeout"),
      );

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle unexpected exceptions", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockImplementation(() => {
        throw "String error";
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("logging", () => {
    it("should log API call start", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.debug).toHaveBeenCalledWith(
        "🔐 Signin API called at:",
        expect.any(String),
      );
    });

    it("should log request body reception", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.debug).toHaveBeenCalledWith("📥 Request body received:", {
        email: "user@example.com",
        hasPassword: true,
      });
    });

    it("should log successful validation", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.debug).toHaveBeenCalledWith(
        "✅ Input validation passed for email:",
        "user@example.com",
      );
    });

    it("should log Supabase instance creation", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.debug).toHaveBeenCalledWith("🔧 Supabase instance created");
    });

    it("should log auth attempt", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.debug).toHaveBeenCalledWith(
        "🔑 Attempting signInWithPassword...",
      );
    });

    it("should log successful signin", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "user-id", email: "user@example.com" },
          session: { access_token: "token" },
        },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.debug).toHaveBeenCalledWith("✅ Signin successful:", {
        userId: "user-id",
        email: "user@example.com",
        sessionExists: true,
        duration: expect.any(String),
      });
    });

    it("should log auth errors", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Auth error", status: 400 },
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.error).toHaveBeenCalledWith("❌ Supabase auth error:", {
        message: "Auth error",
        status: 400,
        timestamp: expect.any(String),
      });
    });

    it("should log validation errors", async () => {
      const requestBody = {
        email: "",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(logger.error).toHaveBeenCalledWith(
        "❌ Input validation error:",
        expect.any(Array),
      );
    });
  });

  describe("response format", () => {
    it("should return correct content type", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "user-id", email: "user@example.com" },
          session: { access_token: "token" },
        },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return correct error response format", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "wrongpassword",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid credentials", status: 400 },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody).toHaveProperty("error");
      expect(responseBody).toHaveProperty("message");
      expect(typeof responseBody.error).toBe("string");
      expect(typeof responseBody.message).toBe("string");
    });
  });

  describe("security considerations", () => {
    it("should not leak sensitive information in error messages", async () => {
      // Test various auth errors to ensure they all return the same generic message
      const authErrors = [
        { message: "Invalid login credentials", status: 400 },
        { message: "Email not confirmed", status: 400 },
        { message: "User not found", status: 400 },
        { message: "Account disabled", status: 400 },
        { message: "Too many attempts", status: 429 },
      ];

      for (const authError of authErrors) {
        (
          mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
        ).mockResolvedValue({
          email: "user@example.com",
          password: "password123",
        });

        mockSupabaseAuth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: authError,
        });

        const response = await POST(createAPIContext(mockRequest, mockCookies));
        const responseBody = await response.json();

        // All auth errors should return the same message
        expect(responseBody.error).toBe("INVALID_CREDENTIALS");
        expect(responseBody.message).toBe("Nieprawidłowe dane logowania.");
        expect(response.status).toBe(400);
      }
    });

    it("should trim and lowercase email for consistency", async () => {
      const requestBody = {
        email: "  USER@EXAMPLE.COM  ",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  describe("performance monitoring", () => {
    it("should include duration in success logs", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      const debugCalls = mockLogger.debug.mock.calls;
      const successCall = debugCalls.find(
        (call) => call[0] === "✅ Signin successful:",
      );

      expect(successCall).toBeTruthy();
      expect((successCall?.[1] as { duration: string })?.duration).toMatch(
        /^\d+ms$/,
      );
    });

    it("should include duration in error logs", async () => {
      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockRejectedValue(new Error("Invalid JSON"));

      await POST(createAPIContext(mockRequest, mockCookies));

      const errorCalls = mockLogger.error.mock.calls;
      const errorCall = errorCalls.find(
        (call) => call[0] === "❌ Unexpected signin error:",
      );

      expect(errorCall).toBeTruthy();
      expect((errorCall?.[2] as { duration: string })?.duration).toMatch(
        /^\d+ms$/,
      );
    });
  });
});
