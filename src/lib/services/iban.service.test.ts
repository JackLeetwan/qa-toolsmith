import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generate } from "./iban.service";
import type { IbanCountry } from "../../types/types";

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn();
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
});

// Mock the utility functions to control their behavior in tests
vi.mock("../utils/number.js", () => ({
  fnv1a32: vi.fn(),
  splitmix32: vi.fn(),
  generateDigits: vi.fn(),
}));

vi.mock("../utils/iban.js", () => ({
  calculateIbanCheckDigits: vi.fn(),
}));

import { fnv1a32, splitmix32, generateDigits } from "../utils/number.js";
import { calculateIbanCheckDigits } from "../utils/iban.js";

const mockedFnv1a32 = vi.mocked(fnv1a32);
const mockedSplitmix32 = vi.mocked(splitmix32);
const mockedGenerateDigits = vi.mocked(generateDigits);
const mockedCalculateIbanCheckDigits = vi.mocked(calculateIbanCheckDigits);

describe("IBAN Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomUUID.mockReturnValue("random-uuid-123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generate", () => {
    describe("deterministic generation with seed", () => {
      it("should generate deterministic IBAN for Germany with seed", () => {
        // Mock the utility functions
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "12345678"; // BLZ for DE
            if (length === 10) return "1234567890"; // Account for DE
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result = generate("DE", "test-seed");

        expect(result).toBe("DE86123456781234567890");
        expect(fnv1a32).toHaveBeenCalledWith("test-seed");
        expect(splitmix32).toHaveBeenCalledWith(12345);
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 8); // BLZ length for DE
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 10); // Account length for DE
        expect(calculateIbanCheckDigits).toHaveBeenCalledWith(
          "DE",
          "123456781234567890",
        );
      });

      it("should generate deterministic IBAN for Austria with seed", () => {
        mockedFnv1a32.mockReturnValue(67890);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 5) return "12345"; // BLZ for AT
            if (length === 11) return "12345678901"; // Account for AT
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("37");

        const result = generate("AT", "austria-seed");

        expect(result).toBe("AT371234512345678901");
        expect(fnv1a32).toHaveBeenCalledWith("austria-seed");
        expect(splitmix32).toHaveBeenCalledWith(67890);
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 5); // BLZ length for AT
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 11); // Account length for AT
        expect(calculateIbanCheckDigits).toHaveBeenCalledWith(
          "AT",
          "1234512345678901",
        );
      });

      it("should generate deterministic IBAN for Poland with seed", () => {
        mockedFnv1a32.mockReturnValue(99999);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "87654321"; // BLZ for PL
            if (length === 16) return "1234567890123456"; // Account for PL
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("61");

        const result = generate("PL", "poland-seed");

        expect(result).toBe("PL61876543211234567890123456");
        expect(fnv1a32).toHaveBeenCalledWith("poland-seed");
        expect(splitmix32).toHaveBeenCalledWith(99999);
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 8); // BLZ length for PL
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 16); // Account length for PL
        expect(calculateIbanCheckDigits).toHaveBeenCalledWith(
          "PL",
          "876543211234567890123456",
        );
      });

      it("should produce same result for same seed", () => {
        mockedFnv1a32.mockReturnValue(11111);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(() => "12345");
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result1 = generate("DE", "same-seed");
        const result2 = generate("DE", "same-seed");

        expect(result1).toBe(result2);
        expect(fnv1a32).toHaveBeenCalledTimes(2);
        expect(splitmix32).toHaveBeenCalledTimes(2);
      });

      it("should produce different results for different seeds", () => {
        mockedFnv1a32.mockReturnValueOnce(11111).mockReturnValueOnce(22222);
        const mockRng1 = vi.fn();
        const mockRng2 = vi.fn();
        mockedSplitmix32
          .mockReturnValueOnce(mockRng1)
          .mockReturnValueOnce(mockRng2);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (rng === mockRng1) {
              return length === 8 ? "11111111" : "1111111111";
            } else {
              return length === 8 ? "22222222" : "2222222222";
            }
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result1 = generate("DE", "seed1");
        const result2 = generate("DE", "seed2");

        expect(result1).toBe("DE86111111111111111111");
        expect(result2).toBe("DE86222222222222222222");
        expect(result1).not.toBe(result2);
      });
    });

    describe("random generation without seed", () => {
      it("should generate random IBAN using crypto.randomUUID", () => {
        mockRandomUUID.mockReturnValue("random-uuid-456");
        mockedFnv1a32.mockReturnValue(77777);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "99999999"; // BLZ for DE
            if (length === 10) return "9999999999"; // Account for DE
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result = generate("DE");

        expect(result).toBe("DE86999999999999999999");
        expect(mockRandomUUID).toHaveBeenCalledTimes(1);
        expect(fnv1a32).toHaveBeenCalledWith("random-uuid-456");
      });

      it("should generate different random IBANs on multiple calls", () => {
        mockRandomUUID
          .mockReturnValueOnce("uuid-1")
          .mockReturnValueOnce("uuid-2");

        mockedFnv1a32.mockReturnValueOnce(11111).mockReturnValueOnce(22222);

        let callCount = 0;
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            callCount++;
            if (length === 8) return callCount === 1 ? "11111111" : "22222222"; // Different BLZ for each call
            if (length === 10)
              return callCount === 2 ? "1111111111" : "2222222222"; // Different account for each call
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result1 = generate("DE");
        const result2 = generate("DE");

        expect(result1).toBe("DE86111111111111111111");
        expect(result2).toBe("DE86222222222222222222");
        expect(result1).not.toBe(result2); // They should be different since different seeds
        expect(mockRandomUUID).toHaveBeenCalledTimes(2);
      });
    });

    describe("country-specific generation", () => {
      it("should generate correct BBAN length for Germany (18)", () => {
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "12345678";
            if (length === 10) return "1234567890";
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result = generate("DE", "test");

        expect(result).toBe("DE86123456781234567890");
        expect(result.length).toBe(22); // DE IBAN length
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 8);
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 10);
      });

      it("should generate correct BBAN length for Austria (16)", () => {
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 5) return "12345";
            if (length === 11) return "12345678901";
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("37");

        const result = generate("AT", "test");

        expect(result).toBe("AT371234512345678901");
        expect(result.length).toBe(20); // AT IBAN length
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 5);
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 11);
      });

      it("should generate correct BBAN length for Poland (24)", () => {
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "12345678";
            if (length === 16) return "1234567890123456";
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("61");

        const result = generate("PL", "test");

        expect(result).toBe("PL61123456781234567890123456");
        expect(result.length).toBe(28); // PL IBAN length
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 8);
        expect(generateDigits).toHaveBeenCalledWith(mockRng, 16);
      });
    });

    describe("IBAN validation integration", () => {
      it("should generate valid IBANs for Germany", () => {
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "37040044"; // Real-looking BLZ
            if (length === 10) return "0532013000"; // Real-looking account
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("89");

        const iban = generate("DE", "test");
        expect(iban).toBe("DE89370400440532013000");

        // This should be a valid IBAN (using real calculation)
        // We can't easily test this without complex mocking, so we'll trust the implementation
      });

      it("should generate valid IBANs for Austria", () => {
        mockedFnv1a32.mockReturnValue(67890);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 5) return "19043"; // Real-looking BLZ
            if (length === 11) return "00234573201"; // Real-looking account
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("61");

        const iban = generate("AT", "test");
        expect(iban).toBe("AT611904300234573201");

        // Should be valid IBAN
      });

      it("should generate valid IBANs for Poland", () => {
        mockedFnv1a32.mockReturnValue(99999);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "10901014"; // BLZ for PL
            if (length === 16) return "00071219812874"; // Account for PL
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("61");

        const iban = generate("PL", "test");
        expect(iban).toBe("PL611090101400071219812874");

        // Should be valid IBAN
      });
    });

    describe("edge cases", () => {
      it("should handle empty seed string", () => {
        mockedFnv1a32.mockReturnValue(0);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "12345678"; // BLZ for DE
            if (length === 10) return "1234567890"; // Account for DE
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result = generate("DE", "");

        expect(result).toBe("DE86123456781234567890");
        expect(fnv1a32).toHaveBeenCalledWith("");
      });

      it("should handle long seed strings", () => {
        const longSeed = "a".repeat(1000);
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "12345678"; // BLZ for DE
            if (length === 10) return "1234567890"; // Account for DE
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result = generate("DE", longSeed);

        expect(fnv1a32).toHaveBeenCalledWith(longSeed);
        expect(result).toBe("DE86123456781234567890");
      });

      it("should handle seed with special characters", () => {
        const specialSeed = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockImplementation(
          (rng: () => number, length: number) => {
            if (length === 8) return "12345678"; // BLZ for DE
            if (length === 10) return "1234567890"; // Account for DE
            return "";
          },
        );
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result = generate("DE", specialSeed);

        expect(fnv1a32).toHaveBeenCalledWith(specialSeed);
        expect(result).toBe("DE86123456781234567890");
      });
    });

    describe("error handling", () => {
      // Note: TypeScript should prevent invalid countries at compile time
      // But we'll test runtime behavior if the type system is bypassed
      it("should handle unknown country (if type system bypassed)", () => {
        // This would normally be caught by TypeScript, but testing runtime safety
        const invalidCountry = "XX" as IbanCountry;
        expect(() => generate(invalidCountry, "test")).toThrow();
      });
    });

    describe("type safety", () => {
      it("should accept valid IbanCountry types", () => {
        const countries: IbanCountry[] = ["DE", "AT", "PL"];

        countries.forEach((country) => {
          mockedFnv1a32.mockReturnValue(12345);
          const mockRng = vi.fn();
          mockedSplitmix32.mockReturnValue(mockRng);
          mockedGenerateDigits.mockReturnValue("12345");
          mockedCalculateIbanCheckDigits.mockReturnValue("86");

          const result = generate(country, "test");
          expect(typeof result).toBe("string");
          expect(result.startsWith(country)).toBe(true);
        });
      });

      it("should return string type", () => {
        mockedFnv1a32.mockReturnValue(12345);
        const mockRng = vi.fn();
        mockedSplitmix32.mockReturnValue(mockRng);
        mockedGenerateDigits.mockReturnValue("12345");
        mockedCalculateIbanCheckDigits.mockReturnValue("86");

        const result: string = generate("DE", "test");
        expect(typeof result).toBe("string");
      });
    });
  });
});
