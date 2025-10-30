/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext, AstroCookies } from "astro";
import { PUT } from "@/pages/api/kb/entries/[id]";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

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
  params: { id: string },
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
    params,
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
    routePattern: "/api/kb/entries/[id]",
    isPrerendered: false,
  } as unknown as APIContext;
}

describe("PUT /api/kb/entries/[id] - admin restrictions", () => {
  let mockSupabase: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };
  });

  it("non-admin attempting to set is_public=true -> 403", async () => {
    // 1st single(): fetch existing (private, owned by user)
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: {
        id: "e1",
        user_id: "user-1",
        title: "T",
        url_original: "https://ex",
        url_canonical: "https://ex",
        tags: [],
        is_public: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries/e1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: true }),
    });
    const context = createAPIContext(
      request,
      { id: "e1" },
      {
        supabase: mockSupabase,
        user: { id: "user-1", email: "u@example.com", role: "user" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toEqual({
      code: "FORBIDDEN",
      message: "Only admins can edit public KB entries",
      details: null,
    });
    expect(mockQueryBuilder.update).not.toHaveBeenCalled();
  });

  it("non-admin attempting to edit public entry -> 403", async () => {
    // Existing entry is public
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: {
        id: "e2",
        user_id: "user-1",
        title: "Public",
        url_original: "https://ex",
        url_canonical: "https://ex",
        tags: [],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries/e2", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Changed" }),
    });
    const context = createAPIContext(
      request,
      { id: "e2" },
      {
        supabase: mockSupabase,
        user: { id: "user-1", email: "u@example.com", role: "user" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(mockQueryBuilder.update).not.toHaveBeenCalled();
  });

  it("non-admin edits own private entry -> 200", async () => {
    // 1) fetch existing (private, owned)
    mockQueryBuilder.single
      .mockResolvedValueOnce({
        data: {
          id: "e3",
          user_id: "user-1",
          title: "Old",
          url_original: "https://ex",
          url_canonical: "https://ex",
          tags: [],
          is_public: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          search_vector: null,
        },
        error: null,
      })
      // 2) update select().single() result
      .mockResolvedValueOnce({
        data: {
          id: "e3",
          user_id: "user-1",
          title: "New",
          url_original: "https://ex",
          url_canonical: "https://ex",
          tags: [],
          is_public: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          search_vector: null,
        },
        error: null,
      });

    const request = new Request("http://localhost:4321/api/kb/entries/e3", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New" }),
    });
    const context = createAPIContext(
      request,
      { id: "e3" },
      {
        supabase: mockSupabase,
        user: { id: "user-1", email: "u@example.com", role: "user" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.title).toBe("New");
    expect(mockQueryBuilder.update).toHaveBeenCalled();
  });

  it("admin edits public entry including is_public -> 200", async () => {
    mockQueryBuilder.single
      // existing public entry
      .mockResolvedValueOnce({
        data: {
          id: "e4",
          user_id: "user-x",
          title: "Public Old",
          url_original: "https://ex",
          url_canonical: "https://ex",
          tags: [],
          is_public: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          search_vector: null,
        },
        error: null,
      })
      // updated entry
      .mockResolvedValueOnce({
        data: {
          id: "e4",
          user_id: "user-x",
          title: "Public New",
          url_original: "https://ex",
          url_canonical: "https://ex",
          tags: [],
          is_public: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          search_vector: null,
        },
        error: null,
      });

    const request = new Request("http://localhost:4321/api/kb/entries/e4", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Public New", is_public: false }),
    });
    const context = createAPIContext(
      request,
      { id: "e4" },
      {
        supabase: mockSupabase,
        user: { id: "admin-1", email: "a@example.com", role: "admin" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.title).toBe("Public New");
    expect(body.data.is_public).toBe(false);
  });

  it("invalid JSON body -> 400 VALIDATION_ERROR", async () => {
    // existing entry (private, owned)
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: {
        id: "e5",
        user_id: "user-1",
        title: "Old",
        url_original: "https://ex",
        url_canonical: "https://ex",
        tags: [],
        is_public: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
      error: null,
    });

    const badBody = '{"title": "New"'; // missing closing brace
    const request = new Request("http://localhost:4321/api/kb/entries/e5", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: badBody,
    });
    const context = createAPIContext(
      request,
      { id: "e5" },
      {
        supabase: mockSupabase,
        user: { id: "user-1", email: "u@example.com", role: "user" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toMatch(/invalid json/i);
  });
});
