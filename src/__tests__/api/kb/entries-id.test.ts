/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext, AstroCookies } from "astro";
import { GET, PUT, DELETE } from "../../../pages/api/kb/entries/[id]";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types";

// Mock logger
vi.mock("../../../lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Helper to create APIContext for testing
function createAPIContext(
  request: Request,
  params: { id: string },
  locals: {
    supabase?: SupabaseClient<Database> | null;
    user?: { id: string; email: string } | null;
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

describe("GET /api/kb/entries/[id]", () => {
  let mockSupabase: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };
  });

  it("should allow unauthenticated user to read public entry", async () => {
    const mockEntry = {
      id: "entry-1",
      user_id: "user-1",
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
      data: mockEntry,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries/entry-1");
    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: null,
      },
    );

    const response = await GET(context);
    const body = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.title).toBe("Public Entry");
    expect(body.data).not.toHaveProperty("search_vector");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", "entry-1");
  });

  it("should return 404 for unauthenticated user accessing private entry", async () => {
    mockQueryBuilder.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const request = new Request("http://localhost:4321/api/kb/entries/entry-1");
    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: null,
      },
    );

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Entry not found or access denied");
  });

  it("should allow authenticated user to read own entry", async () => {
    const mockEntry = {
      id: "entry-1",
      user_id: "user-123",
      title: "My Entry",
      url_original: "https://example.com/my",
      url_canonical: "https://example.com/my",
      tags: [],
      is_public: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      search_vector: null,
    };

    mockQueryBuilder.single.mockResolvedValue({
      data: mockEntry,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries/entry-1");
    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.title).toBe("My Entry");
  });

  it("should allow authenticated user to read public entry", async () => {
    const mockEntry = {
      id: "entry-1",
      user_id: "user-456",
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
      data: mockEntry,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries/entry-1");
    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await GET(context);
    expect(response.status).toBe(200);
  });

  it("should return 404 for authenticated user accessing other user's private entry", async () => {
    mockQueryBuilder.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const request = new Request("http://localhost:4321/api/kb/entries/entry-1");
    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("should handle missing id parameter", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries/");
    const context = createAPIContext(
      request,
      { id: undefined as any },
      {
        supabase: mockSupabase,
        user: null,
      },
    );

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Entry ID is required");
  });

  it("should handle missing supabase client", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries/entry-1");
    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: null,
        user: null,
      },
    );

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("CONFIGURATION_ERROR");
  });

  it("should handle database errors", async () => {
    mockQueryBuilder.single.mockResolvedValue({
      data: null,
      error: { message: "Database error", code: "PGRST500" },
    });

    const request = new Request("http://localhost:4321/api/kb/entries/entry-1");
    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: null,
      },
    );

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("DATABASE_ERROR");
  });
});

describe("PUT /api/kb/entries/[id]", () => {
  let mockSupabase: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueryBuilder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };
  });

  it("should allow authenticated user to update own entry", async () => {
    const mockUpdatedEntry = {
      id: "entry-1",
      user_id: "user-123",
      title: "Updated Entry",
      url_original: "https://example.com/updated",
      url_canonical: "https://example.com/updated",
      tags: ["tag1"],
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      search_vector: null,
    };

    mockQueryBuilder.single.mockResolvedValue({
      data: mockUpdatedEntry,
      error: null,
    });

    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Entry",
          is_public: true,
        }),
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.title).toBe("Updated Entry");
    expect(body.data.is_public).toBe(true);
    expect(mockQueryBuilder.update).toHaveBeenCalled();
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", "entry-1");
  });

  it("should reject authenticated user updating other user's entry", async () => {
    mockQueryBuilder.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Entry",
        }),
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Entry not found or access denied");
  });

  it("should reject unauthenticated users", async () => {
    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated Entry",
        }),
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: null,
      },
    );

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("Authentication required");
    expect(mockQueryBuilder.update).not.toHaveBeenCalled();
  });

  it("should support partial updates", async () => {
    const mockUpdatedEntry = {
      id: "entry-1",
      user_id: "user-123",
      title: "Original Title",
      url_original: "https://example.com/new-url",
      url_canonical: "https://example.com/new-url",
      tags: [],
      is_public: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      search_vector: null,
    };

    mockQueryBuilder.single.mockResolvedValue({
      data: mockUpdatedEntry,
      error: null,
    });

    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_original: "https://example.com/new-url",
        }),
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await PUT(context);
    expect(response.status).toBe(200);

    expect(mockQueryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        url_original: "https://example.com/new-url",
      }),
    );
    expect(mockQueryBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.anything(),
      }),
    );
  });

  it("should validate input data with Zod schema", async () => {
    // Test invalid URL
    const request1 = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_original: "not-a-url",
        }),
      },
    );

    const context1 = createAPIContext(
      request1,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response1 = await PUT(context1);
    expect(response1.status).toBe(400);
    const body1 = await response1.json();
    expect(body1.error.code).toBe("VALIDATION_ERROR");

    // Test title too long
    const request2 = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "a".repeat(201),
        }),
      },
    );

    const context2 = createAPIContext(
      request2,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response2 = await PUT(context2);
    expect(response2.status).toBe(400);
  });

  it("should reject update with no fields", async () => {
    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe(
      "At least one field must be provided for update",
    );
  });

  it("should handle missing id parameter", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated",
      }),
    });

    const context = createAPIContext(
      request,
      { id: undefined as any },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await PUT(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/kb/entries/[id]", () => {
  let mockSupabase: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueryBuilder = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };
  });

  it("should allow authenticated user to delete own entry", async () => {
    mockQueryBuilder.eq.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "DELETE",
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await DELETE(context);

    expect(response.status).toBe(204);
    expect(mockQueryBuilder.delete).toHaveBeenCalled();
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", "entry-1");
  });

  it("should reject authenticated user deleting other user's entry", async () => {
    mockQueryBuilder.eq.mockResolvedValue({
      data: null,
      error: { message: "Access denied", code: "PGRST301" },
    });

    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "DELETE",
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("DATABASE_ERROR");
  });

  it("should reject unauthenticated users", async () => {
    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "DELETE",
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: mockSupabase,
        user: null,
      },
    );

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("Authentication required");
    expect(mockQueryBuilder.delete).not.toHaveBeenCalled();
  });

  it("should handle missing id parameter", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries/", {
      method: "DELETE",
    });

    const context = createAPIContext(
      request,
      { id: undefined as any },
      {
        supabase: mockSupabase,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should handle missing supabase client", async () => {
    const request = new Request(
      "http://localhost:4321/api/kb/entries/entry-1",
      {
        method: "DELETE",
      },
    );

    const context = createAPIContext(
      request,
      { id: "entry-1" },
      {
        supabase: null,
        user: { id: "user-123", email: "user@example.com" },
      },
    );

    const response = await DELETE(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("CONFIGURATION_ERROR");
  });
});
