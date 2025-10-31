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
import { POST } from "./signup";

// Mock createSupabaseServerInstance
const mockSupabaseAuth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
};

const mockCreateSupabaseServerInstance = vi.fn(() => ({
  auth: mockSupabaseAuth,
}));

vi.mock("../../../db/supabase.client", () => ({
  createSupabaseServerInstance: vi.fn(() => mockCreateSupabaseServerInstance()),
}));

// Mock astro:env/server with a variable we can control
let mockAUTH_SIGNUP_REDIRECT_URL: string | undefined = undefined;
vi.mock("astro:env/server", () => ({
  get AUTH_SIGNUP_REDIRECT_URL() {
    return mockAUTH_SIGNUP_REDIRECT_URL;
  },
  AUTH_RESET_REDIRECT_URL: undefined,
}));

vi.mock("../../../lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../lib/services/rate-limiter.service", () => ({
  consume: vi.fn(),
}));

vi.mock("../../../lib/helpers/request.helper", () => ({
  getTrustedIp: vi.fn(() => "127.0.0.1"),
}));

import { logger } from "../../../lib/utils/logger";
import { consume as consumeRateLimit } from "../../../lib/services/rate-limiter.service";
// import { getTrustedIp } from "../../../lib/helpers/request.helper";

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
    routePattern: "/api/auth/signup",
    isPrerendered: false,
  } as unknown as APIContext;
}

describe("Signup API Endpoint", () => {
  let mockRequest: Request;
  let mockCookies: AstroCookies;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAUTH_SIGNUP_REDIRECT_URL = undefined;

    // Mock rate limiter to always succeed by default
    vi.mocked(consumeRateLimit).mockResolvedValue();

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
      url: "http://localhost:4321/api/auth/signup",
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

  describe("successful signup", () => {
    it("should create account successfully", async () => {
      const requestBody = {
        email: "NEWUSER@EXAMPLE.COM",
        password: "SecurePass123",
      };

      const mockUser = {
        id: "new-user-uuid-123",
        email: "newuser@example.com",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      // Mock successful signup
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock successful signin
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: "token" },
        },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        user: {
          id: "new-user-uuid-123",
          email: "newuser@example.com",
        },
        emailConfirmationRequired: false,
        message: "Konto utworzone i zalogowano pomyślnie.",
      });

      expect(response.headers.get("Content-Type")).toBe("application/json");

      // Verify signup was called with processed email and no redirect URL (undefined by default)
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "SecurePass123",
        options: undefined,
      });

      // Verify auto-login was attempted
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "SecurePass123",
      });
    });

    it("should use redirect URL when AUTH_SIGNUP_REDIRECT_URL is set", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      mockAUTH_SIGNUP_REDIRECT_URL = "https://qa-toolsmith.pages.dev";

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const mockUser = {
        id: "new-user-uuid-123",
        email: "user@example.com",
      };

      // Mock successful signup
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock successful auto-login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: "jwt-token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);

      // Verify signup was called with redirect URL
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "SecurePass123",
        options: { emailRedirectTo: "https://qa-toolsmith.pages.dev" },
      });
    });

    it("should normalize email to lowercase", async () => {
      const requestBody = {
        email: "NEWUSER@EXAMPLE.COM",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "SecurePass123",
        options: undefined,
      });

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "SecurePass123",
      });
    });

    it("should handle user data in signup response", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "signup-user-id", email: "user@example.com" } },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "signin-user-id", email: "user@example.com" },
          session: { access_token: "token" },
        },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      // Should return data from signInWithPassword, not signUp
      expect(responseBody.user.id).toBe("signin-user-id");
    });
  });

  describe("input validation errors", () => {
    it("should reject missing email", async () => {
      const requestBody = {
        password: "SecurePass123",
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

      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
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
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should reject invalid email format", async () => {
      const requestBody = {
        email: "invalid-email",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should reject password too short", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "1234567", // 7 characters
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should reject password without letters", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "12345678", // Only numbers
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should reject password without numbers", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "password", // Only letters
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should reject password too long", async () => {
      const longPassword = "a".repeat(73); // 73 characters
      const requestBody = {
        email: "user@example.com",
        password: longPassword,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should reject email too long", async () => {
      const longEmail = "a".repeat(250) + "@example.com"; // Over 254 chars
      const requestBody = {
        email: longEmail,
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should handle invalid JSON in request", async () => {
      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error).toBe("UNKNOWN_ERROR");
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });
  });

  describe("signup errors", () => {
    it("should return generic error for email already exists", async () => {
      const requestBody = {
        email: "existing@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: {
          message: "User already registered",
          status: 400,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: "INVALID_CREDENTIALS",
        message: "Nie udało się utworzyć konta. Sprawdź dane.",
      });

      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should return generic error for invalid password", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "weak",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      // Note: This should be caught by client-side validation, but testing server-side
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: {
          message: "Password should be at least 6 characters",
          status: 400,
        },
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should return generic error for any signup error", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: {
          message: "Some other signup error",
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
        password: "SecurePass123",
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
      expect(responseBody.message).toBe("Wystąpił błąd podczas rejestracji.");

      expect(logger.error).toHaveBeenCalledWith(
        "Signup error:",
        "Supabase connection failed",
      );
    });

    it("should handle network errors during signup", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockRejectedValue(new Error("Network timeout"));

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle unexpected exceptions", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockImplementation(() => {
        throw "String error";
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("password validation", () => {
    it("should accept valid password with letters and numbers", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "Password123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password123",
        options: undefined,
      });
    });

    it("should accept password with special characters", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "Pass123!@#",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Pass123!@#",
        options: undefined,
      });
    });

    it("should accept minimum password length", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "Pass1234", // 8 characters
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
    });

    it("should accept maximum password length", async () => {
      const maxPassword = "a".repeat(71) + "1"; // 72 characters with at least one letter and one number
      const requestBody = {
        email: "user@example.com",
        password: maxPassword,
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(200);
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: maxPassword,
        options: undefined,
      });
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: maxPassword,
      });
    });
  });

  describe("response format", () => {
    it("should return correct content type", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });
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
        password: "weak",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
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
      const signupErrors = [
        { message: "User already registered", status: 400 },
        { message: "Email already exists", status: 400 },
        { message: "Weak password", status: 400 },
        { message: "Invalid email", status: 400 },
      ];

      for (const signupError of signupErrors) {
        (
          mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
        ).mockResolvedValue({
          email: "user@example.com",
          password: "SecurePass123",
        });

        mockSupabaseAuth.signUp.mockResolvedValue({
          data: { user: null },
          error: signupError,
        });

        const response = await POST(createAPIContext(mockRequest, mockCookies));
        const responseBody = await response.json();

        // All signup errors should return the same message
        expect(responseBody.error).toBe("INVALID_CREDENTIALS");
        expect(responseBody.message).toBe(
          "Nie udało się utworzyć konta. Sprawdź dane.",
        );
        expect(response.status).toBe(400);
      }
    });

    it("should trim and lowercase email for consistency", async () => {
      const requestBody = {
        email: "  USER@EXAMPLE.COM  ",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      await POST(createAPIContext(mockRequest, mockCookies));

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "SecurePass123",
        options: undefined,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty request body", async () => {
      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue({});

      const response = await POST(createAPIContext(mockRequest, mockCookies));

      expect(response.status).toBe(400);
      expect(mockSupabaseAuth.signUp).not.toHaveBeenCalled();
    });

    it("should handle null user data in signup response", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-id" }, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody.user.id).toBe("user-id");
    });

    it("should handle null user data in signin response", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody.user.id).toBe("");
      expect(responseBody.user.email).toBe("");
    });

    it("should handle undefined user properties", async () => {
      const requestBody = {
        email: "user@example.com",
        password: "SecurePass123",
      };

      (
        mockRequest.json as Mock<() => Promise<Partial<LoginRequest>>>
      ).mockResolvedValue(requestBody);
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: {} },
        error: null,
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: {}, session: { access_token: "token" } },
        error: null,
      });

      const response = await POST(createAPIContext(mockRequest, mockCookies));
      const responseBody = await response.json();

      expect(responseBody.user.id).toBe("");
      expect(responseBody.user.email).toBe("");
    });
  });
});
