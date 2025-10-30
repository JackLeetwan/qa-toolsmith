import { z } from "zod";

/**
 * Schema for creating a KB entry
 */
export const KbEntryCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  url_original: z.string().url("Invalid URL format"),
  tags: z.array(z.string()).default([]),
  is_public: z.boolean().default(false),
});

/**
 * Schema for updating a KB entry (all fields optional)
 */
export const KbEntryUpdateSchema = KbEntryCreateSchema.partial();

/**
 * Schema for query parameters (GET /api/kb/entries)
 * - after: cursor for keyset pagination (format: "updated_at,id")
 * - limit: number of items per page (1-100, default 20)
 */
export const KbEntryQuerySchema = z.object({
  after: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
