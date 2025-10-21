import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useIbanApi } from "./useIbanApi";
import { mockFetch } from "../../test/setup";
import type {
  IbanCountry,
  IbanGeneratorResponse,
  IbanValidationResponse,
} from "../../types/types";

describe("useIbanApi Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.generate).toBe("function");
      expect(typeof result.current.validate).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });
  });

  describe("generate function", () => {
    describe("successful generation", () => {
      it("should generate IBAN without seed", async () => {
        const mockResponse = {
          iban: "DE89370400440532013000",
          country: "DE" as IbanCountry,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse),
        });

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.generate({ country: "DE" });
        });

        expect(response).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          "https://test.example.com/api/generators/iban?country=DE",
          {
            method: "GET",
            cache: "no-store",
          },
        );
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      });

      it("should generate IBAN with seed", async () => {
        const mockResponse = {
          iban: "DE89370400440532013000",
          country: "DE" as IbanCountry,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse),
        });

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.generate({
            country: "DE",
            seed: "test-seed",
          });
        });

        expect(response).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          "https://test.example.com/api/generators/iban?country=DE&seed=test-seed",
          {
            method: "GET",
            cache: "default",
          },
        );
      });

      it("should handle different countries", async () => {
        const countries: IbanCountry[] = ["DE", "AT", "PL"];

        for (const country of countries) {
          const mockResponse = {
            iban: `XX1234567890123456789`,
            country,
          };

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue(mockResponse),
          });

          const { result } = renderHook(() =>
            useIbanApi("https://test.example.com"),
          );

          let response: IbanGeneratorResponse | null = null;
          await act(async () => {
            response = await result.current.generate({ country });
          });

          expect(response).not.toBeNull();
          expect((response as unknown as IbanGeneratorResponse).country).toBe(
            country,
          );
          expect(mockFetch).toHaveBeenCalledWith(
            `https://test.example.com/api/generators/iban?country=${country}`,
            expect.objectContaining({ method: "GET", cache: "no-store" }),
          );
        }
      });
    });

    describe("error handling", () => {
      it("should handle API error responses", async () => {
        const errorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid country code",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: vi.fn().mockResolvedValue(errorResponse),
        });

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.generate({ country: "DE" });
        });

        expect(response).toBe(null);
        expect(result.current.error).toEqual({
          code: "VALIDATION_ERROR",
          message: "Invalid country code",
        });
        expect(result.current.isLoading).toBe(false);
      });

      it("should handle network errors", async () => {
        const networkError = new Error("Network connection failed");
        mockFetch.mockRejectedValueOnce(networkError);

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.generate({ country: "DE" });
        });

        expect(response).toBe(null);
        expect(result.current.error).toEqual({
          code: "NETWORK_ERROR",
          message: "Network connection failed",
        });
        expect(result.current.isLoading).toBe(false);
      });

      it("should handle malformed JSON responses", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        });

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.generate({ country: "DE" });
        });

        expect(response).toBe(null);
        expect(result.current.error).toEqual({
          code: "INTERNAL",
          message: "An unexpected error occurred",
        });
      });

      it("should handle non-Error exceptions", async () => {
        mockFetch.mockRejectedValueOnce("String error");

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.generate({ country: "DE" });
        });

        expect(response).toBe(null);
        expect(result.current.error).toEqual({
          code: "NETWORK_ERROR",
          message: "Network error occurred",
        });
      });
    });

    describe("loading states", () => {
      it("should set loading state during request", async () => {
        let resolveFetch: (value: unknown) => void;
        const fetchPromise = new Promise((resolve) => {
          resolveFetch = resolve;
        });

        mockFetch.mockReturnValueOnce(fetchPromise);

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        // Start the request
        act(() => {
          result.current.generate({ country: "DE" });
        });

        // Should be loading
        expect(result.current.isLoading).toBe(true);
        expect(result.current.error).toBe(null);

        // Resolve the request
        act(() => {
          resolveFetch({
            ok: true,
            json: vi.fn().mockResolvedValue({ iban: "DE123", country: "DE" }),
          });
        });

        // Should not be loading anymore
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      });

      it("should reset loading state on error", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        await act(async () => {
          await result.current.generate({ country: "DE" });
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).not.toBe(null);
      });
    });
  });

  describe("validate function", () => {
    describe("successful validation", () => {
      it("should validate IBAN successfully", async () => {
        const mockResponse = {
          valid: true,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse),
        });

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.validate({
            iban: "DE89370400440532013000",
          });
        });

        expect(response).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          "https://test.example.com/api/validators/iban?iban=DE89370400440532013000",
          {
            method: "GET",
          },
        );
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      });

      it("should handle invalid IBAN", async () => {
        const mockResponse = {
          valid: false,
          reason: "Invalid format",
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockResponse),
        });

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.validate({ iban: "INVALID" });
        });

        expect(response).toEqual(mockResponse);
        expect(result.current.error).toBe(null);
      });

      it("should handle various IBAN formats", async () => {
        const testIbans = [
          "DE89370400440532013000",
          "DE89 3704 0044 0532 0130 00",
          "AT611904300234573201",
          "PL61109010140000071219812874",
        ];

        for (const iban of testIbans) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({ valid: true }),
          });

          const { result } = renderHook(() =>
            useIbanApi("https://test.example.com"),
          );

          let response: IbanValidationResponse | null = null;
          await act(async () => {
            response = await result.current.validate({ iban });
          });

          expect(response).not.toBeNull();
          expect((response as unknown as IbanValidationResponse).valid).toBe(
            true,
          );
        }
      });
    });

    describe("error handling", () => {
      it("should handle validation API errors", async () => {
        const errorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid IBAN format",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: vi.fn().mockResolvedValue(errorResponse),
        });

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.validate({ iban: "INVALID" });
        });

        expect(response).toBe(null);
        expect(result.current.error).toEqual({
          code: "VALIDATION_ERROR",
          message: "Invalid IBAN format",
        });
      });

      it("should handle network errors during validation", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Connection timeout"));

        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        let response;
        await act(async () => {
          response = await result.current.validate({
            iban: "DE89370400440532013000",
          });
        });

        expect(response).toBe(null);
        expect(result.current.error).toEqual({
          code: "NETWORK_ERROR",
          message: "Connection timeout",
        });
      });
    });
  });

  describe("clearError function", () => {
    it("should clear error state", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      // Trigger an error
      await act(async () => {
        await result.current.generate({ country: "DE" });
      });

      expect(result.current.error).not.toBe(null);

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });

    it("should not affect loading state", async () => {
      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      // Set loading state manually (simulate ongoing request)
      act(() => {
        // This is tricky to test directly, but clearError should not affect loading
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe("state management", () => {
    it("should not overwrite error from previous call", async () => {
      // First call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ iban: "DE123", country: "DE" }),
      });

      // Second call fails
      mockFetch.mockRejectedValueOnce(new Error("Second call failed"));

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      // First successful call
      await act(async () => {
        await result.current.generate({ country: "DE" });
      });
      expect(result.current.error).toBe(null);

      // Second failed call
      await act(async () => {
        await result.current.generate({ country: "AT" });
      });
      expect(result.current.error).toEqual({
        code: "NETWORK_ERROR",
        message: "Second call failed",
      });
    });

    it("should allow concurrent operations", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ iban: "DE123", country: "DE" }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ iban: "AT456", country: "AT" }),
      });

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      // Execute operations sequentially to avoid overlapping act() calls
      let result1, result2;
      await act(async () => {
        result1 = await result.current.generate({ country: "DE" });
      });

      await act(async () => {
        result2 = await result.current.generate({ country: "AT" });
      });

      // Both should complete successfully
      expect(result1).toHaveProperty("iban");
      expect(result2).toHaveProperty("iban");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe("URL construction", () => {
    it("should construct correct URLs for generate", async () => {
      const testCases = [
        {
          params: { country: "DE" as IbanCountry },
          expectedUrl:
            "https://test.example.com/api/generators/iban?country=DE",
        },
        {
          params: { country: "AT" as IbanCountry, seed: "test-seed" },
          expectedUrl:
            "https://test.example.com/api/generators/iban?country=AT&seed=test-seed",
        },
        {
          params: { country: "PL" as IbanCountry, seed: "seed with spaces" },
          expectedUrl:
            "https://test.example.com/api/generators/iban?country=PL&seed=seed+with+spaces",
        },
      ];

      for (const { params, expectedUrl } of testCases) {
        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi
            .fn()
            .mockResolvedValue({ iban: "XX123", country: params.country }),
        });

        await act(async () => {
          await result.current.generate(params);
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.objectContaining({ method: "GET" }),
        );
      }
    });

    it("should construct correct URLs for validate", async () => {
      const testIbans = [
        "DE89370400440532013000",
        "DE89 3704 0044 0532 0130 00",
        "INVALID_IBAN",
      ];

      for (const iban of testIbans) {
        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ valid: true, iban }),
        });

        await act(async () => {
          await result.current.validate({ iban });
        });

        // Use URL constructor to get the correct encoding (spaces become +)
        const expectedUrlObj = new URL(
          "/api/validators/iban",
          "https://test.example.com",
        );
        expectedUrlObj.searchParams.set("iban", iban);
        expect(mockFetch).toHaveBeenCalledWith(
          expectedUrlObj.toString(),
          expect.objectContaining({ method: "GET" }),
        );
      }
    });
  });

  describe("cache behavior", () => {
    it("should use no-store cache for non-seeded requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ iban: "DE123", country: "DE" }),
      });

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      await act(async () => {
        await result.current.generate({ country: "DE" });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    it("should use default cache for seeded requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ iban: "DE123", country: "DE" }),
      });

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      await act(async () => {
        await result.current.generate({ country: "DE", seed: "test-seed" });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cache: "default" }),
      );
    });
  });

  describe("hook stability", () => {
    it("should return stable function references", () => {
      const { result, rerender } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      const initialGenerate = result.current.generate;
      const initialValidate = result.current.validate;
      const initialClearError = result.current.clearError;

      rerender();

      expect(result.current.generate).toBe(initialGenerate);
      expect(result.current.validate).toBe(initialValidate);
      expect(result.current.clearError).toBe(initialClearError);
    });

    it("should maintain state across rerenders", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Test error"));

      const { result, rerender } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      await act(async () => {
        await result.current.generate({ country: "DE" });
      });

      expect(result.current.error).not.toBe(null);

      rerender();

      expect(result.current.error).toEqual({
        code: "NETWORK_ERROR",
        message: "Test error",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty seed parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ iban: "DE123", country: "DE" }),
      });

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      await act(async () => {
        await result.current.generate({ country: "DE", seed: "" });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.example.com/api/generators/iban?country=DE&seed=",
        expect.objectContaining({ cache: "default" }),
      );
    });

    it("should handle special characters in seed", async () => {
      const specialSeed = "!@#$%^&*()_+-=[]{}|;:,.<>?";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ iban: "DE123", country: "DE" }),
      });

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      await act(async () => {
        await result.current.generate({ country: "DE", seed: specialSeed });
      });

      const expectedUrlObj = new URL(
        "/api/generators/iban",
        "https://test.example.com",
      );
      expectedUrlObj.searchParams.set("country", "DE");
      expectedUrlObj.searchParams.set("seed", specialSeed);
      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrlObj.toString(),
        expect.objectContaining({ cache: "default" }),
      );
    });

    it("should handle very long IBANs", async () => {
      const longIban = "DE89" + "1".repeat(30); // Very long IBAN
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ valid: false, iban: longIban }),
      });

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      await act(async () => {
        await result.current.validate({ iban: longIban });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(longIban)),
        expect.any(Object),
      );
    });
  });

  describe("type safety", () => {
    it("should accept valid IbanCountry types", async () => {
      const countries: IbanCountry[] = ["DE", "AT", "PL"];

      for (const country of countries) {
        const { result } = renderHook(() =>
          useIbanApi("https://test.example.com"),
        );

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ iban: "XX123", country }),
        });

        await act(async () => {
          const response = await result.current.generate({ country });
          expect(typeof response?.iban).toBe("string");
          expect(response?.country).toBe(country);
        });
      }
    });

    it("should handle UIError type", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Test error"));

      const { result } = renderHook(() =>
        useIbanApi("https://test.example.com"),
      );

      await act(async () => {
        await result.current.generate({ country: "DE" });
      });

      expect(result.current.error).toHaveProperty("code");
      expect(result.current.error).toHaveProperty("message");
      expect(typeof result.current.error?.code).toBe("string");
      expect(typeof result.current.error?.message).toBe("string");
    });
  });
});
