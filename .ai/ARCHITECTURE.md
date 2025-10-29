# QA Toolsmith Architecture Specification

This document provides high-level architecture overview for QA Toolsmith MVP, covering key architectural decisions, data flow, database design, and technology stack.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Architecture](#database-architecture)
3. [UI Architecture](#ui-architecture)
4. [Technology Stack](#technology-stack)

---

## Architecture Overview

### Key Architectural Decisions

**Backend as a Service (Supabase)**

- PostgreSQL database with Row Level Security (RLS) for multi-tenant data isolation
- Built-in authentication with JWT tokens
- Serverless-friendly architecture compatible with Cloudflare Workers

**Astro SSR + React**

- Astro for server-rendered pages and API endpoints
- React for interactive client-side components only
- Minimal JavaScript footprint for better performance

**State Management**

- Server-side data fetching with Astro SSR
- React hooks for local component state
- localStorage for offline-first features (autosave)

### API Design

**📚 Detailed API documentation:** See `docs/api.md` for complete endpoint specifications, request/response formats, and examples.

**Key Design Principles:**

- RESTful endpoints with snake_case responses
- Keyset pagination for stable performance
- Structured error responses with codes
- JWT authentication via Supabase
- Rate limiting on auth and write endpoints

**Main Endpoints:**

- `/api/auth/*` - Authentication (login, logout, reset password)
- `/api/templates` - Template management (global + user-scoped forks)
- `/api/charters` - Exploration sessions with timer
- `/api/kb` - Knowledge Base CRUD with FTS search
- `/api/generators/*` - Data generators and validators
- `/api/ai/*` - AI assistant integration (Improve/Expand)

### Data Flow

1. **Authentication**: User logs in → Supabase JWT → Middleware validates → User context available
2. **Data Access**: Astro SSR endpoint → RLS policies enforce isolation → Returns user's data only
3. **Mutations**: Client submits form → Astro API validates → Supabase RLS → Success/error response
4. **Offline**: localStorage autosave → Sync on reconnect → Conflict resolution (409)

---

## Authentication & Authorization

### User Stories Coverage

- **US-001 Rejestracja**: Email/password signup with auto-login; no account enumeration
- **US-002 Logowanie**: Session management with rate limiting and temporary lockout
- **US-003 Role Management**: Admin (global templates) vs User (own templates/charters/KB)

**📚 Detailed implementation:** See `docs/api.md` for authentication endpoints and flow details.

---

## Database Architecture

**Core Tables:**

- `profiles` - User profiles with roles (admin/user), linked to Supabase machines
- `templates` - Global and user-scoped templates with fork lineage
- `charters` - Exploration sessions with timer and optimistic locking
- `charter_notes` - Tagged notes (bug/idea/question/risk)
- `kb_entries` - Knowledge base links with canonicalization and FTS
- `kb_notes` - Notes attached to KB entries
- `ai_invocations` - AI action logs and metadata
- `ai_daily_usage` - Per-user daily quota tracking
- `usage_events` - Product analytics (charter/generator/kb)

**Relationships:**

- `profiles (1:N)` → `templates`, `charters`, `kb_entries`, and other user artifacts
- `templates` can fork to user-scoped copies via `origin_template_id`
- `charters (1:N)` → `charter_notes`
- `kb_entries (1:N)` → `kb_notes`

**Key Constraints:**

- RLS policies enforce per-user data isolation on all tables
- Templates: Unique combination of scope/name/owner_id
- Charters: One active session per user (partial unique constraint)
- KB: Unique canonical URL per user

**Indexes:**

- BTREE indexes on (user_id, updated_at DESC, id DESC) for keyset pagination
- GIN indexes for FTS search (KB search_vector)
- GIN indexes on tags and text fields for filtering

---

## UI Architecture

### Key Concepts

- **Mobile-first**: All views prioritize mobile devices
- **Minimal a11y baseline**: Focus visible, form labels, touch targets ≥40px
- **Offline-aware**: Offline banner, retry queue for idempotent operations
- **Optimistic UI**: Immediate feedback for frequent actions
- **Consistent patterns**: Unified list, form, error, and loading components

### State Management

- **React 19** hooks: `use()` for async data fetching, `useOptimistic()` for optimistic updates
- **Keyset pagination**: `?limit&after=cursor` for stable pagination
- **URL-synced filters**: Search and filter parameters in URL
- **localStorage**: Autosave for Charters (5s), generator history (10 entries)

### Error Handling

| HTTP Code | UI Handling                          |
| --------- | ------------------------------------ |
| 401       | Modal re-login + intent preservation |
| 403       | Banner "No permission"               |
| 409       | Conflict resolution dialog           |
| 422       | Inline form errors                   |
| 429       | Rate limit banner with countdown     |
| 500       | Error boundary with retry option     |
| Offline   | Offline banner + retry queue         |

### Main Views

- **Generators Hub** (`/generators`) - List of available data generators
- **IBAN Generator** (`/generators/iban`) - Generate/validate with history
- **Templates** (`/templates`) - Template management with fork actions
- **Charters** (`/charters`) - Exploration sessions with timer
- **Knowledge Base** (`/kb`) - Link management with FTS search
- **Profile** (`/profile`) - User profile and AI usage stats

### Navigation

- **Top navbar**: Logo, main nav items (Templates, Charters, KB, Generators)
- **User menu**: Avatar/email, Profile, Logout
- **Admin dropdown**: Conditional admin-only actions
- **Breadcrumbs**: Contextual navigation for nested routes

---

## Technology Stack

### Frontend

- **Astro 5** (v5.13.7): SSR with minimal JavaScript, API endpoints
- **React 19** (v19.1.1): Interactive components with React Compiler
- **TypeScript 5**: Static typing
- **Tailwind 4** (v4.1.13): Utility-first CSS with native Vite integration
- **Shadcn/ui**: Accessible React components on Radix UI

### Backend

- **Supabase**:
  - PostgreSQL database with Row Level Security (RLS)
  - `@supabase/supabase-js` (v2.75.0) - BaaS SDK
  - `@supabase/ssr` (v0.7.0) - SSR support with cookie management
  - Built-in JWT authentication

### Environment Variables

**Astro 5 typed environment system** (`astro:env`):

- Server-side: `import { SUPABASE_URL, SUPABASE_KEY, ... } from 'astro:env/server'`
- Client-side: `import { ENV_NAME } from 'astro:env/client'` (public only)
- Priority: Cloudflare bindings → astro:env → Node.js fallback

### AI Integration

- **OpenRouter.ai**: Multi-model AI service
  - Per-user daily usage limits
  - Structured JSON responses with schema validation
  - Comprehensive error handling

### CI/CD & Hosting

- **GitHub Actions**: Lint → Build → Unit Tests → E2E Tests
- **Cloudflare Pages**: Production hosting with SSR via `@astrojs/cloudflare` adapter
- **Browser**: Chromium only for E2E tests

---

## Testing

**📚 Detailed testing documentation:** See test files in `src/__tests__/` for unit tests and `e2e/` for E2E tests.

**Testing Strategy:**

- **Unit Tests**: Vitest (1,167 tests across 34 files)
- **E2E Tests**: Playwright (10 tests covering full workflows)
- **Test Principles**: No sleeps, stable selectors (data-testid), test isolation
- **Diagnostics**: Traces, screenshots, videos (on failure only, 7-day retention)

---

## See Also

### Related Documentation

- **[API Documentation](../docs/api.md)** - Complete API reference with endpoint specifications
- **[Tech Stack](../docs/tech-stack.md)** - Technology overview and deployment configuration
- **[Cloudflare Deployment](../docs/deployment-cloudflare.md)** - Complete deployment guide
- **[Generators View](../docs/generators-view.md)** - User-facing documentation for data generators
- **[PRD](./prd.md)** - Product Requirements Document with user stories (US-001 to US-014)
- **[README](../README.md)** - Project overview and getting started

### Code Documentation

- **Database Types**: `src/db/database.types.ts` - Supabase type definitions
- **Supabase Client**: `src/db/supabase.client.ts` - Server-side client setup
- **API Routes**: `src/pages/api/` - API endpoint implementations
- **Component Library**: `src/components/` - React components

### Testing

- **Unit Tests**: `src/__tests__/` - Vitest test files
- **E2E Tests**: `e2e/` - Playwright test files
