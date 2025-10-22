# QA Toolsmith API Documentation

This directory contains documentation for the QA Toolsmith REST API endpoints.

## Available Endpoints

### 🔐 Authentication

- **[POST /auth/login](/api/auth-login.md)** - User authentication with email/password, returns JWT token + profile

### 🏥 Health & Status

- **[GET /health](/api/health.md)** - Simple application health check endpoint (liveness/readiness probe)

### 🔢 Data Generators

- **[GET /generators/iban](/api/generators-iban.md)** - Generate valid IBAN codes (DE, AT, PL) with optional seed

---

## API Conventions

All endpoints follow these conventions:

### Response Format

```json
{
  "data": {
    /* response data */
  }
}
```

### Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {
      /* optional field-specific errors */
    }
  }
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Authentication

Most endpoints require Bearer JWT token in `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Obtain token via `POST /auth/login`.

### Rate Limiting

- **Login endpoint** (`/auth/login`): 10 requests per 60 seconds per IP
- **Other endpoints**: TBD

---

## Quick Start

1. **Authenticate:**

   ```bash
   POST /auth/login
   Content-Type: application/json

   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```

2. **Use token in requests:**

   ```bash
   GET /api/some-endpoint
   Authorization: Bearer {access_token}
   ```

3. **Generate test data:**
   ```bash
   GET /generators/iban?country=DE
   ```

---

## Postman Collection

Import the collection from `.postman/` directory to test all endpoints with pre-configured requests and tests.

---

## Testing Guide

See individual endpoint documentation for:

- Request/response examples
- Error scenarios
- cURL, JavaScript, Python examples
- Postman setup instructions

---

# POST /auth/login — User Authentication

## Endpoint Overview

**URL:** `POST http://localhost:3000/api/auth/login`

**Purpose:** Authenticate user with email/password via Supabase Auth, return JWT token + profile.

**Rate Limit:** 10 requests per 60 seconds per IP (429 on exceed)

---

## Prerequisites

1. **Astro dev server running:**

   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

2. **Supabase credentials configured** in `.env.local`:

   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. **Test user created** in Supabase Auth:
   - Email: `test@example.com`
   - Password: `testPassword123`

---

## Test Scenarios in Postman

### ✅ Scenario 1: Valid Login (200 OK)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "email": "test@example.com",
  "password": "testPassword123"
}
```

**Expected Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profile": {
    "id": "a5e0e0b1-1234-5678-9abc-def012345678",
    "email": "test@example.com",
    "role": "user",
    "created_at": "2025-10-16T10:00:00Z",
    "updated_at": "2025-10-16T10:00:00Z"
  }
}
```

**Verify:**

- ✅ Status code: `200`
- ✅ Response has `access_token` (JWT)
- ✅ Response has `profile` with `id`, `email`, `role`
- ✅ Header `X-Request-ID` present
- ✅ Content-Type: `application/json`

---

### ❌ Scenario 2: Invalid Email Format (400 Bad Request)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "not-an-email",
  "password": "testPassword123"
}
```

**Expected Response (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request: please check your input and try again.",
    "details": {
      "email": "Email must be a valid RFC 5322 address"
    }
  }
}
```

**Verify:**

- ✅ Status code: `400`
- ✅ Error code: `VALIDATION_ERROR`
- ✅ Details contain field-specific errors

---

### ❌ Scenario 3: Password Too Short (400 Bad Request)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "short"
}
```

**Expected Response (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request: please check your input and try again.",
    "details": {
      "password": "Password must be at least 8 characters"
    }
  }
}
```

---

### ❌ Scenario 4: Missing Required Field (400 Bad Request)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com"
}
```

**Expected Response (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request: please check your input and try again.",
    "details": {
      "password": "Required"
    }
  }
}
```

---

### ❌ Scenario 5: Invalid JSON (400 Bad Request)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "testPassword123"
  // Missing closing brace
```
```

**Expected Response (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request: please check your input and try again."
  }
}
```

---

### ❌ Scenario 6: Wrong Content-Type (400 Bad Request)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/x-www-form-urlencoded

email=test@example.com&password=testPassword123
```

**Expected Response (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request: please check your input and try again."
  }
}
```

---

### ❌ Scenario 7: Invalid Credentials (401 Unauthorized)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "wrongPassword123"
}
```

**Expected Response (401):**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect."
  }
}
```

**Verify:**

- ✅ Status code: `401`
- ✅ Error code does NOT expose which field is wrong (security)

---

### ❌ Scenario 8: Non-existent User (401 Unauthorized)

**Request:**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "nonexistent@example.com",
  "password": "testPassword123"
}
```

**Expected Response (401):**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect."
  }
}
```

---

### ⏱️ Scenario 9: Rate Limit Exceeded (429 Too Many Requests)

**Steps:**

1. Send 10 valid login requests **in quick succession** (within 60 seconds)
2. Send 11th request

**Request (11th attempt):**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "testPassword123"
}
```

**Expected Response (429):**

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many login attempts. Please try again later."
  }
}
```

**Verify:**

- ✅ Status code: `429`
- ✅ Response header `Retry-After: 45` (seconds remaining)
- ✅ Error code: `RATE_LIMITED`

**Note:** Can use Postman Collection Runner with 10 iterations + 1 final test request

---

### 📧 Scenario 10: Email Normalization

**Request (uppercase email):**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "Test@Example.COM",
  "password": "testPassword123"
}
```

**Expected Response (200):**

```json
{
  "access_token": "...",
  "profile": {
    "id": "a5e0e0b1-...",
    "email": "test@example.com", // ← normalized to lowercase
    "role": "user",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

## Postman Collection Setup

### 1. Create Environment

**File → New → Environment → "QA Toolsmith Dev"**

Variables:

```
BASE_URL = http://localhost:3000
API_ENDPOINT = /api/auth/login
TEST_EMAIL = test@example.com
TEST_PASSWORD = testPassword123
REQUEST_ID = 550e8400-e29b-41d4-a716-446655440000
```

### 2. Create Collection Request

**New Request:**

**Tab: Authorization**

- Type: `No Auth` (we're testing the endpoint itself)

**Tab: Headers**

```
Content-Type: application/json
X-Request-ID: {{REQUEST_ID}}
```

**Tab: Body (raw, JSON)**

```json
{
  "email": "{{TEST_EMAIL}}",
  "password": "{{TEST_PASSWORD}}"
}
```

**Tab: Tests**

```javascript
// Status code tests
pm.test("Status is 200 on valid credentials", function () {
  pm.response.to.have.status(200);
});

// Response structure
pm.test("Response has access_token", function () {
  let jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("access_token");
});

pm.test("Response has profile", function () {
  let jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("profile");
});

pm.test("Profile has required fields", function () {
  let jsonData = pm.response.json();
  pm.expect(jsonData.profile).to.have.property("id");
  pm.expect(jsonData.profile).to.have.property("email");
  pm.expect(jsonData.profile).to.have.property("role");
});

// Header validation
pm.test("X-Request-ID header present", function () {
  pm.response.to.have.header("X-Request-ID");
});

pm.test("Content-Type is application/json", function () {
  pm.expect(pm.response.headers.get("Content-Type")).to.include(
    "application/json",
  );
});

// Save token for later use
pm.test("Save access_token for authenticated requests", function () {
  let jsonData = pm.response.json();
  pm.environment.set("ACCESS_TOKEN", jsonData.access_token);
});
```

### 3. Run Tests

**Runner → Select Collection → Run**

Expected: ✅ All tests pass for valid scenario

---

## Debugging Tips

### Check Server Logs

```bash
# Terminal where you ran `npm run dev`
# Look for console.log output or error messages
```

### Common Issues

| Issue             | Cause                          | Solution                                      |
| ----------------- | ------------------------------ | --------------------------------------------- |
| 500 error         | Supabase credentials missing   | Check `.env.local` has `SUPABASE_SERVICE_KEY` |
| 401 on valid user | User doesn't exist in Supabase | Create test user in Supabase console          |
| 429 immediately   | Rate limit store not reset     | Restart dev server                            |
| Slow response     | Profile fetch timeout          | Check DB connectivity                         |

---

## Next Steps

After successful login:

1. **Save `access_token`** from response
2. **Use token in Authorization header** for authenticated endpoints:
   ```
   Authorization: Bearer eyJhbGci...
   ```
3. **Test GET /profiles/me** with the token

---

# GET /health — Health Check Endpoint

## Overview

The health endpoint provides a simple mechanism to check the application's availability and readiness. It is primarily used for monitoring and smoke tests.

## Endpoint Details

- **URL**: `/api/health`
- **Method**: `GET`
- **Authentication**: Not required (publicly accessible)

## Response

### Success Response (200 OK)

```json
{
  "status": "ok"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "error": {
    "code": "INTERNAL",
    "message": "An unexpected server error occurred"
  }
}
```

## Usage Examples

### cURL

```bash
curl -X GET https://your-qa-toolsmith-instance.com/api/health
```

### JavaScript (Fetch API)

```javascript
fetch("https://your-qa-toolsmith-instance.com/api/health")
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Health check failed:", error));
```

## Notes

- The endpoint is designed to be lightweight and fast
- It can be used by monitoring systems, load balancers, and CI/CD pipelines
- No authentication is required to allow external systems to check application health

---

# GET /api/generators/iban — IBAN Generator Endpoint

## Overview

The IBAN generator endpoint produces valid IBAN (International Bank Account Number) codes for German (DE), Austrian (AT), and Polish (PL) bank accounts. It's useful for generating test data in QA scenarios.

**URL:** `GET http://localhost:3000/api/generators/iban`

**Authentication:** Not required (publicly accessible)

**Rate Limit:** None (use general API rate limits if needed)

---

## Query Parameters

| Parameter | Type   | Required | Description                                                                            | Example                    |
| --------- | ------ | -------- | -------------------------------------------------------------------------------------- | -------------------------- |
| `country` | string | ✅ Yes   | Country code: `DE`, `AT`, or `PL`                                                      | `?country=DE`              |
| `seed`    | string | ❌ No    | Deterministic seed for reproducible IBANs (max 64 chars, alphanumeric + `.`, `_`, `-`) | `?country=DE&seed=test123` |

---

## Responses

### ✅ Success Response (200 OK)

**Without seed (random IBAN):**

```http
GET /api/generators/iban?country=DE

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "iban": "DE89370400440532013000",
  "country": "DE"
}
```

**With seed (deterministic IBAN):**

```http
GET /api/generators/iban?country=AT&seed=mytest

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=31536000, immutable
ETag: "QVQ6bXl0ZXN0"

{
  "iban": "AT611904300234573201",
  "country": "AT",
  "seed": "mytest"
}
```

### ❌ Error: Missing Required Parameter (400 Bad Request)

```http
GET /api/generators/iban

HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query parameter 'country' is required and must be 'DE', 'AT', or 'PL'"
  }
}
```

### ❌ Error: Invalid Country (400 Bad Request)

```http
GET /api/generators/iban?country=FR

HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "country: Invalid enum value. Expected 'DE' | 'AT' | 'PL'"
  }
}
```

### ❌ Error: Invalid Seed Format (400 Bad Request)

```http
GET /api/generators/iban?country=DE&seed=invalid@seed

HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "seed: seed must contain only alphanumeric, dots, underscores, or hyphens"
  }
}
```

### ❌ Error: Seed Too Long (400 Bad Request)

```http
GET /api/generators/iban?country=DE&seed=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "seed: seed must be at most 64 characters"
  }
}
```

### ❌ Error: Server Error (500 Internal Server Error)

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": {
    "code": "INTERNAL",
    "message": "An unexpected server error occurred"
  }
}
```

---

## Request Examples

### cURL

**Random IBAN (Germany):**

```bash
curl -X GET "http://localhost:3000/api/generators/iban?country=DE"
```

**Deterministic IBAN (Austria with seed):**

```bash
curl -X GET "http://localhost:3000/api/generators/iban?country=AT&seed=testuser123"
```

**Polish IBAN:**

```bash
curl -X GET "http://localhost:3000/api/generators/iban?country=PL"
```

### JavaScript (Fetch API)

```javascript
// Random IBAN
fetch("http://localhost:3000/api/generators/iban?country=DE")
  .then((response) => response.json())
  .then((data) => console.log("Generated IBAN:", data.iban))
  .catch((error) => console.error("Error:", error));

// Deterministic IBAN with seed
fetch("http://localhost:3000/api/generators/iban?country=DE&seed=my-test-seed")
  .then((response) => response.json())
  .then((data) => console.log("Generated IBAN:", data.iban, "Seed:", data.seed))
  .catch((error) => console.error("Error:", error));
```

### Python (Requests)

```python
import requests

# Random IBAN
response = requests.get('http://localhost:3000/api/generators/iban', params={'country': 'DE'})
data = response.json()
print(f"Generated IBAN: {data['iban']}")

# With seed (deterministic)
response = requests.get(
    'http://localhost:3000/api/generators/iban',
    params={'country': 'AT', 'seed': 'test123'}
)
data = response.json()
print(f"Generated IBAN: {data['iban']} with seed: {data['seed']}")
```

### Postman

**Tab: GET/POST selector** → `GET`

**URL:**

```
http://localhost:3000/api/generators/iban?country=DE&seed=mytest
```

**Or use Postman Params tab:**

| Key       | Value    |
| --------- | -------- |
| `country` | `DE`     |
| `seed`    | `mytest` |

**Send** ✈️

---

## IBAN Validation

Generated IBANs follow **ISO 13616-1:2007** standard with **MOD-97** checksum validation:

- **Germany (DE):** 22 characters, format: `DE + 2 check digits + 18 account digits`
- **Austria (AT):** 20 characters, format: `AT + 2 check digits + 16 account digits`
- **Poland (PL):** 28 characters, format: `PL + 2 check digits + 24 account digits`

All generated IBANs have valid checksums and can be used for testing purposes.

---

## Caching Behavior

### Random IBAN (no seed)

```
Cache-Control: no-store
```

- Response is **never cached** (each request generates different IBAN)

### Deterministic IBAN (with seed)

```
Cache-Control: public, max-age=31536000, immutable
ETag: "encoded-hash"
```

- Response is **cached for 1 year** (same seed always produces same IBAN)
- Safe for CDN caching

---

## Use Cases

### 1. QA Test Data Generation

```bash
# Generate multiple test IBANs for Germany
for i in {1..5}; do
  curl -s "http://localhost:3000/api/generators/iban?country=DE" | jq .iban
done
```

### 2. Reproducible Fixtures (with seed)

```bash
# Always generates same IBAN for consistent test data
curl "http://localhost:3000/api/generators/iban?country=DE&seed=fixture-001"
```

### 3. Multi-country Testing

```javascript
const countries = ["DE", "AT", "PL"];
const ibans = await Promise.all(
  countries.map((country) =>
    fetch(`/api/generators/iban?country=${country}`).then((r) => r.json()),
  ),
);
console.log(ibans);
```

---

## Technical Details

### Generation Algorithm

1. **Checksum Generation:** Uses MOD-97 algorithm per ISO 13616
2. **Account Number:** Randomly generated or seeded based on input
3. **Validation:** Every IBAN is validated before response

### Performance

- **Response time:** < 50ms (typically < 5ms)
- **Memory usage:** Minimal (stateless)
- **No database required:** Pure computation

---

## Error Codes

| Code               | Status | Description                                                       |
| ------------------ | ------ | ----------------------------------------------------------------- |
| `VALIDATION_ERROR` | 400    | Invalid parameter (missing country, invalid format, invalid seed) |
| `INTERNAL`         | 500    | Unexpected server error                                           |

---

## Notes

- The endpoint is **deterministic**: same seed + country always produces the same IBAN
- Generated IBANs are **valid for testing** but **not real bank accounts**
- Country parameter is **case-sensitive** (`DE`, not `de`)
- Seed parameter is **case-sensitive** for reproducibility
- Use seed when you need **fixed test data** across environments
- Omit seed when you need **random diverse data** for volume testing

---

## Related Endpoints

- **GET `/api/generators/iban`** — This endpoint
- **GET `/validators/iban`** — Validate existing IBANs (coming soon)
- **GET `/api/generators/{kind}`** — Other data generators (address, phone, etc.)

---

# GET /api/validators/iban — IBAN Validator Endpoint

Validates an IBAN checksum and format.

## Request

### Query Parameters

| Parameter | Type   | Required | Description                                             |
| --------- | ------ | -------- | ------------------------------------------------------- |
| `iban`    | string | Yes      | IBAN to validate (spaces will be removed automatically) |

### Example Request

```bash
GET /api/validators/iban?iban=DE89370400440532013000
```

## Response

### Success (200 OK)

Returns validation result with `valid` boolean and optional `reason` if invalid.

#### Valid IBAN

```json
{
  "valid": true
}
```

#### Invalid IBAN

```json
{
  "valid": false,
  "reason": "Invalid checksum (mod-97 validation failed)"
}
```

### Error Responses

#### 400 Bad Request

Returned when query parameters are missing or invalid.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query parameter 'iban' is required"
  }
}
```

#### 500 Internal Server Error

Returned when an unexpected server error occurs.

```json
{
  "error": {
    "code": "INTERNAL",
    "message": "An unexpected server error occurred"
  }
}
```

## Validation Rules

The validator checks the following:

1. **Length**: Minimum 15 characters, maximum 34 characters
2. **Country Code**: First 2 characters must be letters (A-Z)
3. **Check Digits**: Characters 3-4 must be digits (0-9)
4. **BBAN Format**: Remaining characters must be alphanumeric (A-Z, 0-9)
5. **Country-Specific Length**: For known countries (DE=22, AT=20, PL=28)
6. **Mod-97 Checksum**: IBAN must pass mod-97 validation (remainder = 1)

## Example Invalid Reasons

- `"IBAN is too short (minimum 15 characters)"`
- `"IBAN is too long (maximum 34 characters)"`
- `"Invalid country code (must be 2 letters)"`
- `"Invalid check digits (must be 2 digits)"`
- `"Invalid length for DE (expected 22, got 20)"`
- `"BBAN contains invalid characters (must be alphanumeric)"`
- `"Invalid checksum (mod-97 validation failed)"`

## Caching

Validation results are cached for 5 minutes:

```
Cache-Control: public, max-age=300
```

## Notes

- The IBAN will be normalized: spaces removed, converted to uppercase
- The validator uses the ISO 13616 mod-97 algorithm
- Country-specific formats are validated for DE, AT, and PL
