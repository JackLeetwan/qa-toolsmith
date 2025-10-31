import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AstroCookies, APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

// Mock environment variables before importing anything
vi.mock("import.meta", () => ({
  env: {
    DEV: true,
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_KEY: "test-key",
  },
}));

// Mock the logger BEFORE importing middleware
vi.mock("../lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock createSupabaseServerInstance
const mockSupabaseAuth = {
  getUser: vi.fn(),
};

const mockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: vi.fn(),
} as unknown as SupabaseClient<Database>;

vi.mock("../db/supabase.client", () => {
  const mockCreateSupabaseServerInstance = vi.fn(() => mockSupabaseClient);
  return {
    createSupabaseServerInstance: mockCreateSupabaseServerInstance,
  };
});

// Import the middleware handler AFTER ALL mocks are set up
import { middlewareHandler } from "./middleware-handler";
import { createSupabaseServerInstance } from "../db/supabase.client";
import { logger } from "../lib/utils/logger";

// Console methods are not mocked globally since logger is properly mocked

// Get the mocked logger
const mockLogger = vi.mocked(logger);

// Type the mocked createSupabaseServerInstance (defined inside vi.mock factory)
const mockCreateSupabaseServerInstanceMock = vi.mocked(
  createSupabaseServerInstance,
);

// Type the mocked supabase client
const mockSupabaseClientMock = vi.mocked(mockSupabaseClient);

// Helper to create APIContext for testing
function createAPIContext(
  locals: App.Locals,
  cookies: AstroCookies,
  url: URL,
  request: Request,
  redirect?: ReturnType<typeof vi.fn>,
): APIContext {
  return {
    locals,
    cookies,
    url,
    request,
    site: undefined,
    generator: "Astro v5.0.0",
    params: {},
    props: {},
    redirect: redirect || vi.fn(),
    rewrite: vi.fn(),
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
    routePattern: url.pathname,
    isPrerendered: false,
  } as unknown as APIContext;
}

// Test-specific type for locals that allows dynamic property access
type TestLocals = App.Locals & Record<string, unknown>;

describe("Middleware", () => {
  let mockLocals: TestLocals;
  let mockCookies: AstroCookies;
  let mockUrl: URL;
  let mockRequest: Request;
  let mockRedirect: ReturnType<typeof vi.fn>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLocals = {
      supabase: mockSupabaseClient,
    };
    mockCookies = {
      get: vi.fn(),
      has: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      merge: vi.fn(),
      headers: vi.fn(),
    } as unknown as AstroCookies;
    mockUrl = new URL("https://example.com/test");
    mockRequest = {
      method: "GET",
      headers: new Headers(),
    } as Request;
    mockRedirect = vi.fn((url: string) => {
      console.log("mockRedirect called with:", url);
      return new Response(null, { status: 302, headers: { Location: url } });
    });
    mockNext = vi.fn(() => {
      console.log("mockNext called!");
      return { status: 200 };
    });

    // The mocked client is returned by createSupabaseServerInstance
    // We can access it through the mock
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("public paths", () => {
    const publicPaths = [
      "/",
      "/auth/login",
      "/auth/register",
      "/auth/reset",
      "/auth/reset/confirm",
      "/logout",
      "/api/auth/signin",
      "/api/auth/signup",
      "/api/auth/signout",
      "/api/auth/reset-request",
      "/api/auth/reset-change",
      "/api/health",
      "/generators",
      "/generators/iban",
    ];

    it.each(publicPaths)(
      "should allow access to public path: %s",
      async (path) => {
        mockUrl.pathname = path;
        mockSupabaseAuth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const context = createAPIContext(
          mockLocals,
          mockCookies,
          mockUrl,
          mockRequest,
        );

        await middlewareHandler(context, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
        // Check that the expected log exists
        expect(mockLogger.info).toHaveBeenCalledWith(
          "✅ Public path, allowing access:",
          path,
        );
      },
    );

    it("should allow access to public API generator paths", async () => {
      mockUrl.pathname = "/api/generators/iban";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ Public path, allowing access:",
        "/api/generators/iban",
      );
    });

    it("should allow access to public API validator paths", async () => {
      mockUrl.pathname = "/api/validators/iban";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ Public path, allowing access:",
        "/api/validators/iban",
      );
    });
  });

  describe("protected paths", () => {
    const protectedPaths = ["/templates", "/charters", "/admin"];

    it.each(protectedPaths)(
      "should redirect to login for protected path without auth: %s",
      async (path) => {
        mockUrl.pathname = path;
        mockSupabaseAuth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const context = createAPIContext(
          mockLocals,
          mockCookies,
          mockUrl,
          mockRequest,
          mockRedirect,
        );

        await middlewareHandler(context, mockNext);

        expect(mockRedirect).toHaveBeenCalledWith(
          `/auth/login?next=${encodeURIComponent(path)}`,
        );
        expect(mockNext).not.toHaveBeenCalled();
        // Check that the expected log exists
        expect(mockLogger.info).toHaveBeenCalledWith(
          "🔒 Protected path requires auth, redirecting to login:",
          path,
        );
      },
    );

    it("should allow access to protected path with authenticated user", async () => {
      mockUrl.pathname = "/templates";
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile fetch
      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "user" },
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockLocals.user).toEqual({
        id: "user-123",
        email: "user@example.com",
        role: "user",
      });
    });

    it("should handle protected paths with subpaths", async () => {
      mockUrl.pathname = "/templates/articles/123";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
        mockRedirect,
      );

      await middlewareHandler(context, mockNext);

      expect(mockRedirect).toHaveBeenCalledWith(
        `/auth/login?next=${encodeURIComponent("/templates/articles/123")}`,
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("kb public access", () => {
    it("should allow access to /kb without authentication", async () => {
      mockUrl.pathname = "/kb";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockLocals.user).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ Public path, allowing access:",
        "/kb",
      );
    });

    it("should allow access to /kb subpaths without authentication", async () => {
      mockUrl.pathname = "/kb/articles/123";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ Public path, allowing access:",
        "/kb/articles/123",
      );
    });

    it("should set user context for authenticated user on /kb", async () => {
      mockUrl.pathname = "/kb";
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile fetch
      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "user" },
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockLocals.user).toEqual({
        id: "user-123",
        email: "user@example.com",
        role: "user",
      });
    });
  });

  describe("user authentication", () => {
    it("should populate locals with authenticated user", async () => {
      mockUrl.pathname = "/dashboard";
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile fetch
      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toEqual({
        id: "user-123",
        email: "user@example.com",
        role: "admin",
      });
      expect(mockLocals.supabase).toBe(mockSupabaseClient);
      // Check that user context was set with correct info
      expect(mockLogger.info).toHaveBeenCalledWith("✅ User context set:", {
        id: "user-123...",
        email: "user@...",
        role: "admin",
        pathname: "/dashboard",
      });
    });

    it("should handle user without email", async () => {
      const mockUser = { id: "user-123", email: null };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: "user" },
              error: null,
            }),
          })),
        })),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toBeDefined();
      expect(mockLocals.user?.email).toBe("");
    });

    it("should default to user role when profile not found", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Profile not found" },
            }),
          })),
        })),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toBeDefined();
      expect(mockLocals.user?.role).toBe("user");
      // Check that error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        "❌ Error fetching user profile:",
        expect.objectContaining({ message: "Profile not found" }),
      );
    });

    it("should handle profile fetch errors gracefully", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Database error"),
            }),
          })),
        })),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toBeDefined();
      expect(mockLocals.user?.role).toBe("user"); // Default role
      expect(mockLogger.error).toHaveBeenCalledWith(
        "❌ Error fetching user profile:",
        expect.any(Error),
      );
    });

    it("should handle invalid role values", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: "invalid-role" },
              error: null,
            }),
          })),
        })),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toBeDefined();
      expect(mockLocals.user?.role).toBe("invalid-role"); // Type assertion allows invalid values
    });

    it("should handle getUser errors", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired" },
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toBeUndefined();
      // Check that error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        "❌ Error getting user session:",
        expect.objectContaining({ message: "Session expired" }),
      );
    });

    it("should handle getUser exceptions", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Network error"),
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "❌ Error getting user session:",
        expect.any(Error),
      );
    });
  });

  describe("redirect behavior", () => {
    it("should include current path in redirect URL", async () => {
      mockUrl.pathname = "/templates/page";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
        mockRedirect,
      );

      await middlewareHandler(context, mockNext);

      expect(mockRedirect).toHaveBeenCalledWith(
        "/auth/login?next=%2Ftemplates%2Fpage",
      );
    });

    it("should handle paths with query parameters in redirect", async () => {
      mockUrl.pathname = "/templates/page";
      mockUrl.search = "?param=value";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
        mockRedirect,
      );

      await middlewareHandler(context, mockNext);

      expect(mockRedirect).toHaveBeenCalledWith(
        "/auth/login?next=%2Ftemplates%2Fpage",
      );
    });

    it("should handle paths with special characters in redirect", async () => {
      // Create a new URL object with the encoded path
      mockUrl = new URL("https://example.com/templates/path%20with%20spaces");
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
        mockRedirect,
      );

      await middlewareHandler(context, mockNext);

      expect(mockRedirect).toHaveBeenCalledWith(
        "/auth/login?next=%2Ftemplates%2Fpath%2520with%2520spaces",
      );
    });
  });

  describe("logging", () => {
    it("should log middleware processing start", async () => {
      mockUrl.pathname = "/test";
      Object.defineProperty(mockRequest, "method", {
        value: "POST",
        writable: true,
      });
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "🛡️ Middleware processing:",
        {
          pathname: "/test",
          method: "POST",
          timestamp: expect.any(String),
        },
      );
    });

    it("should log session check start", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "🔍 Checking user session...",
      );
    });

    it("should log when no authenticated user found", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "❌ No authenticated user found",
      );
    });

    it("should log standard path access", async () => {
      mockUrl.pathname = "/some-page";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      // Check that middleware was called
      expect(mockNext).toHaveBeenCalled();
      // Check that middleware processing was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        "🛡️ Middleware processing:",
        {
          pathname: "/some-page",
          method: "GET",
          timestamp: expect.any(String),
        },
      );
      // Check that standard path access was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ Public path, allowing access:",
        "/some-page",
      );
    });
  });

  describe("supabase client setup", () => {
    it("should create supabase client with correct parameters", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockCreateSupabaseServerInstanceMock).toHaveBeenCalledWith({
        cookies: mockCookies,
        headers: mockRequest.headers,
      });
      expect(mockLocals.supabase).toBe(mockSupabaseClient);
    });

    it("should set supabase client for unauthenticated users", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.supabase).toBe(mockSupabaseClient);
      expect(mockLocals.user).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle root path access", async () => {
      mockUrl.pathname = "/";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("should handle unknown paths", async () => {
      mockUrl.pathname = "/unknown/path";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "✅ Public path, allowing access:",
        "/unknown/path",
      );
    });

    it("should handle paths that start with protected path segments", async () => {
      mockUrl.pathname = "/kb-other"; // Starts with /kb but not exactly /kb
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("should handle malformed URLs gracefully", async () => {
      mockUrl.pathname = "";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle concurrent requests", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Simulate multiple concurrent requests
      const promises = [
        middlewareHandler(
          createAPIContext(
            { supabase: mockSupabaseClient },
            mockCookies,
            mockUrl,
            mockRequest,
          ),
          mockNext,
        ),
        middlewareHandler(
          createAPIContext(
            { supabase: mockSupabaseClient },
            mockCookies,
            mockUrl,
            mockRequest,
          ),
          mockNext,
        ),
      ];

      await Promise.all(promises);

      expect(mockSupabaseAuth.getUser).toHaveBeenCalledTimes(2);
    });
  });

  describe("middleware chain", () => {
    it("should call next() for allowed requests", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      const result = await middlewareHandler(context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(result).toBe(mockNext.mock.results[0].value);
    });

    it("should return redirect result for protected paths", async () => {
      mockUrl.pathname = "/templates";
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
        mockRedirect,
      );

      const result = await middlewareHandler(context, mockNext);

      // The middleware now adds security headers to all responses
      expect(result.status).toBe(302);
      expect(result.headers.get("Location")).toBe(
        "/auth/login?next=%2Ftemplates",
      );
      expect(result.headers.get("X-Frame-Options")).toBe("DENY");
      expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(result.headers.get("X-XSS-Protection")).toBe("1; mode=block");
      expect(result.headers.get("Content-Security-Policy")).toBeDefined();
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle next() returning different response types", async () => {
      mockNext.mockReturnValue({ status: 404, body: "Not found" });
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      const result = await middlewareHandler(context, mockNext);

      expect(result).toBe(mockNext.mock.results[0].value);
    });
  });

  describe("profile query construction", () => {
    it("should query profile with correct parameters", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      });
      const mockEq = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      mockSupabaseClientMock.from.mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
      expect(mockSelect).toHaveBeenCalledWith("role");
      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
      expect(mockSingle).toHaveBeenCalled();
    });

    it("should handle profile query errors", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClientMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Query failed"),
            }),
          }),
        }),
      } as unknown as ReturnType<SupabaseClient<Database>["from"]>);

      const context = createAPIContext(
        mockLocals,
        mockCookies,
        mockUrl,
        mockRequest,
      );

      await middlewareHandler(context, mockNext);

      expect(mockLocals.user).toBeDefined();
      expect(mockLocals.user?.role).toBe("user"); // Default role
      expect(mockLogger.error).toHaveBeenCalledWith(
        "❌ Error fetching user profile:",
        expect.any(Error),
      );
    });
  });
});
