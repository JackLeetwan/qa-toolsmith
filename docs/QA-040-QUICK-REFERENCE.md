# QA-040: Quick Reference Guide

## What Was Done

Added **16 comprehensive API tests** to the existing IBAN Generator E2E test suite, validating:
- ✅ Backend response contracts
- ✅ Input validation and error handling  
- ✅ Security (injection attacks)
- ✅ Caching headers
- ✅ Deterministic reproducibility

**Total E2E Tests**: 20 (4 UI + 16 API)

## Key Files

### Tests
- **`e2e/generators-iban.spec.ts`** - Main test file with all 20 tests
  - Lines 1-79: UI tests (Copy Button Stability)
  - Lines 81-509: API tests (IBAN Generator Endpoint)

### Documentation
- **`docs/api-testing-guide.md`** - Comprehensive API testing guide
- **`docs/QA-040-API-TESTING-SUMMARY.md`** - Complete implementation summary
- **`docs/QA-040-QUICK-REFERENCE.md`** - This file

### Updated
- **`.ai/endpoint-implementation-plans/generators-iban-implementation-plan.md`** - Golden values corrected

## Test Summary

### 🟢 Success Scenarios (6 tests)
```
1. Random IBAN for DE (no seed)
2. Random IBAN for AT (no seed)  
3. Random IBAN for PL (no seed)
4. Deterministic IBAN for DE (seed=1234)
5. Deterministic IBAN for AT (seed=1234)
6. Special characters in seed (dots, underscores, hyphens)
```

### 🔴 Error Scenarios (6 tests)
```
7. Missing country parameter
8. Invalid country parameter
9. Seed exceeds 64 character limit
10. XSS injection in seed
11. SQL injection in seed
12. Spaces in seed
```

### 📋 Response Validation (4 tests)
```
13. Case sensitivity (lowercase country codes)
14. Valid IBAN format for all countries (DE, AT, PL)
15. Content-Type header validation
16. No state leakage between requests
```

## Golden Test Values

These values are verified for reproducibility:

```
GET /api/generators/iban?country=DE&seed=1234
→ DE50185482443452538353

GET /api/generators/iban?country=AT&seed=1234
→ AT471854824434525383
```

## Running Tests

```bash
# All E2E tests (UI + API)
npm run test:e2e

# Only IBAN generator tests
npx playwright test e2e/generators-iban.spec.ts

# With debug mode
npx playwright test e2e/generators-iban.spec.ts --headed --debug

# View last test report
npx playwright show-report
```

## Test Features

### ✅ Security
- XSS injection attempts rejected ✓
- SQL injection attempts rejected ✓
- Character validation enforced ✓
- Boundary testing (64-char limit) ✓

### ✅ Determinism
- Same seed = same IBAN ✓
- No state leakage ✓
- Reproducible in CI ✓

### ✅ Response Contracts
- Status codes verified (200/400) ✓
- Structure validated against types ✓
- Headers checked (Cache-Control, ETag) ✓
- Content-Type: application/json ✓

### ✅ No Side Effects
- All tests are read-only GET requests ✓
- No database modifications ✓
- Public endpoint (no auth required) ✓

## Implementation Details

### Using Playwright page.request API

```typescript
// Make API request
const response = await page.request.get(
  "/api/generators/iban?country=DE&seed=1234"
);

// Assert status
expect(response.status()).toBe(200);

// Parse response
const body = await response.json();

// Validate structure
expect(body.iban).toBe("DE50185482443452538353");
expect(body.country).toBe("DE");
expect(body.seed).toBe("1234");
```

## CI/CD Integration

- Tests run automatically on every push
- Sequential execution (workers: 1) for determinism
- Retries: 2 on failure
- Artifacts retained on failure only (no overhead for passing tests)
- Full trace debugging available

## Response Contract

```typescript
// Success (200)
{
  iban: string;           // Valid IBAN
  country: IbanCountry;   // "DE" | "AT" | "PL"
  seed?: string;          // Optional, included if provided
}

// Error (400)
{
  error: {
    code: "VALIDATION_ERROR";
    message: string;
    details?: Record<string, Json>;
  }
}
```

## Best Practices Implemented

✅ **Test Independence** - Each test stands alone, no dependencies
✅ **Explicit Assertions** - Clear validation of structure and content
✅ **Security Focus** - Injection attempts tested
✅ **Error Paths** - Both success and failure scenarios covered
✅ **Deterministic** - Reproducible results, suitable for CI/CD
✅ **Readable** - Well-commented, clear intent
✅ **Page Object Pattern** - UI tests use POM for maintainability

## Future Enhancements

1. Extend to other generator APIs (email, phone, etc.)
2. Performance testing with k6
3. Rate limit testing
4. Contract testing with OpenAPI schemas
5. Mutation testing for validation strictness

## References

- [Playwright API Testing](https://playwright.dev/docs/api-testing)
- [Full API Testing Guide](./api-testing-guide.md)
- [Complete Summary](./QA-040-API-TESTING-SUMMARY.md)
- [Types Definition](../src/types/types.ts)
- [IBAN Service](../src/lib/services/iban.service.ts)
- [API Endpoint](../src/pages/api/generators/iban.ts)

## Support

For questions or issues:
1. Review the comprehensive guide: `docs/api-testing-guide.md`
2. Check test implementations: `e2e/generators-iban.spec.ts`
3. View trace/videos on failure: `npx playwright show-report`
4. Debug in headed mode: `npx playwright test --headed --debug`
