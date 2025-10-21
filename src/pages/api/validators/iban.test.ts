import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { APIContext, AstroCookies } from "astro";
import { GET } from "./iban";

// Mock iban-validator
vi.mock("../../../lib/utils/iban-validator.js", () => ({
  validateIban: vi.fn(),
}));

import { validateIban } from "../../../lib/utils/iban-validator.js";

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
    routePattern: "/api/validators/iban",
    isPrerendered: false,
  } as unknown as APIContext;
}

// Type the mocked function
const mockValidateIban = vi.mocked(validateIban);

describe("IBAN Validator API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful IBAN validation", () => {
    it("should validate a valid IBAN", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({ valid: true });

      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");

      expect(validateIban).toHaveBeenCalledWith(iban);
    });

    it("should validate an invalid IBAN with reason", async () => {
      const iban = "INVALID";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({
        valid: false,
        reason: "Invalid checksum (mod-97 validation failed)",
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        valid: false,
        reason: "Invalid checksum (mod-97 validation failed)",
      });

      expect(validateIban).toHaveBeenCalledWith(iban);
    });

    it("should handle IBAN with spaces", async () => {
      const iban = "DE89 3704 0044 0532 0130 00";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${encodeURIComponent(iban)}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith(iban);
    });

    it("should handle lowercase IBAN", async () => {
      const iban = "de89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith(iban);
    });

    it("should handle different country IBANs", async () => {
      const testCases = [
        "DE89370400440532013000",
        "AT611904300234573201",
        "PL61109010140000071219812874",
      ];

      for (const iban of testCases) {
        const request = new Request(
          `https://example.com/api/validators/iban?iban=${iban}`,
          {
            method: "GET",
            headers: new Headers(),
          },
        );
        mockValidateIban.mockReturnValue({ valid: true });

        const response = await GET(createAPIContext(request));

        expect(response.status).toBe(200);
        expect(validateIban).toHaveBeenCalledWith(iban);
      }
    });
  });

  describe("input validation errors", () => {
    it("should reject missing iban parameter", async () => {
      const request = new Request("https://example.com/api/validators/iban", {
        method: "GET",
        headers: new Headers(),
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "iban: Required",
        },
      });

      expect(validateIban).not.toHaveBeenCalled();
    });

    it("should reject empty iban parameter", async () => {
      const request = new Request(
        "https://example.com/api/validators/iban?iban=",
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
          message: "iban: iban parameter is required",
        },
      });

      expect(validateIban).not.toHaveBeenCalled();
    });

    it("should handle URL-encoded iban parameter", async () => {
      const iban = "DE89 3704 0044 0532 0130 00";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${encodeURIComponent(iban)}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith(iban);
    });

    it("should handle multiple query parameters", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}&extra=ignored`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith(iban);
    });
  });

  describe("validation results", () => {
    it("should return detailed validation results for invalid IBANs", async () => {
      const iban = "DE123";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({
        valid: false,
        reason: "IBAN too short",
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        valid: false,
        reason: "IBAN too short",
      });
    });

    it("should handle validation service returning minimal result", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));
      const responseBody = await response.json();

      expect(responseBody).toEqual({ valid: true });
      expect(responseBody).not.toHaveProperty("reason");
    });

    it("should handle various validation error types", async () => {
      const errorCases = [
        { iban: "INVALID", result: { valid: false, reason: "Invalid format" } },
        { iban: "DE12", result: { valid: false, reason: "Too short" } },
        {
          iban: "XX123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890",
          result: { valid: false, reason: "Too long" },
        },
        {
          iban: "12345678901234567890",
          result: { valid: false, reason: "Invalid country code" },
        },
        {
          iban: "DEAB370400440532013000",
          result: { valid: false, reason: "Invalid check digits" },
        },
      ];

      for (const errorCase of errorCases) {
        const request = new Request(
          `https://example.com/api/validators/iban?iban=${errorCase.iban}`,
          {
            method: "GET",
            headers: new Headers(),
          },
        );
        mockValidateIban.mockReturnValue(errorCase.result);

        const response = await GET(createAPIContext(request));
        const responseBody = await response.json();

        expect(responseBody).toEqual(errorCase.result);
      }
    });
  });

  describe("cache headers", () => {
    it("should set appropriate cache control", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    });

    it("should cache both valid and invalid results", async () => {
      const testCases = [
        { iban: "DE89370400440532013000", result: { valid: true } },
        { iban: "INVALID", result: { valid: false, reason: "Invalid" } },
      ];

      for (const testCase of testCases) {
        const request = new Request(
          `https://example.com/api/validators/iban?iban=${testCase.iban}`,
          {
            method: "GET",
            headers: new Headers(),
          },
        );
        mockValidateIban.mockReturnValue(testCase.result);

        const response = await GET(createAPIContext(request));

        expect(response.headers.get("Cache-Control")).toBe(
          "public, max-age=300",
        );
      }
    });
  });

  describe("error handling", () => {
    it("should handle validation service errors", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockImplementation(() => {
        throw new Error("Validation service failed");
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(500);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        error: {
          code: "INTERNAL",
          message: "An unexpected server error occurred",
          details: { internal: "Validation service failed" },
        },
      });
    });

    it("should handle non-Error exceptions", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockImplementation(() => {
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
        routePattern: "/api/validators/iban",
        isPrerendered: false,
      } as unknown as APIContext;

      const response = await GET(context);
      expect(response.status).toBe(500);
    });
  });

  describe("response format", () => {
    it("should return correct content type", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return valid JSON for success responses", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));
      const responseBody = await response.json();

      expect(typeof responseBody).toBe("object");
      expect(responseBody).toHaveProperty("valid");
      expect(typeof responseBody.valid).toBe("boolean");
    });

    it("should return valid JSON for error responses", async () => {
      const request = new Request("https://example.com/api/validators/iban", {
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

    it("should return valid JSON for invalid IBAN responses", async () => {
      const iban = "INVALID";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({
        valid: false,
        reason: "Invalid IBAN",
      });

      const response = await GET(createAPIContext(request));
      const responseBody = await response.json();

      expect(typeof responseBody).toBe("object");
      expect(responseBody).toHaveProperty("valid");
      expect(responseBody).toHaveProperty("reason");
      expect(typeof responseBody.valid).toBe("boolean");
      expect(typeof responseBody.reason).toBe("string");
    });
  });

  describe("edge cases", () => {
    it("should handle very long IBAN parameters", async () => {
      const longIban = "X".repeat(34); // Maximum IBAN length
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${longIban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: false, reason: "Invalid" });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith(longIban);
    });

    it("should handle IBAN with unicode characters", async () => {
      const iban = "DE89370400440532013000🚀";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${encodeURIComponent(iban)}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({
        valid: false,
        reason: "Invalid characters",
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith(iban);
    });

    it("should handle empty string after URL decoding", async () => {
      const request = new Request(
        "https://example.com/api/validators/iban?iban=%20%20%20",
        {
          method: "GET",
          headers: new Headers(),
        },
      ); // URL-encoded spaces

      mockValidateIban.mockReturnValue({
        valid: false,
        reason: "IBAN is too short (minimum 15 characters)",
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith("   ");
    });

    it("should handle case-sensitive URL parameters", async () => {
      const request = new Request(
        "https://example.com/api/validators/iban?Iban=DE89370400440532013000",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400); // Missing required 'iban' parameter
      expect(validateIban).not.toHaveBeenCalled();
    });

    it("should handle malformed URL-encoded parameters", async () => {
      const request = new Request(
        "https://example.com/api/validators/iban?iban=%ZZ",
        {
          method: "GET",
          headers: new Headers(),
        },
      ); // Invalid URL encoding

      // This should still work as URL parsing handles malformed encoding
      mockValidateIban.mockReturnValue({
        valid: false,
        reason: "Invalid format",
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith("%ZZ");
    });
  });

  describe("service integration", () => {
    it("should call validateIban service with correct parameter", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      await GET(createAPIContext(request));

      expect(validateIban).toHaveBeenCalledTimes(1);
      expect(validateIban).toHaveBeenCalledWith(iban);
    });

    it("should handle service returning different result formats", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const testResults = [
        { valid: true },
        { valid: false, reason: "Invalid checksum" },
        {
          valid: false,
          reason: "Invalid format",
          details: "Country code missing",
        },
      ];

      for (const result of testResults) {
        mockValidateIban.mockReturnValue(result);

        const response = await GET(createAPIContext(request));
        const responseBody = await response.json();

        expect(responseBody).toEqual(result);
      }
    });
  });

  describe("performance and caching", () => {
    it("should set consistent cache headers", async () => {
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
      // 5 minutes cache for validation results
    });

    it("should not set ETag headers", async () => {
      // Unlike the generator endpoint, validator doesn't set ETags
      const iban = "DE89370400440532013000";
      const request = new Request(
        `https://example.com/api/validators/iban?iban=${iban}`,
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      mockValidateIban.mockReturnValue({ valid: true });

      const response = await GET(createAPIContext(request));

      expect(response.headers.get("ETag")).toBeNull();
    });
  });

  describe("query parameter handling", () => {
    it("should handle multiple values for iban parameter", async () => {
      // URLSearchParams.get() returns the first value, so multiple values are ignored
      const request = new Request(
        "https://example.com/api/validators/iban?iban=DE123&iban=AT456",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(200);
      expect(validateIban).toHaveBeenCalledWith("DE123");
    });

    it("should handle null values from search params", async () => {
      // Simulate searchParams.get returning null
      const request = new Request(
        "https://example.com/api/validators/iban?other=value",
        {
          method: "GET",
          headers: new Headers(),
        },
      );

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);
      expect(validateIban).not.toHaveBeenCalled();
    });

    it("should handle undefined values from search params", async () => {
      // searchParams.get returns null which becomes undefined
      const request = new Request("https://example.com/api/validators/iban", {
        method: "GET",
        headers: new Headers(),
      });

      const response = await GET(createAPIContext(request));

      expect(response.status).toBe(400);
      expect(validateIban).not.toHaveBeenCalled();
    });
  });
});
