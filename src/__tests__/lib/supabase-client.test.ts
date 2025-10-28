import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseServerInstance } from "../../db/supabase.client";
import type { AstroCookies } from "astro";

describe("Supabase Client Initialization", () => {
  let mockCookies: AstroCookies;
  let mockHeaders: Headers;

  beforeEach(() => {
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

  it("should throw error when env vars are missing", () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_KEY;

    try {
      // Remove env vars temporarily
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_KEY;

      expect(() => {
        createSupabaseServerInstance({
          headers: mockHeaders,
          cookies: mockCookies,
        });
      }).toThrow("Missing Supabase environment variables");
    } finally {
      // Restore env vars
      if (originalUrl) process.env.SUPABASE_URL = originalUrl;
      if (originalKey) process.env.SUPABASE_KEY = originalKey;
    }
  });
});
