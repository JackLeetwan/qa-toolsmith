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
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY;

  // Debug logging in all modes to diagnose CI issues
  // eslint-disable-next-line no-console
  console.log("🔍 DEBUG SUPABASE CLIENT:", {
    url: supabaseUrl || "❌ MISSING",
    urlType: supabaseUrl
      ? supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
        ? "⚠️ LOCALHOST"
        : "✅ CLOUD"
      : "N/A",
    key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : "❌ MISSING",
    nodeEnv: import.meta.env.MODE,
    dev: import.meta.env.DEV,
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
