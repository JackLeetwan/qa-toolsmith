import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EnvName, FeaturePath } from "../features/types";

// Mock astro:env/client with a variable we can control
let mockENV_NAME: string | undefined = "local";

vi.mock("astro:env/client", () => ({
  get ENV_NAME() {
    return mockENV_NAME;
  },
}));

describe("Feature Flags", () => {
  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    mockENV_NAME = "local";
  });

  describe("Safe defaults for invalid environment", () => {
    it("should return false for all features when ENV_NAME is invalid", async () => {
      // Temporarily set invalid ENV_NAME
      mockENV_NAME = "invalid";

      const { isFeatureEnabled } = await import("../features");

      expect(isFeatureEnabled("collections.generators")).toBe(false);
      expect(isFeatureEnabled("collections.templates")).toBe(false);
      expect(isFeatureEnabled("collections.charters")).toBe(false);
      expect(isFeatureEnabled("collections.knowledgeBase")).toBe(false);
      expect(isFeatureEnabled("collections.export")).toBe(false);
      expect(isFeatureEnabled("auth.passwordReset")).toBe(false);
      expect(isFeatureEnabled("auth.emailVerification")).toBe(false);
      expect(isFeatureEnabled("auth.socialLogin")).toBe(false);
    });

    it("should fallback to production when ENV_NAME is missing", async () => {
      // Temporarily remove ENV_NAME - should fallback to production
      mockENV_NAME = undefined;

      const { isFeatureEnabled } = await import("../features");

      // When ENV_NAME is undefined, code fallbacks to "production"
      // Check that production flags are used
      expect(isFeatureEnabled("collections.generators")).toBe(true); // production
      expect(isFeatureEnabled("collections.templates")).toBe(false); // production
      expect(isFeatureEnabled("collections.charters")).toBe(false); // production
      expect(isFeatureEnabled("collections.knowledgeBase")).toBe(true); // production
      expect(isFeatureEnabled("collections.export")).toBe(false); // production
      expect(isFeatureEnabled("auth.passwordReset")).toBe(true); // production
      expect(isFeatureEnabled("auth.emailVerification")).toBe(true); // production
      expect(isFeatureEnabled("auth.socialLogin")).toBe(false); // production
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
    ["production", "collections.knowledgeBase", true],
    ["production", "collections.export", false],
    ["production", "auth.passwordReset", true],
    ["production", "auth.emailVerification", true],
    ["production", "auth.socialLogin", false],
  ] as const)(
    "Feature flag values for %s environment",
    (env: EnvName, featurePath: FeaturePath, expected: boolean) => {
      it(`should return ${expected} for ${featurePath}`, async () => {
        mockENV_NAME = env;

        const { isFeatureEnabled } = await import("../features");

        expect(isFeatureEnabled(featurePath)).toBe(expected);
      });
    },
  );

  describe("Default-deny behavior", () => {
    it("should return false for non-existent namespace", async () => {
      mockENV_NAME = "local";

      const { isFeatureEnabled } = await import("../features");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isFeatureEnabled("nonexistent.feature" as any)).toBe(false);
    });

    it("should return false for non-existent feature key", async () => {
      mockENV_NAME = "local";

      const { isFeatureEnabled } = await import("../features");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isFeatureEnabled("auth.nonexistent" as any)).toBe(false);
    });
  });
});
