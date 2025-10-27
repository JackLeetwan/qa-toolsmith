import type { APIContext } from "astro";
import { createSupabaseServerInstance } from "../db/supabase.client";
import type { Role } from "../types/types";
import { logger } from "../lib/utils/logger";

export async function middlewareHandler(
  context: APIContext,
  next: () => Promise<Response>,
): Promise<Response> {
  const { pathname } = context.url;
  const { method } = context.request;
  const timestamp = new Date().toISOString();

  logger.info("🛡️ Middleware processing:", { pathname, method, timestamp });

  // Define public paths that don't require Supabase or authentication
  const publicPaths = [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/reset",
    "/auth/reset/confirm",
    "/logout",
    "/api/auth/signin",
    "/api/auth/signup",
    "/api/auth/signout",
    "/api/auth/reset-request",
    "/api/auth/reset-change",
    "/api/health",
    "/generators",
    "/generators/iban",
    "/api/generators/iban",
    "/api/validators/iban",
  ];

  // Check if current path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  // Create supabase client
  let supabase;
  try {
    supabase = createSupabaseServerInstance({
      cookies: context.cookies,
      headers: context.request.headers,
    });
  } catch (error) {
    logger.error("❌ Failed to create Supabase client:", error);

    // For public paths, continue without Supabase
    if (isPublicPath) {
      logger.warn("⚠️ Continuing without Supabase for public path:", pathname);
      return next();
    }

    // For protected paths, return error
    return new Response(
      JSON.stringify({
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Server configuration error. Please contact administrator.",
          details: error instanceof Error ? error.message : String(error),
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Set supabase client in locals
  context.locals.supabase = supabase;

  // Define protected paths that require authentication
  const protectedPaths = ["/kb", "/templates", "/charters", "/admin"];

  // Check if current path is protected
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );

  logger.info("🔍 Checking user session...");

  // Always try to get user session
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getUser();

  if (sessionError) {
    logger.error("❌ Error getting user session:", sessionError);
    // For protected paths, redirect to login
    if (isProtectedPath) {
      return context.redirect(
        `/auth/login?next=${encodeURIComponent(pathname)}`,
      );
    }
    // For public paths, continue without user context
    logger.info(
      "✅ Public path, allowing access without user context:",
      pathname,
    );
    return next();
  }

  const user = sessionData?.user;

  if (!user) {
    logger.info("❌ No authenticated user found");
    // For protected paths, redirect to login
    if (isProtectedPath) {
      logger.info(
        "🔒 Protected path requires auth, redirecting to login:",
        pathname,
      );
      return context.redirect(
        `/auth/login?next=${encodeURIComponent(pathname)}`,
      );
    }
    // For public paths, continue without user context
    logger.info("✅ Public path, allowing access:", pathname);
    return next();
  }

  // User is authenticated - fetch profile and set context
  logger.info("✅ User authenticated, fetching profile for user:", {
    id: user.id.substring(0, 8) + "...", // Log only first 8 chars for security
    email: user.email ? user.email.split("@")[0] + "@..." : "unknown", // Hide email domain
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    logger.error("❌ Error fetching user profile:", profileError);
    // Default to user role on error
    context.locals.user = {
      id: user.id,
      email: user.email || "",
      role: "user" as Role,
    };
  } else {
    context.locals.user = {
      id: user.id,
      email: user.email || "",
      role: (profile?.role as Role) || "user",
    };
  }

  logger.info("✅ User context set:", {
    id: user.id.substring(0, 8) + "...", // Log only first 8 chars for security
    email: user.email ? user.email.split("@")[0] + "@..." : "unknown", // Hide email domain
    role: context.locals.user.role,
    pathname,
  });

  return next();
}
