/**
 * IBAN Validator - validates IBAN format and checksum
 */

interface IbanValidationResult {
  valid: boolean;
  reason?: string;
}

const IBAN_LENGTHS: Record<string, number> = {
  DE: 22, // Germany
  AT: 20, // Austria
  PL: 28, // Poland
};

/**
 * Validate IBAN format and checksum
 * @param iban - IBAN string to validate (will be normalized)
 * @returns Validation result with reason if invalid
 */
export function validateIban(iban: string): IbanValidationResult {
  // Normalize: remove spaces and convert to uppercase
  const normalized = iban.replace(/\s/g, "").toUpperCase();

  // Check minimum length
  if (normalized.length < 15) {
    return { valid: false, reason: "IBAN is too short (minimum 15 characters)" };
  }

  // Check maximum length
  if (normalized.length > 34) {
    return { valid: false, reason: "IBAN is too long (maximum 34 characters)" };
  }

  // Extract country code (first 2 chars)
  const countryCode = normalized.slice(0, 2);

  // Validate country code format (must be letters)
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { valid: false, reason: "Invalid country code (must be 2 letters)" };
  }

  // Extract check digits (chars 2-3)
  const checkDigits = normalized.slice(2, 4);

  // Validate check digits format (must be digits)
  if (!/^\d{2}$/.test(checkDigits)) {
    return { valid: false, reason: "Invalid check digits (must be 2 digits)" };
  }

  // Check country-specific length if known
  if (IBAN_LENGTHS[countryCode]) {
    const expectedLength = IBAN_LENGTHS[countryCode];
    if (normalized.length !== expectedLength) {
      return {
        valid: false,
        reason: `Invalid length for ${countryCode} (expected ${expectedLength}, got ${normalized.length})`,
      };
    }
  }

  // Validate BBAN contains only alphanumeric characters
  const bban = normalized.slice(4);
  if (!/^[A-Z0-9]+$/.test(bban)) {
    return { valid: false, reason: "BBAN contains invalid characters (must be alphanumeric)" };
  }

  // Perform mod-97 checksum validation
  const isChecksumValid = validateIbanChecksum(normalized);
  if (!isChecksumValid) {
    return { valid: false, reason: "Invalid checksum (mod-97 validation failed)" };
  }

  return { valid: true };
}

/**
 * Validate IBAN checksum using mod-97 algorithm
 * Rearranges IBAN: BBAN + country + check digits, then computes mod 97
 * Valid IBAN should result in remainder of 1
 *
 * @param iban - Normalized IBAN (uppercase, no spaces)
 * @returns true if checksum is valid
 */
function validateIbanChecksum(iban: string): boolean {
  // Rearrange: move first 4 chars (CC + check) to end
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numeric = "";
  for (const char of rearranged) {
    if (char >= "0" && char <= "9") {
      numeric += char;
    } else {
      const code = char.charCodeAt(0) - "A".charCodeAt(0) + 10;
      numeric += code;
    }
  }

  // Compute mod 97
  const remainder = computeMod97(numeric);

  // Valid IBAN has remainder of 1
  return remainder === 1;
}

/**
 * Compute mod 97 for large numeric strings
 * Uses iterative approach to handle large numbers
 *
 * @param numeric - Numeric string
 * @returns Remainder after mod 97
 */
function computeMod97(numeric: string): number {
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  return remainder;
}
