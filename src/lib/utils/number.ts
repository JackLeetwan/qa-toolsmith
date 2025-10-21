/**
 * FNV-1a 32-bit hash function
 * @param input - String to hash
 * @returns 32-bit unsigned integer hash
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5 >>> 0; // FNV offset basis

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash;
}

/**
 * SplitMix32 PRNG state and generator
 * @param seed - Initial seed (32-bit unsigned)
 * @returns Generator function that returns pseudo-random 32-bit unsigned integers
 */
export function splitmix32(seed: number): () => number {
  // Convert to 32-bit unsigned, handling floating point specially
  let state: number;
  if (seed !== Math.floor(seed)) {
    // Has fractional part, use IEEE 754 bit representation
    const buffer = new ArrayBuffer(4);
    new Float32Array(buffer)[0] = seed;
    state = new Uint32Array(buffer)[0];
  } else {
    // Integer, convert to unsigned 32-bit
    state = seed >>> 0;
  }

  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
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
    const value = rng();
    const digit = ((value % 10) + 10) % 10; // Ensure positive digit 0-9
    result += String(digit);
  }
  return result;
}
