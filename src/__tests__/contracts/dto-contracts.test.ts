import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  LoginResponse,
  ProfileDTO,
  IbanGeneratorResponse,
  IbanValidationResponse,
  HealthDTO,
  ErrorResponse,
  KeysetPage,
  TemplateDTO,
  TemplateListItemDTO,
} from "../../types/types";

/**
 * Snake case regex pattern: lowercase letter(s) optionally followed by
 * groups of underscore and alphanumeric (lowercase)
 * Examples: valid_key, id, key_1_two_3
 * Counterexamples: ValidKey (camelCase), VALID_KEY (UPPER_SNAKE), _key (leading underscore)
 */
const SNAKE_CASE_PATTERN = /^[a-z]+(_[a-z0-9]+)*$/;

/**
 * Recursively validates that all object keys match snake_case pattern.
 * @param obj Object to validate
 * @param path Current path in object hierarchy for error reporting
 * @returns Array of violations, empty if all keys are valid
 */
function validateSnakeCaseKeys(
  obj: unknown,
  path = "root",
): { key: string; path: string; value: unknown }[] {
  const violations: { key: string; path: string; value: unknown }[] = [];

  if (obj === null || typeof obj !== "object") {
    return violations;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...validateSnakeCaseKeys(item, `${path}[${index}]`));
    });
    return violations;
  }

  // Handle objects
  for (const [key, value] of Object.entries(obj)) {
    // Check if key matches snake_case pattern
    if (!SNAKE_CASE_PATTERN.test(key)) {
      violations.push({
        key,
        path: `${path}.${key}`,
        value,
      });
    }

    // Recursively check nested objects and arrays
    if (value !== null && typeof value === "object") {
      violations.push(...validateSnakeCaseKeys(value, `${path}.${key}`));
    }
  }

  return violations;
}

/**
 * Creates sample API response fixtures for contract testing.
 * These mirror the actual API responses without network calls.
 */
const fixtures = {
  /**
   * Sample LoginResponse fixture
   * Mirrors: POST /api/auth/signin success response
   */
  loginResponse: (): LoginResponse => ({
    access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    profile: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
      role: "user",
    },
  }),

  /**
   * Sample ProfileDTO fixture
   * Mirrors: GET /profiles/me response
   */
  profileDto: (): ProfileDTO => ({
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "user@example.com",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    role: "admin",
  }),

  /**
   * Sample IbanGeneratorResponse fixture
   * Mirrors: GET /api/generators/iban success response
   */
  ibanGeneratorResponse: (): IbanGeneratorResponse => ({
    iban: "DE89370400440532013000",
    country: "DE",
    seed: "test-seed",
  }),

  /**
   * Sample IbanGeneratorResponse without optional seed
   */
  ibanGeneratorResponseNoSeed: (): IbanGeneratorResponse => ({
    iban: "AT611904300234573201",
    country: "AT",
  }),

  /**
   * Sample IbanValidationResponse fixture (valid IBAN)
   * Mirrors: GET /api/validators/iban success response with valid IBAN
   */
  ibanValidationResponseValid: (): IbanValidationResponse => ({
    valid: true,
  }),

  /**
   * Sample IbanValidationResponse fixture (invalid IBAN)
   * Mirrors: GET /api/validators/iban success response with invalid IBAN
   */
  ibanValidationResponseInvalid: (): IbanValidationResponse => ({
    valid: false,
    reason: "Checksum validation failed",
  }),

  /**
   * Sample HealthDTO fixture
   * Mirrors: GET /api/health success response
   */
  healthDto: (): HealthDTO => ({
    status: "ok",
  }),

  /**
   * Sample ErrorResponse fixture
   * Mirrors: API error response format
   */
  errorResponse: (): ErrorResponse => ({
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid input provided",
      details: {
        field_name: "email",
        reason: "Invalid email format",
      },
    },
  }),

  /**
   * Sample KeysetPage<ProfileDTO> fixture
   * Mirrors: GET /profiles (paginated list response)
   */
  profilesPageResponse: (): KeysetPage<ProfileDTO> => ({
    items: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user1@example.com",
        created_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-15T10:30:00Z",
        role: "user",
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        email: "user2@example.com",
        created_at: "2024-01-16T10:30:00Z",
        updated_at: "2024-01-16T10:30:00Z",
        role: "admin",
      },
    ],
    next_cursor: "eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMSJ9",
  }),

  /**
   * Sample KeysetPage<ProfileDTO> without next_cursor
   */
  profilesPageResponseLastPage: (): KeysetPage<ProfileDTO> => ({
    items: [
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        email: "user3@example.com",
        created_at: "2024-01-17T10:30:00Z",
        updated_at: "2024-01-17T10:30:00Z",
        role: "user",
      },
    ],
  }),

  /**
   * Sample TemplateDTO fixture
   * Mirrors: GET /templates/{id} success response
   */
  templateDto: (): TemplateDTO => ({
    id: "template-123",
    owner_id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Bug Report Template",
    fields: [
      {
        key: "bug_title",
        type: "text",
        label: "Bug Title",
        help: "Brief description of the bug",
      },
      {
        key: "steps_to_reproduce",
        type: "markdown",
        label: "Steps to Reproduce",
      },
    ],
    scope: "user",
    preset: null,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    required_fields: ["bug_title"],
    attachments: [],
    is_readonly: false,
    origin_template_id: null,
    version: 1,
  }),

  /**
   * Sample TemplateListItemDTO fixture
   * Mirrors: GET /templates list item (from templates_effective view)
   */
  templateListItemDto: (): TemplateListItemDTO => ({
    id: "template-456",
    owner_id: "550e8400-e29b-41d4-a716-446655440000",
    name: "API Error Template",
    fields: [
      {
        key: "error_code",
        type: "text",
        label: "Error Code",
      },
    ],
    scope: "global",
    preset: "api_bug",
    required_fields: ["error_code"],
    is_readonly: false,
    origin_template_id: null,
    created_at: "2024-01-14T08:00:00Z",
    updated_at: "2024-01-14T08:00:00Z",
    attachments: [],
    version: 1,
  }),
};

describe("DTO Contracts - JSON Key Format (snake_case)", () => {
  describe("LoginResponse", () => {
    it("should have all keys in snake_case format", () => {
      const response = fixtures.loginResponse();
      const violations = validateSnakeCaseKeys(response);

      if (violations.length > 0) {
        const violationStr = violations
          .map((v) => `'${v.key}' at ${v.path}`)
          .join(", ");
        throw new Error(`Keys not in snake_case: ${violationStr}`);
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe("ProfileDTO", () => {
    it("should have all keys in snake_case format", () => {
      const profile = fixtures.profileDto();
      const violations = validateSnakeCaseKeys(profile);

      expect(violations).toHaveLength(0);
    });
  });

  describe("IbanGeneratorResponse", () => {
    it("should have all keys in snake_case format (with seed)", () => {
      const response = fixtures.ibanGeneratorResponse();
      const violations = validateSnakeCaseKeys(response);

      expect(violations).toHaveLength(0);
    });

    it("should have all keys in snake_case format (without seed)", () => {
      const response = fixtures.ibanGeneratorResponseNoSeed();
      const violations = validateSnakeCaseKeys(response);

      expect(violations).toHaveLength(0);
    });
  });

  describe("IbanValidationResponse", () => {
    it("should have all keys in snake_case format (valid IBAN)", () => {
      const response = fixtures.ibanValidationResponseValid();
      const violations = validateSnakeCaseKeys(response);

      expect(violations).toHaveLength(0);
    });

    it("should have all keys in snake_case format (invalid IBAN)", () => {
      const response = fixtures.ibanValidationResponseInvalid();
      const violations = validateSnakeCaseKeys(response);

      expect(violations).toHaveLength(0);
    });
  });

  describe("HealthDTO", () => {
    it("should have all keys in snake_case format", () => {
      const health = fixtures.healthDto();
      const violations = validateSnakeCaseKeys(health);

      expect(violations).toHaveLength(0);
    });
  });

  describe("ErrorResponse", () => {
    it("should have all keys in snake_case format", () => {
      const error = fixtures.errorResponse();
      const violations = validateSnakeCaseKeys(error);

      expect(violations).toHaveLength(0);
    });
  });

  describe("KeysetPage<ProfileDTO>", () => {
    it("should have all keys in snake_case format (with cursor)", () => {
      const page = fixtures.profilesPageResponse();
      const violations = validateSnakeCaseKeys(page);

      expect(violations).toHaveLength(0);
    });

    it("should have all keys in snake_case format (last page)", () => {
      const page = fixtures.profilesPageResponseLastPage();
      const violations = validateSnakeCaseKeys(page);

      expect(violations).toHaveLength(0);
    });
  });

  describe("TemplateDTO", () => {
    it("should have all keys in snake_case format", () => {
      const template = fixtures.templateDto();
      const violations = validateSnakeCaseKeys(template);

      expect(violations).toHaveLength(0);
    });
  });

  describe("TemplateListItemDTO", () => {
    it("should have all keys in snake_case format", () => {
      const templateItem = fixtures.templateListItemDto();
      const violations = validateSnakeCaseKeys(templateItem);

      expect(violations).toHaveLength(0);
    });
  });
});

describe("DTO Contracts - TypeScript Type Compatibility", () => {
  /**
   * These tests use expectTypeOf to verify that fixture shapes
   * match TypeScript types at compile time. No runtime type checking
   * is performed—violations are caught during build with --typecheck.
   */

  it("LoginResponse fixture matches LoginResponse type", () => {
    const response = fixtures.loginResponse();
    expectTypeOf(response).toMatchTypeOf<LoginResponse>();
  });

  it("ProfileDTO fixture matches ProfileDTO type", () => {
    const profile = fixtures.profileDto();
    expectTypeOf(profile).toMatchTypeOf<ProfileDTO>();
  });

  it("IbanGeneratorResponse fixture (with seed) matches type", () => {
    const response = fixtures.ibanGeneratorResponse();
    expectTypeOf(response).toMatchTypeOf<IbanGeneratorResponse>();
  });

  it("IbanGeneratorResponse fixture (without seed) matches type", () => {
    const response = fixtures.ibanGeneratorResponseNoSeed();
    expectTypeOf(response).toMatchTypeOf<IbanGeneratorResponse>();
  });

  it("IbanValidationResponse fixture (valid) matches type", () => {
    const response = fixtures.ibanValidationResponseValid();
    expectTypeOf(response).toMatchTypeOf<IbanValidationResponse>();
  });

  it("IbanValidationResponse fixture (invalid) matches type", () => {
    const response = fixtures.ibanValidationResponseInvalid();
    expectTypeOf(response).toMatchTypeOf<IbanValidationResponse>();
  });

  it("HealthDTO fixture matches HealthDTO type", () => {
    const health = fixtures.healthDto();
    expectTypeOf(health).toMatchTypeOf<HealthDTO>();
  });

  it("ErrorResponse fixture matches ErrorResponse type", () => {
    const error = fixtures.errorResponse();
    expectTypeOf(error).toMatchTypeOf<ErrorResponse>();
  });

  it("KeysetPage<ProfileDTO> fixture (with cursor) matches type", () => {
    const page = fixtures.profilesPageResponse();
    expectTypeOf(page).toMatchTypeOf<KeysetPage<ProfileDTO>>();
  });

  it("KeysetPage<ProfileDTO> fixture (last page) matches type", () => {
    const page = fixtures.profilesPageResponseLastPage();
    expectTypeOf(page).toMatchTypeOf<KeysetPage<ProfileDTO>>();
  });

  it("TemplateDTO fixture matches TemplateDTO type", () => {
    const template = fixtures.templateDto();
    expectTypeOf(template).toMatchTypeOf<TemplateDTO>();
  });

  it("TemplateListItemDTO fixture matches TemplateListItemDTO type", () => {
    const templateItem = fixtures.templateListItemDto();
    expectTypeOf(templateItem).toMatchTypeOf<TemplateListItemDTO>();
  });
});

describe("DTO Contracts - Snake Case Violations Detection", () => {
  /**
   * These tests ensure our validation function correctly identifies
   * keys that violate the snake_case pattern.
   */

  it("should detect camelCase violations", () => {
    const invalidObject = {
      valid_key: "ok",
      invalidKey: "should fail",
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      key: "invalidKey",
      path: "root.invalidKey",
    });
  });

  it("should detect PascalCase violations", () => {
    const invalidObject = {
      ValidKey: "should fail",
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(1);
    expect(violations[0].key).toBe("ValidKey");
  });

  it("should detect UPPER_SNAKE_CASE violations", () => {
    const invalidObject = {
      VALID_KEY: "should fail",
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(1);
    expect(violations[0].key).toBe("VALID_KEY");
  });

  it("should detect leading underscore violations", () => {
    const invalidObject = {
      _private_key: "should fail",
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(1);
    expect(violations[0].key).toBe("_private_key");
  });

  it("should detect trailing underscore violations", () => {
    const invalidObject = {
      key_: "should fail",
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(1);
    expect(violations[0].key).toBe("key_");
  });

  it("should accept valid snake_case variants", () => {
    const validObject = {
      id: "single word",
      user_id: "word with underscore",
      user_profile_id: "multiple underscores",
      key_1_2_3: "with numbers",
      a_b_c_d_e: "many segments",
    };

    const violations = validateSnakeCaseKeys(validObject);

    expect(violations).toHaveLength(0);
  });

  it("should detect violations in nested objects", () => {
    const invalidObject = {
      valid_key: {
        nested_valid: "ok",
        nestedInvalid: "should fail",
      },
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe("root.valid_key.nestedInvalid");
  });

  it("should detect violations in array items", () => {
    const invalidObject = {
      items: [
        {
          valid_key: "ok",
          invalidKey: "should fail",
        },
      ],
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe("root.items[0].invalidKey");
  });

  it("should report multiple violations with correct paths", () => {
    const invalidObject = {
      firstError: "fail",
      nested: {
        secondError: "fail",
      },
      array: [
        {
          thirdError: "fail",
        },
      ],
    };

    const violations = validateSnakeCaseKeys(invalidObject);

    expect(violations).toHaveLength(3);
    expect(violations.map((v) => v.key)).toEqual([
      "firstError",
      "secondError",
      "thirdError",
    ]);
  });
});
