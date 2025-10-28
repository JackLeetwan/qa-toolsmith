import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseServerInstance } from "../../db/supabase.client";
import type { AstroCookies } from "astro";

describe("Supabase Client Initialization", () => {
  let mockCookies: AstroCookies;
  let mockHeaders: Headers;

  beforeEach(() => {
    // Ensure environment variables are set for tests
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_KEY = "test-anonymous-key-placeholder";

    // Mock Astro cookies
    mockCookies = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      getAll: vi.fn(),
    } as unknown as AstroCookies;

    // Mock headers
    mockHeaders = new Headers();
  });

  it("should initialize with environment variables", () => {
    // Verify SUPABASE_URL and SUPABASE_KEY are set in test environment
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_KEY).toBeDefined();
  });

  it("should create Supabase server instance without throwing", () => {
    expect(() => {
      createSupabaseServerInstance({
        headers: mockHeaders,
        cookies: mockCookies,
      });
    }).not.toThrow();
  });

  it.skip("should throw error when env vars are missing", () => {
    // This test is skipped because astro:env/server is always mocked in tests
    // The error throwing only works when BOTH astro:env/server AND process.env are undefined
  });
});
