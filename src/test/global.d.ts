/**
 * Global type declarations for Vitest environment
 *
 * This file provides additional test-only global types that are ONLY included
 * during test runs via tsconfig.vitest.json and should never leak into production builds.
 *
 * Note: `vitest` is already declared in vitest/globals.d.ts when globals: true
 *
 * Reference: https://vitest.dev/config/#globals
 */

/// <reference types="vitest/globals" />

declare global {
  /**
   * Alternative global reference to vitest (legacy/alias)
   *
   * Points to the same instance as `vitest` but provides an alternative
   * naming convention for detection or legacy code patterns.
   */
  const __vitest__: typeof vitest;
}

export {};
