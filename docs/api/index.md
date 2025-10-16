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
