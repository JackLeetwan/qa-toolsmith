/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext, AstroCookies } from "astro";
import { POST } from "@/pages/api/kb/entries/index";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

// Mock logger to avoid noisy output in tests
vi.mock("../../../lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function createAPIContext(
  request: Request,
  locals: {
    supabase?: SupabaseClient<Database> | null;
    user?: { id: string; email: string; role?: "admin" | "user" } | null;
  },
): APIContext {
  const cookies = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    merge: vi.fn(),
    headers: vi.fn(),
  } as unknown as AstroCookies;

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
    locals,
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
    routePattern: "/api/kb/entries",
    isPrerendered: false,
  } as unknown as APIContext;
}

describe("POST /api/kb/entries - admin restrictions", () => {
  let mockSupabase: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueryBuilder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };
  });

  it("non-admin with is_public=true -> 403 FORBIDDEN", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Entry",
        url_original: "https://example.com/new",
        is_public: true,
      }),
    });

    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com", role: "user" },
    });

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toEqual({
      code: "FORBIDDEN",
      message: "Only admins can create public KB entries",
      details: null,
    });
    expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
  });

  it("non-admin without is_public -> 201 private entry", async () => {
    const mockCreated = {
      id: "id-1",
      user_id: "user-123",
      title: "New Entry",
      url_original: "https://example.com/new",
      url_canonical: "https://example.com/new",
      tags: [],
      is_public: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      search_vector: null,
    };

    mockQueryBuilder.single.mockResolvedValue({
      data: mockCreated,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Entry",
        url_original: "https://example.com/new",
      }),
    });

    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com", role: "user" },
    });

    const response = await POST(context);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.is_public).toBe(false);
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_public: false }),
    );
  });

  it("admin with is_public=true -> 201 public entry", async () => {
    const mockCreated = {
      id: "id-2",
      user_id: "admin-1",
      title: "Public Entry",
      url_original: "https://example.com/public",
      url_canonical: "https://example.com/public",
      tags: [],
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      search_vector: null,
    };

    mockQueryBuilder.single.mockResolvedValue({
      data: mockCreated,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Public Entry",
        url_original: "https://example.com/public",
        is_public: true,
      }),
    });

    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "admin-1", email: "admin@example.com", role: "admin" },
    });

    const response = await POST(context);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.is_public).toBe(true);
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_public: true }),
    );
  });

  it("admin with is_public=false -> 201 private entry", async () => {
    const mockCreated = {
      id: "id-3",
      user_id: "admin-1",
      title: "Private Entry",
      url_original: "https://example.com/private",
      url_canonical: "https://example.com/private",
      tags: [],
      is_public: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      search_vector: null,
    };

    mockQueryBuilder.single.mockResolvedValue({
      data: mockCreated,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Private Entry",
        url_original: "https://example.com/private",
        is_public: false,
      }),
    });

    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "admin-1", email: "admin@example.com", role: "admin" },
    });

    const response = await POST(context);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.is_public).toBe(false);
  });

  it("invalid JSON body -> 400 VALIDATION_ERROR", async () => {
    const badBody = '{"title": "Bad"'; // missing closing brace
    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: badBody,
    });

    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com", role: "user" },
    });

    const response = await POST(context);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toMatch(/invalid json/i);
    expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
  });
});
