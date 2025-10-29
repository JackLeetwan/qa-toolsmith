# QA Toolsmith API Documentation

This directory contains documentation for the QA Toolsmith REST API endpoints.

## Available Endpoints

### 🔐 Authentication

- **[POST /auth/login](#post-authlogin--user-authentication)** - User authentication with email/password, returns JWT token + profile

### 🏥 Health & Status

- **[GET /health](#get-health--health-check-endpoint)** - Simple application health check endpoint (liveness/readiness probe)

### 🔢 Data Generators

- **[GET /generators/iban](#get-apigeneratorsiban--iban-generator-endpoint)** - Generate valid IBAN codes (DE, AT, PL) with optional seed
- **[GET /validators/iban](#get-apivalidatorsiban--iban-validator-endpoint)** - Validate existing IBANs

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

## Prerequisites

Before testing endpoints, ensure:

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

## Caching Strategy

### IBAN Generator Caching

**Random IBAN (no seed):**

```
Cache-Control: no-store
```

- Response is **never cached** (each request generates different IBAN)

**Deterministic IBAN (with seed):**

```
Cache-Control: public, max-age=31536000, immutable
ETag: "encoded-hash"
```

- Response is **cached for 1 year** (same seed always produces same IBAN)
- Safe for CDN caching

### IBAN Validator Caching

```
Cache-Control: public, max-age=300
```

- Validation results are cached for 5 minutes

---

## Error Handling

### Client-Side Validation

- **Inline Errors**: Display immediately for format violations
- **Submit Prevention**: Block API calls for invalid inputs
- **User Feedback**: Clear error messages with suggestions

### API Error Mapping

| HTTP Code | Error Code        | UI Handling                    |
| --------- | ----------------- | ------------------------------ |
| 400       | `invalid_country` | Inline error on country select |
| 400       | `invalid_seed`    | Inline error on seed input     |
| 400       | `bad_params`      | Form validation errors         |
| 429       | `rate_limited`    | Toast + retry after delay      |
| 500       | `internal`        | Error boundary fallback        |

### Network Error Handling

- **Timeout**: 30s default, graceful degradation
- **Offline**: Banner notification, queue requests
- **Retry**: Exponential backoff for 5xx errors
- **AbortController**: Cancel in-flight requests on unmount/param change

---

## Local Storage Keys

### Generator Preferences & History

- `gen_pref_iban` - user preferences (country, format, mode)
- `gen_history_iban` - IBAN generation history (max 10 items)

---

## Testing Guide

See individual endpoint documentation for:

- Request/response examples
- Error scenarios
- cURL, JavaScript, Python examples
- Postman setup instructions

---

# POST /auth/login — User Authentication

## Overview

**URL:** `POST /api/auth/login`  
**Purpose:** Authenticate user with email/password via Supabase Auth, return JWT token + profile.  
**Rate Limit:** 10 requests per 60 seconds per IP (429 on exceed)

## Request

**Headers:**

```
Content-Type: application/json
X-Request-ID: <optional-unique-id>
```

**Body:**

```json
{
  "email": "test@example.com",
  "password": "testPassword123"
}
```

## Responses

### Success (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profile": {
    "id": "uuid",
    "email": "test@example.com",
    "role": "user",
    "created_at": "2025-10-16T10:00:00Z",
    "updated_at": "2025-10-16T10:00:00Z"
  }
}
```

### Test Scenarios

| Scenario             | Request                   | Response               | Status | Error Code            |
| -------------------- | ------------------------- | ---------------------- | ------ | --------------------- |
| ✅ Valid login       | Valid credentials         | JWT + profile          | 200    | -                     |
| ❌ Invalid email     | `"email": "not-an-email"` | Field validation error | 400    | `VALIDATION_ERROR`    |
| ❌ Short password    | `"password": "short"`     | Field validation error | 400    | `VALIDATION_ERROR`    |
| ❌ Wrong credentials | Wrong email/password      | Generic error          | 401    | `INVALID_CREDENTIALS` |
| ⏱️ Rate limited      | 11th request in 60s       | Rate limit error       | 429    | `RATE_LIMITED`        |

**Notes:**

- Rate limit resets after 60 seconds
- Use Postman Collection Runner to test rate limiting (10 iterations + 1)
- Invalid credentials error doesn't reveal which field is wrong (security)

## Postman Setup (Optional)

### Environment Variables

```
BASE_URL = http://localhost:3000
API_ENDPOINT = /api/auth/login
TEST_EMAIL = test@example.com
TEST_PASSWORD = testPassword123
```

### Tests Script

```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Has access_token", () =>
  pm.expect(pm.response.json()).to.have.property("access_token"),
);
pm.test("Has profile", () =>
  pm.expect(pm.response.json()).to.have.property("profile"),
);
```

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
- **GET `/validators/iban`** — Validate existing IBANs
- **GET `/api/generators/{kind}`** — Other data generators:

### Planned Generators

- `phone` - Phone Number Generator
- `address` - Address Generator
- `plates` - License Plate Generator
- `email` - Email Generator
- `company` - Company Name Generator
- `card` - Payment Card Generator
- `guid` - GUID Generator
- `string` - Random String Generator

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

---

## See Also

### Related Documentation

- **[Architecture Overview](../.ai/ARCHITECTURE.md)** - High-level architecture, database design, and data flow
- **[Tech Stack](./tech-stack.md)** - Technology overview and deployment details
- **[Cloudflare Deployment](./deployment-cloudflare.md)** - Complete deployment guide
- **[Generators View](./generators-view.md)** - User-facing documentation for data generators
- **[README](../README.md)** - Project overview and getting started

### Implementation Details

- **Authentication**: See `.ai/ARCHITECTURE.md#authentication--authorization` for auth flow
- **Database Schema**: See `.ai/ARCHITECTURE.md#database-architecture` for table structures
- **API Design**: See `.ai/ARCHITECTURE.md#api-design` for design principles
- **Error Handling**: See `.ai/ARCHITECTURE.md#ui-architecture` for error codes
