/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { calculateIbanCheckDigits, padDigits } from "@/lib/utils/iban";

describe("IBAN Utils", () => {
  describe("calculateIbanCheckDigits", () => {
    describe("Valid check digit calculations", () => {
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
          "10901014000071219812874",
        );
        expect(result).toBe("34");
      });

      it("should handle lowercase country codes", () => {
        const result = calculateIbanCheckDigits("de", "370400440532013000");
        expect(result).toBe("89");
      });

      it("should handle BBANs with leading zeros", () => {
        const result = calculateIbanCheckDigits("DE", "000400440532013000");
        expect(result).toBe("44");
      });

      it("should handle BBANs with all zeros", () => {
        const result = calculateIbanCheckDigits("DE", "000000000000000000");
        expect(result).toBe("36");
      });
    });

    describe("Edge cases", () => {
      it("should handle minimum BBAN length", () => {
        const result = calculateIbanCheckDigits("XX", "12345678901");
        expect(result).toBe("08");
      });

      it("should handle maximum reasonable BBAN length", () => {
        const longBban = "1".repeat(30);
        const result = calculateIbanCheckDigits("XX", longBban);
        expect(result).toMatch(/^\d{2}$/);
      });

      it("should handle BBAN with mixed letters and numbers", () => {
        const result = calculateIbanCheckDigits("GB", "NWBK60161331926819");
        expect(result).toBe("29");
      });

      it("should handle country codes with different cases", () => {
        const result = calculateIbanCheckDigits("", "370400440532013000");
        expect(result).toBe("50");
      });

      it("should handle empty BBAN", () => {
        const result = calculateIbanCheckDigits("DE", "");
        expect(result).toBe("36");
      });

      it("should handle both empty inputs", () => {
        const result = calculateIbanCheckDigits("", "");
        expect(result).toBe("98");
      });

      it("should handle BBAN with special characters", () => {
        // Special characters are filtered out, so result should be same as valid input
        const result = calculateIbanCheckDigits("DE", "370400440532013000!");
        expect(result).toBe("89"); // Same as valid German IBAN without special char
      });

      it("should handle BBAN with multiple special characters", () => {
        // Multiple special characters are filtered out
        const result = calculateIbanCheckDigits(
          "DE",
          "370@400#440$532%013^000",
        );
        expect(result).toBe("89"); // Same as valid German IBAN without special chars
      });

      it("should handle BBAN with only special characters", () => {
        // When BBAN contains only special characters, it falls back to country code calculation
        const result = calculateIbanCheckDigits("DE", "!!!@@@###");
        expect(result).toBe("36"); // Same as empty BBAN for DE
      });

      it("should handle BBAN with spaces", () => {
        // Spaces are filtered out as special characters
        const result = calculateIbanCheckDigits(
          "DE",
          "370 400 440 532 013 000",
        );
        expect(result).toBe("89"); // Same as valid German IBAN without spaces
      });
    });

    describe("Algorithm verification", () => {
      it("should produce check digits that make IBAN valid", () => {
        const country = "DE";
        const bban = "370400440532013000";
        const checkDigits = calculateIbanCheckDigits(country, bban);

        // Verify the full IBAN is valid by checking if it passes mod-97
        const rearranged = bban + country + checkDigits;
        let numeric = "";
        for (const char of rearranged) {
          if (char >= "0" && char <= "9") {
            numeric += char;
          } else {
            const code = char.charCodeAt(0) - "A".charCodeAt(0) + 10;
            numeric += code;
          }
        }

        let remainder = 0;
        for (const digit of numeric) {
          remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
        }

        expect(remainder).toBe(1); // Valid IBAN should have remainder of 1
      });

      it("should produce different check digits for different BBANs", () => {
        const result1 = calculateIbanCheckDigits("DE", "370400440532013000");
        const result2 = calculateIbanCheckDigits("DE", "370400440532013001");
        expect(result1).not.toBe(result2);
      });

      it("should produce different check digits for different countries", () => {
        const bban = "370400440532013000";
        const result1 = calculateIbanCheckDigits("DE", bban);
        const result2 = calculateIbanCheckDigits("AT", bban);
        expect(result1).not.toBe(result2);
      });
    });
  });

  describe("padDigits", () => {
    describe("Basic padding functionality", () => {
      it("should pad single digit to two digits", () => {
        const result = padDigits(2, "5");
        expect(result).toBe("05");
      });

      it("should pad single digit to three digits", () => {
        const result = padDigits(3, "7");
        expect(result).toBe("007");
      });

      it("should not pad if already at target length", () => {
        const result = padDigits(2, "42");
        expect(result).toBe("42");
      });

      it("should not pad if longer than target length", () => {
        const result = padDigits(2, "123");
        expect(result).toBe("123");
      });

      it("should handle zero length padding", () => {
        const result = padDigits(0, "123");
        expect(result).toBe("123");
      });
    });

    describe("Edge cases", () => {
      it("should handle empty string", () => {
        const result = padDigits(3, "");
        expect(result).toBe("000");
      });

      it("should handle very large target length", () => {
        const result = padDigits(10, "42");
        expect(result).toBe("0000000042");
      });

      it("should handle negative target length", () => {
        const result = padDigits(-1, "42");
        expect(result).toBe("42");
      });

      it("should handle string with non-numeric characters", () => {
        const result = padDigits(5, "abc");
        expect(result).toBe("00abc");
      });

      it("should handle string with numbers and letters", () => {
        const result = padDigits(6, "1a2b");
        expect(result).toBe("001a2b");
      });
    });

    describe("Real-world usage", () => {
      it("should pad IBAN check digits correctly", () => {
        const result = padDigits(2, "5");
        expect(result).toBe("05");
      });

      it("should pad account numbers", () => {
        const result = padDigits(10, "12345");
        expect(result).toBe("0000012345");
      });

      it("should handle check digit calculation results", () => {
        // This simulates what calculateIbanCheckDigits does internally
        const check = 5;
        const padded = String(check).padStart(2, "0");
        expect(padded).toBe("05");
        // And verify our function does the same
        expect(padDigits(2, String(check))).toBe("05");
      });
    });
  });
});
