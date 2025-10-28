import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from "astro:env/server";

// Allow bypassing credential check in test environment
const supabaseUrl = import.meta.env.VITEST
  ? "https://test.supabase.co"
  : SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITEST
  ? "test-service-key"
  : SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_KEY)",
  );
}

/**
 * Create a Supabase client with service role permissions.
 * This client is used server-side only to authenticate users.
 */
const supabaseAuth = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface LoginCommand {
  email: string;
  password: string;
  ip: string;
  userAgent?: string;
}

export interface LoginSession {
  access_token: string;
  expires_in: number;
  user_id: string;
}

/**
 * Authenticate user with email/password against Supabase Auth.
 *
 * Maps Supabase errors to application error codes and HTTP status codes.
 *
 * @param cmd - Login command with credentials and context (IP, User-Agent)
 * @returns Session with JWT access token and user ID
 * @throws Error with status 401 for invalid credentials, 500 for provider errors
 */
export async function loginWithPassword(
  cmd: LoginCommand,
): Promise<LoginSession> {
  const { email, password } = cmd;

  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase error codes to application errors
      if (error.status === 400 || error.status === 401) {
        // Invalid email/password or user not found
        const authError = new Error("invalid_credentials") as Error & {
          status: number;
          code: string;
        };
        authError.status = 401;
        authError.code = "INVALID_CREDENTIALS";
        throw authError;
      }

      // Unexpected error from auth provider
      const providerError = new Error("auth_provider_error") as Error & {
        status: number;
        code: string;
        originalError: typeof error;
      };
      providerError.status = 500;
      providerError.code = "INTERNAL";
      providerError.originalError = error;
      throw providerError;
    }

    if (!data.session) {
      const sessionError = new Error("no_session_returned") as Error & {
        status: number;
        code: string;
      };
      sessionError.status = 500;
      sessionError.code = "INTERNAL";
      throw sessionError;
    }

    return {
      access_token: data.session.access_token,
      expires_in: data.session.expires_in ?? 3600,
      user_id: data.session.user.id,
    };
  } catch (err: unknown) {
    // If already wrapped with our error code, rethrow
    const typedErr = err as Error & { code?: string; status?: number };
    if (typedErr.code && typedErr.status) {
      throw err;
    }

    // Unexpected error
    const unexpectedError = new Error("unexpected_error") as Error & {
      status: number;
      code: string;
      originalError: unknown;
    };
    unexpectedError.status = 500;
    unexpectedError.code = "INTERNAL";
    unexpectedError.originalError = err;
    throw unexpectedError;
  }
}

/**
 * Get Supabase client for other operations (e.g., fetching user data).
 */
export function getAuthClient() {
  return supabaseAuth;
}
