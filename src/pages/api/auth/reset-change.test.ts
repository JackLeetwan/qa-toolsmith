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
import { POST } from "./reset-change";

// Type for mock request body that allows null values for edge case testing
interface MockResetChangeRequest {
  access_token: string | null | undefined;
  new_password: string | null | undefined;
}

// Mock createSupabaseServerInstance
const mockSupabaseAuth = {
  updateUser: vi.fn(),
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

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { logger } from "../../../lib/utils/logger";

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
    routePattern: "/api/auth/reset-change",
    isPrerendered: false,
  } as unknown as APIContext;
}

describe("Reset Change API Endpoint", () => {
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
      url: "http://localhost:4321/api/auth/reset-change",
      headers: new Headers(),
    } as unknown as Request;

    // Cast to Mock type to access mock methods
    (
      mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
    ).mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful password change", () => {
    it("should update password successfully", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        ok: true,
        message: "Hasło zaktualizowane.",
      });

      expect(response.headers.get("Content-Type")).toBe("application/json");

      expect(mockRequest.json).toHaveBeenCalledTimes(1);
      expect(createSupabaseServerInstance).toHaveBeenCalledWith({
        cookies: mockCookies,
        headers: mockRequest.headers,
      });
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        password: "NewSecurePass123",
      });
    });

    it("should accept password with special characters", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewPass123!@#",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        password: "NewPass123!@#",
      });
    });

    it("should accept minimum password length", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "Pass1234", // 8 characters
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
    });

    it("should accept maximum password length", async () => {
      const maxPassword = "a".repeat(71) + "1"; // 72 characters with letter and number
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: maxPassword,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        password: maxPassword,
      });
    });
  });

  describe("input validation errors", () => {
    it("should reject missing access_token", async () => {
      const requestBody = {
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: "INVALID_INPUT",
        message: "Nieprawidłowe dane wejściowe.",
      });

      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should reject missing new_password", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should reject empty access_token", async () => {
      const requestBody = {
        access_token: "",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should reject empty new_password", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should reject password too short", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "1234567", // 7 characters
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should reject password without letters", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "12345678", // Only numbers
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should reject password without numbers", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "password", // Only letters
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should reject password too long", async () => {
      const longPassword = "a".repeat(73); // 73 characters
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: longPassword,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should handle invalid JSON in request", async () => {
      (mockRequest.json as Mock<() => Promise<never>>).mockRejectedValue(
        new Error("Invalid JSON"),
      );

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error).toBe("UNKNOWN_ERROR");
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("password update errors", () => {
    it("should return generic error for invalid token", async () => {
      const requestBody = {
        access_token: "invalid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: null },
        error: {
          message: "Invalid access token",
          status: 401,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: "INVALID_CREDENTIALS",
        message: "Nie udało się ustawić nowego hasła.",
      });
    });

    it("should return generic error for expired token", async () => {
      const requestBody = {
        access_token: "expired-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: null },
        error: {
          message: "Token has expired",
          status: 401,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should return generic error for weak password", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: null },
        error: {
          message: "Password is too weak",
          status: 400,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.error).toBe("INVALID_CREDENTIALS");
    });

    it("should return generic error for any update error", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: null },
        error: {
          message: "Some other update error",
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
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockCreateSupabaseServerInstance.mockImplementation(() => {
        throw new Error("Supabase connection failed");
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error).toBe("UNKNOWN_ERROR");
      expect(responseBody.message).toBe("Wystąpił błąd podczas zmiany hasła.");

      expect(logger.error).toHaveBeenCalledWith(
        "Reset change error:",
        expect.any(Error),
      );
    });

    it("should handle network errors during password update", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockRejectedValue(
        new Error("Network timeout"),
      );

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        "Reset change error:",
        expect.any(Error),
      );
    });

    it("should handle unexpected exceptions", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockImplementation(() => {
        throw "String error";
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        "Reset change error:",
        "String error",
      );
    });
  });

  describe("response format", () => {
    it("should return correct content type", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return correct success response format", async () => {
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody).toHaveProperty("ok");
      expect(responseBody).toHaveProperty("message");
      expect(typeof responseBody.ok).toBe("boolean");
      expect(typeof responseBody.message).toBe("string");
    });

    it("should return correct error response format", async () => {
      const requestBody = {
        access_token: "",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
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
    it("should not leak sensitive information in error messages", async () => {
      const updateErrors = [
        { message: "Invalid access token", status: 401 },
        { message: "Token expired", status: 401 },
        { message: "Password too weak", status: 400 },
        { message: "User not found", status: 404 },
        { message: "Rate limit exceeded", status: 429 },
      ];

      for (const updateError of updateErrors) {
        (
          mockRequest.json as Mock<
            () => Promise<Partial<MockResetChangeRequest>>
          >
        ).mockResolvedValue({
          access_token: "some-token",
          new_password: "NewSecurePass123",
        });

        mockSupabaseAuth.updateUser.mockResolvedValue({
          data: { user: null },
          error: updateError,
        });

        const response = await POST(createAPIContext(mockRequest, mockCookies));
        const responseBody = await response.json();

        // All password update errors should return the same message
        expect(responseBody.error).toBe("INVALID_CREDENTIALS");
        expect(responseBody.message).toBe(
          "Nie udało się ustawić nowego hasła.",
        );
        expect(response.status).toBe(400);
      }
    });

    it("should require access token for password changes", async () => {
      // Test that password changes require valid authentication
      const requestBody = {
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("password validation", () => {
    it("should accept complex passwords", async () => {
      const complexPasswords = [
        "Password123!",
        "MySecurePass42",
        "Test123456",
        "Abc123Def",
      ];

      for (const password of complexPasswords) {
        (
          mockRequest.json as Mock<
            () => Promise<Partial<MockResetChangeRequest>>
          >
        ).mockResolvedValue({
          access_token: "valid-token",
          new_password: password,
        });

        mockSupabaseAuth.updateUser.mockResolvedValue({
          data: { user: { id: "user-id" } },
          error: null,
        });

        const response = await POST(createAPIContext(mockRequest, mockCookies));

        expect(response.status).toBe(200);
        expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
          password,
        });
      }
    });

    it("should handle unicode characters in passwords", async () => {
      const unicodePassword = "Pássword123🚀";
      const requestBody = {
        access_token: "valid-jwt-token",
        new_password: unicodePassword,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        password: unicodePassword,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty request body", async () => {
      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue({});

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should handle null values in request", async () => {
      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue({
        access_token: null,
        new_password: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should handle undefined values in request", async () => {
      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue({
        access_token: undefined,
        new_password: undefined,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.updateUser).not.toHaveBeenCalled();
    });

    it("should handle very long access tokens", async () => {
      const longToken = "a".repeat(1000); // Very long JWT
      const requestBody = {
        access_token: longToken,
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        password: "NewSecurePass123",
      });
    });

    it("should handle password exactly at limits", async () => {
      // Test password exactly 8 characters
      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue({
        access_token: "token",
        new_password: "Pass1234", // Exactly 8 chars
      });
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      let response = await POST(createAPIContext(mockRequest, mockCookies));
      expect(response.status).toBe(200);

      // Test password exactly 72 characters
      const maxPassword = "a".repeat(71) + "1"; // 72 chars with letter and number
      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue({
        access_token: "token",
        new_password: maxPassword,
      });

      response = await POST(createAPIContext(mockRequest, mockCookies));
      expect(response.status).toBe(200);
    });
  });

  describe("access token handling", () => {
    it("should pass access token to Supabase (though not directly used in updateUser)", async () => {
      // Note: In Supabase, the access token should be set via cookies/headers
      // The updateUser call doesn't directly use the token parameter
      const requestBody = {
        access_token: "jwt-token-123",
        new_password: "NewSecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<MockResetChangeRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      // The access_token from the request body is not directly passed to updateUser
      // It's assumed to be handled by the Supabase client configuration
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        password: "NewSecurePass123",
      });
    });

    it("should handle various token formats", async () => {
      const tokens = [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        "simple-token-123",
        "token_with_underscores",
        "token.with.dots",
      ];

      for (const token of tokens) {
        (
          mockRequest.json as Mock<
            () => Promise<Partial<MockResetChangeRequest>>
          >
        ).mockResolvedValue({
          access_token: token,
          new_password: "NewSecurePass123",
        });

        mockSupabaseAuth.updateUser.mockResolvedValue({
          data: { user: { id: "user-id" } },
          error: null,
        });

        const response = await POST(createAPIContext(mockRequest, mockCookies));

        expect(response.status).toBe(200);
      }
    });
  });
});
