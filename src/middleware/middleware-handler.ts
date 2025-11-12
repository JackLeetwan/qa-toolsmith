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
      runtimeEnv: (
        context.locals as unknown as {
          runtime?: { env?: Record<string, string> };
        }
      ).runtime?.env,
    });
  } catch (error) {
    logger.error("❌ Failed to create Supabase client:", error);

    // For public paths, continue without Supabase
    if (isPublicPath) {
      logger.warn("⚠️ Continuing without Supabase for public path:", pathname);
      return next();
    }

    // For protected paths, return error with security headers
    const errorResponse = new Response(
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

    // Add security headers
    const secureErrorHeaders = new Headers(errorResponse.headers);
    secureErrorHeaders.set("X-Frame-Options", "DENY");
    secureErrorHeaders.set("X-Content-Type-Options", "nosniff");
    secureErrorHeaders.set("X-XSS-Protection", "1; mode=block");

    return new Response(errorResponse.body, {
      status: errorResponse.status,
      statusText: errorResponse.statusText,
      headers: secureErrorHeaders,
    });
  }

  // Set supabase client in locals
  context.locals.supabase = supabase;

  // Define protected paths that require authentication
  const protectedPaths = ["/templates", "/charters", "/admin"];

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
      const redirectResponse = context.redirect(
        `/auth/login?next=${encodeURIComponent(pathname)}`,
      );

      // Add security headers to redirect response
      const secureRedirectHeaders = new Headers(redirectResponse.headers);
      secureRedirectHeaders.set("X-Frame-Options", "DENY");
      secureRedirectHeaders.set("X-Content-Type-Options", "nosniff");
      secureRedirectHeaders.set("X-XSS-Protection", "1; mode=block");

      return new Response(redirectResponse.body, {
        status: redirectResponse.status,
        statusText: redirectResponse.statusText,
        headers: secureRedirectHeaders,
      });
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
      const redirectResponse = context.redirect(
        `/auth/login?next=${encodeURIComponent(pathname)}`,
      );

      // Add security headers to redirect response
      const secureRedirectHeaders = new Headers(redirectResponse.headers);
      secureRedirectHeaders.set("X-Frame-Options", "DENY");
      secureRedirectHeaders.set("X-Content-Type-Options", "nosniff");
      secureRedirectHeaders.set("X-XSS-Protection", "1; mode=block");

      return new Response(redirectResponse.body, {
        status: redirectResponse.status,
        statusText: redirectResponse.statusText,
        headers: secureRedirectHeaders,
      });
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

  // Get the response from the next handler
  const response = await next();

  // Add security headers to all responses
  const securityHeaders = new Headers(response.headers);

  // Content Security Policy - restrict resource loading
  securityHeaders.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'",
  );

  // Prevent clickjacking
  securityHeaders.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  securityHeaders.set("X-Content-Type-Options", "nosniff");

  // Referrer Policy
  securityHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Prevent XSS attacks (legacy header, but still useful)
  securityHeaders.set("X-XSS-Protection", "1; mode=block");

  // Permissions Policy (formerly Feature Policy)
  securityHeaders.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  // HTTP Strict Transport Security (HSTS)
  securityHeaders.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: securityHeaders,
  });
}
