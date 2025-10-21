import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { getByUserId } from "./profile.service";
import type { ProfileDTO } from "../../types/types";
import type {
  PostgrestSingleResponse,
  SupabaseClient,
  PostgrestError,
} from "@supabase/supabase-js";
import type { Tables } from "../../db/database.types";
import { mockCreateClient } from "../../test/setup";

describe("Profile Service", () => {
  // Use the actual database row type for mocking
  type ProfileRow = Tables<"profiles">;

  // Create a more complete mock of SupabaseClient
  interface MockSupabaseClient {
    from(table: string): MockTableQuery;
    supabaseUrl?: string;
    supabaseKey?: string;
    auth?: Record<string, unknown>;
    realtime?: Record<string, unknown>;
    storage?: Record<string, unknown>;
  }

  interface MockTableQuery {
    select(columns: string): MockSelectQuery;
    insert?: () => unknown;
    upsert?: () => unknown;
    update?: () => unknown;
    delete?: () => unknown;
    eq(column: string, value: string): MockEqQuery;
  }

  interface MockSelectQuery {
    eq(column: string, value: string): MockEqQuery;
  }

  interface MockEqQuery {
    single(): Promise<PostgrestSingleResponse<ProfileRow>>;
  }

  // Create a mock PostgrestError
  function createMockPostgrestError(
    overrides: Partial<PostgrestError> = {},
  ): PostgrestError {
    return {
      code: "PGRST116",
      details: "",
      hint: "",
      message: "No rows returned",
      name: "PostgrestError",
      ...overrides,
    };
  }

  // Create a mock PostgrestResponseSuccess
  function createMockPostgrestResponse(
    data: ProfileRow | null,
    error: PostgrestError | null = null,
  ): PostgrestSingleResponse<ProfileRow> {
    return {
      data,
      error,
      count: null,
      status: 200,
      statusText: "OK",
    } as PostgrestSingleResponse<ProfileRow>;
  }

  let mockSupabaseClient: MockSupabaseClient;
  let mockFrom: Mock<(table: string) => MockTableQuery>;
  let mockSelect: Mock<(columns: string) => MockSelectQuery>;
  let mockEq: Mock<(column: string, value: string) => MockEqQuery>;
  let mockSingle: Mock<() => Promise<PostgrestSingleResponse<ProfileRow>>>;

  const testUserId = "test-user-uuid-123";
  const mockProfileData: ProfileRow = {
    id: testUserId,
    email: "user@example.com",
    role: "user",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    org_id: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Only use fake timers for timing-sensitive tests, not all tests
    // vi.useFakeTimers();

    // Setup mock chain for each test
    mockSingle = vi.fn<() => Promise<PostgrestSingleResponse<ProfileRow>>>();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockFrom = vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      insert: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }));
    mockSupabaseClient = {
      from: mockFrom,
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "test-key",
      auth: {},
      realtime: {},
      storage: {},
    };

    mockCreateClient.mockReturnValue(
      mockSupabaseClient as unknown as SupabaseClient,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Ensure no pending promises from previous tests
    vi.clearAllTimers();
  });

  describe("getByUserId", () => {
    describe("successful profile fetching", () => {
      it("should return profile on first attempt", async () => {
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(mockProfileData),
        );

        const result = await getByUserId(testUserId);

        expect(result).toEqual({
          id: testUserId,
          email: "user@example.com",
          role: "user",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        } as ProfileDTO);

        expect(mockFrom).toHaveBeenCalledWith("profiles");
        expect(mockSelect).toHaveBeenCalledWith(
          "id, email, role, created_at, updated_at",
        );
        expect(mockEq).toHaveBeenCalledWith("id", testUserId);
        expect(mockSingle).toHaveBeenCalledTimes(1);
      });

      it("should handle admin role", async () => {
        const adminProfile: ProfileRow = { ...mockProfileData, role: "admin" };
        mockSingle.mockResolvedValue(createMockPostgrestResponse(adminProfile));

        const result = await getByUserId(testUserId);
        expect(result.role).toBe("admin");
      });

      it("should default to user role when role is null", async () => {
        const nullRoleProfile = {
          ...mockProfileData,
          role: null as string | null,
        } as ProfileRow;
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(nullRoleProfile),
        );

        const result = await getByUserId(testUserId);
        expect(result.role).toBe("user");
      });

      it("should default to user role when role is undefined", async () => {
        const undefinedRoleProfile = {
          ...mockProfileData,
          role: undefined as string | undefined,
        } as ProfileRow;
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(undefinedRoleProfile),
        );

        const result = await getByUserId(testUserId);
        expect(result.role).toBe("user");
      });

      it("should handle different user IDs", async () => {
        const differentUserId = "different-user-456";
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse({
            ...mockProfileData,
            id: differentUserId,
          }),
        );

        const result = await getByUserId(differentUserId);
        expect(result.id).toBe(differentUserId);
        expect(mockEq).toHaveBeenCalledWith("id", differentUserId);
      });
    });

    describe("retry logic for missing profile", () => {
      it("should retry when profile not found and eventually succeed", async () => {
        vi.useFakeTimers();
        // First two attempts fail, third succeeds
        mockSingle
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Advance timers for retries (1ms delay each in test env)
        await vi.advanceTimersByTimeAsync(1); // First retry
        await vi.advanceTimersByTimeAsync(1); // Second retry

        const result = await promise;

        expect(result).toEqual(
          expect.objectContaining({
            id: testUserId,
            email: "user@example.com",
          }),
        );

        expect(mockSingle).toHaveBeenCalledTimes(3);
        vi.useRealTimers();
      });

      it("should retry when data is null but no error", async () => {
        vi.useFakeTimers();
        mockSingle
          .mockResolvedValueOnce(createMockPostgrestResponse(null))
          .mockResolvedValueOnce(createMockPostgrestResponse(null))
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Advance timers for retries
        await vi.advanceTimersByTimeAsync(1);
        await vi.advanceTimersByTimeAsync(1);

        const result = await promise;
        expect(result.id).toBe(testUserId);
        expect(mockSingle).toHaveBeenCalledTimes(3);
        vi.useRealTimers();
      });

      it("should fail after maximum retries when profile not found", async () => {
        // All attempts return not found
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(null, createMockPostgrestError()),
        );

        await expect(getByUserId(testUserId)).rejects.toThrow(
          "profile_not_ready",
        );

        expect(mockSingle).toHaveBeenCalledTimes(3); // Max retries
      });

      it("should fail after maximum retries when data is null", async () => {
        mockSingle.mockResolvedValue(createMockPostgrestResponse(null));

        await expect(getByUserId(testUserId)).rejects.toThrow(
          "profile_not_ready",
        );

        expect(mockSingle).toHaveBeenCalledTimes(3);
      });
    });

    describe("error handling", () => {
      it("should throw wrapped error on database error after retries", async () => {
        const dbError = new Error("Database connection failed");
        mockSingle.mockRejectedValue(dbError);

        await expect(getByUserId(testUserId)).rejects.toThrow(
          "profile_fetch_error",
        );

        expect(mockSingle).toHaveBeenCalledTimes(3);
      });

      it("should retry on database errors before giving up", async () => {
        vi.useFakeTimers();
        const dbError = new Error("Temporary database error");
        mockSingle
          .mockRejectedValueOnce(dbError)
          .mockRejectedValueOnce(dbError)
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Advance timers for retries
        await vi.advanceTimersByTimeAsync(1);
        await vi.advanceTimersByTimeAsync(1);

        const result = await promise;
        expect(result.id).toBe(testUserId);
        expect(mockSingle).toHaveBeenCalledTimes(3);
        vi.useRealTimers();
      });

      it("should rethrow wrapped errors immediately on last attempt", async () => {
        const wrappedError = new Error("Custom error") as Error & {
          code: string;
          status: number;
        };
        wrappedError.code = "CUSTOM";
        wrappedError.status = 400;

        mockSingle.mockRejectedValue(wrappedError);

        await expect(getByUserId(testUserId)).rejects.toThrow(wrappedError);
        expect(mockSingle).toHaveBeenCalledTimes(3); // Still retries
      });

      it("should handle different types of database errors", async () => {
        const errors = [
          createMockPostgrestError({
            code: "PGRST301",
            message: "Permission denied",
          }),
          createMockPostgrestError({
            code: "PGRST204",
            message: "No rows found",
          }),
          createMockPostgrestError({
            code: "42P01",
            message: "Table doesn't exist",
          }),
        ];

        for (const dbError of errors) {
          mockSingle.mockResolvedValue(
            createMockPostgrestResponse(null, dbError),
          );

          await expect(getByUserId(testUserId)).rejects.toThrow(
            "profile_not_ready",
          );
        }
      });
    });

    describe("timing and retry delays", () => {
      it("should implement proper retry delays", async () => {
        vi.useFakeTimers();
        mockSingle
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Advance timer for first retry (1ms delay in test env)
        await vi.advanceTimersByTimeAsync(1);
        await vi.advanceTimersByTimeAsync(1); // Second retry

        const result = await promise;
        expect(result.id).toBe(testUserId);
        expect(mockSingle).toHaveBeenCalledTimes(3);
        vi.useRealTimers();
      });

      it("should use correct retry delay", async () => {
        vi.useFakeTimers();
        mockSingle
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Advance timer by retry delay (1ms in test env)
        await vi.advanceTimersByTimeAsync(1);

        const result = await promise;
        expect(result.id).toBe(testUserId);
        expect(mockSingle).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
      });

      it("should not wait on successful first attempt", async () => {
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(mockProfileData),
        );

        const startTime = Date.now();
        await getByUserId(testUserId);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(10); // Should be very fast
        expect(mockSingle).toHaveBeenCalledTimes(1);
      });
    });

    describe("race condition handling", () => {
      it("should handle profile creation delay after authentication", async () => {
        vi.useFakeTimers();
        // Simulate the common case: profile not ready immediately after auth
        let callCount = 0;
        mockSingle.mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            return Promise.resolve(
              createMockPostgrestResponse(null, createMockPostgrestError()),
            );
          }
          return Promise.resolve(createMockPostgrestResponse(mockProfileData));
        });

        const promise = getByUserId(testUserId);

        // Advance timers for retries
        await vi.advanceTimersByTimeAsync(1);
        await vi.advanceTimersByTimeAsync(1);

        const result = await promise;
        expect(result.email).toBe("user@example.com");
        expect(callCount).toBe(3);
        vi.useRealTimers();
      });

      it("should succeed on second attempt", async () => {
        vi.useFakeTimers();
        mockSingle
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Advance timer for retry
        await vi.advanceTimersByTimeAsync(1);

        const result = await promise;
        expect(result.id).toBe(testUserId);
        expect(mockSingle).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
      });

      it("should handle intermittent database errors", async () => {
        vi.useFakeTimers();
        mockSingle
          .mockRejectedValueOnce(new Error("Connection timeout"))
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Advance timers for retries
        await vi.advanceTimersByTimeAsync(1);
        await vi.advanceTimersByTimeAsync(1);

        const result = await promise;
        expect(result.id).toBe(testUserId);
        expect(mockSingle).toHaveBeenCalledTimes(3);
        vi.useRealTimers();
      });
    });

    describe("edge cases", () => {
      it("should handle empty user ID", async () => {
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(mockProfileData),
        );

        const result = await getByUserId("");
        expect(result).toEqual(
          expect.objectContaining({
            email: "user@example.com",
          }),
        );
        expect(mockEq).toHaveBeenCalledWith("id", "");
      });

      it("should handle very long user ID", async () => {
        const longUserId = "a".repeat(100);
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse({ ...mockProfileData, id: longUserId }),
        );

        const result = await getByUserId(longUserId);
        expect(result.id).toBe(longUserId);
      });

      it("should handle user ID with special characters", async () => {
        const specialUserId = "user-123_special@test.domain";
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse({
            ...mockProfileData,
            id: specialUserId,
          }),
        );

        const result = await getByUserId(specialUserId);
        expect(result.id).toBe(specialUserId);
      });

      it("should handle profile with minimal data", async () => {
        const minimalProfile: ProfileRow = {
          id: testUserId,
          email: "minimal@example.com",
          role: "user",
          created_at: "",
          updated_at: "",
          org_id: null,
        };

        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(minimalProfile),
        );

        const result = await getByUserId(testUserId);
        expect(result).toEqual({
          id: testUserId,
          email: "minimal@example.com",
          role: "user",
          created_at: "",
          updated_at: "",
        } as ProfileDTO);
      });

      it("should handle profile with extra fields", async () => {
        const extendedProfile = {
          ...mockProfileData,
          extra_field: "should be ignored",
          nested: { object: true },
        };

        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(extendedProfile),
        );

        const result = await getByUserId(testUserId);
        expect(result).not.toHaveProperty("extra_field");
        expect(result).not.toHaveProperty("nested");
        expect(result.id).toBe(testUserId);
      });
    });

    describe("type safety", () => {
      it("should return properly typed ProfileDTO", async () => {
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(mockProfileData),
        );

        const result: ProfileDTO = await getByUserId(testUserId);

        expect(typeof result.id).toBe("string");
        expect(typeof result.email).toBe("string");
        expect(result.role).toBe("user");
        expect(typeof result.created_at).toBe("string");
        expect(typeof result.updated_at).toBe("string");
      });

      it("should handle role type narrowing", async () => {
        const adminProfile = { ...mockProfileData, role: "admin" as const };
        mockSingle.mockResolvedValue(createMockPostgrestResponse(adminProfile));

        const result = await getByUserId(testUserId);
        expect(result.role).toBe("admin");

        // Type assertion to ensure TypeScript understands the union type
        const role: "admin" | "user" = result.role;
        expect(["admin", "user"]).toContain(role);
      });
    });

    describe("constants and configuration", () => {
      it("should use correct number of retry attempts", async () => {
        mockSingle.mockResolvedValue(
          createMockPostgrestResponse(null, createMockPostgrestError()),
        );

        await expect(getByUserId(testUserId)).rejects.toThrow();
        expect(mockSingle).toHaveBeenCalledTimes(3); // PROFILE_RETRY_ATTEMPTS
      });

      it("should use correct retry delay", async () => {
        vi.useFakeTimers();
        mockSingle
          .mockResolvedValueOnce(
            createMockPostgrestResponse(null, createMockPostgrestError()),
          )
          .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

        const promise = getByUserId(testUserId);

        // Should wait for retry delay (1ms in test env)
        await vi.advanceTimersByTimeAsync(1);

        const result = await promise;
        expect(result.id).toBe(testUserId);
        vi.useRealTimers();
      });
    });
  });

  describe("environment configuration", () => {
    it("should create Supabase client with correct credentials", async () => {
      // Clear previous mocks and trigger client creation by calling the service
      vi.clearAllMocks();

      // Re-setup the mock chain after clearing
      mockSingle = vi.fn<() => Promise<PostgrestSingleResponse<ProfileRow>>>();
      mockEq = vi.fn(() => ({ single: mockSingle }));
      mockSelect = vi.fn(() => ({ eq: mockEq }));
      mockFrom = vi.fn(() => ({
        select: mockSelect,
        eq: mockEq,
        insert: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }));
      mockSupabaseClient = {
        from: mockFrom,
        supabaseUrl: "https://test.supabase.co",
        supabaseKey: "test-key",
        auth: {},
        realtime: {},
        storage: {},
      };

      mockCreateClient.mockReturnValue(
        mockSupabaseClient as unknown as SupabaseClient,
      );
      mockSingle.mockResolvedValue(
        createMockPostgrestResponse(mockProfileData),
      );

      await getByUserId(testUserId);

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-service-key",
      );
    });

    // Environment variable validation is tested in integration scenarios
    // where the global setup doesn't provide mocked values
  });

  describe("sleep helper", () => {
    // The sleep function is internal, but we can test its behavior indirectly
    it("should implement delays correctly in retry logic", async () => {
      vi.useFakeTimers();
      mockSingle
        .mockResolvedValueOnce(
          createMockPostgrestResponse(null, createMockPostgrestError()),
        )
        .mockResolvedValueOnce(createMockPostgrestResponse(mockProfileData));

      const promise = getByUserId(testUserId);

      // Advance timer by retry delay (1ms in test env)
      await vi.advanceTimersByTimeAsync(1);

      const result = await promise;
      expect(result.id).toBe(testUserId);
      expect(mockSingle).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });
});
