import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types";

// Determine if we're in production based on environment
const isProduction =
  import.meta.env.PROD || import.meta.env.ENV_NAME === "production";

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
}) => {
  // Try import.meta.env first (works in Cloudflare), fallback to process.env (works in Node adapter runtime)
  // Get process from globalThis to work around Vite bundling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeProcess = (globalThis as any).process || undefined;
  const supabaseUrl =
    import.meta.env.SUPABASE_URL || nodeProcess?.env?.SUPABASE_URL;
  const supabaseKey =
    import.meta.env.SUPABASE_KEY || nodeProcess?.env?.SUPABASE_KEY;

  // Comprehensive debug logging in all modes to diagnose environment issues
  // eslint-disable-next-line no-console
  console.log("🔍 DEBUG SUPABASE CLIENT INIT:", {
    timestamp: new Date().toISOString(),
    environment: {
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      dev: import.meta.env.DEV,
      envName: import.meta.env.ENV_NAME,
    },
    supabaseUrl: {
      fromImportMeta: import.meta.env.SUPABASE_URL ? "✅ Set" : "❌ Missing",
      fromProcessEnv: nodeProcess?.env?.SUPABASE_URL ? "✅ Set" : "❌ Missing",
      final: supabaseUrl
        ? supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
          ? "⚠️ LOCALHOST"
          : "✅ CLOUD"
        : "❌ MISSING",
      value: supabaseUrl || "❌ NOT SET",
    },
    supabaseKey: {
      fromImportMeta: import.meta.env.SUPABASE_KEY ? "✅ Set" : "❌ Missing",
      fromProcessEnv: nodeProcess?.env?.SUPABASE_KEY ? "✅ Set" : "❌ Missing",
      final: supabaseKey
        ? `✅ Set (${supabaseKey.substring(0, 20)}...)`
        : "❌ MISSING",
    },
    processAvailable: {
      exists: typeof process !== "undefined" ? "✅ Yes" : "❌ No",
      env: nodeProcess?.env ? "✅ Yes" : "❌ No",
    },
    globalThis: {
      process: nodeProcess ? "✅ Available" : "❌ Not available",
    },
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
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

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
