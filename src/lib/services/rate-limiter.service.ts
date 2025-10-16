/**
 * Rate Limiter Service
 *
 * Enforces rate limiting per IP address using in-memory storage.
 * In production, this should be backed by Redis for distributed systems.
 *
 * Limits: 10 requests per 60 seconds per IP.
 */

interface RateLimitEntry {
  count: number;
  expireAt: number;
}

const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds in ms
const RATE_LIMIT_MAX = 10; // max requests per window

// In-memory store; in production, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Consume one rate-limit token for the given IP.
 * Throws an error with status 429 if limit exceeded.
 *
 * @param ip - The IP address to rate limit
 * @throws Error with status=429 and retryAfter=TTL if limit exceeded
 */
export async function consume(ip: string): Promise<void> {
  const now = Date.now();
  const key = `rl:login:${ip}`;

  let entry = rateLimitStore.get(key);

  // Expire old entries
  if (entry && entry.expireAt < now) {
    rateLimitStore.delete(key);
    entry = undefined;
  }

  if (!entry) {
    // New entry
    rateLimitStore.set(key, {
      count: 1,
      expireAt: now + RATE_LIMIT_WINDOW,
    });
    return;
  }

  // Increment counter
  entry.count += 1;

  // Check limit
  if (entry.count > RATE_LIMIT_MAX) {
    const ttl = Math.ceil((entry.expireAt - now) / 1000);
    const error = new Error("rate_limited") as Error & {
      status: number;
      code: string;
      retryAfter: number;
    };
    error.status = 429;
    error.code = "RATE_LIMITED";
    error.retryAfter = ttl > 0 ? ttl : 60;
    throw error;
  }
}

/**
 * Reset rate limit for a given IP (useful for testing).
 */
export function reset(ip: string): void {
  const key = `rl:login:${ip}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limit entries (useful for testing).
 */
export function resetAll(): void {
  rateLimitStore.clear();
}
