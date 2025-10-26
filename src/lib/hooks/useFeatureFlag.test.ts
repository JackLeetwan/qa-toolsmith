import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFeatureFlag } from "./useFeatureFlag";

// Mock the environment utility
vi.mock("@/lib/utils/environment", () => ({
  getClientEnvName: vi.fn(),
}));

// Mock the features module
vi.mock("@/features", () => ({
  getFeatureFlagsForEnv: vi.fn(),
}));

import { getClientEnvName } from "@/lib/utils/environment";
import { getFeatureFlagsForEnv } from "@/features";

const mockGetClientEnvName = vi.mocked(getClientEnvName);
const mockGetFeatureFlagsForEnv = vi.mocked(getFeatureFlagsForEnv);

describe("useFeatureFlag Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("feature flag checking", () => {
    it("should return true for enabled feature in local environment", () => {
      mockGetClientEnvName.mockReturnValue("local");
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: true,
          emailVerification: true,
          socialLogin: true,
        },
        collections: {
          generators: true,
          charters: true,
          templates: true,
          knowledgeBase: true,
          export: true,
        },
      });

      const { result } = renderHook(() =>
        useFeatureFlag("collections.generators"),
      );

      expect(result.current).toBe(true);
      expect(mockGetClientEnvName).toHaveBeenCalledTimes(1);
      expect(mockGetFeatureFlagsForEnv).toHaveBeenCalledWith("local");
    });

    it("should return false for disabled feature in production environment", () => {
      mockGetClientEnvName.mockReturnValue("production");
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: true,
          emailVerification: true,
          socialLogin: false,
        },
        collections: {
          generators: true,
          charters: false,
          templates: false,
          knowledgeBase: false,
          export: false,
        },
      });

      const { result } = renderHook(() =>
        useFeatureFlag("collections.charters"),
      );

      expect(result.current).toBe(false);
      expect(mockGetClientEnvName).toHaveBeenCalledTimes(1);
      expect(mockGetFeatureFlagsForEnv).toHaveBeenCalledWith("production");
    });

    it("should return false for invalid environment", () => {
      mockGetClientEnvName.mockReturnValue(null);
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: false,
          emailVerification: false,
          socialLogin: false,
        },
        collections: {
          generators: false,
          charters: false,
          templates: false,
          knowledgeBase: false,
          export: false,
        },
      });

      const { result } = renderHook(() => useFeatureFlag("auth.passwordReset"));

      expect(result.current).toBe(false);
      expect(mockGetClientEnvName).toHaveBeenCalledTimes(1);
      expect(mockGetFeatureFlagsForEnv).toHaveBeenCalledWith(null);
    });

    it("should return false for non-existent namespace", () => {
      mockGetClientEnvName.mockReturnValue("local");
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: true,
          emailVerification: true,
          socialLogin: true,
        },
        collections: {
          generators: true,
          charters: true,
          templates: true,
          knowledgeBase: true,
          export: true,
        },
      });

      const { result } = renderHook(() =>
        useFeatureFlag("nonexistent.feature"),
      );

      expect(result.current).toBe(false);
    });

    it("should return false for non-existent feature key", () => {
      mockGetClientEnvName.mockReturnValue("local");
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: true,
          emailVerification: true,
          socialLogin: true,
        },
        collections: {
          generators: true,
          charters: true,
          templates: true,
          knowledgeBase: true,
          export: true,
        },
      });

      const { result } = renderHook(() => useFeatureFlag("auth.nonexistent"));

      expect(result.current).toBe(false);
    });
  });

  describe("environment handling", () => {
    it("should handle local environment correctly", () => {
      mockGetClientEnvName.mockReturnValue("local");
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: true,
          emailVerification: true,
          socialLogin: true,
        },
        collections: {
          generators: true,
          charters: true,
          templates: true,
          knowledgeBase: true,
          export: true,
        },
      });

      const { result } = renderHook(() => useFeatureFlag("auth.socialLogin"));

      expect(result.current).toBe(true);
    });

    it("should handle integration environment correctly", () => {
      mockGetClientEnvName.mockReturnValue("integration");
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: true,
          emailVerification: true,
          socialLogin: false,
        },
        collections: {
          generators: true,
          charters: true,
          templates: true,
          knowledgeBase: true,
          export: false,
        },
      });

      const { result: result1 } = renderHook(() =>
        useFeatureFlag("collections.export"),
      );
      const { result: result2 } = renderHook(() =>
        useFeatureFlag("auth.socialLogin"),
      );

      expect(result1.current).toBe(false);
      expect(result2.current).toBe(false);
    });

    it("should handle production environment correctly", () => {
      mockGetClientEnvName.mockReturnValue("production");
      mockGetFeatureFlagsForEnv.mockReturnValue({
        auth: {
          passwordReset: true,
          emailVerification: true,
          socialLogin: false,
        },
        collections: {
          generators: true,
          charters: false,
          templates: false,
          knowledgeBase: false,
          export: false,
        },
      });

      const { result: result1 } = renderHook(() =>
        useFeatureFlag("collections.generators"),
      );
      const { result: result2 } = renderHook(() =>
        useFeatureFlag("collections.templates"),
      );

      expect(result1.current).toBe(true);
      expect(result2.current).toBe(false);
    });
  });
});
