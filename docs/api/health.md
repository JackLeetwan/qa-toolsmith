# Health Endpoint

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
