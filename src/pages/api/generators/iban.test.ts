import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { APIContext, AstroCookies } from "astro";

// Mock feature flags to avoid environment issues
vi.mock("../../../features", () => ({
  isFeatureEnabled: vi.fn(() => true), // Default to enabled for most tests
}));

// Mock iban.service
vi.mock("../../../lib/services/iban.service.js", () => ({
  generate: vi.fn(),
}));

import { GET } from "./iban";
import { generate } from "../../../lib/services/iban.service.js";
import { isFeatureEnabled } from "../../../features";

// Helper to create APIContext for testing
function createAPIContext(request: Request): APIContext {
  return {
    request,
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      merge: vi.fn(),
      headers: vi.fn(),
    } as unknown as AstroCookies,
    url: new URL(request.url),
    site: undefined,
    generator: "Astro v5.0.0",
    params: {},
    props: {},
    redirect: vi.fn(),
    rewrite: vi.fn(),
    locals: {},
    clientAddress: "127.0.0.1",
    originPathname: "/",
    getActionResult: vi.fn(),
    callAction: vi.fn(),
    session: undefined,
    csp: {
      insertDirective: vi.fn(),
      insertStyleResource: vi.fn(),
      insertStyleHash: vi.fn(),
    },
    preferredLocale: undefined,
    preferredLocaleList: [],
    currentLocale: undefined,
    routePattern: "/api/generators/iban",
    isPrerendered: false,
  } as unknown as APIContext;
}

// Type the mocked function
const mockGenerate = vi.mocked(generate);

describe("IBAN Generator API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful IBAN generation", () => {
    it("should generate IBAN for Germany", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        iban: "DE89370400440532013000",
        country: "DE",
      });

      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store");

      expect(generate).toHaveBeenCalledWith("DE", undefined);
    });

    it("should generate IBAN for Austria", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=AT",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("AT611904300234573201");

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        iban: "AT611904300234573201",
        country: "AT",
      });

      expect(generate).toHaveBeenCalledWith("AT", undefined);
    });

    it("should generate IBAN for Poland", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=PL",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("PL61109010140000071219812874");

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        iban: "PL61109010140000071219812874",
        country: "PL",
      });

      expect(generate).toHaveBeenCalledWith("PL", undefined);
    });

    it("should generate IBAN with seed", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE&seed=test-seed",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        iban: "DE89370400440532013000",
        country: "DE",
        seed: "test-seed",
      });

      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable",
      );
      expect(response.headers.get("ETag")).toBe('"REU6dGVzdC1zZWVk"');

      expect(generate).toHaveBeenCalledWith("DE", "test-seed");
    });

    it("should handle seed with special characters", async () => {
      const seed = "test.seed_123-test";
      const request = new Request(
        `https://example.com/api/generators/iban?country=DE&seed=${encodeURIComponent(seed)}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        iban: "DE89370400440532013000",
        country: "DE",
        seed,
      });

      expect(generate).toHaveBeenCalledWith("DE", seed);
    });
  });

  describe("feature flag checks", () => {
    it("should return 404 when generators feature is disabled", async () => {
      // Mock feature flag to return false
      vi.mocked(isFeatureEnabled).mockReturnValue(false);

      const request = new Request(
        "https://example.com/api/generators/iban?country=DE",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "FEATURE_DISABLED",
          message: "IBAN generator feature is not available",
        },
      });

      expect(generate).not.toHaveBeenCalled();

      // Reset mock for other tests
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
    });
  });

  describe("input validation errors", () => {
    it("should reject missing country parameter", async () => {
      const request = new Request("https://example.com/api/generators/iban", {
        method: "GET",
        headers: new Headers(),
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Query parameter 'country' is required and must be 'DE', 'AT', or 'PL'",
        },
      });

      expect(generate).not.toHaveBeenCalled();
    });

    it("should reject invalid country parameter", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=US",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "country: Invalid enum value. Expected 'DE' | 'AT' | 'PL', received 'US'",
        },
      });

      expect(generate).not.toHaveBeenCalled();
    });

    it("should reject lowercase country parameter", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=de",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.error.code).toBe("VALIDATION_ERROR");

      expect(generate).not.toHaveBeenCalled();
    });

    it("should reject seed too long", async () => {
      const longSeed = "a".repeat(65);
      const request = new Request(
        `https://example.com/api/generators/iban?country=DE&seed=${longSeed}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "seed: seed must be at most 64 characters",
        },
      });

      expect(generate).not.toHaveBeenCalled();
    });

    it("should reject seed with invalid characters", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE&seed=invalid@seed!",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "seed: seed must contain only alphanumeric, dots, underscores, or hyphens",
        },
      });

      expect(generate).not.toHaveBeenCalled();
    });

    it("should handle multiple validation errors", async () => {
      const longSeed = "a".repeat(65);
      const request = new Request(
        `https://example.com/api/generators/iban?country=INVALID&seed=${longSeed}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.error.code).toBe("VALIDATION_ERROR");
      expect(responseBody.error.message).toContain("country:");
      expect(responseBody.error.message).toContain("seed:");

      expect(generate).not.toHaveBeenCalled();
    });
  });

  describe("cache headers", () => {
    it("should set no-store cache control for random generation", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("ETag")).toBeNull();
    });

    it("should set immutable cache control for seeded generation", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE&seed=test-seed",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable",
      );
      expect(response.headers.get("ETag")).toBe('"REU6dGVzdC1zZWVk"');
    });

    it("should generate correct ETag for seeded requests", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=AT&seed=my-seed-123",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("AT611904300234573201");

      const response = await GET(createAPIContext(request));

      // ETag should be base64 of "AT:my-seed-123"
      const expectedETag = btoa("AT:my-seed-123");
      expect(response.headers.get("ETag")).toBe(`"${expectedETag}"`);
    });

    it("should handle special characters in ETag generation", async () => {
      const seed = "test.seed_123-test";
      const request = new Request(
        `https://example.com/api/generators/iban?country=PL&seed=${encodeURIComponent(seed)}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("PL61109010140000071219812874");

      const response = await GET(createAPIContext(request));

      const expectedETag = btoa(`PL:${seed}`);
      expect(response.headers.get("ETag")).toBe(`"${expectedETag}"`);
    });
  });

  describe("error handling", () => {
    it("should handle generation service errors", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockImplementation(() => {
        throw new Error("IBAN generation failed");
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "INTERNAL",
          message: "An unexpected server error occurred",
          details: { internal: "IBAN generation failed" },
        },
      });
    });

    it("should handle non-Error exceptions", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockImplementation(() => {
        throw "String error";
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody.error.details.internal).toBe("String error");
    });

    it("should handle URL parsing errors", async () => {
      const context = {
        request: {
          url: "invalid-url",
          method: "GET",
          headers: new Headers(),
        } as Request,
        cookies: {
          get: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
          has: vi.fn(),
          merge: vi.fn(),
          headers: vi.fn(),
        } as unknown as AstroCookies,
        url: {} as URL, // This won't be used since URL parsing fails
        site: undefined,
        generator: "Astro v5.0.0",
        params: {},
        props: {},
        redirect: vi.fn(),
        rewrite: vi.fn(),
        locals: {},
        clientAddress: "127.0.0.1",
        originPathname: "/",
        getActionResult: vi.fn(),
        callAction: vi.fn(),
        session: undefined,
        csp: {
          insertDirective: vi.fn(),
          insertStyleResource: vi.fn(),
          insertStyleHash: vi.fn(),
        },
        preferredLocale: undefined,
        preferredLocaleList: [],
        currentLocale: undefined,
        routePattern: "/api/generators/iban",
        isPrerendered: false,
      } as unknown as APIContext;

      const response = await GET(context);
      expect(response.status).toBe(500);
    });
  });

  describe("edge cases", () => {
    it("should handle empty seed parameter", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE&seed=",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.error.code).toBe("VALIDATION_ERROR");

      expect(generate).not.toHaveBeenCalled();
    });

    it("should handle seed exactly at max length", async () => {
      const maxSeed = "a".repeat(64);
      const request = new Request(
        `https://example.com/api/generators/iban?country=DE&seed=${maxSeed}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.seed).toBe(maxSeed);
    });

    it("should handle multiple query parameters", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE&seed=test&extra=ignored",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        iban: "DE89370400440532013000",
        country: "DE",
        seed: "test",
      });
    });

    it("should handle URL-encoded parameters", async () => {
      const seed = "test seed";
      const request = new Request(
        `https://example.com/api/generators/iban?country=DE&seed=${encodeURIComponent(seed)}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.error.code).toBe("VALIDATION_ERROR");

      expect(generate).not.toHaveBeenCalled();
    });

    it("should handle case-sensitive URL parameters", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?Country=DE&Seed=test",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400); // Missing required 'country' parameter
      expect(generate).not.toHaveBeenCalled();
    });
  });

  describe("response format", () => {
    it("should return correct content type", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return valid JSON for success responses", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE&seed=test",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));
      const responseBody = await response.json();

      expect(typeof responseBody).toBe("object");
      expect(responseBody).toHaveProperty("iban");
      expect(responseBody).toHaveProperty("country");
      expect(responseBody).toHaveProperty("seed");
    });

    it("should return valid JSON for error responses", async () => {
      const request = new Request("https://example.com/api/generators/iban", {
        method: "GET",
        headers: new Headers(),
      });

      const response = await GET(createAPIContext(request));
      const responseBody = await response.json();

      expect(typeof responseBody).toBe("object");
      expect(responseBody).toHaveProperty("error");
      expect(typeof responseBody.error).toBe("object");
      expect(responseBody.error).toHaveProperty("code");
      expect(responseBody.error).toHaveProperty("message");
    });
  });

  describe("service integration", () => {
    it("should call generate service with correct parameters", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=PL&seed=deterministic",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("PL61109010140000071219812874");

      await GET(createAPIContext(request));

      expect(generate).toHaveBeenCalledTimes(1);
      expect(generate).toHaveBeenCalledWith("PL", "deterministic");
    });

    it("should handle service returning different IBAN formats", async () => {
      const testCases = [
        { country: "DE", iban: "DE89370400440532013000" },
        { country: "AT", iban: "AT611904300234573201" },
        { country: "PL", iban: "PL61109010140000071219812874" },
      ];

      for (const testCase of testCases) {
        const request = new Request(
          `https://example.com/api/generators/iban?country=${testCase.country}`,
          {
            method: "GET",
            headers: new Headers(),
          },
        );
        mockGenerate.mockReturnValue(testCase.iban);

        const response = await GET(createAPIContext(request));
        const responseBody = await response.json();

        expect(responseBody.iban).toBe(testCase.iban);
        expect(responseBody.country).toBe(testCase.country);
      }
    });
  });

  describe("performance and caching", () => {
    it("should set appropriate cache headers for seeded requests", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE&seed=cached-seed",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toBe("public, max-age=31536000, immutable");

      const etag = response.headers.get("ETag");
      expect(etag).toBeTruthy();
      expect(etag).toMatch(/^".*"$/); // Should be quoted
    });

    it("should set no-cache headers for random requests", async () => {
      const request = new Request(
        "https://example.com/api/generators/iban?country=DE",
        {
          method: "GET",
          headers: new Headers(),
        },
      );
      mockGenerate.mockReturnValue("DE89370400440532013000");

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("ETag")).toBeNull();
    });

    it("should generate unique ETags for different parameters", async () => {
      const testCases = [
        {
          url: "https://example.com/api/generators/iban?country=DE&seed=seed1",
          expectedETag: btoa("DE:seed1"),
        },
        {
          url: "https://example.com/api/generators/iban?country=AT&seed=seed1",
          expectedETag: btoa("AT:seed1"),
        },
        {
          url: "https://example.com/api/generators/iban?country=DE&seed=seed2",
          expectedETag: btoa("DE:seed2"),
        },
      ];

      for (const testCase of testCases) {
        const request = new Request(testCase.url, {
          method: "GET",
          headers: new Headers(),
        });
        mockGenerate.mockReturnValue("DE89370400440532013000");

        const response = await GET(createAPIContext(request));
        const etag = response.headers.get("ETag");

        expect(etag).toBe(`"${testCase.expectedETag}"`);
      }
    });
  });
});
