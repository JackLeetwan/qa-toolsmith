# GitHub Actions Workflows

This directory contains the CI/CD workflows for QA Toolsmith MVP.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)
**Trigger**: Push to `main` or `master` branches  
**Purpose**: Full deployment readiness check  
**Jobs**:
- `lint`: Code quality and formatting checks
- `build`: Application build with artifacts
- `test`: Unit tests with coverage (1,201 tests)
- `coverage-summary`: Coverage reporting and summary
- `e2e`: End-to-end tests (33 tests) with full diagnostics
- `health-check`: Post-deployment smoke test

**Artifacts Retention**: 30 days (production readiness)

### 2. Pull Request Workflow (`pull-request.yml`)
**Trigger**: Pull requests to `main` or `master` branches  
**Purpose**: Code review readiness check  
**Jobs**:
- `lint`: Code quality and formatting checks
- `unit-tests`: Unit tests with coverage
- `e2e-tests`: End-to-end tests with diagnostics
- `status-comment`: Automated PR status comment

**Artifacts Retention**: 7 days (review process)

## Configuration

### Required Secrets
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `OPENROUTER_API_KEY`: AI service API key
- `E2E_USERNAME`: Test user email
- `E2E_PASSWORD`: Test user password
- `E2E_USERNAME_ID`: Test user UUID

### Environment Variables
- `PORT`: 3000 (preview server)
- `NODE_VERSION`: 22.14.0 (from .nvmrc)

### Test Configuration
- **Unit Tests**: Vitest with coverage (V8 provider)
- **E2E Tests**: Playwright with Chromium only
- **Timeout**: 30 minutes for E2E tests
- **Diagnostics**: Traces, screenshots, videos (on failure only)

## Architecture Decisions

### Sequential Execution
Tests run sequentially (not in parallel) to ensure deterministic results and proper resource management.

### Browser Strategy
Only Chromium is used for E2E tests to match local development configuration and reduce CI complexity.

### Artifact Strategy
- **CI**: 30-day retention for production artifacts (compliance, debugging)
- **PR**: 7-day retention for review artifacts (short-term review process)
- **Diagnostics**: Only captured on test failures to minimize storage

### Health Check
Post-deployment verification ensures the application is ready for production use.

## Performance Metrics

- **Unit Tests**: ~1,201 tests across 36 files
- **E2E Tests**: 33 comprehensive tests
- **Build Time**: ~2-3 minutes
- **Total Pipeline**: ~8-12 minutes (depending on test execution)

## Troubleshooting

### Common Issues
1. **Test Flakiness**: Increase timeouts for toast notifications
2. **Environment Variables**: Verify all secrets are properly configured
3. **Build Failures**: Check Node.js version compatibility

### Debug Commands
```bash
# Local testing
npm run test:unit:coverage
npm run test:e2e

# View reports
npx playwright show-report
```

## Future Improvements

- [ ] Create reusable workflows to reduce duplication
- [ ] Add performance regression testing
- [ ] Implement automated dependency updates
- [ ] Add security scanning (CodeQL)
