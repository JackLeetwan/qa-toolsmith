import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import {
  getTrustedIp,
  maskIpForAudit,
  getOrCreateRequestId,
  isValidUuid,
} from "./request.helper";

// Mock crypto.randomUUID properly with vi.fn()
const mockRandomUUID = vi.fn(() => "generated-uuid-12345");

// Setup global crypto mock before tests
beforeAll(() => {
  vi.stubGlobal("crypto", {
    ...global.crypto,
    randomUUID: mockRandomUUID,
  });
});

// Restore original crypto after tests
afterAll(() => {
  vi.restoreAllMocks();
});

describe("Request Helper", () => {
  beforeEach(() => {
    // Reset crypto mock call count before each test
    mockRandomUUID.mockClear();
    mockRandomUUID.mockImplementation(() => "generated-uuid-12345");
  });
  describe("getTrustedIp", () => {
    describe("X-Forwarded-For header handling", () => {
      it("should extract first IP from X-Forwarded-For when proxies are trusted", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42, 198.51.100.1, 192.0.2.1",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted-proxy"]);
        expect(result).toBe("203.0.113.42");
      });

      it("should handle X-Forwarded-For with single IP", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "192.168.1.100",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted-proxy"]);
        expect(result).toBe("192.168.1.100");
      });

      it("should trim whitespace from X-Forwarded-For IPs", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "  203.0.113.42  ,  198.51.100.1  ",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted-proxy"]);
        expect(result).toBe("203.0.113.42");
      });

      it("should ignore X-Forwarded-For when no trusted proxies configured", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42",
            "x-client-ip": "192.168.1.100",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, []);
        expect(result).toBe("192.168.1.100");
      });

      it("should ignore X-Forwarded-For when trustedProxies is undefined", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42",
            "cf-connecting-ip": "198.51.100.1",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest);
        expect(result).toBe("198.51.100.1");
      });
    });

    describe("Cloudflare header handling", () => {
      it("should use CF-Connecting-IP when trusted proxies configured", () => {
        const mockRequest = {
          headers: new Headers({
            "cf-connecting-ip": "198.51.100.17",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["cloudflare-proxy"]);
        expect(result).toBe("198.51.100.17");
      });

      it("should prefer X-Forwarded-For over CF-Connecting-IP", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42",
            "cf-connecting-ip": "198.51.100.17",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted-proxy"]);
        expect(result).toBe("203.0.113.42");
      });
    });

    describe("fallback IP handling", () => {
      it("should use X-Client-IP as fallback", () => {
        const mockRequest = {
          headers: new Headers({
            "x-client-ip": "10.0.0.5",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest);
        expect(result).toBe("10.0.0.5");
      });

      it("should return 'unknown' when no IP headers present", () => {
        const mockRequest = {
          headers: new Headers(),
        } as Request;

        const result = getTrustedIp(mockRequest);
        expect(result).toBe("unknown");
      });

      it("should return 'unknown' when headers are empty strings", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "",
            "cf-connecting-ip": "",
            "x-client-ip": "",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted"]);
        expect(result).toBe("unknown");
      });
    });

    describe("edge cases", () => {
      it("should handle malformed X-Forwarded-For", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": ",,,",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted"]);
        expect(result).toBe("unknown");
      });

      it("should handle IPv6 addresses in X-Forwarded-For", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "2001:db8::1, ::1",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted"]);
        expect(result).toBe("2001:db8::1");
      });

      it("should handle very long header values", () => {
        const longIpList = Array(100).fill("192.168.1.1").join(", ");
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": longIpList,
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted"]);
        expect(result).toBe("192.168.1.1");
      });

      it("should handle headers with special characters", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42; 198.51.100.1",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, ["trusted"]);
        expect(result).toBe("203.0.113.42; 198.51.100.1");
      });
    });

    describe("trusted proxy configuration", () => {
      it("should work with empty trusted proxies array", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42",
            "x-client-ip": "192.168.1.100",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, []);
        expect(result).toBe("192.168.1.100");
      });

      it("should work with multiple trusted proxies", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42",
          }),
        } as Request;

        const result = getTrustedIp(mockRequest, [
          "proxy1",
          "proxy2",
          "proxy3",
        ]);
        expect(result).toBe("203.0.113.42");
      });
    });
  });

  describe("maskIpForAudit", () => {
    describe("IPv4 masking", () => {
      it("should mask IPv4 to /24 CIDR", () => {
        expect(maskIpForAudit("203.0.113.42")).toBe("203.0.113.0/24");
        expect(maskIpForAudit("192.168.1.100")).toBe("192.168.1.0/24");
        expect(maskIpForAudit("10.0.0.1")).toBe("10.0.0.0/24");
      });

      it("should handle IPv4 with leading zeros", () => {
        expect(maskIpForAudit("192.168.001.100")).toBe("192.168.001.0/24");
      });

      it("should handle IPv4 edge values", () => {
        expect(maskIpForAudit("0.0.0.0")).toBe("0.0.0.0/24");
        expect(maskIpForAudit("255.255.255.255")).toBe("255.255.255.0/24");
      });
    });

    describe("IPv6 masking", () => {
      it("should mask IPv6 to /64 CIDR", () => {
        expect(maskIpForAudit("2001:db8:85a3:8d3:1319:8a2e:370:7344")).toBe(
          "2001:db8:85a3:8d3.../64",
        );
        expect(maskIpForAudit("::1")).toBe("::1/128");
        expect(maskIpForAudit("2001:db8::1")).toBe("2001:db8.../64");
      });

      it("should handle compressed IPv6", () => {
        expect(maskIpForAudit("2001:db8::")).toBe("2001:db8.../64");
        expect(maskIpForAudit("::ffff:192.0.2.1")).toBe("::ffff.../64");
      });

      it("should handle short IPv6 addresses", () => {
        expect(maskIpForAudit("::1")).toBe("::1/128");
        expect(maskIpForAudit("2001:db8::1")).toBe("2001:db8.../64");
      });
    });

    describe("special cases", () => {
      it("should return 'unknown' unchanged", () => {
        expect(maskIpForAudit("unknown")).toBe("unknown");
      });

      it("should return invalid IPs unchanged", () => {
        expect(maskIpForAudit("invalid-ip")).toBe("invalid-ip");
        expect(maskIpForAudit("256.256.256.256")).toBe("256.256.256.256");
        expect(maskIpForAudit("192.168")).toBe("192.168");
        expect(maskIpForAudit("")).toBe("");
      });

      it("should handle mixed formats", () => {
        expect(maskIpForAudit("192.168.1.1:8080")).toBe("192.168.1.0/24");
        expect(maskIpForAudit("[2001:db8::1]:8080")).toBe("[2001:db8::1]:8080");
      });
    });

    describe("edge cases", () => {
      it("should handle very long IP strings", () => {
        const longIp = "192.168.1." + "1".repeat(100);
        expect(maskIpForAudit(longIp)).toBe(longIp); // Invalid IPv4, returned as-is
      });

      it("should handle IP with extra dots", () => {
        expect(maskIpForAudit("192.168.1.1.1")).toBe("192.168.1.1.1"); // Invalid, returned as-is
      });

      it("should handle IPv4-mapped IPv6", () => {
        expect(maskIpForAudit("::ffff:192.0.2.1")).toBe("::ffff.../64");
      });

      it("should handle localhost variations", () => {
        expect(maskIpForAudit("127.0.0.1")).toBe("127.0.0.0/24");
        expect(maskIpForAudit("::1")).toBe("::1/128");
      });
    });
  });

  describe("getOrCreateRequestId", () => {
    describe("existing request ID handling", () => {
      it("should return existing valid UUID from X-Request-ID", () => {
        const validUuid = "550e8400-e29b-41d4-a716-446655440000";
        const mockRequest = {
          headers: new Headers({
            "x-request-id": validUuid,
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe(validUuid);
      });

      it("should accept uppercase UUID", () => {
        const uppercaseUuid = "550E8400-E29B-41D4-A716-446655440000";
        const mockRequest = {
          headers: new Headers({
            "x-request-id": uppercaseUuid,
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe(uppercaseUuid);
      });

      it("should reject invalid UUID format", () => {
        const mockRequest = {
          headers: new Headers({
            "x-request-id": "invalid-uuid",
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe("generated-uuid-12345");
        expect(mockRandomUUID).toHaveBeenCalledTimes(1);
      });

      it("should reject UUID v1", () => {
        const uuidV1 = "550e8400-e29b-11d4-a716-446655440000";
        const mockRequest = {
          headers: new Headers({
            "x-request-id": uuidV1,
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe("generated-uuid-12345");
      });

      it("should reject UUID with wrong version", () => {
        const uuidV3 = "550e8400-e29b-31d4-a716-446655440000";
        const mockRequest = {
          headers: new Headers({
            "x-request-id": uuidV3,
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe("generated-uuid-12345");
      });
    });

    describe("new request ID generation", () => {
      it("should generate new UUID when no X-Request-ID header", () => {
        const mockRequest = {
          headers: new Headers(),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe("generated-uuid-12345");
        expect(mockRandomUUID).toHaveBeenCalledTimes(1);
      });

      it("should generate new UUID when X-Request-ID is empty", () => {
        const mockRequest = {
          headers: new Headers({
            "x-request-id": "",
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe("generated-uuid-12345");
        expect(mockRandomUUID).toHaveBeenCalledTimes(1);
      });

      it("should generate new UUID when X-Request-ID has only whitespace", () => {
        const mockRequest = {
          headers: new Headers({
            "x-request-id": "   ",
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe("generated-uuid-12345");
        expect(mockRandomUUID).toHaveBeenCalledTimes(1);
      });
    });

    describe("UUID validation edge cases", () => {
      it("should accept UUID with different variant bits", () => {
        const uuidVariant8 = "550e8400-e29b-41d4-8716-446655440000"; // Variant 8
        const uuidVariant9 = "550e8400-e29b-41d4-9716-446655440000"; // Variant 9
        const uuidVariantA = "550e8400-e29b-41d4-a716-446655440000"; // Variant A
        const uuidVariantB = "550e8400-e29b-41d4-b716-446655440000"; // Variant B

        [uuidVariant8, uuidVariant9, uuidVariantA, uuidVariantB].forEach(
          (uuid) => {
            const mockRequest = {
              headers: new Headers({
                "x-request-id": uuid,
              }),
            } as Request;

            const result = getOrCreateRequestId(mockRequest);
            expect(result).toBe(uuid);
          },
        );
      });

      it("should reject UUID with wrong length", () => {
        const tooShort = "550e8400-e29b-41d4-a716-44665544000";
        const tooLong = "550e8400-e29b-41d4-a716-4466554400000";

        [tooShort, tooLong].forEach((uuid) => {
          const mockRequest = {
            headers: new Headers({
              "x-request-id": uuid,
            }),
          } as Request;

          const result = getOrCreateRequestId(mockRequest);
          expect(result).toBe("generated-uuid-12345");
        });
      });

      it("should reject UUID with invalid characters", () => {
        const invalidChars = "550e8400-e29b-41d4-a716-44665544000g"; // 'g' is invalid

        const mockRequest = {
          headers: new Headers({
            "x-request-id": invalidChars,
          }),
        } as Request;

        const result = getOrCreateRequestId(mockRequest);
        expect(result).toBe("generated-uuid-12345");
      });
    });
  });

  describe("isValidUuid", () => {
    describe("valid UUID v4", () => {
      it("should accept standard UUID v4", () => {
        const validUuid = "550e8400-e29b-41d4-a716-446655440000";
        expect(isValidUuid(validUuid)).toBe(true);
      });

      it("should accept uppercase UUID v4", () => {
        const uppercaseUuid = "550E8400-E29B-41D4-A716-446655440000";
        expect(isValidUuid(uppercaseUuid)).toBe(true);
      });

      it("should accept different variant bits", () => {
        const variants = [
          "550e8400-e29b-41d4-8716-446655440000", // 8
          "550e8400-e29b-41d4-9716-446655440000", // 9
          "550e8400-e29b-41d4-a716-446655440000", // a
          "550e8400-e29b-41d4-b716-446655440000", // b
        ];

        variants.forEach((uuid) => {
          expect(isValidUuid(uuid)).toBe(true);
        });
      });
    });

    describe("invalid UUIDs", () => {
      it("should reject wrong version", () => {
        const uuidV1 = "550e8400-e29b-11d4-a716-446655440000";
        const uuidV3 = "550e8400-e29b-31d4-a716-446655440000";
        const uuidV5 = "550e8400-e29b-51d4-a716-446655440000";

        expect(isValidUuid(uuidV1)).toBe(false);
        expect(isValidUuid(uuidV3)).toBe(false);
        expect(isValidUuid(uuidV5)).toBe(false);
      });

      it("should reject wrong length", () => {
        const tooShort = "550e8400-e29b-41d4-a716-44665544000";
        const tooLong = "550e8400-e29b-41d4-a716-4466554400000";
        const missingDashes = "550e8400e29b41d4a716446655440000";

        expect(isValidUuid(tooShort)).toBe(false);
        expect(isValidUuid(tooLong)).toBe(false);
        expect(isValidUuid(missingDashes)).toBe(false);
      });

      it("should reject invalid characters", () => {
        const invalidChars = "550e8400-e29b-41d4-a716-44665544000g";
        const specialChars = "550e8400-e29b-41d4-a716-44665544000@";

        expect(isValidUuid(invalidChars)).toBe(false);
        expect(isValidUuid(specialChars)).toBe(false);
      });

      it("should reject empty string", () => {
        expect(isValidUuid("")).toBe(false);
      });

      it("should reject random strings", () => {
        expect(isValidUuid("not-a-uuid")).toBe(false);
        expect(isValidUuid("12345")).toBe(false);
      });

      it("should reject nil UUID", () => {
        const nilUuid = "00000000-0000-0000-0000-000000000000";
        expect(isValidUuid(nilUuid)).toBe(false); // Version is 0, not 4
      });
    });

    describe("edge cases", () => {
      it("should handle undefined and null", () => {
        expect(isValidUuid(undefined as unknown)).toBe(false);
        expect(isValidUuid(null as unknown)).toBe(false);
      });

      it("should handle non-string inputs", () => {
        expect(isValidUuid(123 as unknown)).toBe(false);
        expect(isValidUuid({} as unknown)).toBe(false);
        expect(isValidUuid([] as unknown)).toBe(false);
      });

      it("should be case sensitive for hex characters", () => {
        const mixedCase = "550E8400-e29b-41d4-A716-446655440000";
        expect(isValidUuid(mixedCase)).toBe(true);
      });
    });
  });

  describe("integration tests", () => {
    describe("IP extraction and masking flow", () => {
      it("should extract and mask IP correctly", () => {
        const mockRequest = {
          headers: new Headers({
            "x-forwarded-for": "203.0.113.42, 198.51.100.1",
          }),
        } as Request;

        const ip = getTrustedIp(mockRequest, ["trusted-proxy"]);
        expect(ip).toBe("203.0.113.42");

        const masked = maskIpForAudit(ip);
        expect(masked).toBe("203.0.113.0/24");
      });

      it("should handle unknown IP masking", () => {
        const mockRequest = {
          headers: new Headers(),
        } as Request;

        const ip = getTrustedIp(mockRequest);
        expect(ip).toBe("unknown");

        const masked = maskIpForAudit(ip);
        expect(masked).toBe("unknown");
      });
    });

    describe("request ID generation", () => {
      it("should generate consistent request IDs", () => {
        const mockRequest1 = {
          headers: new Headers(),
        } as Request;

        const mockRequest2 = {
          headers: new Headers(),
        } as Request;

        mockRandomUUID.mockReturnValueOnce("uuid-1");
        mockRandomUUID.mockReturnValueOnce("uuid-2");

        const id1 = getOrCreateRequestId(mockRequest1);
        const id2 = getOrCreateRequestId(mockRequest2);

        expect(id1).toBe("uuid-1");
        expect(id2).toBe("uuid-2");
        expect(mockRandomUUID).toHaveBeenCalledTimes(2);
      });

      it("should reuse valid existing request IDs", () => {
        const validUuid = "550e8400-e29b-41d4-a716-446655440000";
        const mockRequest = {
          headers: new Headers({
            "x-request-id": validUuid,
          }),
        } as Request;

        const id = getOrCreateRequestId(mockRequest);
        expect(id).toBe(validUuid);
        expect(mockRandomUUID).not.toHaveBeenCalled();
      });
    });
  });

  describe("type safety", () => {
    it("should handle Request type properly", () => {
      const mockRequest = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
        }),
      } as Request;

      const ip: string = getTrustedIp(mockRequest);
      const masked: string = maskIpForAudit(ip);
      const requestId: string = getOrCreateRequestId(mockRequest);

      expect(typeof ip).toBe("string");
      expect(typeof masked).toBe("string");
      expect(typeof requestId).toBe("string");
    });

    it("should handle optional parameters", () => {
      const mockRequest = { headers: new Headers() } as Request;

      // All functions should work without optional parameters
      expect(() => getTrustedIp(mockRequest)).not.toThrow();
      expect(() => getOrCreateRequestId(mockRequest)).not.toThrow();
    });
  });
});
