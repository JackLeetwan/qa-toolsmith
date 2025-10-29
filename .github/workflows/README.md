# GitHub Actions Workflows

This directory contains the CI/CD workflows for QA Toolsmith.

## Workflows Overview

### CI Pipeline (`ci.yml`)

**Trigger**:

- Push to `main` or `master` branches
- Pull requests to `main` or `master` branches

**Purpose**: Continuous Integration checks for PR validation

**Jobs**:

- `lint`: Code quality and formatting checks
- `build`: Application build with environment variable validation
- `test`: Unit tests with coverage
- `e2e-tests`: End-to-end tests with diagnostics
- `status-comment`: Automated PR status comment (PR only)

**Conditional Behavior**:

- **On Push**: Full pipeline with 30-day artifact retention
- **On Pull Request**: Lightweight checks with 7-day retention and status comments

### Deploy to Cloudflare Pages (`deploy-cloudflare.yml`)

**Trigger**:

- Push to `master` branch
- Manual workflow dispatch

**Purpose**: Production deployment to Cloudflare Pages

**Jobs**:

- `deploy`: Build and deploy to Cloudflare Pages using Wrangler

**Deployment Strategy**:

- Direct upload via Cloudflare Wrangler Action
- Runs only on `master` branch pushes
- Can be triggered manually for hotfixes
- Gracefully skips if Cloudflare secrets are not configured

## Configuration

### Required Secrets for CI

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `E2E_USERNAME`: Test user email (optional, for E2E tests)
- `E2E_PASSWORD`: Test user password (optional, for E2E tests)
- `E2E_USERNAME_ID`: Test user UUID (optional, for E2E tests)

### Required Secrets for Deployment

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID
- `CLOUDFLARE_PAGES_PROJECT_NAME`: Project name (optional, defaults to 'qa-toolsmith')
- `SUPABASE_SERVICE_KEY`: Supabase service role key (for production)
- `OPENROUTER_API_KEY`: AI service API key (optional)

### Environment Variables

- `PORT`: 3000 (preview server)
- `NODE_VERSION`: 22.14.0 (from .nvmrc)
- `ENV_NAME`: production (deployment environment)

### Test Configuration

- **Unit Tests**: Vitest with coverage (V8 provider)
- **E2E Tests**: Playwright with Chromium only
- **Timeout**: 30 minutes for E2E tests
- **Diagnostics**: Traces, screenshots, videos (on failure only)

## Architecture Decisions

### Why Separate Workflows?

1. **Separation of Concerns**: CI checks should run independently from deployments
2. **Security**: Deployment secrets are only exposed during deployment jobs
3. **Performance**: No need to run E2E tests before production deployment (already tested in PR)
4. **Flexibility**: Manual deployment via workflow dispatch
5. **Cost**: Deployment jobs only run when needed, not on every PR

### Sequential Execution

Tests run sequentially (not in parallel) to ensure deterministic results and proper resource management.

### Browser Strategy

Only Chromium is used for E2E tests to match local development configuration and reduce CI complexity.

### Artifact Strategy

- **CI**: 30-day retention for production artifacts (compliance, debugging)
- **PR**: 7-day retention for review artifacts (short-term review process)
- **Diagnostics**: Only captured on test failures to minimize storage

## GitHub Actions Versions

All actions use the latest stable major versions:

- `actions/checkout@v5` (latest: v5)
- `actions/setup-node@v6` (latest: v6)
- `actions/upload-artifact@v4` (latest: v4)
- `actions/github-script@v8` (latest: v8)
- `cloudflare/wrangler-action@v3` (latest: v3)
- `dorny/test-reporter@v2` (latest: v2)

## Performance Metrics

- **Unit Tests**: ~1,201 tests across 36 files
- **E2E Tests**: 33 comprehensive tests
- **Build Time**: ~2-3 minutes
- **CI Pipeline**: ~8-12 minutes (depending on test execution)
- **Deployment**: ~3-5 minutes

## Deployment Process

1. Code is merged to `master` branch
2. CI pipeline validates the code
3. Deployment workflow builds for Cloudflare Pages
4. Direct upload via Wrangler to Cloudflare Pages
5. Deployment URL: `https://qa-toolsmith.pages.dev` (configurable)

## Troubleshooting

### Common Issues

1. **Test Flakiness**: Increase timeouts for toast notifications
2. **Environment Variables**: Verify all secrets are properly configured
3. **Build Failures**: Check Node.js version compatibility
4. **Deployment Skips**: Verify Cloudflare secrets are configured

### Debug Commands

```bash
# Local testing
npm run test:unit:coverage
npm run test:e2e

# View reports
npx playwright show-report

# Manual deployment
npm run build
npm run preview
```

### Getting Cloudflare Secrets

1. **API Token**:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "Cloudflare Pages - Edit" template
   - Include your account ID

2. **Account ID**:
   - Find in Cloudflare Dashboard URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/`

3. **Project Name**:
   - Optional, defaults to `qa-toolsmith`
   - Can be found in Cloudflare Pages dashboard

## Future Improvements

- [ ] Create reusable workflows to reduce duplication
- [ ] Add performance regression testing
- [ ] Implement automated dependency updates
- [ ] Add security scanning (CodeQL)
- [ ] Set up preview deployments for PRs
- [ ] Add rollback capabilities for failed deployments
