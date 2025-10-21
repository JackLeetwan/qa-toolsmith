/**
 * Calculate IBAN check digits (mod-97 algorithm)
 * Moves country code + "00" to the end, transliterates letters (A=10, B=11, ..., Z=35),
 * and computes check digit = 98 - (n mod 97)
 *
 * @param country - Two-letter country code (e.g., 'DE', 'AT')
 * @param bban - Bank Account Number (digits)
 * @returns Two-digit check string (e.g., '86')
 */
export function calculateIbanCheckDigits(
  country: string,
  bban: string,
): string {
  // Rearrange: BBAN + country + "00"
  const rearranged = bban + country.toUpperCase() + "00";

  // Transliterate: A=10, B=11, ..., Z=35
  // Filter out non-alphanumeric characters to handle invalid inputs gracefully
  let numeric = "";
  for (const char of rearranged) {
    if (char >= "0" && char <= "9") {
      numeric += char;
    } else if (char >= "A" && char <= "Z") {
      const code = char.charCodeAt(0) - "A".charCodeAt(0) + 10;
      numeric += code;
    }
    // Skip invalid characters (spaces, special chars, lowercase letters, etc.)
  }

  // If no valid characters after filtering, compute for country + "00" only
  // This happens when BBAN contains only spaces/special chars
  if (numeric.length === 0) {
    // For invalid BBANs, compute check digits for country code + "00"
    const countryNumeric =
      country
        .toUpperCase()
        .split("")
        .map((char) => {
          if (char >= "A" && char <= "Z") {
            return String(char.charCodeAt(0) - "A".charCodeAt(0) + 10);
          }
          return "0"; // fallback for non-letter chars
        })
        .join("") + "00";

    const remainder = computeMod97(countryNumeric);
    const check = 98 - remainder;
    return String(check).padStart(2, "0");
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
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
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
