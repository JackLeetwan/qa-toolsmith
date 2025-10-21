import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consume, reset, resetAll } from "./rate-limiter.service";

// Mock Date.now for deterministic testing
const mockNow = vi.fn();
Date.now = mockNow;

describe("Rate Limiter Service", () => {
  beforeEach(() => {
    // Reset all rate limits before each test
    resetAll();
    // Start with a baseline time
    mockNow.mockReturnValue(1000000000); // 1 second in milliseconds
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("consume", () => {
    describe("normal consumption within limits", () => {
      it("should allow first request for new IP", async () => {
        const ip = "192.168.1.1";

        await expect(consume(ip)).resolves.toBeUndefined();

        // Should create entry with count 1
        // We can't directly inspect the store, but we can test behavior
      });

      it("should allow multiple requests within limit", async () => {
        const ip = "192.168.1.2";

        // Should allow all 10 requests
        for (let i = 1; i <= 10; i++) {
          await expect(consume(ip)).resolves.toBeUndefined();
        }
      });

      it("should allow exactly maximum requests", async () => {
        const ip = "192.168.1.3";

        // Make exactly 10 requests (the limit)
        for (let i = 1; i <= 10; i++) {
          await expect(consume(ip)).resolves.toBeUndefined();
        }
      });

      it("should handle different IPs independently", async () => {
        const ip1 = "192.168.1.1";
        const ip2 = "192.168.1.2";

        // Both should be able to make requests
        await expect(consume(ip1)).resolves.toBeUndefined();
        await expect(consume(ip2)).resolves.toBeUndefined();
        await expect(consume(ip1)).resolves.toBeUndefined();
        await expect(consume(ip2)).resolves.toBeUndefined();
      });
    });

    describe("rate limit exceeded", () => {
      it("should throw error on 11th request", async () => {
        const ip = "192.168.1.4";

        // Make 10 allowed requests
        for (let i = 1; i <= 10; i++) {
          await expect(consume(ip)).resolves.toBeUndefined();
        }

        // 11th request should be blocked
        await expect(consume(ip)).rejects.toThrow("rate_limited");

        const error = await consume(ip).catch((e) => e);
        expect(error.status).toBe(429);
        expect(error.code).toBe("RATE_LIMITED");
        expect(error.retryAfter).toBe(60); // Full window remaining
      });

      it("should throw error on further requests after limit", async () => {
        const ip = "192.168.1.5";

        // Make 10 allowed requests
        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }

        // Further requests should be blocked
        for (let i = 1; i <= 5; i++) {
          await expect(consume(ip)).rejects.toThrow("rate_limited");
        }
      });

      it("should include correct retryAfter time", async () => {
        const ip = "192.168.1.6";
        mockNow.mockReturnValue(1000000000); // Start time

        // Make 10 requests
        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }

        // Advance time by 30 seconds
        mockNow.mockReturnValue(1000000000 + 30000);

        // 11th request should show remaining time
        const error = await consume(ip).catch((e) => e);
        expect(error.retryAfter).toBe(30); // 60 - 30 = 30 seconds remaining
      });

      it("should allow requests after window has expired", async () => {
        const ip = "192.168.1.7";
        mockNow.mockReturnValue(1000000000);

        // Make 10 requests
        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }

        // Advance time past the window
        mockNow.mockReturnValue(1000000000 + 61000); // 61 seconds later

        // Should allow new requests after expiration
        await expect(consume(ip)).resolves.toBeUndefined();

        // Should be able to make more requests in new window
        for (let i = 1; i <= 9; i++) {
          await expect(consume(ip)).resolves.toBeUndefined();
        }
      });
    });

    describe("time-based expiration", () => {
      it("should expire old entries automatically", async () => {
        const ip = "192.168.1.8";
        mockNow.mockReturnValue(1000000000); // Start time

        // Make 10 requests
        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }

        // Advance time past the 60-second window
        mockNow.mockReturnValue(1000000000 + 65000); // 65 seconds later

        // Should allow new requests after expiration
        await expect(consume(ip)).resolves.toBeUndefined();

        // Should be able to make more requests
        for (let i = 1; i <= 9; i++) {
          await expect(consume(ip)).resolves.toBeUndefined();
        }
      });

      it("should clean up expired entries on access", async () => {
        const ip1 = "192.168.1.9";
        const ip2 = "192.168.1.10";

        mockNow.mockReturnValue(1000000000);

        // Both IPs make requests
        await consume(ip1);
        await consume(ip2);

        // Advance time to expire ip1's entry
        mockNow.mockReturnValue(1000000000 + 65000);

        // Accessing ip2 should not affect ip1's expired entry
        // But accessing ip1 should clean it up and allow new requests
        await expect(consume(ip1)).resolves.toBeUndefined();
      });

      it("should handle multiple expiration scenarios", async () => {
        const ip = "192.168.1.11";

        // First window
        mockNow.mockReturnValue(1000000000);
        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }

        // Wait 30 seconds, still in same window
        mockNow.mockReturnValue(1000000000 + 30000);
        await expect(consume(ip)).rejects.toThrow("rate_limited");

        // Wait until window expires
        mockNow.mockReturnValue(1000000000 + 65000);
        await expect(consume(ip)).resolves.toBeUndefined();

        // Start new window
        for (let i = 1; i <= 9; i++) {
          await consume(ip);
        }
      });
    });

    describe("edge cases", () => {
      it("should handle IP addresses with different formats", async () => {
        const ips = [
          "192.168.1.1",
          "10.0.0.1",
          "::1",
          "2001:db8::1",
          "127.0.0.1",
        ];

        for (const ip of ips) {
          // Each IP should be treated independently
          for (let i = 1; i <= 5; i++) {
            await expect(consume(ip)).resolves.toBeUndefined();
          }
        }
      });

      it("should handle empty string IP", async () => {
        const ip = "";
        await expect(consume(ip)).resolves.toBeUndefined();
      });

      it("should handle very long IP strings", async () => {
        const ip = "a".repeat(100);
        await expect(consume(ip)).resolves.toBeUndefined();
      });

      it("should handle special characters in IP", async () => {
        const ip = "192.168.1.1!@#";
        await expect(consume(ip)).resolves.toBeUndefined();
      });

      it("should handle concurrent requests simulation", async () => {
        const ip = "192.168.1.12";

        // Simulate concurrent requests by not awaiting
        const promises = [];
        for (let i = 1; i <= 15; i++) {
          promises.push(consume(ip));
        }

        const results = await Promise.allSettled(promises);

        // Should have 10 fulfilled and 5 rejected
        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled).toHaveLength(10);
        expect(rejected).toHaveLength(5);

        rejected.forEach((reject) => {
          expect(reject.reason.message).toBe("rate_limited");
          expect(reject.reason.status).toBe(429);
        });
      });
    });

    describe("error properties", () => {
      it("should include correct error properties", async () => {
        const ip = "192.168.1.13";

        // Fill up the limit
        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }

        const error = await consume(ip).catch((e) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("rate_limited");
        expect(error.status).toBe(429);
        expect(error.code).toBe("RATE_LIMITED");
        expect(error.retryAfter).toBeGreaterThan(0);
        expect(error.retryAfter).toBeLessThanOrEqual(60);
      });

      it("should calculate retryAfter correctly at different times", async () => {
        const ip = "192.168.1.14";
        mockNow.mockReturnValue(1000000000);

        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }

        // Test at different time offsets
        const testCases = [
          { offset: 0, expectedMin: 59, expectedMax: 60 },
          { offset: 15000, expectedMin: 44, expectedMax: 46 }, // ~15 seconds
          { offset: 30000, expectedMin: 29, expectedMax: 31 }, // ~30 seconds
          { offset: 45000, expectedMin: 14, expectedMax: 16 }, // ~45 seconds
        ];

        for (const { offset, expectedMin, expectedMax } of testCases) {
          mockNow.mockReturnValue(1000000000 + offset);
          const error = await consume(ip).catch((e) => e);
          expect(error.retryAfter).toBeGreaterThanOrEqual(expectedMin);
          expect(error.retryAfter).toBeLessThanOrEqual(expectedMax);
        }
      });
    });
  });

  describe("reset", () => {
    it("should reset rate limit for specific IP", async () => {
      const ip = "192.168.1.15";

      // Fill up the limit
      for (let i = 1; i <= 10; i++) {
        await consume(ip);
      }

      // Should be blocked
      await expect(consume(ip)).rejects.toThrow("rate_limited");

      // Reset
      reset(ip);

      // Should allow requests again
      await expect(consume(ip)).resolves.toBeUndefined();
      await expect(consume(ip)).resolves.toBeUndefined();
    });

    it("should not affect other IPs when resetting one", async () => {
      const ip1 = "192.168.1.16";
      const ip2 = "192.168.1.17";

      // Both reach limit
      for (let i = 1; i <= 10; i++) {
        await consume(ip1);
        await consume(ip2);
      }

      // Both should be blocked
      await expect(consume(ip1)).rejects.toThrow("rate_limited");
      await expect(consume(ip2)).rejects.toThrow("rate_limited");

      // Reset only ip1
      reset(ip1);

      // ip1 should work, ip2 should still be blocked
      await expect(consume(ip1)).resolves.toBeUndefined();
      await expect(consume(ip2)).rejects.toThrow("rate_limited");
    });

    it("should handle resetting non-existent IP", () => {
      const ip = "192.168.1.18";
      expect(() => reset(ip)).not.toThrow();
    });

    it("should allow fresh start after reset", async () => {
      const ip = "192.168.1.19";

      // Make some requests
      for (let i = 1; i <= 5; i++) {
        await consume(ip);
      }

      // Reset
      reset(ip);

      // Should be able to make 10 new requests
      for (let i = 1; i <= 10; i++) {
        await expect(consume(ip)).resolves.toBeUndefined();
      }

      // 11th should be blocked
      await expect(consume(ip)).rejects.toThrow("rate_limited");
    });
  });

  describe("resetAll", () => {
    it("should clear all rate limit entries", async () => {
      const ips = ["192.168.1.20", "192.168.1.21", "192.168.1.22"];

      // All IPs reach limit
      for (const ip of ips) {
        for (let i = 1; i <= 10; i++) {
          await consume(ip);
        }
      }

      // All should be blocked
      for (const ip of ips) {
        await expect(consume(ip)).rejects.toThrow("rate_limited");
      }

      // Reset all
      resetAll();

      // All should work again
      for (const ip of ips) {
        await expect(consume(ip)).resolves.toBeUndefined();
      }
    });

    it("should handle empty store", () => {
      expect(() => resetAll()).not.toThrow();
    });

    it("should reset store to empty state", async () => {
      const ip = "192.168.1.23";

      await consume(ip);
      resetAll();

      // Should behave like fresh IP
      for (let i = 1; i <= 10; i++) {
        await expect(consume(ip)).resolves.toBeUndefined();
      }
    });
  });

  describe("constants and configuration", () => {
    it("should use correct rate limit window (60 seconds)", async () => {
      const ip = "192.168.1.24";
      mockNow.mockReturnValue(1000000000);

      // Make requests
      for (let i = 1; i <= 10; i++) {
        await consume(ip);
      }

      // Advance exactly 60 seconds
      mockNow.mockReturnValue(1000000000 + 60000);

      // Should allow new requests (window expired)
      await expect(consume(ip)).resolves.toBeUndefined();
    });

    it("should use correct rate limit max (10 requests)", async () => {
      const ip = "192.168.1.25";

      // Should allow exactly 10
      for (let i = 1; i <= 10; i++) {
        await expect(consume(ip)).resolves.toBeUndefined();
      }

      // 11th should fail
      await expect(consume(ip)).rejects.toThrow("rate_limited");
    });
  });

  describe("memory management", () => {
    it("should not leak memory with many different IPs", async () => {
      // Create many different IPs
      for (let i = 0; i < 100; i++) {
        const ip = `192.168.1.${i}`;
        await consume(ip);
      }

      // Each should still work independently
      for (let i = 0; i < 100; i++) {
        const ip = `192.168.1.${i}`;
        await expect(consume(ip)).resolves.toBeUndefined();
      }
    });

    it("should clean up expired entries over time", async () => {
      const ips = Array.from({ length: 50 }, (_, i) => `192.168.2.${i}`);

      mockNow.mockReturnValue(1000000000);

      // All make requests
      for (const ip of ips) {
        await consume(ip);
      }

      // Advance time past expiration
      mockNow.mockReturnValue(1000000000 + 65000);

      // Accessing one IP should trigger cleanup for expired entries
      // But since we can't inspect the store directly, we test that it still works
      await expect(consume(ips[0])).resolves.toBeUndefined();
    });
  });
});
