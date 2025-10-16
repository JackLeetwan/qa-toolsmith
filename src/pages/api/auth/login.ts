/**
 * POST /auth/login
 *
 * Proxy login to Supabase Auth with rate limiting per IP.
 * Returns JWT access token + user profile on success.
 *
 * Flow:
 * 1. Validate request body (Zod schema)
 * 2. Apply rate-limit per IP (429 if exceeded)
 * 3. Authenticate with Supabase (401 on invalid credentials)
 * 4. Fetch user profile with retry logic
 * 5. Build response (LoginResponse)
 * 6. Audit attempt to usage_events
 * 7. Return 200 (or error status)
 *
 * Errors:
 * - 400: Invalid JSON or validation failure
 * - 401: Invalid credentials
 * - 429: Rate limit exceeded
 * - 500: Server error (Supabase, profile fetch, etc.)
 */

import { loginWithPassword } from "../../../lib/services/auth.service";
import { getByUserId } from "../../../lib/services/profile.service";
import { consume as rateLimitConsume } from "../../../lib/services/rate-limiter.service";
import { validateLoginRequest } from "../../../lib/validators/login.validator";
import { getTrustedIp, getOrCreateRequestId } from "../../../lib/helpers/request.helper";
import { auditLoginAttempt } from "../../../lib/helpers/audit.helper";
import { errorToHttpResponse } from "../../../lib/helpers/error.helper";
import type { LoginRequest, LoginResponse, ErrorResponse } from "../../../types/types";

export const prerender = false;

/**
 * POST /auth/login handler
 */
export async function POST(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const requestId = getOrCreateRequestId(request);
  const ip = getTrustedIp(request);

  let email: string | undefined;

  try {
    // 1. Validate Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const error = new Error("invalid_content_type") as Error & {
        status: number;
        code: string;
      };
      error.status = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    // 2. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const error = new Error("invalid_json") as Error & {
        status: number;
        code: string;
      };
      error.status = 400;
      error.code = "VALIDATION_ERROR";
      throw error;
    }

    const loginReq: LoginRequest = validateLoginRequest(body);
    email = loginReq.email;

    // 3. Apply rate-limit per IP
    await rateLimitConsume(ip);

    // 4. Authenticate with Supabase
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const session = await loginWithPassword({
      email: loginReq.email,
      password: loginReq.password,
      ip,
      userAgent,
    });

    // 5. Fetch profile (with retry)
    const profile = await getByUserId(session.user_id);

    // 6. Build success response
    const response: LoginResponse = {
      access_token: session.access_token,
      profile,
    };

    // 7. Audit success
    await auditLoginAttempt({
      userId: session.user_id,
      email: loginReq.email,
      ip,
      userAgent,
      status: "success",
    });

    // Return 200 OK with response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
    });
  } catch (err: unknown) {
    // Map error to HTTP response
    const typedErr = err as Error & { code?: string; message?: string };
    const { status, body, headers } = errorToHttpResponse(err);

    // Audit failure
    await auditLoginAttempt({
      email,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      status: "failure",
      reason: typedErr.code || typedErr.message || "unknown",
    });

    // Return error response
    return new Response(JSON.stringify(body as ErrorResponse), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        ...(headers || {}),
      },
    });
  }
}
