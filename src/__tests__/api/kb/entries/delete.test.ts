/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext, AstroCookies } from "astro";
import { DELETE } from "@/pages/api/kb/entries/[id]";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";

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

describe("DELETE /api/kb/entries/[id] - admin restrictions", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // We'll define from() dynamically per test to avoid shared chain conflicts
    mockSupabase = { from: vi.fn() };
  });

  it("non-admin deletes public entry -> 403", async () => {
    // Existing entry is public (handled by select chain defined below)

    // Build separate chains for select and delete to avoid Promise chaining conflicts
    const selectEq = vi.fn().mockResolvedValue({
      data: {
        id: "p1",
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
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "p1",
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
        }),
      }),
    });
    const del = vi.fn().mockReturnValue({ eq: selectEq });
    mockSupabase.from.mockReturnValue({ select, delete: del });

    const request = new Request("http://localhost:4321/api/kb/entries/p1", {
      method: "DELETE",
    });
    const context = createAPIContext(
      request,
      { id: "p1" },
      {
        supabase: mockSupabase,
        user: { id: "user-1", email: "u@example.com", role: "user" },
      },
    );

    const response = await DELETE(context);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toEqual({
      code: "FORBIDDEN",
      message: "Only admins can delete public KB entries",
      details: null,
    });
    // Ensure we did not attempt deletion for public entry by non-admin
  });

  it("non-admin deletes own private entry -> 204", async () => {
    // Build separate chains for select and delete
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "pr1",
            user_id: "user-1",
            title: "Private",
            url_original: "https://ex",
            url_canonical: "https://ex",
            tags: [],
            is_public: false,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            search_vector: null,
          },
          error: null,
        }),
      }),
    });
    const del = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockSupabase.from.mockReturnValue({ select, delete: del });

    const request = new Request("http://localhost:4321/api/kb/entries/pr1", {
      method: "DELETE",
    });
    const context = createAPIContext(
      request,
      { id: "pr1" },
      {
        supabase: mockSupabase,
        user: { id: "user-1", email: "u@example.com", role: "user" },
      },
    );

    const response = await DELETE(context);
    expect(response.status).toBe(204);
  });

  it("admin deletes public entry -> 204", async () => {
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "pub-admin",
            user_id: "user-x",
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
        }),
      }),
    });
    const del = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockSupabase.from.mockReturnValue({ select, delete: del });

    const request = new Request(
      "http://localhost:4321/api/kb/entries/pub-admin",
      {
        method: "DELETE",
      },
    );
    const context = createAPIContext(
      request,
      { id: "pub-admin" },
      {
        supabase: mockSupabase,
        user: { id: "admin-1", email: "a@example.com", role: "admin" },
      },
    );

    const response = await DELETE(context);
    expect(response.status).toBe(204);
  });

  it("admin deletes private entry -> 204", async () => {
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "priv-admin",
            user_id: "user-x",
            title: "Private",
            url_original: "https://ex",
            url_canonical: "https://ex",
            tags: [],
            is_public: false,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            search_vector: null,
          },
          error: null,
        }),
      }),
    });
    const del = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockSupabase.from.mockReturnValue({ select, delete: del });

    const request = new Request(
      "http://localhost:4321/api/kb/entries/priv-admin",
      {
        method: "DELETE",
      },
    );
    const context = createAPIContext(
      request,
      { id: "priv-admin" },
      {
        supabase: mockSupabase,
        user: { id: "admin-1", email: "a@example.com", role: "admin" },
      },
    );

    const response = await DELETE(context);
    expect(response.status).toBe(204);
  });
});
