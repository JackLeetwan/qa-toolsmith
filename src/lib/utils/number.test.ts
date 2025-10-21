import { describe, it, expect, vi } from "vitest";
import { fnv1a32, splitmix32, generateDigits } from "./number";

describe("Number Utilities", () => {
  describe("fnv1a32", () => {
    describe("basic functionality", () => {
      it("should return a number", () => {
        const result = fnv1a32("test");
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(0xffffffff);
      });

      it("should be deterministic (same input produces same output)", () => {
        const input = "hello world";
        const result1 = fnv1a32(input);
        const result2 = fnv1a32(input);
        expect(result1).toBe(result2);
      });

      it("should produce different hashes for different inputs", () => {
        const hash1 = fnv1a32("hello");
        const hash2 = fnv1a32("world");
        const hash3 = fnv1a32("hello world");
        expect(hash1).not.toBe(hash2);
        expect(hash1).not.toBe(hash3);
        expect(hash2).not.toBe(hash3);
      });
    });

    describe("known test vectors", () => {
      it("should match expected hash for empty string", () => {
        const result = fnv1a32("");
        expect(result).toBe(0x811c9dc5); // FNV offset basis
      });

      it("should match expected hash for single character", () => {
        const result = fnv1a32("a");
        expect(result).toBe(0xe40c292c);
      });

      it("should match expected hash for known strings", () => {
        expect(fnv1a32("hello")).toBe(0x4f9f2cab);
        expect(fnv1a32("world")).toBe(0x37a3e893);
        expect(fnv1a32("hello world")).toBe(0xd58b3fa7);
      });
    });

    describe("edge cases", () => {
      it("should handle empty string", () => {
        const result = fnv1a32("");
        expect(result).toBe(0x811c9dc5);
      });

      it("should handle single character", () => {
        const result = fnv1a32("x");
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
      });

      it("should handle very long strings", () => {
        const longString = "a".repeat(10000);
        const result = fnv1a32(longString);
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(0xffffffff);
      });

      it("should handle strings with special characters", () => {
        const result = fnv1a32("!@#$%^&*()_+{}|:<>?[]\\;',./");
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
      });

      it("should handle unicode characters", () => {
        const result = fnv1a32("🚀🌟💻🔥");
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
      });

      it("should handle strings with null characters", () => {
        const result = fnv1a32("hello\x00world");
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });

    describe("hash properties", () => {
      it("should be case sensitive", () => {
        const hash1 = fnv1a32("Hello");
        const hash2 = fnv1a32("hello");
        expect(hash1).not.toBe(hash2);
      });

      it("should produce different hashes for similar strings", () => {
        const hash1 = fnv1a32("test");
        const hash2 = fnv1a32("test1");
        const hash3 = fnv1a32("test ");
        expect(hash1).not.toBe(hash2);
        expect(hash1).not.toBe(hash3);
        expect(hash2).not.toBe(hash3);
      });

      it("should be deterministic across multiple calls", () => {
        const input = "consistent test";
        for (let i = 0; i < 10; i++) {
          expect(fnv1a32(input)).toBe(fnv1a32(input));
        }
      });
    });
  });

  describe("splitmix32", () => {
    describe("basic functionality", () => {
      it("should return a function", () => {
        const rng = splitmix32(12345);
        expect(typeof rng).toBe("function");
      });

      it("should generate numbers", () => {
        const rng = splitmix32(12345);
        const result = rng();
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(0xffffffff);
      });

      it("should generate different numbers on consecutive calls", () => {
        const rng = splitmix32(12345);
        const result1 = rng();
        const result2 = rng();
        expect(result1).not.toBe(result2);
      });
    });

    describe("seed dependence", () => {
      it("should produce same sequence for same seed", () => {
        const rng1 = splitmix32(42);
        const rng2 = splitmix32(42);

        for (let i = 0; i < 10; i++) {
          expect(rng1()).toBe(rng2());
        }
      });

      it("should produce different sequences for different seeds", () => {
        const rng1 = splitmix32(1);
        const rng2 = splitmix32(2);

        const sequence1 = Array.from({ length: 10 }, () => rng1());
        const sequence2 = Array.from({ length: 10 }, () => rng2());

        expect(sequence1).not.toEqual(sequence2);
      });

      it("should handle seed 0", () => {
        const rng = splitmix32(0);
        const result = rng();
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
      });

      it("should handle large seeds", () => {
        const rng = splitmix32(0xffffffff);
        const result = rng();
        expect(typeof result).toBe("number");
        expect(result).toBeGreaterThanOrEqual(0);
      });

      it("should handle negative seeds (converted to unsigned)", () => {
        const rng1 = splitmix32(-1);
        const rng2 = splitmix32(0xffffffff);
        expect(rng1()).toBe(rng2());
      });
    });

    describe("distribution properties", () => {
      it("should generate numbers within full 32-bit range", () => {
        const rng = splitmix32(12345);
        const samples = Array.from({ length: 1000 }, () => rng());

        const min = Math.min(...samples);
        const max = Math.max(...samples);

        expect(min).toBeLessThan(1000000); // Should have small numbers
        expect(max).toBeGreaterThan(4000000000); // Should have large numbers
      });

      it("should have reasonable distribution (basic check)", () => {
        const rng = splitmix32(98765);
        const samples = Array.from({ length: 10000 }, () => rng());

        // Check that we get both even and odd numbers
        const evenCount = samples.filter((n) => n % 2 === 0).length;
        const oddCount = samples.filter((n) => n % 2 === 1).length;

        expect(evenCount).toBeGreaterThan(4000); // Roughly 50%
        expect(oddCount).toBeGreaterThan(4000);
        expect(evenCount + oddCount).toBe(10000);
      });

      it("should not get stuck in cycles quickly", () => {
        const rng = splitmix32(555);
        const seen = new Set<number>();

        // Generate many numbers and check for early cycles
        for (let i = 0; i < 1000; i++) {
          const num = rng();
          expect(seen.has(num)).toBe(false); // No immediate repeats in small sample
          seen.add(num);
        }
      });
    });

    describe("edge cases", () => {
      it("should handle floating point seeds (converted to unsigned)", () => {
        const rng1 = splitmix32(3.14);
        const rng2 = splitmix32(3);
        expect(rng1()).not.toBe(rng2());
      });

      it("should handle very large numbers as seeds", () => {
        const rng = splitmix32(Number.MAX_SAFE_INTEGER);
        const result = rng();
        expect(typeof result).toBe("number");
      });
    });
  });

  describe("generateDigits", () => {
    describe("basic functionality", () => {
      it("should return a string", () => {
        const rng = () => 12345;
        const result = generateDigits(rng, 5);
        expect(typeof result).toBe("string");
      });

      it("should return string of correct length", () => {
        const rng = () => 12345;
        expect(generateDigits(rng, 0)).toHaveLength(0);
        expect(generateDigits(rng, 1)).toHaveLength(1);
        expect(generateDigits(rng, 10)).toHaveLength(10);
        expect(generateDigits(rng, 100)).toHaveLength(100);
      });

      it("should only contain digits", () => {
        const rng = splitmix32(42);
        const result = generateDigits(rng, 100);
        expect(result).toMatch(/^\d+$/);
      });

      it("should use the RNG for each digit", () => {
        let callCount = 0;
        const mockRng = vi.fn(() => {
          callCount++;
          return callCount * 10;
        });

        const result = generateDigits(mockRng, 3);
        expect(mockRng).toHaveBeenCalledTimes(3);
        expect(result).toBe("000"); // 10%10=0, 20%10=0, 30%10=0
      });
    });

    describe("RNG integration", () => {
      it("should work with splitmix32 RNG", () => {
        const rng = splitmix32(12345);
        const result = generateDigits(rng, 10);
        expect(result).toMatch(/^\d{10}$/);
      });

      it("should produce different results with different RNG seeds", () => {
        const rng1 = splitmix32(1);
        const rng2 = splitmix32(2);
        const result1 = generateDigits(rng1, 10);
        const result2 = generateDigits(rng2, 10);
        expect(result1).not.toBe(result2);
      });

      it("should be deterministic with same RNG", () => {
        const rng1 = splitmix32(42);
        const rng2 = splitmix32(42);
        const result1 = generateDigits(rng1, 10);
        const result2 = generateDigits(rng2, 10);
        expect(result1).toBe(result2);
      });
    });

    describe("edge cases", () => {
      it("should handle length 0", () => {
        const rng = () => 5;
        const result = generateDigits(rng, 0);
        expect(result).toBe("");
      });

      it("should handle very large lengths", () => {
        const rng = () => 7;
        const result = generateDigits(rng, 1000);
        expect(result).toHaveLength(1000);
        expect(result).toMatch(/^7+$/);
      });

      it("should handle RNG that returns 0", () => {
        const rng = () => 0;
        const result = generateDigits(rng, 5);
        expect(result).toBe("00000");
      });

      it("should handle RNG that returns large numbers", () => {
        const rng = () => 123456789;
        const result = generateDigits(rng, 3);
        expect(result).toBe("999"); // 123456789 % 10 = 9
      });

      it("should handle RNG that returns negative numbers", () => {
        const rng = () => -5;
        const result = generateDigits(rng, 3);
        expect(result).toBe("555"); // -5 % 10 = 5 in JavaScript
      });
    });

    describe("distribution", () => {
      it("should generate all digits 0-9 with good RNG", () => {
        const rng = splitmix32(999);
        const result = generateDigits(rng, 1000);
        const digits = result.split("").map(Number);

        // Check that all digits appear at least once
        for (let i = 0; i <= 9; i++) {
          expect(digits).toContain(i);
        }
      });

      it("should have reasonable digit distribution", () => {
        const rng = splitmix32(777);
        const result = generateDigits(rng, 10000);
        const digits = result.split("").map(Number);

        const counts = Array(10).fill(0);
        digits.forEach((d) => counts[d]++);

        // Each digit should appear roughly 1000 times (10% of 10000)
        counts.forEach((count) => {
          expect(count).toBeGreaterThan(800); // Allow some variance
          expect(count).toBeLessThan(1200);
        });
      });
    });
  });

  describe("integration", () => {
    describe("hash-based seeding", () => {
      it("should use fnv1a32 to seed RNG for reproducible sequences", () => {
        const seedString = "test seed";
        const hash = fnv1a32(seedString);
        const rng = splitmix32(hash);
        const digits = generateDigits(rng, 10);

        // Same seed string should produce same digit sequence
        const hash2 = fnv1a32(seedString);
        const rng2 = splitmix32(hash2);
        const digits2 = generateDigits(rng2, 10);

        expect(digits).toBe(digits2);
      });

      it("should produce different sequences for different seed strings", () => {
        const hash1 = fnv1a32("seed1");
        const rng1 = splitmix32(hash1);
        const digits1 = generateDigits(rng1, 10);

        const hash2 = fnv1a32("seed2");
        const rng2 = splitmix32(hash2);
        const digits2 = generateDigits(rng2, 10);

        expect(digits1).not.toBe(digits2);
      });
    });

    describe("full pipeline", () => {
      it("should generate IBAN-like numbers using the complete pipeline", () => {
        // Simulate generating a random account number
        const seed = "customer-12345";
        const hash = fnv1a32(seed);
        const rng = splitmix32(hash);
        const accountNumber = generateDigits(rng, 10);

        expect(accountNumber).toMatch(/^\d{10}$/);
        expect(accountNumber.length).toBe(10);
      });

      it("should be reproducible for same input", () => {
        const generateNumber = (seed: string, length: number) => {
          const hash = fnv1a32(seed);
          const rng = splitmix32(hash);
          return generateDigits(rng, length);
        };

        const result1 = generateNumber("test-seed", 15);
        const result2 = generateNumber("test-seed", 15);
        expect(result1).toBe(result2);
      });
    });
  });
});
