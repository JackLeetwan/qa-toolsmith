import type { APIRoute } from "astro";
import { z } from "zod";
import type { KBEntryDTO, KBListResponse } from "@/types/types";
import { KbEntryCreateSchema, KbEntryQuerySchema } from "@/lib/validators/kb";

export const prerender = false;

/**
 * GET /api/kb/entries
 *
 * Retrieves KB entries with conditional logic:
 * - Authenticated users: own entries + public entries
 * - Anonymous users: only public entries (is_public = true)
 *
 * Query parameters:
 * - after?: string - cursor for keyset pagination (format: "updated_at,id")
 * - limit?: number - items per page (1-100, default 20)
 *
 * Response 200:
 * { items: KBEntryDTO[], next_cursor?: string }
 *
 * Response 500:
 * { error: { code: "CONFIGURATION_ERROR" | "DATABASE_ERROR", message: string } }
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  const user = locals.user; // może być null

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Supabase client not available",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      after: url.searchParams.get("after") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const parsed = KbEntryQuerySchema.parse(queryParams);

    // Build base query
    let query = supabase.from("kb_entries").select("*");

    // Apply conditional filtering based on authentication
    if (user) {
      // Authenticated: own entries + public entries
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
    } else {
      // Anonymous: only public entries
      query = query.eq("is_public", true);
    }

    // Apply keyset pagination cursor if provided
    if (parsed.after) {
      const [updatedAt, id] = parsed.after.split(",");
      if (updatedAt && id) {
        // Keyset pagination: get items where updated_at < cursor_updated_at
        // OR (updated_at = cursor_updated_at AND id < cursor_id)
        // Since we order descending, we filter for items "before" the cursor
        query = query.or(
          `updated_at.lt.${updatedAt},and(updated_at.eq.${updatedAt},id.lt.${id})`,
        );
      }
    }

    // Apply sorting and limit
    // Fetch limit + 1 to determine if there's a next page
    query = query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(parsed.limit + 1);

    const { data, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: "DATABASE_ERROR",
            message: error.message,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Process results for pagination
    const items = data?.slice(0, parsed.limit) || [];
    const hasNextPage = (data?.length || 0) > parsed.limit;

    // Calculate next_cursor from the last item
    const next_cursor =
      hasNextPage && items.length > 0
        ? `${items[items.length - 1].updated_at},${items[items.length - 1].id}`
        : undefined;

    // Remove search_vector from response (internal field)
    const itemsWithoutSearchVector: KBEntryDTO[] = items.map((item) => {
      const clone = { ...item } as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (clone as any).search_vector;
      return clone as KBEntryDTO;
    });

    const response: KBListResponse = {
      items: itemsWithoutSearchVector,
      next_cursor,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.errors,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Handle unexpected errors
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL",
          message: "An unexpected error occurred",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

/**
 * POST /api/kb/entries
 *
 * Creates a new KB entry (requires authentication)
 *
 * Request body:
 * {
 *   title: string (1-200 chars),
 *   url_original: string (valid URL),
 *   tags?: string[],
 *   is_public?: boolean (default: false)
 * }
 *
 * Response 201:
 * { data: KBEntryDTO }
 *
 * Response 400:
 * { error: { code: "VALIDATION_ERROR", message: string, details?: ZodError[] } }
 *
 * Response 401:
 * { error: { code: "UNAUTHENTICATED", message: string } }
 *
 * Response 500:
 * { error: { code: "DATABASE_ERROR", message: string } }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  const user = locals.user;

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Supabase client not available",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await request.json();
    const validated = KbEntryCreateSchema.parse(body);

    // Role pre-checks: only admins can create public entries
    if (user.role !== "admin" && validated.is_public === true) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Only admins can create public KB entries",
            details: null,
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Insert entry - search_vector is required by type but will be auto-populated by trigger
    const { data, error } = await supabase
      .from("kb_entries")
      .insert({
        user_id: user.id,
        title: validated.title,
        url_original: validated.url_original,
        tags: validated.tags,
        // Enforce is_public = false for non-admin users
        is_public: user.role === "admin" ? validated.is_public : false,
        // search_vector is required by type but auto-populated by trigger, so we set it to null
        search_vector: null as unknown,
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: "DATABASE_ERROR",
            message: error.message,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Remove internal field from response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (data as any).search_vector;
    return new Response(JSON.stringify({ data: data as KBEntryDTO }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: error.errors,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid JSON in request body",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Handle unexpected errors
    throw error;
  }
};
