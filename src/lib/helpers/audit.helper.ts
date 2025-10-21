import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { maskIpForAudit } from "./request.helper";
import { logger } from "@/lib/utils/logger";
import crypto from "crypto";

export function getSupabaseDb(): ReturnType<typeof createClient<Database>> {
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

export interface AuditLoginAttemptParams {
  userId: string;
  email?: string;
  ip: string;
  userAgent?: string;
  status: "success" | "failure";
  reason?: string;
}

/**
 * Record a login attempt to the usage_events table.
 *
 * Per plan: kind='auth', with masked IP and hashed User-Agent for privacy.
 * No sensitive data (passwords, full IPs) are stored.
 *
 * @param params - Audit parameters
 */
export async function auditLoginAttempt(
  params: AuditLoginAttemptParams,
): Promise<void> {
  const { userId, email, ip, userAgent, status, reason = null } = params;

  try {
    const userAgentHash = userAgent ? sha256(userAgent) : null;
    const maskedIp = maskIpForAudit(ip);

    await getSupabaseDb()
      .from("usage_events")
      .insert({
        user_id: userId,
        kind: "auth" as const,
        meta: {
          status,
          reason,
          ip_cidr: maskedIp,
          user_agent_hash: userAgentHash,
          email_normalized: email?.toLowerCase() ?? null,
        },
      });
  } catch (err) {
    // Audit failure should not crash the request
    logger.error("[AuditError] Failed to record login attempt:", err);
  }
}

/**
 * Compute SHA-256 hash of a string.
 */
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
