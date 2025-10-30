import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext, AstroCookies } from "astro";
import { GET, POST } from "../../../pages/api/kb/entries/index";
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

describe("GET /api/kb/entries", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let mockSupabase: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Build mock query builder chain
    mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };
  });

  it("should return only public entries for unauthenticated users", async () => {
    const mockPublicEntries = [
      {
        id: "1",
        user_id: "user-1",
        title: "Public Entry 1",
        url_original: "https://example.com/1",
        url_canonical: "https://example.com/1",
        tags: ["tag1"],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
      {
        id: "2",
        user_id: "user-2",
        title: "Public Entry 2",
        url_original: "https://example.com/2",
        url_canonical: "https://example.com/2",
        tags: ["tag2"],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
    ];

    mockQueryBuilder.limit.mockResolvedValue({
      data: mockPublicEntries,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries");
    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: null,
    });

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].title).toBe("Public Entry 1");
    expect(body.items[0]).not.toHaveProperty("search_vector");
    expect(mockSupabase.from).toHaveBeenCalledWith("kb_entries");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("is_public", true);
    expect(mockQueryBuilder.or).not.toHaveBeenCalled();
  });

  it("should return own + public entries for authenticated users", async () => {
    const mockEntries = [
      {
        id: "1",
        user_id: "user-123",
        title: "My Private Entry",
        url_original: "https://example.com/private",
        url_canonical: "https://example.com/private",
        tags: [],
        is_public: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
      {
        id: "2",
        user_id: "user-456",
        title: "Public Entry",
        url_original: "https://example.com/public",
        url_canonical: "https://example.com/public",
        tags: [],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
    ];

    mockQueryBuilder.limit.mockResolvedValue({
      data: mockEntries,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries");
    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com" },
    });

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(mockQueryBuilder.or).toHaveBeenCalledWith(
      "user_id.eq.user-123,is_public.eq.true",
    );
  });

  it("should handle keyset pagination with after parameter", async () => {
    const mockEntries = [
      {
        id: "2",
        user_id: "user-1",
        title: "Entry 2",
        url_original: "https://example.com/2",
        url_canonical: "https://example.com/2",
        tags: [],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        search_vector: null,
      },
    ];

    mockQueryBuilder.limit.mockResolvedValue({
      data: mockEntries,
      error: null,
    });

    const request = new Request(
      "http://localhost:4321/api/kb/entries?after=2024-01-01T00:00:00Z,1",
    );
    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: null,
    });

    const response = await GET(context);
    await response.json();

    expect(response.status).toBe(200);
    expect(mockQueryBuilder.or).toHaveBeenCalledWith(
      "updated_at.lt.2024-01-01T00:00:00Z,and(updated_at.eq.2024-01-01T00:00:00Z,id.lt.1)",
    );
  });

  it("should validate limit parameter (min 1, max 100, default 20)", async () => {
    const mockEntries = Array.from({ length: 20 }, (_, i) => ({
      id: `${i}`,
      user_id: "user-1",
      title: `Entry ${i}`,
      url_original: `https://example.com/${i}`,
      url_canonical: `https://example.com/${i}`,
      tags: [],
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      search_vector: null,
    }));

    mockQueryBuilder.limit.mockResolvedValue({
      data: mockEntries,
      error: null,
    });

    // Test default limit
    const request1 = new Request("http://localhost:4321/api/kb/entries");
    const context1 = createAPIContext(request1, {
      supabase: mockSupabase,
      user: null,
    });
    const response1 = await GET(context1);
    expect(response1.status).toBe(200);
    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(21); // limit + 1

    // Test custom limit
    vi.clearAllMocks();
    mockQueryBuilder.limit.mockResolvedValue({
      data: mockEntries.slice(0, 10),
      error: null,
    });
    const request2 = new Request(
      "http://localhost:4321/api/kb/entries?limit=10",
    );
    const context2 = createAPIContext(request2, {
      supabase: mockSupabase,
      user: null,
    });
    const response2 = await GET(context2);
    expect(response2.status).toBe(200);
    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(11); // limit + 1

    // Test invalid limit (too low)
    const request3 = new Request(
      "http://localhost:4321/api/kb/entries?limit=0",
    );
    const context3 = createAPIContext(request3, {
      supabase: mockSupabase,
      user: null,
    });
    const response3 = await GET(context3);
    expect(response3.status).toBe(400);

    // Test invalid limit (too high)
    const request4 = new Request(
      "http://localhost:4321/api/kb/entries?limit=101",
    );
    const context4 = createAPIContext(request4, {
      supabase: mockSupabase,
      user: null,
    });
    const response4 = await GET(context4);
    expect(response4.status).toBe(400);
  });

  it("should return response in KeysetPage format", async () => {
    const mockEntries = [
      {
        id: "1",
        user_id: "user-1",
        title: "Entry 1",
        url_original: "https://example.com/1",
        url_canonical: "https://example.com/1",
        tags: [],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        search_vector: null,
      },
      {
        id: "2",
        user_id: "user-1",
        title: "Entry 2",
        url_original: "https://example.com/2",
        url_canonical: "https://example.com/2",
        tags: [],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        search_vector: null,
      },
      {
        id: "3",
        user_id: "user-1",
        title: "Entry 3",
        url_original: "https://example.com/3",
        url_canonical: "https://example.com/3",
        tags: [],
        is_public: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-03T00:00:00Z",
        search_vector: null,
      },
    ];

    // Return 21 items (limit + 1) to test pagination
    mockQueryBuilder.limit.mockResolvedValue({
      data: mockEntries.concat(
        Array.from({ length: 18 }, (_, i) => ({
          id: `${i + 4}`,
          user_id: "user-1",
          title: `Entry ${i + 4}`,
          url_original: `https://example.com/${i + 4}`,
          url_canonical: `https://example.com/${i + 4}`,
          tags: [],
          is_public: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          search_vector: null,
        })),
      ),
      error: null,
    });

    const request = new Request(
      "http://localhost:4321/api/kb/entries?limit=20",
    );
    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: null,
    });

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("next_cursor");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBe(20); // Only first 20 items
    expect(body.next_cursor).toBeDefined();
    expect(body.next_cursor).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:Z.,]+,\d+$/);
  });

  it("should handle database errors", async () => {
    mockQueryBuilder.limit.mockResolvedValue({
      data: null,
      error: { message: "Database connection failed" },
    });

    const request = new Request("http://localhost:4321/api/kb/entries");
    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: null,
    });

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("DATABASE_ERROR");
    expect(body.error.message).toBe("Database connection failed");
  });

  it("should handle missing supabase client", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries");
    const context = createAPIContext(request, {
      supabase: null,
      user: null,
    });

    const response = await GET(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("CONFIGURATION_ERROR");
    expect(body.error.message).toBe("Supabase client not available");
  });
});

describe("POST /api/kb/entries", () => {
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

  it("should create entry for authenticated user", async () => {
    const mockCreatedEntry = {
      id: "new-entry-id",
      user_id: "user-123",
      title: "New Entry",
      url_original: "https://example.com/new",
      url_canonical: "https://example.com/new",
      tags: ["tag1", "tag2"],
      is_public: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      search_vector: null,
    };

    mockQueryBuilder.single.mockResolvedValue({
      data: mockCreatedEntry,
      error: null,
    });

    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Entry",
        url_original: "https://example.com/new",
        tags: ["tag1", "tag2"],
        is_public: false,
      }),
    });

    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com" },
    });

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toBeDefined();
    expect(body.data.title).toBe("New Entry");
    expect(body.data).not.toHaveProperty("search_vector");
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        title: "New Entry",
        url_original: "https://example.com/new",
        tags: ["tag1", "tag2"],
        is_public: false,
      }),
    );
  });

  it("should reject unauthenticated users", async () => {
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
      user: null,
    });

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("Authentication required");
    expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
  });

  it("should validate input data with Zod schema", async () => {
    // Test missing title
    const request1 = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url_original: "https://example.com/new",
      }),
    });

    const context1 = createAPIContext(request1, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com" },
    });

    const response1 = await POST(context1);
    expect(response1.status).toBe(400);
    const body1 = await response1.json();
    expect(body1.error.code).toBe("VALIDATION_ERROR");

    // Test invalid URL
    const request2 = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Entry",
        url_original: "not-a-url",
      }),
    });

    const context2 = createAPIContext(request2, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com" },
    });

    const response2 = await POST(context2);
    expect(response2.status).toBe(400);
    const body2 = await response2.json();
    expect(body2.error.code).toBe("VALIDATION_ERROR");

    // Test title too long
    const request3 = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "a".repeat(201),
        url_original: "https://example.com/new",
      }),
    });

    const context3 = createAPIContext(request3, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com" },
    });

    const response3 = await POST(context3);
    expect(response3.status).toBe(400);
    const body3 = await response3.json();
    expect(body3.error.code).toBe("VALIDATION_ERROR");
  });

  it("should set is_public to false by default if not provided", async () => {
    const mockCreatedEntry = {
      id: "new-entry-id",
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
      data: mockCreatedEntry,
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
      user: { id: "user-123", email: "user@example.com" },
    });

    const response = await POST(context);
    expect(response.status).toBe(201);

    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_public: false,
      }),
    );
  });

  it("should handle database errors", async () => {
    mockQueryBuilder.single.mockResolvedValue({
      data: null,
      error: { message: "Duplicate entry" },
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
      user: { id: "user-123", email: "user@example.com" },
    });

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("DATABASE_ERROR");
    expect(body.error.message).toBe("Duplicate entry");
  });

  it("should handle missing supabase client", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Entry",
        url_original: "https://example.com/new",
      }),
    });

    const context = createAPIContext(request, {
      supabase: null,
      user: { id: "user-123", email: "user@example.com" },
    });

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("CONFIGURATION_ERROR");
  });

  it("should handle invalid JSON in request body", async () => {
    const request = new Request("http://localhost:4321/api/kb/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const context = createAPIContext(request, {
      supabase: mockSupabase,
      user: { id: "user-123", email: "user@example.com" },
    });

    // Mock request.json to throw SyntaxError
    vi.spyOn(request, "json").mockRejectedValue(
      new SyntaxError("Invalid JSON"),
    );

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
