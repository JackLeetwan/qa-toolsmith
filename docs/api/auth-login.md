# POST /auth/login — Postman Testing Guide

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
