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

  // Fallback to CF-Connecting-IP (Cloudflare) - always check this regardless of trustedProxies
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
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
 * For IPv6: converts to /64 CIDR, except ::1 which gets /128
 *
 * @param ip - IP address
 * @returns Masked IP in CIDR notation
 */
export function maskIpForAudit(ip: string): string {
  if (ip === "unknown") return "unknown";

  // Check for mixed formats (with brackets) - return as-is
  if (ip.includes("[") || ip.includes("]")) {
    return ip;
  }

  // For addresses with both : and ., check if it's IPv4 with port or IPv4-mapped IPv6
  if (ip.includes(":") && ip.includes(".")) {
    // If it looks like IPv4 with port (no ::ffff:), treat as IPv4
    if (!ip.includes("::ffff:")) {
      // Extract IPv4 part before port
      const ipv4Part = ip.split(":")[0];
      if (isValidIPv4(ipv4Part)) {
        const parts = ipv4Part.split(".");
        return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      }
    }
    // Otherwise, let IPv6 validation handle it (IPv4-mapped IPv6)
  }

  // Check if it's a valid IPv4 address
  if (isValidIPv4(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }

  // Check if it's a valid IPv6 address
  if (isValidIPv6(ip)) {
    // Special case for IPv6 localhost
    if (ip === "::1") {
      return "::1/128";
    }

    // For IPv6 masking, preserve the compressed form but mask to first 4 segments
    const parts = ip.split(":");

    // Find compression
    const compressionIndex = parts.indexOf("");

    if (compressionIndex === -1) {
      // No compression, take first 4 segments
      const maskedParts = parts.slice(0, 4);
      return `${maskedParts.join(":")}.../64`;
    }

    // Has compression
    const segmentsBeforeCompression = parts.slice(0, compressionIndex);
    const segmentsAfterCompression = parts
      .slice(compressionIndex)
      .filter((p) => p !== "");

    // Prioritize segments before compression, but if none, use segments after (but limit to 4 total)
    let maskedParts = segmentsBeforeCompression.slice(0, 4);
    if (maskedParts.length === 0) {
      maskedParts = segmentsAfterCompression.slice(0, 1); // Only take the first segment after ::
    }

    // For addresses starting with "::", include the "::" in the result if we took segments after compression
    let prefix = "";
    if (
      segmentsBeforeCompression.length === 0 &&
      segmentsAfterCompression.length > 0
    ) {
      prefix = "::";
    }

    // Ensure we have at least one segment
    if (maskedParts.length === 0) {
      maskedParts.push("0");
    }

    return `${prefix}${maskedParts.join(":")}.../64`;
  }

  // Invalid or unrecognized IP format - return as-is
  return ip;
}

/**
 * Check if string is a valid IPv4 address
 */
function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
    // Allow leading zeros - they're valid in IPv4
  }

  return true;
}

/**
 * Check if string is a valid IPv6 address
 */
function isValidIPv6(ip: string): boolean {
  // Basic IPv6 validation - must contain :
  if (!ip.includes(":")) return false;

  try {
    // Try to expand - if it works, it's valid
    return expandIPv6(ip) !== null;
  } catch {
    return false;
  }
}

/**
 * Expand compressed IPv6 address to full form
 */
function expandIPv6(ip: string): string | null {
  // Handle IPv4-mapped IPv6
  if (ip.includes(".")) {
    const parts = ip.split(":");
    const lastPart = parts[parts.length - 1];
    if (!lastPart.includes(".")) return null;

    const ipv4Parts = lastPart.split(".");
    if (ipv4Parts.length !== 4) return null;
    for (const part of ipv4Parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) return null;
    }

    // Convert IPv4 to two hex segments
    const ipv4Value = ipv4Parts.map((p) => parseInt(p, 10));
    const high = (ipv4Value[0] << 8) | ipv4Value[1];
    const low = (ipv4Value[2] << 8) | ipv4Value[3];
    parts[parts.length - 2] = high.toString(16);
    parts[parts.length - 1] = low.toString(16);

    return expandIPv6(parts.join(":"));
  }

  // Regular IPv6 expansion
  const parts = ip.split(":");

  // Check for invalid multiple ::
  const colonCount = (ip.match(/::/g) || []).length;
  if (colonCount > 1) return null;

  // Find compression (::) - look for the start of compression
  let compressionIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") {
      if (compressionIndex === -1) {
        compressionIndex = i;
      }
      // Allow consecutive empty parts as part of the same compression
    }
  }

  if (compressionIndex === -1) {
    // No compression, validate as-is
    if (parts.length !== 8) return null;
  } else {
    // Has compression, expand it
    const beforeCompression = parts.slice(0, compressionIndex);

    // Find the end of compression (first non-empty part after compression)
    let compressionEnd = compressionIndex;
    while (compressionEnd < parts.length && parts[compressionEnd] === "") {
      compressionEnd++;
    }
    const afterCompression = parts
      .slice(compressionEnd)
      .filter((p) => p !== "");

    const totalSegments = beforeCompression.length + afterCompression.length;
    const missingSegments = 8 - totalSegments;

    if (missingSegments < 0) return null;

    // Rebuild parts with expanded compression
    parts.splice(
      0,
      parts.length,
      ...beforeCompression,
      ...Array(missingSegments).fill("0"),
      ...afterCompression,
    );
  }

  // Validate exactly 8 segments
  if (parts.length !== 8) return null;

  // Validate each segment
  for (const part of parts) {
    const num = parseInt(part, 16);
    if (isNaN(num) || num < 0 || num > 0xffff) return null;
  }

  // Return in canonical form
  return parts.map((part) => parseInt(part, 16).toString(16)).join(":");
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
export function isValidUuid(str: unknown): boolean {
  if (typeof str !== "string") {
    return false;
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
