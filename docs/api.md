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

### 📚 Knowledge Base

- **[GET /api/kb/entries](#get-apikbentries--list-kb-entries)** - List KB entries with public access (pagination supported)
- **[POST /api/kb/entries](#post-apikbentries--create-kb-entry)** - Create a new KB entry (requires authentication)
- **[GET /api/kb/entries/[id]](#get-apikbentriesid--get-kb-entry)** - Get a single KB entry by ID
- **[PUT /api/kb/entries/[id]](#put-apikbentriesid--update-kb-entry)** - Update a KB entry (requires authentication)
- **[DELETE /api/kb/entries/[id]](#delete-apikbentriesid--delete-kb-entry)** - Delete a KB entry (requires authentication)

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

# GET /api/kb/entries — List KB Entries

## Overview

**URL:** `GET /api/kb/entries`  
**Purpose:** Retrieve KB entries with conditional access logic based on authentication status.  
**Authentication:** Optional (public access supported, but authenticated users see more entries)

## Request

**Query Parameters:**

| Parameter | Type   | Required | Description                                              | Example                                |
| --------- | ------ | -------- | -------------------------------------------------------- | -------------------------------------- |
| `after`   | string | ❌ No    | Cursor for keyset pagination (format: `"updated_at,id"`) | `?after=2024-01-01T00:00:00Z,entry-id` |
| `limit`   | number | ❌ No    | Number of items per page (1-100, default: 20)            | `?limit=10`                            |

## Conditional Access Logic

The endpoint returns different results based on authentication:

- **Unauthenticated users (anonymous):**
  - Only entries with `is_public = true` are returned
- **Authenticated users:**
  - Own entries (`user_id = auth.uid()`) + public entries (`is_public = true`)

Note: Internal search metadata field `search_vector` is never returned in responses.

## Responses

### ✅ Success Response (200 OK)

**Response Format:**

```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "url_original": "string",
      "url_canonical": "string",
      "tags": ["string"],
      "is_public": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "next_cursor": "2024-01-01T00:00:00Z,entry-id"
}
```

**Response Fields:**

- `items`: Array of `KBEntryDTO` objects
- `next_cursor`: Optional cursor string for pagination. If present, use as `?after=` parameter for next page. Format: `"updated_at,id"`

### ❌ Error: Invalid Query Parameters (400 Bad Request)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "path": ["limit"],
        "message": "Number must be between 1 and 100"
      }
    ]
  }
}
```

### ❌ Error: Server Error (500 Internal Server Error)

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database query failed"
  }
}
```

## Keyset Pagination

This endpoint uses **keyset-based pagination** (also known as cursor-based pagination):

1. **First request:** Omit `after` parameter to get first page
2. **Next page:** Use `next_cursor` from response as `?after=` parameter
3. **Last page:** `next_cursor` will be `undefined` when no more pages exist

**Example pagination flow:**

```bash
# First page (default limit: 20)
GET /api/kb/entries

# Response includes next_cursor
{
  "items": [...],
  "next_cursor": "2024-01-01T12:00:00Z,abc-123"
}

# Second page
GET /api/kb/entries?after=2024-01-01T12:00:00Z,abc-123

# Last page (no next_cursor)
{
  "items": [...],
  "next_cursor": undefined
}
```

## Request Examples

### cURL

**Unauthenticated user (public entries only):**

```bash
curl -X GET "https://example.com/api/kb/entries"
```

**Authenticated user (own entries + public entries):**

```bash
curl -X GET "https://example.com/api/kb/entries" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Pagination (second page):**

```bash
curl -X GET "https://example.com/api/kb/entries?after=2024-01-01T00:00:00Z,entry-id&limit=10"
```

### JavaScript (Fetch API)

```javascript
// First page
fetch("https://example.com/api/kb/entries")
  .then((response) => response.json())
  .then((data) => {
    console.log("Entries:", data.items);
    console.log("Has next page:", !!data.next_cursor);

    // Load next page if available
    if (data.next_cursor) {
      return fetch(
        `https://example.com/api/kb/entries?after=${data.next_cursor}`,
      );
    }
  })
  .then((response) => response?.json())
  .then((data) => console.log("Next page:", data?.items));
```

### Python (Requests)

```python
import requests

# Authenticated request
headers = {"Authorization": "Bearer YOUR_JWT_TOKEN"}
response = requests.get("https://example.com/api/kb/entries", headers=headers)
data = response.json()

print(f"Found {len(data['items'])} entries")
if data.get("next_cursor"):
    # Fetch next page
    next_response = requests.get(
        "https://example.com/api/kb/entries",
        headers=headers,
        params={"after": data["next_cursor"]}
    )
    next_data = next_response.json()
    print(f"Next page: {len(next_data['items'])} entries")
```

---

# POST /api/kb/entries — Create KB Entry

## Overview

**URL:** `POST /api/kb/entries`  
**Purpose:** Create a new KB entry.  
**Authentication:** Required (Bearer JWT token)
**Authorization:** Only admins may create public entries (`is_public = true`). Non-admins creating with `is_public: true` receive 403.

## Request

**Headers:**

```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**

```json
{
  "title": "React Documentation",
  "url_original": "https://react.dev",
  "tags": ["react", "frontend"],
  "is_public": true
}
```

**Request Fields:**

| Field          | Type     | Required | Description                                          |
| -------------- | -------- | -------- | ---------------------------------------------------- |
| `title`        | string   | ✅ Yes   | Entry title (1-200 characters)                       |
| `url_original` | string   | ✅ Yes   | Original URL (must be valid HTTP/HTTPS URL)          |
| `tags`         | string[] | ❌ No    | Array of tag strings (default: `[]`)                 |
| `is_public`    | boolean  | ❌ No    | Whether entry is publicly visible (default: `false`) |

## Responses

### ✅ Success Response (201 Created)

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "React Documentation",
    "url_original": "https://react.dev",
    "url_canonical": "https://react.dev",
    "tags": ["react", "frontend"],
    "is_public": true,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

### ❌ Error: Validation Error (400 Bad Request)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "path": ["title"],
        "message": "Title is required"
      }
    ]
  }
}
```

### ❌ Error: Unauthenticated (401 Unauthorized)

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

### ❌ Error: Forbidden (403 Forbidden)

Returned when a non-admin user attempts to create a public entry (`is_public: true`).

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only admins can create public KB entries",
    "details": null
  }
}
```

### ❌ Error: Server Error (500 Internal Server Error)

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database insert failed"
  }
}
```

## Request Examples

### cURL

```bash
curl -X POST "https://example.com/api/kb/entries" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Documentation",
    "url_original": "https://react.dev",
    "tags": ["react", "frontend"],
    "is_public": true
  }'
```

Non-admin attempting to create a public entry (403):

```bash
curl -i -X POST "https://example.com/api/kb/entries" \
  -H "Authorization: Bearer NON_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Public Attempt",
    "url_original": "https://example.com",
    "is_public": true
  }'
```

### JavaScript (Fetch API)

```javascript
fetch("https://example.com/api/kb/entries", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer YOUR_JWT_TOKEN",
  },
  body: JSON.stringify({
    title: "React Documentation",
    url_original: "https://react.dev",
    tags: ["react", "frontend"],
    is_public: true,
  }),
})
  .then((response) => response.json())
  .then((data) => console.log("Created entry:", data.data));
```

Non-admin (403):

```javascript
const res = await fetch("https://example.com/api/kb/entries", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer NON_ADMIN_JWT",
  },
  body: JSON.stringify({
    title: "x",
    url_original: "https://x",
    is_public: true,
  }),
});
if (res.status === 403) {
  console.log("Only admins can create public KB entries");
}
```

### Python (Requests)

```python
import requests

headers = {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
}
payload = {
    "title": "React Documentation",
    "url_original": "https://react.dev",
    "tags": ["react", "frontend"],
    "is_public": True
}

response = requests.post(
    "https://example.com/api/kb/entries",
    headers=headers,
    json=payload
)
data = response.json()
print(f"Created entry: {data['data']['id']}")
```

Non-admin (403):

```python
resp = requests.post(
    "https://example.com/api/kb/entries",
    headers={"Authorization": "Bearer NON_ADMIN_JWT", "Content-Type": "application/json"},
    json={"title": "x", "url_original": "https://x", "is_public": True},
)
assert resp.status_code == 403
```

---

# GET /api/kb/entries/[id] — Get KB Entry

## Overview

**URL:** `GET /api/kb/entries/[id]`  
**Purpose:** Retrieve a single KB entry by ID.  
**Authentication:** Optional (RLS automatically enforces access control)

## Request

**URL Parameters:**

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| `id`      | string | ✅ Yes   | UUID of the entry |

## Access Control

- **Unauthenticated users:** Can only access entries with `is_public = true`
- **Authenticated users:** Can access own entries (`user_id = auth.uid()`) + public entries

RLS policies automatically enforce these rules.

## Responses

### ✅ Success Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "React Documentation",
    "url_original": "https://react.dev",
    "url_canonical": "https://react.dev",
    "tags": ["react", "frontend"],
    "is_public": true,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

Note: Internal field `search_vector` is not included in the response.

### ❌ Error: Not Found (404 Not Found)

Returned when:

- Entry doesn't exist
- User doesn't have access (RLS denies access)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Entry not found or access denied"
  }
}
```

### ❌ Error: Server Error (500 Internal Server Error)

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database query failed"
  }
}
```

## Request Examples

### cURL

**Unauthenticated (public entry only):**

```bash
curl -X GET "https://example.com/api/kb/entries/abc-123-def-456"
```

**Authenticated (own or public entry):**

```bash
curl -X GET "https://example.com/api/kb/entries/abc-123-def-456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript (Fetch API)

```javascript
fetch("https://example.com/api/kb/entries/abc-123-def-456", {
  headers: {
    Authorization: "Bearer YOUR_JWT_TOKEN",
  },
})
  .then((response) => response.json())
  .then((data) => console.log("Entry:", data.data))
  .catch((error) => console.error("Error:", error));
```

### Python (Requests)

```python
import requests

headers = {"Authorization": "Bearer YOUR_JWT_TOKEN"}
response = requests.get(
    "https://example.com/api/kb/entries/abc-123-def-456",
    headers=headers
)
data = response.json()
print(f"Entry: {data['data']['title']}")
```

---

# PUT /api/kb/entries/[id] — Update KB Entry

## Overview

**URL:** `PUT /api/kb/entries/[id]`  
**Purpose:** Update a KB entry (partial update supported).  
**Authentication:** Required (Bearer JWT token)  
**Authorization:**

- Users can only update their own entries (RLS enforced)
- Only admins can edit public entries or set `is_public: true`

## Request

**Headers:**

```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**URL Parameters:**

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| `id`      | string | ✅ Yes   | UUID of the entry |

**Body (all fields optional):**

```json
{
  "title": "Updated Title",
  "url_original": "https://updated-url.com",
  "tags": ["updated", "tags"],
  "is_public": false
}
```

**Request Fields:**

| Field          | Type     | Required | Description                                 |
| -------------- | -------- | -------- | ------------------------------------------- |
| `title`        | string   | ❌ No    | Entry title (1-200 characters)              |
| `url_original` | string   | ❌ No    | Original URL (must be valid HTTP/HTTPS URL) |
| `tags`         | string[] | ❌ No    | Array of tag strings                        |
| `is_public`    | boolean  | ❌ No    | Whether entry is publicly visible           |

**Note:** At least one field must be provided for update.

## Responses

### ✅ Success Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Updated Title",
    "url_original": "https://updated-url.com",
    "url_canonical": "https://updated-url.com",
    "tags": ["updated", "tags"],
    "is_public": false,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T13:00:00Z"
  }
}
```

### ❌ Error: Validation Error (400 Bad Request)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "path": ["title"],
        "message": "Title too long"
      }
    ]
  }
}
```

### ❌ Error: Unauthenticated (401 Unauthorized)

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

### ❌ Error: Forbidden (403 Forbidden)

Returned when a non-admin attempts to:

- Edit a public entry
- Set `is_public` to `true`

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only admins can edit public KB entries",
    "details": null
  }
}
```

### ❌ Error: Not Found (404 Not Found)

Returned when:

- Entry doesn't exist
- User is not the owner (RLS denies access)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Entry not found or access denied"
  }
}
```

### ❌ Error: Server Error (500 Internal Server Error)

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database update failed"
  }
}
```

## Request Examples

### cURL

```bash
curl -X PUT "https://example.com/api/kb/entries/abc-123-def-456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "is_public": true
  }'
```

Non-admin forbidden scenarios (403):

```bash
# Editing a public entry
curl -i -X PUT "https://example.com/api/kb/entries/public-entry-id" \
  -H "Authorization: Bearer NON_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"title": "x"}'

# Setting is_public to true
curl -i -X PUT "https://example.com/api/kb/entries/own-private-id" \
  -H "Authorization: Bearer NON_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"is_public": true}'
```

### JavaScript (Fetch API)

```javascript
fetch("https://example.com/api/kb/entries/abc-123-def-456", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer YOUR_JWT_TOKEN",
  },
  body: JSON.stringify({
    title: "Updated Title",
    is_public: true,
  }),
})
  .then((response) => response.json())
  .then((data) => console.log("Updated entry:", data.data));
```

Non-admin (403):

```javascript
const res = await fetch("https://example.com/api/kb/entries/own-private-id", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer NON_ADMIN_JWT",
  },
  body: JSON.stringify({ is_public: true }),
});
if (res.status === 403) {
  console.log("Only admins can edit public KB entries");
}
```

### Python (Requests)

```python
import requests

headers = {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
}
payload = {
    "title": "Updated Title",
    "is_public": True
}

response = requests.put(
    "https://example.com/api/kb/entries/abc-123-def-456",
    headers=headers,
    json=payload
)
data = response.json()
print(f"Updated entry: {data['data']['title']}")
```

Non-admin (403):

```python
resp = requests.put(
    "https://example.com/api/kb/entries/own-private-id",
    headers={"Authorization": "Bearer NON_ADMIN_JWT", "Content-Type": "application/json"},
    json={"is_public": True},
)
assert resp.status_code == 403
```

---

# DELETE /api/kb/entries/[id] — Delete KB Entry

## Overview

**URL:** `DELETE /api/kb/entries/[id]`  
**Purpose:** Delete a KB entry.  
**Authentication:** Required (Bearer JWT token)  
**Authorization:**

- Users can only delete their own private entries (RLS enforced)
- Only admins can delete public entries

## Request

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**URL Parameters:**

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| `id`      | string | ✅ Yes   | UUID of the entry |

**Note:** Related notes are automatically cascade-deleted (foreign key constraint).

## Responses

### ✅ Success Response (204 No Content)

No response body. Status code `204` indicates successful deletion.

### ❌ Error: Unauthenticated (401 Unauthorized)

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

### ❌ Error: Forbidden (403 Forbidden)

Returned when a non-admin attempts to delete a public entry, or delete someone else's private entry.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only admins can delete public KB entries",
    "details": null
  }
}
```

or

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You can delete only your own private KB entries",
    "details": null
  }
}
```

### ❌ Error: Not Found (404 Not Found)

Returned when:

- Entry doesn't exist
- User is not the owner (RLS denies access)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "KB entry not found"
  }
}
```

### ❌ Error: Server Error (500 Internal Server Error)

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database delete failed"
  }
}
```

## Request Examples

### cURL

```bash
curl -X DELETE "https://example.com/api/kb/entries/abc-123-def-456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Non-admin forbidden scenarios (403):

```bash
# Deleting public entry
curl -i -X DELETE "https://example.com/api/kb/entries/public-entry-id" \
  -H "Authorization: Bearer NON_ADMIN_JWT"

# Deleting someone else's private entry
curl -i -X DELETE "https://example.com/api/kb/entries/others-private-id" \
  -H "Authorization: Bearer NON_ADMIN_JWT"
```

### JavaScript (Fetch API)

```javascript
fetch("https://example.com/api/kb/entries/abc-123-def-456", {
  method: "DELETE",
  headers: {
    Authorization: "Bearer YOUR_JWT_TOKEN",
  },
}).then((response) => {
  if (response.status === 204) {
    console.log("Entry deleted successfully");
  }
});
```

### Python (Requests)

```python
import requests

headers = {"Authorization": "Bearer YOUR_JWT_TOKEN"}
response = requests.delete(
    "https://example.com/api/kb/entries/abc-123-def-456",
    headers=headers
)

if response.status_code == 204:
    print("Entry deleted successfully")
```

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
