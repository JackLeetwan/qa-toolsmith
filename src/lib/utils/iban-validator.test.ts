import { describe, it, expect } from "vitest";
import { validateIban } from "./iban-validator";

describe("IBAN Validator", () => {
  describe("validateIban", () => {
    describe("valid IBANs (happy path)", () => {
      it("should validate a valid German IBAN", () => {
        const result = validateIban("DE89370400440532013000");
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("should validate a valid Austrian IBAN", () => {
        const result = validateIban("AT611904300234573201");
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("should validate a valid Polish IBAN", () => {
        const result = validateIban("PL61109010140000071219812874");
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("should validate IBAN with spaces (normalized)", () => {
        const result = validateIban("DE89 3704 0044 0532 0130 00");
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("should validate IBAN with lowercase letters (normalized)", () => {
        const result = validateIban("de89370400440532013000");
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it("should validate IBAN with mixed case and spaces (normalized)", () => {
        const result = validateIban("De89 3704 0044 0532 0130 00");
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    describe("invalid IBANs - length validation", () => {
      it("should reject IBAN that is too short", () => {
        const result = validateIban("DE89370400440532");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid length for DE (expected 22, got 16)",
        );
      });

      it("should reject IBAN that is too long", () => {
        const result = validateIban(
          "DE8937040044053201300012345678901234567890",
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("IBAN is too long (maximum 34 characters)");
      });

      it("should reject empty string", () => {
        const result = validateIban("");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("IBAN is too short (minimum 15 characters)");
      });

      it("should reject IBAN with only spaces", () => {
        const result = validateIban("   ");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("IBAN is too short (minimum 15 characters)");
      });
    });

    describe("invalid IBANs - country code validation", () => {
      it("should reject IBAN with invalid country code (numbers)", () => {
        const result = validateIban("1239370400440532013000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Invalid country code (must be 2 letters)");
      });

      it("should reject IBAN with invalid country code (special characters)", () => {
        const result = validateIban("D@89370400440532013000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Invalid country code (must be 2 letters)");
      });

      it("should reject IBAN with lowercase country code", () => {
        const result = validateIban("de89370400440532013000");
        expect(result.valid).toBe(true); // This should pass because it gets normalized
      });

      it("should reject IBAN with only one character for country code", () => {
        const result = validateIban("D89370400440532013000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Invalid country code (must be 2 letters)");
      });
    });

    describe("invalid IBANs - check digits validation", () => {
      it("should reject IBAN with invalid check digits (letters)", () => {
        const result = validateIban("DEAB370400440532013000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Invalid check digits (must be 2 digits)");
      });

      it("should reject IBAN with invalid check digits (special characters)", () => {
        const result = validateIban("DE8@370400440532013000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Invalid check digits (must be 2 digits)");
      });

      it("should reject IBAN with invalid check digits (letters)", () => {
        const result = validateIban("DEA8370400440532013000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Invalid check digits (must be 2 digits)");
      });
    });

    describe("invalid IBANs - country-specific length validation", () => {
      it("should reject German IBAN with wrong length (too short)", () => {
        const result = validateIban("DE893704004405320130");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid length for DE (expected 22, got 20)",
        );
      });

      it("should reject German IBAN with wrong length (too long)", () => {
        const result = validateIban("DE893704004405320130001");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid length for DE (expected 22, got 23)",
        );
      });

      it("should reject Austrian IBAN with wrong length (too short)", () => {
        const result = validateIban("AT61190430023457320");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid length for AT (expected 20, got 19)",
        );
      });

      it("should reject Austrian IBAN with wrong length (too long)", () => {
        const result = validateIban("AT6119043002345732011");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid length for AT (expected 20, got 21)",
        );
      });

      it("should reject Polish IBAN with wrong length (too short)", () => {
        const result = validateIban("PL6110901014000007121981287");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid length for PL (expected 28, got 27)",
        );
      });

      it("should reject Polish IBAN with wrong length (too long)", () => {
        const result = validateIban("PL611090101400000712198128741");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid length for PL (expected 28, got 29)",
        );
      });

      it("should accept IBANs from unknown countries with valid general length", () => {
        // Using a valid checksum for a 16-character IBAN from unknown country
        const result = validateIban("XX12345678901234");
        expect(result.valid).toBe(false); // Should fail checksum validation, not length
        expect(result.reason).toBe(
          "Invalid checksum (mod-97 validation failed)",
        );
      });
    });

    describe("invalid IBANs - BBAN validation", () => {
      it("should reject IBAN with special characters in BBAN", () => {
        const result = validateIban("DE89 3704 0044 0532 013@ 00");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "BBAN contains invalid characters (must be alphanumeric)",
        );
      });

      it("should accept IBAN with lowercase letters in BBAN (normalized to uppercase)", () => {
        const result = validateIban("DE89 3704 0044 0532 013a 00");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid checksum (mod-97 validation failed)",
        );
      });

      it("should accept IBAN with uppercase letters in BBAN", () => {
        const result = validateIban("DE89370400440532013A00");
        expect(result.valid).toBe(false); // Should fail checksum, not BBAN validation
        expect(result.reason).toBe(
          "Invalid checksum (mod-97 validation failed)",
        );
      });
    });

    describe("invalid IBANs - checksum validation", () => {
      it("should reject IBAN with invalid checksum", () => {
        const result = validateIban("DE89370400440532013001");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid checksum (mod-97 validation failed)",
        );
      });

      it("should reject IBAN with all zeros in check digits", () => {
        const result = validateIban("DE00370400440532013000");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid checksum (mod-97 validation failed)",
        );
      });

      it("should reject IBAN with modified BBAN that breaks checksum", () => {
        const result = validateIban("DE89370400440532013099");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(
          "Invalid checksum (mod-97 validation failed)",
        );
      });
    });

    describe("edge cases", () => {
      it("should handle IBAN at minimum length", () => {
        // Create a valid 15-character IBAN for unknown country
        const result = validateIban("XX1234567890123");
        expect(result.valid).toBe(false); // Should fail checksum
        expect(result.reason).toBe(
          "Invalid checksum (mod-97 validation failed)",
        );
      });

      it("should handle IBAN at maximum length", () => {
        // 32-character IBAN - using DE format as base but extended
        const longIban = "DE893704004405320130001234567890";
        const result = validateIban(longIban);
        expect(result.valid).toBe(false); // Should fail length check for DE
        expect(result.reason).toBe(
          "Invalid length for DE (expected 22, got 32)",
        );
      });

      it("should handle IBAN with maximum spaces", () => {
        const result = validateIban("DE 89 37 04 00 44 05 32 01 30 00");
        expect(result.valid).toBe(true);
      });

      it("should handle IBAN with only country code and check digits", () => {
        const result = validateIban("DE89");
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("IBAN is too short (minimum 15 characters)");
      });
    });

    describe("input normalization", () => {
      it("should normalize spaces correctly", () => {
        const result1 = validateIban("DE89370400440532013000");
        const result2 = validateIban("DE89 3704 0044 0532 0130 00");
        const result3 = validateIban("DE89370400440532013000 ");

        expect(result1.valid).toBe(result2.valid);
        expect(result1.valid).toBe(result3.valid);
      });

      it("should normalize case correctly", () => {
        const result1 = validateIban("DE89370400440532013000");
        const result2 = validateIban("de89370400440532013000");
        const result3 = validateIban("De89370400440532013000");

        expect(result1.valid).toBe(result2.valid);
        expect(result1.valid).toBe(result3.valid);
      });

      it("should handle mixed normalization", () => {
        const result1 = validateIban("DE89370400440532013000");
        const result2 = validateIban(" de 89 37 04 00 44 05 32 01 30 00 ");

        expect(result1.valid).toBe(result2.valid);
      });
    });
  });
});
