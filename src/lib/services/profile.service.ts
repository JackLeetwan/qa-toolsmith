import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { ProfileDTO } from "../../types/types";

function getSupabaseDb(): ReturnType<typeof createClient<Database>> {
  // Allow bypassing credential check in test environment
  if (import.meta.env.VITEST) {
    return createClient<Database>(
      "https://test.supabase.co",
      "test-service-key",
    );
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_KEY)",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

const PROFILE_RETRY_ATTEMPTS = 3;
const PROFILE_RETRY_DELAY = import.meta.env.VITEST ? 1 : 50; // ms - shorter delay for tests

/**
 * Fetch user profile by user ID with retry logic.
 *
 * After successful authentication, there may be a brief delay before the profile
 * record is created by the Supabase Auth → profiles trigger. This function
 * implements a short backoff to handle that race condition.
 *
 * @param userId - The user ID (UUID from auth.users)
 * @returns Profile DTO
 * @throws Error with status 500 if profile cannot be fetched after retries
 */
export async function getByUserId(userId: string): Promise<ProfileDTO> {
  for (let attempt = 0; attempt < PROFILE_RETRY_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await getSupabaseDb()
        .from("profiles")
        .select("id, email, role, created_at, updated_at")
        .eq("id", userId)
        .single();

      if (error) {
        // Not found; retry if attempts remaining
        if (attempt < PROFILE_RETRY_ATTEMPTS - 1) {
          await sleep(PROFILE_RETRY_DELAY);
          continue;
        }

        // Out of retries
        const fetchError = new Error("profile_not_ready") as Error & {
          status: number;
          code: string;
        };
        fetchError.status = 500;
        fetchError.code = "INTERNAL";
        throw fetchError;
      }

      if (!data) {
        if (attempt < PROFILE_RETRY_ATTEMPTS - 1) {
          await sleep(PROFILE_RETRY_DELAY);
          continue;
        }

        const noDataError = new Error("profile_not_ready") as Error & {
          status: number;
          code: string;
        };
        noDataError.status = 500;
        noDataError.code = "INTERNAL";
        throw noDataError;
      }

      // Success: return profile
      return {
        id: data.id,
        email: data.email,
        role: (data.role as "admin" | "user") || "user",
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (err: unknown) {
      // If already a wrapped error, rethrow on last attempt
      const typedErr = err as Error & { code?: string; status?: number };
      if (typedErr.code && typedErr.status) {
        if (attempt === PROFILE_RETRY_ATTEMPTS - 1) {
          throw err;
        }
        // Otherwise retry
        await sleep(PROFILE_RETRY_DELAY);
        continue;
      }

      // Unexpected error
      if (attempt === PROFILE_RETRY_ATTEMPTS - 1) {
        const unexpectedError = new Error("profile_fetch_error") as Error & {
          status: number;
          code: string;
          originalError: unknown;
        };
        unexpectedError.status = 500;
        unexpectedError.code = "INTERNAL";
        unexpectedError.originalError = err;
        throw unexpectedError;
      }

      await sleep(PROFILE_RETRY_DELAY);
    }
  }

  // Should not reach here, but fail gracefully
  const finalError = new Error("profile_not_ready") as Error & {
    status: number;
    code: string;
  };
  finalError.status = 500;
  finalError.code = "INTERNAL";
  throw finalError;
}

/**
 * Helper: Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
