import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { maskIpForAudit } from "./request.helper";
import crypto from "crypto";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_KEY)");
}

const supabaseDb = createClient<Database>(supabaseUrl, supabaseServiceKey);

export interface AuditLoginAttemptParams {
  userId?: string | null;
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
export async function auditLoginAttempt(params: AuditLoginAttemptParams): Promise<void> {
  const { userId = null, email, ip, userAgent, status, reason = null } = params;

  try {
    const userAgentHash = userAgent ? sha256(userAgent) : null;
    const maskedIp = maskIpForAudit(ip);

    await supabaseDb.from("usage_events").insert({
      user_id: userId as string | null,
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
    // eslint-disable-next-line no-console
    console.error("[AuditError] Failed to record login attempt:", err);
  }
}

/**
 * Compute SHA-256 hash of a string.
 */
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
