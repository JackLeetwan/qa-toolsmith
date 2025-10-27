# QA Toolsmith (MVP)

[![CI](https://github.com/jakub-litkowski/qa-toolsmith/actions/workflows/ci.yml/badge.svg)](https://github.com/jakub-litkowski/qa-toolsmith/actions)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Deployment & Hosting](#deployment--hosting)
4. [Getting Started Locally](#getting-started-locally)
5. [Available Scripts](#available-scripts)
6. [Project Scope](#project-scope)
7. [API Documentation](#api-documentation)
8. [Project Status](#project-status)
9. [License](#license)

## Project Description

QA Toolsmith is an open-source, lightweight web application that standardizes and automates common tasks for software testers. The MVP currently offers:

- ✅ Email/password authentication with Admin and User roles
- ✅ IBAN Generator & Validator (Germany, Austria with deterministic seed support)
- ✅ Comprehensive test suite (1167 unit tests, E2E tests, CI/CD pipeline)
- 🚧 Defect report templates (UI/API bugs) with Markdown export — *in development*
- 🚧 Exploration Charter (timer, tagged notes, keyboard shortcuts, Markdown export) — *in development*
- 🚧 Minimal Knowledge Base (CRUD, tags, full-text search, JSON export) — *in development*
- 📋 Additional synthetic test data generators & validators (phone, address, license plates, email, companies, credit cards, GUIDs, strings) — *planned*
- 📋 Optional AI assistant to polish content (per-user daily limit, dry-run/manual fallback) — *planned*

## Tech Stack

- **Frontend**
  - Astro 5
  - React 19
  - TypeScript 5
  - Tailwind CSS 4
  - Shadcn/ui
- **Backend**
  - Supabase (PostgreSQL, Auth, SDK)
- **AI Integration**
  - Openrouter.ai (supports OpenAI, Anthropic, Google, etc.)
- **CI/CD & Hosting**
  - GitHub Actions (CI/CD pipeline)
  - Cloudflare Pages (production hosting)
- **Testing**
  - Vitest (unit testing)
  - Playwright (E2E testing)
  - React Testing Library (component testing)

## Deployment & Hosting

QA Toolsmith is deployed on **Cloudflare Pages**, chosen after comprehensive analysis of hosting platforms for optimal balance of cost, performance, and developer experience.

**Key Benefits:**
- **Budget-optimized**: Generous free tier allowing commercial use (100,000 requests/day)
- **Global performance**: Edge deployment via Cloudflare Workers
- **SSR support**: Full compatibility with Astro's server-side rendering requirements
- **Developer experience**: Git integration with automatic deployments and preview environments

**Why Cloudflare Pages?**
The application requires SSR due to server-side API endpoints (authentication, data generators). Cloudflare Pages provides the best combination of cost-effectiveness and technical compatibility among evaluated platforms (Netlify, Vercel, Render, DigitalOcean App Platform).

For detailed technical architecture and API specifications, see [.ai/ARCHITECTURE.md](.ai/ARCHITECTURE.md).

For detailed technical stack and deployment configuration, see [docs/tech-stack.md](docs/tech-stack.md).

## Environment Configuration

### Required Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anonymous key (note: not SUPABASE_ANON_KEY)
- `SUPABASE_SERVICE_KEY` - Supabase service role key (server-side only)
- `OPENROUTER_API_KEY` - AI integration key (optional)
- `ENV_NAME` - Environment name (local, integration, or production). **Required in production for feature flags.**

**Note:** `ENV_NAME` is used for both server-side and client-side code to control feature flags. It's configured as a public environment variable in `astro.config.mjs` for client-side access.

### Environment Files
- `.env` - Local development
- `.env.test` - E2E testing
- Platform-specific environment variables configured in Cloudflare Pages dashboard

## Getting Started Locally

### Prerequisites

- Node.js v22.14.0 (see `.nvmrc`)
- npm (included with Node.js)

### Installation

```bash
git clone https://github.com/jakub-litkowski/qa-toolsmith.git
cd qa-toolsmith
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Pre-commit Hooks

This project uses **Husky** and **lint-staged** to automatically lint, format, and type-check files before each commit:

- Staged TypeScript/JavaScript files are automatically fixed with ESLint
- All staged files are formatted with Prettier
- TypeScript type checking blocks commits if errors are found

The hooks run automatically when you commit. To bypass them (not recommended):

```bash
git commit --no-verify
```

## Available Scripts

- `npm run dev` — Start development server
- `npm run dev:e2e` — Start development server with E2E test environment (.env.test)
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run astro` — Run Astro CLI commands
- `npm run lint` — Run ESLint checks
- `npm run lint:fix` — Automatically fix lint issues
- `npm run format` — Format files with Prettier
- `npm run typecheck` — Run TypeScript type checking
- `npm run test` — Run all tests (unit + E2E)
- `npm run test:unit` — Run unit tests with Vitest
- `npm run test:e2e` — Run E2E tests with Playwright
- `npm run test:e2e:ui` — Open Playwright UI for test development
- `npm run test:e2e:debug` — Run E2E tests in debug mode (step-through)
- `npm run test:e2e:headed` — Run E2E tests in headed mode (visible browser)

### E2E Tests with Cloud Supabase

E2E tests run against a dedicated cloud Supabase project for maximum stability and reproducibility. This approach:

- ✅ Isolates test data from local development
- ✅ Enables consistent CI/CD execution
- ✅ Automatically cleans up test data after each run

**Quick Setup:**

1. Create a cloud Supabase project for E2E tests
2. Copy `.env.test.example` to `.env.test` and fill in credentials
3. Migrate database schema: `supabase link && supabase db push`
4. Run tests: `npm run test:e2e`

**Setup Instructions**: Follow the steps above to configure your E2E testing environment.

### E2E Diagnostics

When tests fail, Playwright automatically captures diagnostic artifacts:

```bash
# View HTML report with traces, videos, and screenshots
npx playwright show-report

# Or manually open the HTML report
open playwright-report/index.html
```

The report includes:
- **Traces**: Full HAR + event timeline for debugging selectors and hydration issues
- **Videos**: Screen recording of failed test sessions
- **Screenshots**: Snapshot at exact failure point

For flaky IBAN generator tests, check:
1. Timeline in HTML report to see exact failure step
2. Video to watch selector interactions
3. Trace to inspect network timing and DOM mutations

## Project Scope

### MVP (v0.0.1) - Complete ✅

#### 1. Authentication & Roles ✅

- Email/password sign-in/out
- Admin & User roles (first Admin seeded)
- Login rate limiting and temporary lockout

#### 2. Data Generators & Validators ✅

- **IBAN Generator & Validator**: Full implementation for Germany (DE) and Austria (AT)
  - Deterministic generation with optional seed
  - Luhn algorithm validation
  - Comprehensive test suite (1000+ test cases)

### In Development 🚧

#### 3. Defect Report Templates

- UI & API bug presets with required fields
- Global templates managed by Admin; Users can fork & customize
- Markdown export & "Copy to clipboard" button

#### 4. Exploration Charter

- Charters with Goal, Hypotheses, Notes (tags: bug / idea / question / risk)
- Start/Stop timer, keyboard shortcuts (Alt+N, Alt+T, Alt+S)
- Autosave (localStorage every 5 s, DB on close)
- Markdown export & session history

#### 5. Knowledge Base

- CRUD for links with canonicalization & deduplication
- Multiple notes per link, tag support
- Full-text search (Postgres FTS) & tag filtering
- JSON export of entries

### Planned 📋

#### 6. Additional Data Generators

- Phone numbers (DE/AT/PL)
- Addresses (DE/AT/PL)
- License plates (DE/AT/PL)
- Email addresses
- Company names
- Payment cards (Visa, Mastercard with Luhn checksum)
- GUIDs/UUIDs
- Random strings with custom patterns

#### 7. AI Assistant

- "Improve / Expand" actions for descriptions, steps, notes
- Diff preview with accept/reject
- Per-user daily limit (`AI_MAX_REQUESTS_PER_USER_PER_DAY`), dry-run & manual fallback
- Integration with Openrouter.ai

### 7. Testing & CI/CD ✅

- **Unit tests**: 1167 tests across 34 test files
  - IBAN validator & generator: 158 test cases covering edge cases
  - Authentication, services, helpers, and utilities: 1009 test cases
- **E2E tests**: 10 Playwright tests covering generators, navigation, and authentication
- **Smoke tests**: GET /health, homepage render, login flow
- **CI/CD**: GitHub Actions pipeline (lint → build → test → e2e → health-check)

## API Documentation

The QA Toolsmith API provides several endpoints for interacting with the application programmatically. Detailed API specifications and endpoint documentation can be found in [.ai/ARCHITECTURE.md](.ai/ARCHITECTURE.md).

- **Health Check**: `GET /api/health` - Simple application health check endpoint

## Project Status

- **MVP Complete** (v0.0.1)
- Actively maintained feature set for testers' core workflows

## License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.