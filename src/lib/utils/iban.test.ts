import { describe, it, expect } from "vitest";
import { calculateIbanCheckDigits, padDigits } from "./iban";
import { validateIban } from "./iban-validator";

describe("IBAN Utilities", () => {
  describe("calculateIbanCheckDigits", () => {
    describe("valid calculations", () => {
      it("should calculate correct check digits for German IBAN", () => {
        const result = calculateIbanCheckDigits("DE", "370400440532013000");
        expect(result).toBe("89");
      });

      it("should calculate correct check digits for Austrian IBAN", () => {
        const result = calculateIbanCheckDigits("AT", "1904300234573201");
        expect(result).toBe("61");
      });

      it("should calculate correct check digits for Polish IBAN", () => {
        const result = calculateIbanCheckDigits(
          "PL",
          "109010140000071219812874",
        );
        expect(result).toBe("61");
      });

      it("should calculate check digits that produce valid IBAN when combined", () => {
        const bban = "370400440532013000";
        const checkDigits = calculateIbanCheckDigits("DE", bban);
        const iban = `DE${checkDigits}${bban}`;

        const validation = validateIban(iban);
        expect(validation.valid).toBe(true);
      });

      it("should handle country codes with different cases", () => {
        const result1 = calculateIbanCheckDigits("DE", "370400440532013000");
        const result2 = calculateIbanCheckDigits("de", "370400440532013000");
        const result3 = calculateIbanCheckDigits("De", "370400440532013000");

        expect(result1).toBe(result2);
        expect(result1).toBe(result3);
        expect(result1).toBe("89");
      });
    });

    describe("edge cases", () => {
      it("should handle BBAN with leading zeros", () => {
        const result = calculateIbanCheckDigits("XX", "001234567890");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle BBAN with all zeros", () => {
        const result = calculateIbanCheckDigits("XX", "000000000000");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle BBAN with maximum reasonable length", () => {
        const longBban = "1".repeat(30); // 30-digit BBAN
        const result = calculateIbanCheckDigits("XX", longBban);
        expect(result).toMatch(/^\d{2}$/); // Should be 2 digits
        expect(parseInt(result)).toBeGreaterThanOrEqual(0);
        expect(parseInt(result)).toBeLessThanOrEqual(97);
      });

      it("should handle single digit BBAN", () => {
        const result = calculateIbanCheckDigits("XX", "1");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle BBAN with letters (should transliterate)", () => {
        // This is an edge case - BBAN should be numeric, but the function should handle letters
        const result = calculateIbanCheckDigits("XX", "ABC123");
        expect(result).toMatch(/^\d{2}$/);
      });
    });

    describe("invalid inputs", () => {
      it("should handle empty country code", () => {
        const result = calculateIbanCheckDigits("", "370400440532013000");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle country code with numbers", () => {
        const result = calculateIbanCheckDigits("12", "370400440532013000");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle country code with special characters", () => {
        const result = calculateIbanCheckDigits("D@", "370400440532013000");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle empty BBAN", () => {
        const result = calculateIbanCheckDigits("DE", "");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle BBAN with only spaces", () => {
        const result = calculateIbanCheckDigits("DE", "   ");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });

      it("should handle BBAN with special characters", () => {
        const result = calculateIbanCheckDigits("DE", "3704@0440532@13000");
        expect(result).toMatch(/^\d{2}$/);
        expect(result).not.toBe("00");
      });
    });

    describe("check digit range", () => {
      it("should always return two-digit string", () => {
        const testCases = [
          ["DE", "370400440532013000"],
          ["AT", "1904300234573201"],
          ["PL", "109010140000071219812874"],
          ["XX", "1"],
          ["XX", "999999999999999999"],
        ];

        testCases.forEach(([country, bban]) => {
          const result = calculateIbanCheckDigits(country, bban);
          expect(result).toMatch(/^\d{2}$/);
          expect(result.length).toBe(2);
        });
      });

      it("should never return '00' as check digits", () => {
        // '00' would indicate invalid calculation
        const testCases = [
          ["DE", "370400440532013000"],
          ["AT", "1904300234573201"],
          ["PL", "109010140000071219812874"],
        ];

        testCases.forEach(([country, bban]) => {
          const result = calculateIbanCheckDigits(country, bban);
          expect(result).not.toBe("00");
        });
      });

      it("should return valid check digits (01-99 range)", () => {
        const result = calculateIbanCheckDigits("DE", "370400440532013000");
        const checkNum = parseInt(result);
        expect(checkNum).toBeGreaterThanOrEqual(1);
        expect(checkNum).toBeLessThanOrEqual(99);
      });
    });

    describe("integration with validator", () => {
      it("should produce valid IBANs for known test cases", () => {
        const testCases = [
          {
            country: "DE",
            bban: "370400440532013000",
            expectedIban: "DE89370400440532013000",
          },
          {
            country: "AT",
            bban: "1904300234573201",
            expectedIban: "AT611904300234573201",
          },
        ];

        testCases.forEach(({ country, bban, expectedIban }) => {
          const checkDigits = calculateIbanCheckDigits(country, bban);
          const iban = `${country}${checkDigits}${bban}`;

          expect(iban).toBe(expectedIban);
          const validation = validateIban(iban);
          expect(validation.valid).toBe(true);
        });
      });

      it("should handle round-trip validation", () => {
        const originalIban = "DE89370400440532013000";
        const country = originalIban.slice(0, 2);
        const bban = originalIban.slice(4);

        const recalculatedCheckDigits = calculateIbanCheckDigits(country, bban);
        const reconstructedIban = `${country}${recalculatedCheckDigits}${bban}`;

        expect(reconstructedIban).toBe(originalIban);
        const validation = validateIban(reconstructedIban);
        expect(validation.valid).toBe(true);
      });
    });
  });

  describe("padDigits", () => {
    describe("basic functionality", () => {
      it("should pad with leading zeros when needed", () => {
        expect(padDigits(5, "123")).toBe("00123");
        expect(padDigits(3, "1")).toBe("001");
        expect(padDigits(2, "")).toBe("00");
      });

      it("should not pad when length is already sufficient", () => {
        expect(padDigits(3, "123")).toBe("123");
        expect(padDigits(5, "12345")).toBe("12345");
        expect(padDigits(3, "1234")).toBe("1234");
      });

      it("should handle zero length", () => {
        expect(padDigits(0, "123")).toBe("123");
        expect(padDigits(0, "")).toBe("");
      });

      it("should handle negative length", () => {
        expect(padDigits(-1, "123")).toBe("123");
        expect(padDigits(-5, "123")).toBe("123");
      });
    });

    describe("edge cases", () => {
      it("should handle empty string", () => {
        expect(padDigits(5, "")).toBe("00000");
      });

      it("should handle string with only spaces", () => {
        expect(padDigits(5, "   ")).toBe("00   ");
      });

      it("should handle string with special characters", () => {
        expect(padDigits(5, "a@b")).toBe("00a@b");
      });

      it("should handle very large target length", () => {
        expect(padDigits(100, "123")).toBe("0".repeat(97) + "123");
      });

      it("should handle very long input string", () => {
        const longString = "1".repeat(100);
        expect(padDigits(50, longString)).toBe(longString);
      });
    });

    describe("typical IBAN use cases", () => {
      it("should pad account numbers to standard lengths", () => {
        expect(padDigits(10, "12345")).toBe("0000012345");
        expect(padDigits(8, "987")).toBe("00000987");
      });

      it("should handle maximum reasonable IBAN component lengths", () => {
        expect(padDigits(30, "123456789")).toBe("0".repeat(21) + "123456789");
      });
    });
  });
});
