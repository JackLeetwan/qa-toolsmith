import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";

// Determine if we're in production based on environment
const isProduction = import.meta.env.PROD;

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: isProduction, // Only use secure cookies in production (HTTPS)
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(
  cookieHeader: string,
): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
  // Cloudflare Pages Functions runtime bindings (available via locals.runtime.env)
  runtimeEnv?: Record<string, string> | undefined;
}) => {
  // Priority order for environment variables:
  // 1. Cloudflare runtime bindings (context.runtimeEnv)
  // 2. astro:env/server (typowane, bezpieczne)
  // 3. Node process.env fallback (for local preview/E2E)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeProcess = (globalThis as any).process || undefined;
  const bindingsUrl = context.runtimeEnv?.SUPABASE_URL;
  const bindingsKey = context.runtimeEnv?.SUPABASE_KEY;

  // Priority order: 1) Cloudflare bindings → 2) astro:env/server → 3) process.env fallback
  const supabaseUrl =
    bindingsUrl || SUPABASE_URL || nodeProcess?.env?.SUPABASE_URL;
  const supabaseKey =
    bindingsKey || SUPABASE_KEY || nodeProcess?.env?.SUPABASE_KEY;

  // Single, clear diagnostic log showing source priority and final values
  // eslint-disable-next-line no-console
  console.log("🔍 Supabase client init:", {
    envSource: {
      url: bindingsUrl
        ? "cloudflare-bindings"
        : SUPABASE_URL
          ? "astro:env/server"
          : nodeProcess?.env?.SUPABASE_URL
            ? "process.env"
            : "❌ missing",
      key: bindingsKey
        ? "cloudflare-bindings"
        : SUPABASE_KEY
          ? "astro:env/server"
          : nodeProcess?.env?.SUPABASE_KEY
            ? "process.env"
            : "❌ missing",
    },
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
  });

  if (!supabaseUrl || !supabaseKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!supabaseKey) missingVars.push("SUPABASE_KEY");

    throw new Error(
      `Missing Supabase environment variables: ${missingVars.join(", ")}. ` +
        "Please ensure these are set in Cloudflare Pages environment variables.",
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options),
        );
      },
    },
  });

  return supabase;
};

// Legacy client for backward compatibility
// Note: This is NOT used anywhere in the codebase but kept for backward compatibility
// Returns null when env vars are missing to prevent crashes
// Uses astro:env/server for typified environment access
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_KEY;

export const supabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookieOptions,
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op for legacy client
          },
        },
      })
    : null;
