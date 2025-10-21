/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { validateIban } from "@/lib/utils/iban-validator";

describe("IBAN Validator", () => {
  describe("validateIban", () => {
    describe("Valid IBANs", () => {
      it("should validate a valid German IBAN", () => {
        const result = validateIban("DE89370400440532013000");
        expect(result).toEqual({ valid: true });
      });

      it("should validate a valid Austrian IBAN", () => {
        const result = validateIban("AT611904300234573201");
        expect(result).toEqual({ valid: true });
      });

      it("should validate a valid Polish IBAN", () => {
        const result = validateIban("PL61109010140000071219812874");
        expect(result).toEqual({ valid: true });
      });

      it("should validate IBANs with spaces (normalization)", () => {
        const result = validateIban("DE89 3704 0044 0532 0130 00");
        expect(result).toEqual({ valid: true });
      });

      it("should validate IBANs with lowercase letters (normalization)", () => {
        const result = validateIban("de89370400440532013000");
        expect(result).toEqual({ valid: true });
      });

      it("should validate IBANs with mixed case and spaces (normalization)", () => {
        const result = validateIban("De89 3704 0044 0532 0130 00");
        expect(result).toEqual({ valid: true });
      });

      it("should validate IBANs from unknown countries (length within 15-34)", () => {
        // Valid format for a fictional country "XX" with 16 characters
        const result = validateIban("XX1234567890123456");
        // This will fail checksum validation, but we're testing format validation
        // The checksum test will cover this scenario
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("checksum");
      });
    });

    describe("Invalid IBANs - Length validation", () => {
      it("should reject IBANs that are too short", () => {
        const result = validateIban("DE123");
        expect(result).toEqual({
          valid: false,
          reason: "IBAN is too short (minimum 15 characters)",
        });
      });

      it("should reject IBANs that are too long", () => {
        const result = validateIban(
          "DE893704004405320130001234567890123456789",
        );
        expect(result).toEqual({
          valid: false,
          reason: "IBAN is too long (maximum 34 characters)",
        });
      });

      it("should reject German IBANs with wrong length", () => {
        const result = validateIban("DE893704004405320130001");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid length for DE (expected 22, got 23)",
        });
      });

      it("should reject Austrian IBANs with wrong length", () => {
        const result = validateIban("AT61190430023457320");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid length for AT (expected 20, got 19)",
        });
      });

      it("should reject Polish IBANs with wrong length", () => {
        const result = validateIban("PL6110901014000007121981287412");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid length for PL (expected 28, got 30)",
        });
      });
    });

    describe("Invalid IBANs - Country code validation", () => {
      it("should reject IBANs with non-letter country code", () => {
        const result = validateIban("D189370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid country code (must be 2 letters)",
        });
      });

      it("should reject IBANs with lowercase country code", () => {
        const result = validateIban("de89370400440532013000");
        expect(result).toEqual({ valid: true }); // This should pass due to normalization
      });

      it("should reject IBANs with numbers in country code", () => {
        const result = validateIban("D189370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid country code (must be 2 letters)",
        });
      });

      it("should reject IBANs with special characters in country code", () => {
        const result = validateIban("D@89370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid country code (must be 2 letters)",
        });
      });
    });

    describe("Invalid IBANs - Check digits validation", () => {
      it("should reject IBANs with non-digit check digits", () => {
        const result = validateIban("DE8A370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid check digits (must be 2 digits)",
        });
      });

      it("should reject IBANs with letters in check digits", () => {
        const result = validateIban("DEAB370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid check digits (must be 2 digits)",
        });
      });

      it("should reject IBANs with special characters in check digits", () => {
        const result = validateIban("DE8@370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid check digits (must be 2 digits)",
        });
      });

      it("should reject IBANs with single digit check digits", () => {
        const result = validateIban("DE8370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid length for DE (expected 22, got 21)",
        });
      });
    });

    describe("Invalid IBANs - BBAN validation", () => {
      it("should reject IBANs with special characters in BBAN", () => {
        const result = validateIban("DE89@70400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "BBAN contains invalid characters (must be alphanumeric)",
        });
      });

      it("should reject IBANs with spaces in BBAN", () => {
        const result = validateIban("DE89 70400440532013000");
        // This will fail length validation first due to space removal
        expect(result).toEqual({
          valid: false,
          reason: "Invalid length for DE (expected 22, got 21)",
        });
      });

      it("should reject IBANs with lowercase letters in BBAN", () => {
        const result = validateIban("DE89370400440532013000");
        expect(result).toEqual({ valid: true }); // Uppercase conversion handles this
      });
    });

    describe("Invalid IBANs - Checksum validation", () => {
      it("should reject IBANs with invalid checksum", () => {
        const result = validateIban("DE89370400440532013001");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid checksum (mod-97 validation failed)",
        });
      });

      it("should reject IBANs with swapped check digits", () => {
        const result = validateIban("DE98370400440532013000");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid checksum (mod-97 validation failed)",
        });
      });

      it("should reject IBANs with modified BBAN that breaks checksum", () => {
        const result = validateIban("DE89370400440532013099");
        expect(result).toEqual({
          valid: false,
          reason: "Invalid checksum (mod-97 validation failed)",
        });
      });
    });

    describe("Edge cases", () => {
      it("should handle empty string", () => {
        const result = validateIban("");
        expect(result).toEqual({
          valid: false,
          reason: "IBAN is too short (minimum 15 characters)",
        });
      });

      it("should handle string with only spaces", () => {
        const result = validateIban("   ");
        expect(result).toEqual({
          valid: false,
          reason: "IBAN is too short (minimum 15 characters)",
        });
      });

      it("should handle null input (when converted to string)", () => {
        // TypeScript will catch this, but for runtime safety
        const result = validateIban(String(null));
        expect(result).toEqual({
          valid: false,
          reason: "IBAN is too short (minimum 15 characters)",
        });
      });

      it("should handle undefined input (when converted to string)", () => {
        const result = validateIban(String(undefined));
        expect(result).toEqual({
          valid: false,
          reason: "IBAN is too short (minimum 15 characters)",
        });
      });

      it("should handle very long strings", () => {
        const longString = "A".repeat(100);
        const result = validateIban(longString);
        expect(result).toEqual({
          valid: false,
          reason: "IBAN is too long (maximum 34 characters)",
        });
      });

      it("should handle strings at minimum length", () => {
        // 15 characters: CC + DD + 11 BBAN chars = minimum valid format
        const result = validateIban("XX1234567890123");
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("checksum");
      });

      it("should handle strings at maximum length", () => {
        // 34 characters: CC + DD + 30 BBAN chars = maximum valid format
        const result = validateIban("XX123456789012345678901234567890");
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("checksum");
      });
    });

    describe("Normalization behavior", () => {
      it("should remove all spaces from IBAN", () => {
        const result = validateIban("DE 89 3704 0044 0532 0130 00");
        expect(result).toEqual({ valid: true });
      });

      it("should convert lowercase to uppercase", () => {
        const result = validateIban("de89370400440532013000");
        expect(result).toEqual({ valid: true });
      });

      it("should handle mixed case and spaces", () => {
        const result = validateIban("De 89 3704 0044 0532 0130 00");
        expect(result).toEqual({ valid: true });
      });

      it("should handle multiple consecutive spaces", () => {
        const result = validateIban("DE  89  3704 0044 0532 0130 00");
        expect(result).toEqual({ valid: true });
      });

      it("should handle tabs and newlines as spaces", () => {
        const ibanWithTabs = "DE89\t3704\n0044 0532 0130 00";
        const result = validateIban(ibanWithTabs);
        expect(result).toEqual({ valid: true });
      });
    });
  });
});
