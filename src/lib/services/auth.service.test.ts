import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import { mockSignInWithPassword } from "../../test/setup";
import type { LoginCommand, LoginSession } from "./auth.service";

describe("Auth Service", () => {
  let loginWithPassword: (cmd: LoginCommand) => Promise<LoginSession>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getAuthClient: () => any;

  beforeAll(async () => {
    const authService = await import("./auth.service");
    loginWithPassword = authService.loginWithPassword;
    getAuthClient = authService.getAuthClient;
  });

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockSignInWithPassword.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loginWithPassword", () => {
    const validCommand: LoginCommand = {
      email: "user@example.com",
      password: "securepassword123",
      ip: "192.168.1.1",
      userAgent: "Test Browser",
    };

    describe("successful login", () => {
      it("should return session data for valid credentials", async () => {
        const mockSession = {
          access_token: "jwt-token-123",
          expires_in: 3600,
          user: { id: "user-uuid-123" },
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: mockSession },
          error: null,
        });

        const result = await loginWithPassword(validCommand);

        expect(result).toEqual({
          access_token: "jwt-token-123",
          expires_in: 3600,
          user_id: "user-uuid-123",
        });

        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "securepassword123",
        });
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });

      it("should handle session without expires_in", async () => {
        const mockSession = {
          access_token: "jwt-token-123",
          expires_in: null,
          user: { id: "user-uuid-123" },
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: mockSession },
          error: null,
        });

        const result = await loginWithPassword(validCommand);

        expect(result.expires_in).toBe(3600); // Default value
      });

      it("should handle session with zero expires_in", async () => {
        const mockSession = {
          access_token: "jwt-token-123",
          expires_in: 0,
          user: { id: "user-uuid-123" },
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: mockSession },
          error: null,
        });

        const result = await loginWithPassword(validCommand);

        expect(result.expires_in).toBe(0);
      });
    });

    describe("invalid credentials (401 errors)", () => {
      it("should throw INVALID_CREDENTIALS error for 400 status", async () => {
        const mockError = {
          status: 400,
          message: "Invalid login credentials",
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: null },
          error: mockError,
        });

        await expect(loginWithPassword(validCommand)).rejects.toThrow(
          "invalid_credentials",
        );

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(401);
        expect(error.code).toBe("INVALID_CREDENTIALS");
      });

      it("should throw INVALID_CREDENTIALS error for 401 status", async () => {
        const mockError = {
          status: 401,
          message: "Invalid email or password",
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: null },
          error: mockError,
        });

        await expect(loginWithPassword(validCommand)).rejects.toThrow(
          "invalid_credentials",
        );

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(401);
        expect(error.code).toBe("INVALID_CREDENTIALS");
      });

      it("should handle different 400/401 error messages", async () => {
        const errorMessages = [
          "Invalid login credentials",
          "Email not confirmed",
          "User not found",
          "Wrong password",
        ];

        for (const message of errorMessages) {
          mockSignInWithPassword.mockResolvedValue({
            data: { session: null },
            error: { status: 401, message },
          });

          const error = await loginWithPassword(validCommand).catch((e) => e);
          expect(error.status).toBe(401);
          expect(error.code).toBe("INVALID_CREDENTIALS");
        }
      });
    });

    describe("provider errors (500 errors)", () => {
      it("should throw INTERNAL error for non-400/401 auth errors", async () => {
        const mockError = {
          status: 500,
          message: "Internal server error",
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: null },
          error: mockError,
        });

        await expect(loginWithPassword(validCommand)).rejects.toThrow(
          "auth_provider_error",
        );

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
        expect(error.originalError).toBe(mockError);
      });

      it("should throw INTERNAL error for 403 status", async () => {
        const mockError = {
          status: 403,
          message: "Forbidden",
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: null },
          error: mockError,
        });

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
      });

      it("should throw INTERNAL error for network errors", async () => {
        const mockError = {
          status: null,
          message: "Network error",
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: null },
          error: mockError,
        });

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
      });
    });

    describe("no session returned", () => {
      it("should throw INTERNAL error when session is null", async () => {
        mockSignInWithPassword.mockResolvedValue({
          data: { session: null },
          error: null,
        });

        await expect(loginWithPassword(validCommand)).rejects.toThrow(
          "no_session_returned",
        );

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
      });

      it("should throw INTERNAL error when data.session is undefined", async () => {
        mockSignInWithPassword.mockResolvedValue({
          data: { session: undefined },
          error: null,
        });

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
      });

      it("should throw INTERNAL error when data is null", async () => {
        mockSignInWithPassword.mockResolvedValue({
          data: null,
          error: null,
        });

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
      });
    });

    describe("unexpected errors", () => {
      it("should wrap network errors", async () => {
        mockSignInWithPassword.mockRejectedValue(new Error("Network timeout"));

        await expect(loginWithPassword(validCommand)).rejects.toThrow(
          "unexpected_error",
        );

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
        expect(error.originalError).toBeInstanceOf(Error);
        expect(error.originalError.message).toBe("Network timeout");
      });

      it("should wrap non-Error exceptions", async () => {
        mockSignInWithPassword.mockRejectedValue("String error");

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.status).toBe(500);
        expect(error.code).toBe("INTERNAL");
        expect(error.originalError).toBe("String error");
      });

      it("should rethrow already wrapped errors", async () => {
        const wrappedError = new Error("custom error") as Error & {
          code: string;
          status: number;
        };
        wrappedError.code = "CUSTOM";
        wrappedError.status = 400;

        mockSignInWithPassword.mockRejectedValue(wrappedError);

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error).toBe(wrappedError);
        expect(error.code).toBe("CUSTOM");
        expect(error.status).toBe(400);
      });
    });

    describe("input validation", () => {
      it("should accept command without userAgent", async () => {
        const commandWithoutUA: LoginCommand = {
          email: "user@example.com",
          password: "password123",
          ip: "192.168.1.1",
        };

        mockSignInWithPassword.mockResolvedValue({
          data: {
            session: {
              access_token: "token",
              expires_in: 3600,
              user: { id: "user-id" },
            },
          },
          error: null,
        });

        const result = await loginWithPassword(commandWithoutUA);
        expect(result.access_token).toBe("token");
      });

      it("should handle various IP formats", async () => {
        const testIPs = ["192.168.1.1", "10.0.0.1", "::1", "2001:db8::1"];

        for (const ip of testIPs) {
          const command: LoginCommand = {
            email: "user@example.com",
            password: "password123",
            ip,
          };

          mockSignInWithPassword.mockResolvedValue({
            data: {
              session: {
                access_token: "token",
                expires_in: 3600,
                user: { id: "user-id" },
              },
            },
            error: null,
          });

          const result = await loginWithPassword(command);
          expect(result.access_token).toBe("token");
        }
      });
    });

    describe("error message preservation", () => {
      it("should preserve original error message for debugging", async () => {
        const mockError = {
          status: 500,
          message: "Database connection failed",
          details: "Connection timeout",
        };

        mockSignInWithPassword.mockResolvedValue({
          data: { session: null },
          error: mockError,
        });

        const error = await loginWithPassword(validCommand).catch((e) => e);
        expect(error.originalError).toBe(mockError);
      });
    });
  });

  describe("getAuthClient", () => {
    it("should return the Supabase client", () => {
      const client = getAuthClient();
      expect(client).toHaveProperty("auth");
      expect(client.auth).toHaveProperty("signInWithPassword");
    });

    it("should always return the same client instance", () => {
      const client1 = getAuthClient();
      const client2 = getAuthClient();
      expect(client1).toBe(client2);
    });
  });

  describe("environment configuration", () => {
    it("should create client with correct configuration", () => {
      // Since client is created at module level, we can't test the call parameters
      // But we can verify that getAuthClient returns a properly configured client
      const client = getAuthClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    // Environment validation happens at module import time, so we can't test
    // missing environment variables in this test setup since the module is already loaded
    it.skip("should throw error if SUPABASE_URL is missing", async () => {
      // This test would require a separate test file or setup
    });

    it.skip("should throw error if SUPABASE_SERVICE_KEY is missing", async () => {
      // This test would require a separate test file or setup
    });
  });

  describe("type safety", () => {
    const testCommand: LoginCommand = {
      email: "test@example.com",
      password: "password123",
      ip: "127.0.0.1",
      userAgent: "Test",
    };

    it("should return properly typed LoginSession", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: "token",
            expires_in: 3600,
            user: { id: "user-id" },
          },
        },
        error: null,
      });

      const result: LoginSession = await loginWithPassword(testCommand);
      expect(typeof result.access_token).toBe("string");
      expect(typeof result.expires_in).toBe("number");
      expect(typeof result.user_id).toBe("string");
    });

    it("should accept properly typed LoginCommand", async () => {
      const command: LoginCommand = {
        email: "test@example.com",
        password: "password",
        ip: "127.0.0.1",
        userAgent: "Test",
      };

      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: "token",
            expires_in: 3600,
            user: { id: "user-id" },
          },
        },
        error: null,
      });

      const result = await loginWithPassword(command);
      expect(result).toBeDefined();
    });
  });
});
