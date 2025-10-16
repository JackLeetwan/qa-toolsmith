import { fnv1a32, splitmix32, generateDigits } from "../utils/number.js";
import { calculateIbanCheckDigits } from "../utils/iban.js";
import type { IbanCountry } from "../../types/types.js";

/**
 * IBAN Service: Generates syntactically valid IBAN numbers
 * with optional deterministic generation via seed.
 */

interface CountrySpec {
  blzLength: number;
  acctLength: number;
  bbanLength: number;
}

const COUNTRY_SPECS: Record<IbanCountry, CountrySpec> = {
  DE: { blzLength: 8, acctLength: 10, bbanLength: 18 },
  AT: { blzLength: 5, acctLength: 11, bbanLength: 16 },
  PL: { blzLength: 8, acctLength: 16, bbanLength: 24 },
};

/**
 * Generate a valid IBAN for the specified country
 *
 * @param country - Country code ('DE' or 'AT')
 * @param seed - Optional seed for deterministic generation
 *              If omitted, generates a random IBAN
 * @returns Complete IBAN string (country + check digits + BBAN)
 *
 * @example
 * generate('DE', '1234') // => 'DE86011870660241783056'
 * generate('AT', '1234') // => 'AT370118702417830564'
 */
export function generate(country: IbanCountry, seed?: string): string {
  // Use seed if provided, otherwise generate random
  const seedValue = seed ?? crypto.randomUUID();

  // Hash seed → 32-bit unsigned integer
  const hash = fnv1a32(seedValue);

  // Initialize PRNG with hashed seed
  const rng = splitmix32(hash);

  // Get country-specific specs
  const spec = COUNTRY_SPECS[country];

  // Generate BLZ (Bankleitzahl) and account number
  const blz = generateDigits(rng, spec.blzLength);
  const acct = generateDigits(rng, spec.acctLength);

  // Combine into BBAN
  const bban = blz + acct;

  // Calculate IBAN check digits
  const checkDigits = calculateIbanCheckDigits(country, bban);

  // Return complete IBAN: CC + check digits + BBAN
  return `${country}${checkDigits}${bban}`;
}
