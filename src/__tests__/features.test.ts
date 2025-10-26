import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EnvName, FeaturePath } from "../features/types";

// Mock the environment for each test

describe("Feature Flags", () => {
  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    // Reset import.meta.env for each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (import.meta.env as any).ENV_NAME = "local";
  });

  describe("Environment validation", () => {
    it("should throw error for invalid ENV_NAME", async () => {
      // Temporarily set invalid ENV_NAME
      const originalEnv = import.meta.env.ENV_NAME;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).ENV_NAME = "invalid";

      const { isFeatureEnabled } = await import("../features");

      expect(() => {
        isFeatureEnabled("collections.generators");
      }).toThrow("Invalid or missing ENV_NAME");

      // Restore original env
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).ENV_NAME = originalEnv;
    });

    it("should throw error for missing ENV_NAME", async () => {
      // Temporarily remove ENV_NAME
      const originalEnv = import.meta.env.ENV_NAME;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).ENV_NAME = undefined;

      const { isFeatureEnabled } = await import("../features");

      expect(() => {
        isFeatureEnabled("collections.generators");
      }).toThrow("Invalid or missing ENV_NAME");

      // Restore original env
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).ENV_NAME = originalEnv;
    });
  });

  describe.each([
    ["local", "collections.generators", true], // Currently enabled in config.local.ts
    ["local", "collections.templates", true], // Currently enabled in config.local.ts
    ["local", "collections.charters", true], // Currently enabled in config.local.ts
    ["local", "collections.knowledgeBase", true],
    ["local", "collections.export", true],
    ["local", "auth.passwordReset", true],
    ["local", "auth.emailVerification", true],
    ["local", "auth.socialLogin", true], // Currently enabled in config.local.ts
    ["integration", "collections.generators", true],
    ["integration", "collections.templates", true],
    ["integration", "collections.charters", true],
    ["integration", "collections.knowledgeBase", true],
    ["integration", "collections.export", false],
    ["integration", "auth.passwordReset", true],
    ["integration", "auth.emailVerification", true],
    ["integration", "auth.socialLogin", false],
    ["production", "collections.generators", true],
    ["production", "collections.templates", false],
    ["production", "collections.charters", false],
    ["production", "collections.knowledgeBase", false], // Currently disabled in config.production.ts
    ["production", "collections.export", false],
    ["production", "auth.passwordReset", true],
    ["production", "auth.emailVerification", true],
    ["production", "auth.socialLogin", false],
  ] as const)(
    "Feature flag values for %s environment",
    (env: EnvName, featurePath: FeaturePath, expected: boolean) => {
      it(`should return ${expected} for ${featurePath}`, async () => {
        process.env.ENV_NAME = env;

        const { isFeatureEnabled } = await import("../features");

        expect(isFeatureEnabled(featurePath)).toBe(expected);
      });
    },
  );

  describe("Default-deny behavior", () => {
    it("should return false for non-existent namespace", async () => {
      process.env.ENV_NAME = "local";

      const { isFeatureEnabled } = await import("../features");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isFeatureEnabled("nonexistent.feature" as any)).toBe(false);
    });

    it("should return false for non-existent feature key", async () => {
      process.env.ENV_NAME = "local";

      const { isFeatureEnabled } = await import("../features");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isFeatureEnabled("auth.nonexistent" as any)).toBe(false);
    });
  });
});
