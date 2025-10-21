import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  loginRequestSchema,
  validateLoginRequest,
  tryValidateLoginRequest,
} from "./login.validator";
import type { LoginRequest } from "../../types/types";

describe("Login Validator", () => {
  describe("loginRequestSchema", () => {
    describe("valid login requests (happy path)", () => {
      it("should validate correct email and password", () => {
        const input = {
          email: "user@example.com",
          password: "securepassword123",
        };

        const result = loginRequestSchema.parse(input);
        expect(result).toEqual({
          email: "user@example.com", // Should remain lowercase if already lowercase
          password: "securepassword123",
        });
      });

      it("should transform email to lowercase", () => {
        const input = {
          email: "USER@EXAMPLE.COM",
          password: "password123",
        };

        const result = loginRequestSchema.parse(input);
        expect(result.email).toBe("user@example.com");
      });

      it("should validate mixed case email", () => {
        const input = {
          email: "User.Name+Tag@Example.Co.Uk",
          password: "password123",
        };

        const result = loginRequestSchema.parse(input);
        expect(result.email).toBe("user.name+tag@example.co.uk");
      });

      it("should accept minimum password length", () => {
        const input = {
          email: "user@example.com",
          password: "12345678", // Exactly 8 characters
        };

        const result = loginRequestSchema.parse(input);
        expect(result.password).toBe("12345678");
      });

      it("should accept maximum password length", () => {
        const longPassword = "a".repeat(128);
        const input = {
          email: "user@example.com",
          password: longPassword,
        };

        const result = loginRequestSchema.parse(input);
        expect(result.password).toBe(longPassword);
      });

      it("should accept maximum email length", () => {
        const longEmail = "a".repeat(248) + "@a.com"; // 254 chars total
        const input = {
          email: longEmail,
          password: "password123",
        };

        const result = loginRequestSchema.parse(input);
        expect(result.email).toBe(longEmail.toLowerCase());
      });
    });

    describe("invalid emails", () => {
      it("should reject empty email", () => {
        const input = {
          email: "",
          password: "password123",
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("valid RFC 5322");
        }
      });

      it("should reject email without @", () => {
        const input = {
          email: "userexample.com",
          password: "password123",
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject email without domain", () => {
        const input = {
          email: "user@",
          password: "password123",
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject email without local part", () => {
        const input = {
          email: "@example.com",
          password: "password123",
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject email with spaces", () => {
        const input = {
          email: "user @ example.com",
          password: "password123",
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject email exceeding maximum length", () => {
        const longEmail = "a".repeat(249) + "@a.com"; // 255 chars total
        const input = {
          email: longEmail,
          password: "password123",
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("cannot exceed 254");
        }
      });

      it("should reject email with invalid characters", () => {
        const invalidEmails = [
          "user@exam ple.com",
          "user@.com",
          "user..user@example.com",
          "user@example..com",
        ];

        invalidEmails.forEach((email) => {
          const input = { email, password: "password123" };
          const result = loginRequestSchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });
    });

    describe("invalid passwords", () => {
      it("should reject password too short", () => {
        const input = {
          email: "user@example.com",
          password: "1234567", // 7 characters
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain(
            "at least 8 characters",
          );
        }
      });

      it("should reject password too long", () => {
        const longPassword = "a".repeat(129); // 129 characters
        const input = {
          email: "user@example.com",
          password: longPassword,
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("cannot exceed 128");
        }
      });

      it("should reject empty password", () => {
        const input = {
          email: "user@example.com",
          password: "",
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain(
            "at least 8 characters",
          );
        }
      });

      it("should reject null password", () => {
        const input = {
          email: "user@example.com",
          password: null as unknown as string,
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject undefined password", () => {
        const input = {
          email: "user@example.com",
          password: undefined as unknown as string,
        };

        expect(() => loginRequestSchema.parse(input)).toThrow();
        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe("invalid input types", () => {
      it("should reject non-object input", () => {
        const invalidInputs = [null, undefined, "string", 123, [], true];

        invalidInputs.forEach((input) => {
          const result = loginRequestSchema.safeParse(input);
          expect(result.success).toBe(false);
        });
      });

      it("should reject missing email field", () => {
        const input = {
          password: "password123",
        };

        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject missing password field", () => {
        const input = {
          email: "user@example.com",
        };

        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject extra fields", () => {
        const input = {
          email: "user@example.com",
          password: "password123",
          extraField: "should be ignored",
        };

        const result = loginRequestSchema.parse(input);
        expect(result).toEqual({
          email: "user@example.com",
          password: "password123",
        });
        expect(result).not.toHaveProperty("extraField");
      });
    });

    describe("edge cases", () => {
      it("should handle email with plus addressing", () => {
        const input = {
          email: "user+tag@example.com",
          password: "password123",
        };

        const result = loginRequestSchema.parse(input);
        expect(result.email).toBe("user+tag@example.com");
      });

      it("should handle email with subdomains", () => {
        const input = {
          email: "user@sub.example.com",
          password: "password123",
        };

        const result = loginRequestSchema.parse(input);
        expect(result.email).toBe("user@sub.example.com");
      });

      it("should handle password with special characters", () => {
        const input = {
          email: "user@example.com",
          password: "!@#$%^&*()_+-=[]{}|;:,.<>?",
        };

        const result = loginRequestSchema.parse(input);
        expect(result.password).toBe("!@#$%^&*()_+-=[]{}|;:,.<>?");
      });

      it("should handle password with unicode characters", () => {
        const input = {
          email: "user@example.com",
          password: "pássword123🚀",
        };

        const result = loginRequestSchema.parse(input);
        expect(result.password).toBe("pássword123🚀");
      });

      it("should handle exactly maximum lengths", () => {
        const maxEmail = "a".repeat(248) + "@a.com"; // 254 chars total
        const maxPassword = "a".repeat(128);

        const input = {
          email: maxEmail,
          password: maxPassword,
        };

        const result = loginRequestSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe(maxEmail.toLowerCase());
          expect(result.data.password).toBe(maxPassword);
        }
      });
    });
  });

  describe("validateLoginRequest", () => {
    it("should return validated LoginRequest for valid input", () => {
      const input = {
        email: "user@example.com",
        password: "securepassword123",
      };

      const result = validateLoginRequest(input);
      expect(result).toEqual({
        email: "user@example.com",
        password: "securepassword123",
      });
      expect(result).toMatchObject<LoginRequest>({
        email: expect.any(String),
        password: expect.any(String),
      });
    });

    it("should throw ZodError for invalid input", () => {
      const input = {
        email: "invalid-email",
        password: "123",
      };

      expect(() => validateLoginRequest(input)).toThrow(z.ZodError);
    });

    it("should transform email to lowercase", () => {
      const input = {
        email: "USER@EXAMPLE.COM",
        password: "password123",
      };

      const result = validateLoginRequest(input);
      expect(result.email).toBe("user@example.com");
    });

    it("should handle valid edge cases", () => {
      const testCases = [
        { email: "test.email+tag@example.co.uk", password: "password123" },
        { email: "user@sub.domain.com", password: "a".repeat(8) },
        { email: "a@b.com", password: "a".repeat(128) },
      ];

      testCases.forEach((input) => {
        const result = validateLoginRequest(input);
        expect(result.email).toBe(input.email.toLowerCase());
        expect(result.password).toBe(input.password);
      });
    });
  });

  describe("tryValidateLoginRequest", () => {
    it("should return validated LoginRequest for valid input", () => {
      const input = {
        email: "user@example.com",
        password: "securepassword123",
      };

      const result = tryValidateLoginRequest(input);
      expect(result).toEqual({
        email: "user@example.com",
        password: "securepassword123",
      });
    });

    it("should return null for invalid input", () => {
      const invalidInputs = [
        { email: "invalid-email", password: "password123" },
        { email: "user@example.com", password: "123" },
        { email: "", password: "password123" },
        { email: "user@example.com", password: "" },
        null,
        undefined,
        "string",
        123,
      ];

      invalidInputs.forEach((input) => {
        const result = tryValidateLoginRequest(input);
        expect(result).toBeNull();
      });
    });

    it("should transform email to lowercase", () => {
      const input = {
        email: "USER@EXAMPLE.COM",
        password: "password123",
      };

      const result = tryValidateLoginRequest(input);
      expect(result).not.toBeNull();
      expect(result?.email).toBe("user@example.com");
    });

    it("should handle extra fields gracefully", () => {
      const input = {
        email: "user@example.com",
        password: "password123",
        extra: "field",
        nested: { object: true },
      };

      const result = tryValidateLoginRequest(input);
      expect(result).toEqual({
        email: "user@example.com",
        password: "password123",
      });
    });

    it("should distinguish between valid and invalid inputs", () => {
      const validInput = {
        email: "user@example.com",
        password: "password123",
      };

      const invalidInput = {
        email: "invalid-email",
        password: "password123",
      };

      expect(tryValidateLoginRequest(validInput)).not.toBeNull();
      expect(tryValidateLoginRequest(invalidInput)).toBeNull();
    });
  });

  describe("type safety", () => {
    it("should ensure returned object matches LoginRequest interface", () => {
      const input = {
        email: "user@example.com",
        password: "securepassword123",
      };

      const result = validateLoginRequest(input);

      // Type assertion to ensure TypeScript compatibility
      const loginRequest: LoginRequest = result;
      expect(loginRequest.email).toBe("user@example.com");
      expect(loginRequest.password).toBe("securepassword123");
    });

    it("should work with TypeScript strict mode", () => {
      const input = {
        email: "user@example.com" as const,
        password: "securepassword123" as const,
      };

      const result = validateLoginRequest(input);
      expect(typeof result.email).toBe("string");
      expect(typeof result.password).toBe("string");
    });
  });
});
