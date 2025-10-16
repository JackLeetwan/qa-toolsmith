# GET /api/validators/iban

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
