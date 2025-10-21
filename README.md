# QA Toolsmith (MVP)

[![CI](https://github.com/jakub-litkowski/qa-toolsmith/actions/workflows/ci.yml/badge.svg)](https://github.com/jakub-litkowski/qa-toolsmith/actions)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [API Documentation](#api-documentation)
7. [Project Status](#project-status)
8. [License](#license)

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
  - GitHub Actions
  - Docker (DigitalOcean)
- **Testing**
  - Vitest (unit testing)
  - Playwright (E2E testing)
  - React Testing Library (component testing)

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

The QA Toolsmith API provides several endpoints for interacting with the application programmatically. Detailed documentation for each endpoint can be found in the [docs/api](docs/api) directory.

- **Health Check**: `GET /api/health` - Simple application health check endpoint

## Project Status

- **MVP Complete** (v0.0.1)
- Actively maintained feature set for testers' core workflows

## License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.