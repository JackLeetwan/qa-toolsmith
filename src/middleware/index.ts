import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import { defineMiddleware } from "astro:middleware";

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/auth/login",
  "/auth/register",
  "/auth/reset",
  "/auth/reset/confirm",
  "/logout",
  // Auth API endpoints
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/signout",
  "/api/auth/reset-request",
  "/api/auth/reset-change",
  // Health check
  "/api/health",
  // Public generators (read-only)
  "/generators",
  "/generators/iban",
  "/generators/[kind]",
  // Home page
  "/",
];

// Protected paths that require authentication
const PROTECTED_PATHS = ["/kb", "/templates", "/charters", "/admin"];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // eslint-disable-next-line no-console
  console.log("🛡️ Middleware processing:", {
    pathname: url.pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
  });

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Always check user session for all paths to populate locals.user
  // eslint-disable-next-line no-console
  console.log("🔍 Checking user session...");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    // eslint-disable-next-line no-console
    console.error("❌ Error getting user session:", userError);
  }

  if (user) {
    // eslint-disable-next-line no-console
    console.log("✅ User authenticated:", {
      id: user.id,
      email: user.email,
      pathname: url.pathname,
    });

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      // eslint-disable-next-line no-console
      console.error("❌ Error fetching user profile:", profileError);
    }

    locals.user = {
      email: user.email || "",
      id: user.id,
      role: (profile?.role as "admin" | "user") || "user", // Default to "user" if profile not found
    };
    locals.supabase = supabase;
  } else {
    // eslint-disable-next-line no-console
    console.log("❌ No authenticated user found");
    locals.supabase = supabase;
  }

  // Check if this is a protected path that requires authentication
  const isProtectedPath = PROTECTED_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(path + "/"));

  if (isProtectedPath && !user) {
    // eslint-disable-next-line no-console
    console.log("🔒 Protected path requires auth, redirecting to login:", url.pathname);
    // Redirect to login for protected routes
    const redirectUrl = `/auth/login?next=${encodeURIComponent(url.pathname)}`;
    return redirect(redirectUrl);
  }

  // Check if this is a public path (for logging purposes)
  const isPublicPath =
    PUBLIC_PATHS.includes(url.pathname) ||
    url.pathname.startsWith("/api/generators/") ||
    url.pathname.startsWith("/api/validators/");

  if (isPublicPath) {
    // eslint-disable-next-line no-console
    console.log("✅ Public path, allowing access:", url.pathname);
  } else {
    // eslint-disable-next-line no-console
    console.log("🌐 Standard path, allowing access:", url.pathname);
  }

  return next();
});
