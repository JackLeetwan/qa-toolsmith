import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { auditLoginAttempt, getSupabaseDb } from "./audit.helper";
import type { AuditLoginAttemptParams } from "./audit.helper";
import type {
  PostgrestResponse,
  PostgrestError,
  SupabaseClient,
} from "@supabase/supabase-js";
import { maskIpForAudit } from "./request.helper";
import { mockCreateClient } from "../../test/setup";
import { wrapConsoleSpy } from "../../test/logger-test-utils";
import crypto from "crypto";

// Create a mock PostgrestResponse for successful operations
function createMockPostgrestResponse(
  data: unknown | null = null,
  error: PostgrestError | null = null,
): PostgrestResponse<unknown> {
  return {
    data,
    error,
    count: null,
    status: 201,
    statusText: "Created",
  } as PostgrestResponse<unknown>;
}

// Mock request helper
vi.mock("./request.helper", () => ({
  maskIpForAudit: vi.fn(),
}));

// Mock crypto module
vi.mock("crypto", () => ({
  default: {
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => "mocked-hash"),
    })),
  },
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => "mocked-hash"),
  })),
}));

describe("Audit Helper", () => {
  // Create a more complete mock of SupabaseClient for audit operations
  interface MockSupabaseClient {
    from(table: string): MockTableQuery;
  }

  interface MockTableQuery {
    insert(data: unknown): Promise<PostgrestResponse<unknown>>;
  }

  let mockSupabaseClient: MockSupabaseClient;
  let mockFrom: Mock<(table: string) => MockTableQuery>;
  let mockInsert: Mock<(data: unknown) => Promise<PostgrestResponse<unknown>>>;

  // Helper to access insert call data with proper typing
  const getInsertCallData = (callIndex: number): Record<string, unknown> => {
    return mockInsert.mock.calls[callIndex][0] as Record<string, unknown>;
  };

  // Mock console.error to capture audit errors
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

    // Setup mock chain for each test - insert returns a PostgrestResponse promise
    mockInsert = vi
      .fn<(data: unknown) => Promise<PostgrestResponse<unknown>>>()
      .mockResolvedValue(createMockPostgrestResponse(null, null));
    mockFrom = vi.fn(() => ({
      insert: mockInsert,
    }));
    mockSupabaseClient = {
      from: mockFrom,
    };

    mockCreateClient.mockReturnValue(
      mockSupabaseClient as unknown as SupabaseClient,
    );
    vi.mocked(maskIpForAudit).mockReturnValue("192.168.1.0/24");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleErrorSpy?.mockRestore();
  });

  describe("auditLoginAttempt", () => {
    const baseParams: AuditLoginAttemptParams = {
      userId: "user-uuid-123",
      email: "user@example.com",
      ip: "192.168.1.100",
      userAgent: "Mozilla/5.0 Test Browser",
      status: "success",
    };

    describe("successful audit logging", () => {
      it("should record successful login attempt", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        await auditLoginAttempt(baseParams);

        expect(mockFrom).toHaveBeenCalledWith("usage_events");
        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user@example.com",
          },
        });
      });

      it("should record failed login attempt with reason", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          ...baseParams,
          status: "failure",
          reason: "invalid_credentials",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "failure",
            reason: "invalid_credentials",
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user@example.com",
          },
        });
      });

      it("should include user ID when provided", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          ...baseParams,
          userId: "user-uuid-123",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user@example.com",
          },
        });
      });
    });

    describe("privacy features", () => {
      it("should mask IP address", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));
        vi.mocked(maskIpForAudit).mockReturnValue("10.0.0.0/24");

        const params: AuditLoginAttemptParams = {
          ...baseParams,
          ip: "10.0.0.50",
        };

        await auditLoginAttempt(params);

        expect(maskIpForAudit).toHaveBeenCalledWith("10.0.0.50");
        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "10.0.0.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user@example.com",
          },
        });
      });

      it("should hash user agent", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        await auditLoginAttempt(baseParams);

        expect(crypto.createHash).toHaveBeenCalledWith("sha256");
        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user@example.com",
          },
        });
      });

      it("should normalize email to lowercase", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          ...baseParams,
          email: "USER@EXAMPLE.COM",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user@example.com",
          },
        });
      });
    });

    describe("optional fields handling", () => {
      it("should handle missing email", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          userId: "user-uuid-123",
          ip: "192.168.1.100",
          userAgent: "Test Browser",
          status: "failure",
          reason: "no_email",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "failure",
            reason: "no_email",
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: null,
          },
        });
      });

      it("should handle missing userAgent", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          userId: "user-uuid-123",
          email: "user@example.com",
          ip: "192.168.1.100",
          status: "success",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: null,
            email_normalized: "user@example.com",
          },
        });
      });

      it("should handle missing reason", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          userId: "user-uuid-123",
          email: "user@example.com",
          ip: "192.168.1.100",
          userAgent: "Test Browser",
          status: "failure",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "failure",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user@example.com",
          },
        });
      });
    });

    describe("error handling", () => {
      it("should not throw when database insert fails", async () => {
        mockInsert.mockRejectedValue(new Error("Database connection failed"));

        await expect(auditLoginAttempt(baseParams)).resolves.toBeUndefined();

        const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
        expect(
          errorWrapper.wasCalledWith(
            "[AuditError] Failed to record login attempt:",
            expect.any(Error),
          ),
        ).toBe(true);
      });

      it("should not throw when IP masking fails", async () => {
        vi.mocked(maskIpForAudit).mockImplementation(() => {
          throw new Error("IP masking failed");
        });
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        await expect(auditLoginAttempt(baseParams)).resolves.toBeUndefined();

        const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
        expect(
          errorWrapper.wasCalledWith(
            "[AuditError] Failed to record login attempt:",
            expect.any(Error),
          ),
        ).toBe(true);
      });

      it("should not throw when user agent hashing fails", async () => {
        vi.mocked(crypto.createHash).mockImplementation(() => {
          throw new Error("Hashing failed");
        });
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        await expect(auditLoginAttempt(baseParams)).resolves.toBeUndefined();

        const errorWrapper = wrapConsoleSpy(consoleErrorSpy);
        expect(
          errorWrapper.wasCalledWith(
            "[AuditError] Failed to record login attempt:",
            expect.any(Error),
          ),
        ).toBe(true);
      });

      it("should continue execution despite audit errors", async () => {
        mockInsert.mockRejectedValue(new Error("Database error"));

        // Should not throw
        await auditLoginAttempt(baseParams);

        // Verify the error was logged
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      });

      it("should handle multiple audit calls with errors", async () => {
        mockInsert.mockRejectedValue(new Error("Persistent error"));

        await auditLoginAttempt(baseParams);
        await auditLoginAttempt({ ...baseParams, status: "failure" });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe("edge cases", () => {
      it("should handle empty strings", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          userId: "user-uuid-123",
          email: "",
          ip: "",
          userAgent: "",
          status: "failure",
          reason: "",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "failure",
            reason: "",
            ip_cidr: "192.168.1.0/24", // maskIpForAudit result
            user_agent_hash: null, // empty string is falsy, so hash is null
            email_normalized: "",
          },
        });
      });

      it("should handle very long strings", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const longString = "a".repeat(1000);
        const params: AuditLoginAttemptParams = {
          userId: "user-uuid-123",
          email: longString + "@example.com",
          ip: "192.168.1.100",
          userAgent: longString,
          status: "success",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: (longString + "@example.com").toLowerCase(),
          },
        });
      });

      it("should handle special characters in email", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          userId: "user-uuid-123",
          email: "user+tag@example.com",
          ip: "192.168.1.100",
          userAgent: "Browser/1.0",
          status: "success",
        };

        await auditLoginAttempt(params);

        expect(mockInsert).toHaveBeenCalledWith({
          user_id: "user-uuid-123",
          kind: "auth",
          meta: {
            status: "success",
            reason: null,
            ip_cidr: "192.168.1.0/24",
            user_agent_hash: "mocked-hash",
            email_normalized: "user+tag@example.com",
          },
        });
      });

      it("should handle various IP formats", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));
        const testCases = [
          { ip: "10.0.0.1", expectedMask: "10.0.0.0/24" },
          { ip: "::1", expectedMask: "::1/128" },
          { ip: "2001:db8::1", expectedMask: "2001:db8::/32" },
        ];

        for (const { ip, expectedMask } of testCases) {
          vi.mocked(maskIpForAudit).mockReturnValue(expectedMask);

          const params: AuditLoginAttemptParams = {
            userId: "user-uuid-123",
            email: "user@example.com",
            ip,
            userAgent: "Test",
            status: "success",
          };

          await auditLoginAttempt(params);

          expect(maskIpForAudit).toHaveBeenCalledWith(ip);
        }
      });
    });

    describe("data integrity", () => {
      it("should always set kind to 'auth'", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        await auditLoginAttempt(baseParams);

        const insertCall = getInsertCallData(0);
        expect(insertCall.kind).toBe("auth");
      });

      it("should preserve status values", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const successParams = { ...baseParams, status: "success" as const };
        const failureParams = { ...baseParams, status: "failure" as const };

        await auditLoginAttempt(successParams);
        await auditLoginAttempt(failureParams);

        expect(
          (getInsertCallData(0).meta as Record<string, unknown>).status,
        ).toBe("success");
        expect(
          (getInsertCallData(1).meta as Record<string, unknown>).status,
        ).toBe("failure");
      });

      it("should handle reason as string or null", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        await auditLoginAttempt({ ...baseParams, reason: "invalid_password" });
        await auditLoginAttempt({ ...baseParams, reason: undefined });

        expect(
          (getInsertCallData(0).meta as Record<string, unknown>).reason,
        ).toBe("invalid_password");
        expect(
          (getInsertCallData(1).meta as Record<string, unknown>).reason,
        ).toBe(null);
      });
    });

    describe("environment configuration", () => {
      it("should create Supabase client with correct credentials", async () => {
        // Call getSupabaseDb to trigger client creation
        getSupabaseDb();

        expect(mockCreateClient).toHaveBeenCalledWith(
          "https://test.supabase.co",
          "test-service-key",
        );
      });

      // Environment variable validation is tested in integration scenarios
      // where the global setup doesn't provide mocked values
    });

    describe("type safety", () => {
      it("should accept valid AuditLoginAttemptParams", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const params: AuditLoginAttemptParams = {
          userId: "user-123",
          email: "test@example.com",
          ip: "192.168.1.1",
          userAgent: "Browser/1.0",
          status: "success",
          reason: "login_successful",
        };

        await expect(auditLoginAttempt(params)).resolves.toBeUndefined();
      });

      it("should handle minimal required params", async () => {
        mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));

        const minimalParams: AuditLoginAttemptParams = {
          userId: "user-uuid-123",
          ip: "127.0.0.1",
          status: "failure",
        };

        await expect(auditLoginAttempt(minimalParams)).resolves.toBeUndefined();
      });
    });
  });

  describe("sha256 function", () => {
    it("should hash strings correctly", async () => {
      // Import and call the private function indirectly through auditLoginAttempt
      mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));
      await auditLoginAttempt({
        userId: "test-user-id",
        ip: "127.0.0.1",
        userAgent: "test-agent",
        status: "success",
      });

      expect(crypto.createHash).toHaveBeenCalledWith("sha256");
    });

    it("should handle empty strings", async () => {
      mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));
      await auditLoginAttempt({
        userId: "test-user-id",
        ip: "127.0.0.1",
        userAgent: "",
        status: "success",
      });

      // Empty userAgent should not trigger hashing
      expect(crypto.createHash).not.toHaveBeenCalled();
    });

    it("should handle unicode strings", async () => {
      const unicodeString = "🚀🌟💻";

      mockInsert.mockResolvedValue(createMockPostgrestResponse(null, null));
      await auditLoginAttempt({
        userId: "test-user-id",
        ip: "127.0.0.1",
        userAgent: unicodeString,
        status: "success",
      });

      expect(crypto.createHash).toHaveBeenCalledWith("sha256");
    });
  });
});
