/**
 * Calculate IBAN check digits (mod-97 algorithm)
 * Moves country code + "00" to the end, transliterates letters (A=10, B=11, ..., Z=35),
 * and computes check digit = 98 - (n mod 97)
 *
 * @param country - Two-letter country code (e.g., 'DE', 'AT')
 * @param bban - Bank Account Number (digits)
 * @returns Two-digit check string (e.g., '86')
 */
export function calculateIbanCheckDigits(country: string, bban: string): string {
  // Rearrange: BBAN + country + "00"
  const rearranged = bban + country + "00";

  // Transliterate: A=10, B=11, ..., Z=35
  let numeric = "";
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i];
    if (char >= "0" && char <= "9") {
      numeric += char;
    } else {
      const code = char.charCodeAt(0) - "A".charCodeAt(0) + 10;
      numeric += code;
    }
  }

  // Compute check = 98 - (numeric mod 97)
  const remainder = computeMod97(numeric);
  const check = 98 - remainder;

  return String(check).padStart(2, "0");
}

/**
 * Compute mod 97 for large numeric strings (IBAN algorithm)
 * Uses iterative approach to avoid JavaScript number precision issues
 *
 * @param numeric - Numeric string (may be very long)
 * @returns Remainder after mod 97
 */
function computeMod97(numeric: string): number {
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }
  return remainder;
}

/**
 * Pad a numeric string to a specific length with leading zeros
 *
 * @param length - Target length
 * @param value - Value to pad
 * @returns Padded string
 */
export function padDigits(length: number, value: string): string {
  return value.padStart(length, "0");
}
