# API Testing Guide for E2E Tests

## Overview

This document describes the API testing strategy for the QA Toolsmith MVP E2E test suite, specifically focusing on the IBAN Generator API endpoint (`GET /api/generators/iban`).

## Introduction

While E2E tests typically focus on user interactions through the browser UI, API testing is crucial for:

1. **Backend Validation**: Ensure API logic is correct independent of UI
2. **Contract Testing**: Verify response structure matches TypeScript types
3. **Error Handling**: Test edge cases and invalid inputs
4. **Performance**: Quick validation without UI rendering overhead
5. **Security**: Test injection attacks and boundary conditions

## Using Playwright for API Testing

Playwright provides built-in API testing capabilities through the `page.request` API, which allows making HTTP requests directly without navigating through the browser.

### Advantages

- **Shared Context**: Reuse the same Playwright context as UI tests
- **No Browser Overhead**: Faster than full page navigation
- **Integrated Logging**: Part of trace viewer diagnostics
- **Consistent Patterns**: Same assertions and patterns as UI tests

### Example

```typescript
// Make an API request
const response = await page.request.get("/api/generators/iban?country=DE");

// Assert status
expect(response.status()).toBe(200);

// Parse response
const body = await response.json();

// Validate structure
expect(body).toHaveProperty("iban");
expect(body.country).toBe("DE");
```

## IBAN Generator API Tests

### Endpoint Details

- **URL**: `GET /api/generators/iban`
- **Parameters**: 
  - `country` (required): `DE` | `AT` | `PL`
  - `seed` (optional): alphanumeric with dots, underscores, hyphens (max 64 chars)
- **Response**: `IbanGeneratorResponse` type from `src/types/types.ts`
- **Public**: No authentication required

### Test Suite Structure

The test suite `e2e/generators-iban.spec.ts` contains two `describe` blocks:

#### 1. UI Tests ("IBAN Generator - Copy Button Stability")
Tests the user interface and copy functionality:
- Copy button stability and visibility
- Toast message display and auto-dismiss
- Sequential copy actions
- Result content validation

#### 2. API Tests ("IBAN Generator - API Endpoint")
Tests backend validation and response contracts:

### Test Categories

#### Success Cases

1. **Random IBAN Generation** (no seed)
   - DE: 22-digit format (DE + 2 check digits + 18 BBAN)
   - AT: 20-digit format (AT + 2 check digits + 16 BBAN)
   - PL: 28-digit format (PL + 2 check digits + 24 BBAN)
   - Cache-Control header: `no-store`

2. **Deterministic IBAN Generation** (with seed)
   - Same seed always produces same IBAN
   - Response includes seed in output
   - Cache-Control header: `public, max-age=31536000, immutable`
   - ETag header present for caching

3. **Special Characters in Seed**
   - Allowed: alphanumeric, dots (.), underscores (_), hyphens (-)
   - Validates deterministic reproducibility

#### Error Cases (400 Bad Request)

1. **Missing Country Parameter**
   - No query string provided
   - Response includes error structure with code and message

2. **Invalid Country Parameter**
   - Country not in allowed list (DE, AT, PL)
   - Error code: `VALIDATION_ERROR`

3. **Seed Validation Errors**
   - Exceeds 64 character limit
   - Contains invalid characters (spaces, special symbols)
   - XSS injection attempt: `<script>alert('xss')</script>`
   - SQL injection attempt: `'; DROP TABLE profiles; --`

#### Response Contract Validation

All tests verify:
- HTTP status code (200 or 400)
- Response structure (`iban`, `country`, optional `seed`)
- Data types (strings, proper formats)
- Content-Type header: `application/json`
- Cache headers (based on seed presence)
- ETag header (for deterministic responses)

### Golden Test Values

Deterministic generation with `seed=1234`:

```
GET /api/generators/iban?country=DE&seed=1234
Response: {"iban":"DE50185482443452538353","country":"DE","seed":"1234"}

GET /api/generators/iban?country=AT&seed=1234
Response: {"iban":"AT471854824434525383","country":"AT","seed":"1234"}
```

These values are verified in tests to ensure consistency across deployments.

### Error Response Structure

The API returns standardized error responses:

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "country: Invalid enum value. Expected 'DE' | 'AT' | 'PL'"
  }
}
```

## Best Practices

### 1. Test Independence
Each test is independent and doesn't rely on previous tests:
```typescript
// Each test makes its own API call
const response = await page.request.get("/api/generators/iban?country=DE");
```

### 2. Response Validation
Verify both structure and content:
```typescript
// Check structure
expect(body).toHaveProperty("iban");
expect(body).toHaveProperty("country");

// Check format
expect(body.iban).toMatch(/^DE\d{20}$/);

// Check type
expect(typeof body.iban).toBe("string");
```

### 3. Error Validation
Test error paths thoroughly:
```typescript
expect(response.status()).toBe(400);
const body = await response.json();
expect(body.error.code).toBe("VALIDATION_ERROR");
expect(body.error.message.toLowerCase()).toContain("country");
```

### 4. Security Testing
Include injection attack scenarios:
```typescript
// XSS attempt
const maliciousSeed = "<script>alert('xss')</script>";
const response = await page.request.get(
  `/api/generators/iban?country=DE&seed=${encodeURIComponent(maliciousSeed)}`
);
expect(response.status()).toBe(400);
```

### 5. State Leakage Testing
Verify no state carries between requests:
```typescript
// Make requests with different parameters
const response1 = await page.request.get("/api/generators/iban?country=DE");
const response2 = await page.request.get("/api/generators/iban?country=AT");

// Verify responses are independent
expect(response1.json().country).toBe("DE");
expect(response2.json().country).toBe("AT");
```

## Running API Tests

Run all E2E tests (UI + API):
```bash
npm run test:e2e
```

Run only IBAN tests:
```bash
npx playwright test e2e/generators-iban.spec.ts
```

Run with specific configuration:
```bash
npx playwright test e2e/generators-iban.spec.ts --headed --debug
```

### Debugging Failed Tests

When a test fails, Playwright captures:
- **Screenshots**: Visual state at failure
- **Videos**: Full test recording
- **Traces**: Network, DOM, console logs

View the last report:
```bash
npx playwright show-report
```

Navigate to the trace viewer for detailed debugging:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

## Integration with CI/CD

API tests run automatically in GitHub Actions pipeline:
- Triggered on: `push` to any branch
- Workers: 1 (sequential, deterministic)
- Retries: 2 on failure
- Artifacts: HTML report, traces, videos (retained on failure only)

## Response Contract Types

### Success Response (200)

```typescript
interface IbanGeneratorResponse {
  iban: string;           // Valid IBAN for country
  country: IbanCountry;   // "DE" | "AT" | "PL"
  seed?: string;          // Present only if seed was provided
}
```

### Error Response (400)

```typescript
interface ErrorResponse {
  error: {
    code: ErrorCode;      // "VALIDATION_ERROR" | "INTERNAL"
    message: string;      // Human-readable error description
    details?: Record<string, Json>;
  };
}
```

## Future Enhancements

1. **Performance Testing**: Add load testing with k6
2. **Rate Limiting**: Test rate limit enforcement with multiple requests
3. **Additional Endpoints**: Extend pattern to other generator APIs
4. **Contract Testing**: Integration with OpenAPI schemas
5. **Mutation Testing**: Verify validation is strict enough

## References

- [Playwright API Testing Guide](https://playwright.dev/docs/api-testing)
- [Types Definition](../src/types/types.ts)
- [IBAN Service Implementation](../src/lib/services/iban.service.ts)
- [API Endpoint Implementation](../src/pages/api/generators/iban.ts)
- [E2E Test Guidelines](./TESTING_GUIDELINES.md)
