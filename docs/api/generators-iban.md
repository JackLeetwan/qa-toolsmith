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
