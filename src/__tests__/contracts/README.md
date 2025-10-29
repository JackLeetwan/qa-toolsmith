# DTO Contract Tests

This directory contains contract tests that validate API response schemas and their TypeScript type definitions.

## Overview

Contract tests ensure that:

1. **All JSON response keys follow `snake_case` convention** — Catches typos and naming inconsistencies early
2. **API response shapes match their TypeScript DTO types** — Validates compile-time and runtime consistency
3. **No network calls** — Tests use local fixtures for reliability and speed

## Files

- **`dto-contracts.test.ts`** — Main contract test suite
  - Runtime validation of snake_case keys across all response objects
  - Compile-time type compatibility checks using `expectTypeOf`
  - Violation detection and detailed error reporting
  - Nested object and array validation

## Key Patterns

### 1. Fixtures (Local Test Data)

Fixtures are local factory functions that return sample API responses. They mirror actual API behavior without network calls:

```typescript
const fixtures = {
  loginResponse: (): LoginResponse => ({
    access_token: "eyJhbGc...",
    profile: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@example.com",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
      role: "user",
    },
  }),
};
```

**Guidelines for fixtures:**

- Use realistic, complete data
- Include all required DTO fields (reference `src/types/types.ts`)
- Use snake_case keys exclusively
- Include optional fields where they provide value
- Add comments documenting which API endpoint they mirror

### 2. Snake Case Validation

The test suite includes `validateSnakeCaseKeys()` — a recursive validator that checks all object keys:

```typescript
const violations = validateSnakeCaseKeys(response);
expect(violations).toHaveLength(0);
```

**What it catches:**

- camelCase: `invalidKey` ❌ → should be `invalid_key` ✓
- PascalCase: `ValidKey` ❌ → should be `valid_key` ✓
- UPPER_SNAKE_CASE: `VALID_KEY` ❌ → should be `valid_key` ✓
- Leading/trailing underscores: `_private` or `key_` ❌ → should be `private` or `key_` ✓

**Valid patterns:**

- Single word: `id`, `name`, `status`
- Multiple words: `user_id`, `created_at`, `last_modified`
- With numbers: `key_1`, `account_2fa`, `api_v3`

### 3. TypeScript Type Compatibility

Tests use `expectTypeOf()` to verify fixture shapes match DTOs at compile time:

```typescript
it("LoginResponse fixture matches LoginResponse type", () => {
  const response = fixtures.loginResponse();
  expectTypeOf(response).toMatchTypeOf<LoginResponse>();
});
```

**Important:** These tests only execute during type checking (not at runtime):

```bash
npm run typecheck
```

**What it catches:**

- Missing required fields in fixtures
- Type mismatches (e.g., string vs number)
- Optional fields that should be required

## Running Tests

```bash
# Run contract tests only
npm run test:unit -- src/__tests__/contracts/dto-contracts.test.ts

# Run all unit tests (includes contracts)
npm run test:unit

# Run with type checking
npm run typecheck

# Run with coverage report
npm run test:unit:coverage -- src/__tests__/contracts/dto-contracts.test.ts
```

## Adding a New DTO to Contracts

When you add a new API endpoint, add its contract test:

### Step 1: Define or Update the DTO

In `src/types/types.ts`:

```typescript
export interface MyNewResponse {
  id: string;
  user_name: string;
  created_at: string;
}
```

### Step 2: Import the DTO

```typescript
import type { MyNewResponse } from "../../types/types";
```

### Step 3: Create a Fixture

```typescript
const fixtures = {
  myNewResponse: (): MyNewResponse => ({
    id: "123",
    user_name: "john_doe",
    created_at: "2024-01-15T10:30:00Z",
  }),
};
```

### Step 4: Add Tests

```typescript
describe("MyNewResponse", () => {
  it("should have all keys in snake_case format", () => {
    const response = fixtures.myNewResponse();
    const violations = validateSnakeCaseKeys(response);
    expect(violations).toHaveLength(0);
  });

  it("MyNewResponse fixture matches MyNewResponse type", () => {
    const response = fixtures.myNewResponse();
    expectTypeOf(response).toMatchTypeOf<MyNewResponse>();
  });
});
```

## Troubleshooting

### ❌ Test Fails: "Keys not in snake_case"

The test reports which keys violate the convention. Example error:

```
Keys not in snake_case: 'userId' at root.userId, 'firstName' at root.firstName
```

**Fix:** Update the fixture (or API code) to use snake_case:

```typescript
// ❌ Before
{ userId: "123", firstName: "John" }

// ✓ After
{ user_id: "123", first_name: "John" }
```

### ❌ TypeScript Error: "missing properties"

When running `npm run typecheck`:

```
Type '...' is missing the following properties from type 'MyDTO': field_one, field_two
```

**Fix:** Add the missing fields to your fixture. Consult `src/types/types.ts` and `src/db/database.types.ts` to identify all required fields.

### ✓ Tests Pass Locally but Fail in CI

Ensure you've committed your fixture updates and run `npm run typecheck` before pushing:

```bash
npm run typecheck
npm run test:unit -- src/__tests__/contracts/dto-contracts.test.ts
npm run lint
```

## Best Practices

1. **Keep Fixtures Simple** — Minimal realistic data, no noise
2. **Use Exact Comment Tags** — Mark which endpoint each fixture mirrors (`// Mirrors: POST /api/auth/signin`)
3. **Test Nested Structures** — Include nested objects and arrays to catch deep key violations
4. **Run Typecheck Pre-Commit** — Prevent type errors from reaching CI
5. **Review Violations Carefully** — Each reported path helps locate the exact problem
6. **Update DTOs First** — If changing API responses, update `src/types/types.ts` first, then update fixtures

## See Also

- [Testing Guidelines](../../docs/TESTING_GUIDELINES.md) — General testing principles and E2E diagnostics
- [Types Documentation](../../src/types/types.ts) — All DTO definitions
- [Vitest Documentation](https://vitest.dev/guide/testing-types.html) — `expectTypeOf` reference
