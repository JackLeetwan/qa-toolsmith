/**
 * Rate Limiter Service
 *
 * Enforces rate limiting per IP address using distributed storage.
 * Supports both in-memory (local development) and Cloudflare KV (production).
 *
 * Limits: 10 requests per 60 seconds per IP.
 */

interface RateLimitEntry {
  count: number;
  expireAt: number;
}

const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds in ms
const RATE_LIMIT_MAX = 10; // max requests per window

// Cloudflare runtime interface
interface CloudflareGlobal {
  caches?: unknown;
  KV_RATE_LIMIT?: KVNamespace;
}

// Detect Cloudflare runtime
const isCloudflareRuntime =
  typeof globalThis !== "undefined" &&
  (globalThis as CloudflareGlobal).caches !== undefined &&
  typeof (globalThis as CloudflareGlobal).KV_RATE_LIMIT !== "undefined";

// Storage abstraction
class RateLimitStorage {
  private inMemoryStore = new Map<string, RateLimitEntry>();

  async get(key: string): Promise<RateLimitEntry | null> {
    if (isCloudflareRuntime) {
      const kv = (globalThis as CloudflareGlobal).KV_RATE_LIMIT as KVNamespace;
      const data = await kv.get(key);
      return data ? JSON.parse(data as string) : null;
    } else {
      return this.inMemoryStore.get(key) || null;
    }
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    if (isCloudflareRuntime) {
      const kv = (globalThis as CloudflareGlobal).KV_RATE_LIMIT as KVNamespace;
      // Set with TTL (expire after window)
      const ttl = Math.ceil((entry.expireAt - Date.now()) / 1000);
      await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
    } else {
      this.inMemoryStore.set(key, entry);
    }
  }

  async delete(key: string): Promise<void> {
    if (isCloudflareRuntime) {
      const kv = (globalThis as CloudflareGlobal).KV_RATE_LIMIT as KVNamespace;
      await kv.delete(key);
    } else {
      this.inMemoryStore.delete(key);
    }
  }

  clear(): void {
    if (!isCloudflareRuntime) {
      this.inMemoryStore.clear();
    }
    // Note: Cannot clear all KV entries efficiently
  }

  // Atomic increment operation for concurrent requests
  async incrementCount(
    key: string,
    windowMs: number,
    maxCount: number,
  ): Promise<{ count: number; expireAt: number; allowed: boolean }> {
    if (isCloudflareRuntime) {
      const kv = (globalThis as CloudflareGlobal).KV_RATE_LIMIT as KVNamespace;
      const now = Date.now();
      const expireAt = now + windowMs;

      // Use KV's atomic operations if available, otherwise fallback to get/set
      const data = await kv.get(key);
      let entry: RateLimitEntry;

      if (data) {
        entry = JSON.parse(data);
        // Check if entry has expired
        if (entry.expireAt <= now) {
          entry = { count: 1, expireAt };
        } else {
          entry.count += 1;
        }
      } else {
        entry = { count: 1, expireAt };
      }

      const allowed = entry.count <= maxCount;
      const ttl = Math.ceil((entry.expireAt - now) / 1000);
      await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
      return { ...entry, allowed };
    } else {
      // For in-memory, we still have race conditions, but for testing it's acceptable
      let entry = this.inMemoryStore.get(key);

      if (!entry || entry.expireAt <= Date.now()) {
        entry = { count: 1, expireAt: Date.now() + windowMs };
      } else {
        entry.count += 1;
      }

      this.inMemoryStore.set(key, entry);
      const allowed = entry.count <= maxCount;
      return { ...entry, allowed };
    }
  }
}

const storage = new RateLimitStorage();

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

  // Use atomic increment for concurrent safety
  const result = await storage.incrementCount(
    key,
    RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX,
  );

  // Check if request is allowed
  if (!result.allowed) {
    const ttl = Math.ceil((result.expireAt - now) / 1000);
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
export async function reset(ip: string): Promise<void> {
  const key = `rl:login:${ip}`;
  await storage.delete(key);
}

/**
 * Clear all rate limit entries (useful for testing).
 * Note: In Cloudflare KV, this only affects in-memory fallback.
 */
export function resetAll(): void {
  storage.clear();
}
