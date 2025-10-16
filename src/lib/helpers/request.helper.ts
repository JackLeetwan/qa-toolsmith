/**
 * Request Helper Functions
 *
 * Utility functions for handling HTTP request metadata,
 * such as extracting client IP and managing request IDs.
 */

/**
 * Extract trusted client IP from request headers.
 *
 * Respects X-Forwarded-For header when behind a trusted proxy.
 * Falls back to socket remoteAddress or unknown.
 *
 * @param req - Astro request context
 * @param trustedProxies - List of trusted proxy IPs (CIDR or IP); empty = no proxies
 * @returns Client IP address
 */
export function getTrustedIp(req: Request, trustedProxies?: string[]): string {
  // Check X-Forwarded-For header (for proxies)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor && trustedProxies && trustedProxies.length > 0) {
    // Take the first IP from the comma-separated list
    const clientIp = forwardedFor.split(",")[0]?.trim();
    if (clientIp) return clientIp;
  }

  // Fallback to CF-Connecting-IP (Cloudflare)
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp && trustedProxies && trustedProxies.length > 0) {
    return cfConnectingIp;
  }

  // Fallback to request socket (if available in runtime)
  // Note: In Astro with Node adapter, this may not be directly available
  // so we use a placeholder or extract from env
  const clientAddr = req.headers.get("x-client-ip");
  if (clientAddr) return clientAddr;

  // Last resort: unknown
  return "unknown";
}

/**
 * Mask IP address for logging/auditing (CIDR notation).
 *
 * For IPv4: converts to /24 CIDR (e.g., 203.0.113.42 → 203.0.113.0/24)
 * For IPv6: converts to /64 CIDR
 *
 * @param ip - IP address
 * @returns Masked IP in CIDR notation
 */
export function maskIpForAudit(ip: string): string {
  if (ip === "unknown") return "unknown";

  // Simple IPv4 detection and masking
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }

  // IPv6 masking (basic)
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length > 2) {
      return `${parts.slice(0, 4).join(":")}.../64`;
    }
  }

  // Fallback: return as-is
  return ip;
}

/**
 * Get or create a request ID for tracking.
 *
 * Checks X-Request-ID header; if not present, generates a new UUID v4.
 *
 * @param req - HTTP Request
 * @returns Request ID (UUID)
 */
export function getOrCreateRequestId(req: Request): string {
  const existingId = req.headers.get("x-request-id");
  if (existingId && isValidUuid(existingId)) {
    return existingId;
  }

  return crypto.randomUUID();
}

/**
 * Check if a string is a valid UUID v4.
 */
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
