/**
 * FNV-1a 32-bit hash function
 * @param input - String to hash
 * @returns 32-bit unsigned integer hash
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  const prime = 0x01000193; // FNV prime

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * prime) >>> 0; // Keep as 32-bit unsigned
  }

  return hash >>> 0;
}

/**
 * SplitMix32 PRNG state and generator
 * @param seed - Initial seed (32-bit unsigned)
 * @returns Generator function that returns pseudo-random 32-bit unsigned integers
 */
export function splitmix32(seed: number): () => number {
  let state = seed >>> 0; // Ensure 32-bit unsigned

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), 1 | z);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return (z ^ (z >>> 14)) >>> 0;
  };
}

/**
 * Generate N random digits using the provided RNG
 * @param rng - RNG generator function
 * @param length - Number of digits to generate
 * @returns String of N digits (0-9), each digit independently random
 */
export function generateDigits(rng: () => number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String(rng() % 10);
  }
  return result;
}
