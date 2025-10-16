# REST API Plan

> Sources: db schema, PRD, and tech stack are referenced inline with citations.

## 1. Resources

- **Auth / Profiles** → `profiles` (managed alongside Supabase Auth `auth.users`; holds `email`, `role`, timestamps).
- **Templates** → `templates` (global & user-scoped, fork lineage, fields schema, required fields, attachments, presets).
- **Drafts** → `drafts` (optional MVP; ephemeral saved work-in-progress for reports/charters).
- **Charters** → `charters` (exploratory testing sessions with status/timer and optimistic locking).
- **Charter Notes** → `charter_notes` (tagged notes: bug/idea/question/risk).
- **Knowledge Base Entries** → `kb_entries` (links with canonicalization, tags, FTS).
- **Knowledge Base Notes** → `kb_notes` (notes attached to KB entries).
- **AI Invocations** → `ai_invocations` (Improve/Expand logs & metadata).
- **AI Daily Usage** → `ai_daily_usage` (per-user daily counter & limiter).
- **Usage Events** → `usage_events` (simple product analytics; charter/generator/kb).

> Key relationships, indexes, and RLS policies inform pagination, filtering, and security.

## 2. Endpoints

### Conventions (applies to all list endpoints)

- **Pagination:** keyset via `?limit=50&after=cursor` where `cursor` encodes `(updated_at,id)`; default sort `updated_at desc, id desc`.
- **Filtering:** common filters per resource (e.g., `status`, `scope`, `tags`, `preset`, `q` for FTS-backed searches).
- **Errors:** JSON `{ "error": { "code": "string", "message": "string", "details": {} } }` with HTTP 400, 401, 403, 404, 409, 422, 429, 500.
- **Auth:** `Authorization: Bearer <JWT>` (Supabase) with RLS enforcing per-user access; `profiles.role in ('admin','user')`.
- **Content type:** `application/json`.

---

### 2.1 Health & Session

- **GET `/health`** — liveness/readiness probe; returns `{ "status": "ok" }`. Required by PRD smoke checks.
- **POST `/auth/login`** — proxied to Supabase Auth (rate-limited per IP). Returns JWT & profile.
- **POST `/auth/logout`** — revoke session.

**Errors:** `429` for too many attempts (PRD), `401` invalid credentials.

---

### 2.2 Profiles

- **GET `/profiles/me`** — current user profile.  
  **Response:** `{ "id": "uuid", "email": "string", "role": "admin|user", "created_at": "...", "updated_at": "..." }`.
- **PATCH `/profiles/me`** — update own profile (non-privileged fields).
- **GET `/admin/profiles`** — admin-only list (paginated).

**Errors:** `403` for non-admin access.

---

### 2.3 Templates

- **GET `/templates`** — list visible templates (global + own, alias of `templates_effective`).  
  **Query:** `scope=global|user&owner_id=uuid&preset=ui_bug|api_bug&name=...`  
  **Response:** items with `fields`, `required_fields`, `is_readonly`, `origin_template_id`.
- **POST `/templates`** — create **user-scoped** template. Admin may create **global** ones.  
  **Request:** `{ "name": "...", "scope": "user|global", "fields": [...], "required_fields": [...], "attachments": [], "preset": "ui_bug|api_bug" }`  
  **Errors:** `422` if `required_fields` ⊄ `fields.key`; `400` invalid attachments URLs.
- **GET `/templates/{id}`** — get one.
- **PATCH `/templates/{id}`** — update (respect `is_readonly` for global unless admin).
- **DELETE `/templates/{id}`** — delete (global: admin only; user: owner).

**Business actions**

- **POST `/templates/{id}/fork`** — create user-owned fork; sets `origin_template_id`. `409` if same-name exists.
- **POST `/templates/{id}/render`** — render to Markdown (enforces required fields, attachments as URL list).

---

### 2.4 Drafts (optional MVP)

- **GET `/drafts`**, **POST `/drafts`**, **GET `/drafts/{id}`**, **PATCH `/drafts/{id}`**, **DELETE `/drafts/{id}`** — CRUD of ephemeral WIP content; auto-expired by retention job.

---

### 2.5 Charters

- **GET `/charters`** — list user's charters; filters: `status=active|closed`. Keyset pagination.
- **POST `/charters`** — create new charter (`goal`, `hypotheses`); if an active one exists, return `409` with pointer to it.
- **GET `/charters/{id}`**, **PATCH `/charters/{id}`**, **DELETE `/charters/{id}`** — CRUD.
- **POST `/charters/{id}/start`** — set `status=active`, `started_at=now()`; `409` if already active elsewhere.
- **POST `/charters/{id}/stop`** — set `status=closed`, `ended_at=now()`; DB `CHECK` ensures `ended_at>=started_at`.
- **GET `/charters/{id}/export`** — export to Markdown with Goal/Hypotheses/Notes/Duration.

**Notes subresource**

- **GET `/charters/{id}/notes`**, **POST `/charters/{id}/notes`**, **DELETE `/charters/{id}/notes/{noteId}`** — tagged notes `bug|idea|question|risk`; server sets `noted_at`.

---

### 2.6 Knowledge Base

- **GET `/kb`** — list entries with FTS + tag filters.  
  **Query:** `q=string&tags=tag1,tag2` (FTS on title + notes + tags; sort by relevance/date).
- **POST `/kb`** — add entry; server canonicalizes URL and deduplicates per user; `409` if canonical URL exists (return existing entry).
- **GET `/kb/{id}`**, **PATCH `/kb/{id}`**, **DELETE `/kb/{id}`** — CRUD.
- **GET `/kb/{id}/notes`**, **POST `/kb/{id}/notes`**, **DELETE `/kb/{id}/notes/{noteId}`** — manage notes.
- **GET `/kb/export`** — export all user KB as JSON.

**Validation:** title length 1–200; note ≤5000 chars; tags length/count limits per schema.

---

### 2.7 Data Generators & Validators

- **GET `/generators/iban`** — generate valid IBAN for `country=DE|AT` with optional `seed`.  
  **Query:** `country=DE|AT&seed=1234`  
  **Response:** `{ "iban": "string", "country": "DE|AT", "seed": "optional" }`  
  **Errors:** `400` invalid `country`.
- **GET `/validators/iban`** — validate IBAN; returns `{ "valid": true|false, "reason": "..." }`. Unit tests per PRD.
- **GET `/generators/{kind}`** — other local data (address, phone, plates, email, company, card, guid, string) with `country=PL|DE|AT` and optional `seed`. Return `400` with helpful message on bad params.

---

### 2.8 AI Assistant

- **POST `/ai/improve`**, **POST `/ai/expand`** — process text fields, return proposed change + diff preview; on accept, the client applies changes.  
  **Request:** `{ "context": "template|charter|kb", "field": "description|steps|hypotheses|notes", "text": "..." }`  
  **Response:** `{ "proposal": "...", "diff": "...", "model": "...", "usage": { "prompt": 123, "completion": 45 } }`  
  **Limits & toggles:** per-user daily cap via `ai_daily_usage`; global `AI_DISABLED` hides or rejects with `403`. Log metadata to `ai_invocations`. `429` when over quota.
- **GET `/ai/limits`** — return remaining daily allowance for the user.

---

### 2.9 Stats & Events

- **POST `/events`** — record usage event `{ kind: 'charter'|'generator'|'kb', meta: {...} }`.
- **GET `/stats/summary`** — aggregate counts for charters, generators, kb (admin can view global; users see own).

---

## 3. Authentication & Authorization

- **Mechanism:** Supabase Auth JWT; include `Authorization: Bearer <token>` in requests. Profiles store role `admin|user`.
- **RLS policies:** enforce per-user access on all tables with `user_id`, allow admins broader `SELECT`; templates: global readable; user-owned readable/writable; global modifications admin-only.
- **Login rate limiting:** reverse proxy (Nginx) per-IP sliding window for `/auth/*` and generic per-token budget for write endpoints. PRD requires temporary lockout after repeated failures.

## 4. Validation & Business Logic

- **Templates:** enforce `required_fields ⊆ fields.key`; validate `attachments` as HTTP/HTTPS URLs; maintain `UNIQUE(scope, lower(name), owner_id)`; presets `ui_bug|api_bug`; `is_readonly` for seeded globals.
- **Reports (render):** required fields must be present before Markdown rendering; attachments are URL list (no uploads in MVP).
- **Charters:** single active per user (partial `UNIQUE`); DB `CHECK` enforces status/ended_at invariants; keyboard shortcuts and local autosave are FE concerns, with periodic DB saves via API.
- **KB:** canonicalize & deduplicate URLs; FTS search; tag filters; note length ≤5000; export JSON. Conflicts return `409` with existing record.
- **AI:** daily quota via `ai_daily_usage`; log to `ai_invocations`; disabled mode via env denies calls.
- **Generators/Validators:** IBAN DE/AT generation & validation with mod-97; other local data generators per PRD; robust parameter validation; unit + property-based tests for IBAN.

### Common Error Codes

- `400` malformed input; `401` unauthenticated; `403` forbidden (e.g., editing global template as user); `404` not found; `409` conflict (KB duplicate, active charter exists); `422` schema/validation errors; `429` rate limited; `500` server error.

## 5. Security & Performance

- **Transport:** HTTPS only; CORS restricted to app origin; JSON body size limit (e.g., 128KB). (Aligned with DO + Astro/React hosting.)
- **RLS-first design:** rely on PostgreSQL RLS + Supabase JWT claims to scope data access; server validates role-based routes (admin endpoints) as defense-in-depth.
- **Pagination:** keyset on `(updated_at,id)` for stable performance; appropriate composite BTREE/GIN indexes per table (FTS on KB).
- **Rate limits:** login & write-heavy endpoints rate-limited; AI endpoints capped by per-user quotas.
- **Privacy:** synthetic/test data only; no PII; support GDPR delete-on-request (delete account + cascade to user-owned artifacts).
- **Observability:** structured logs; smoke test includes `/health` and one CRUD path post-deploy (CI requirement).

## 6. Example Payloads

### Template (create)

**Request**

```json
{
  "name": "My UI Bug",
  "scope": "user",
  "preset": "ui_bug",
  "fields": [
    { "key": "title", "type": "text", "label": "Title" },
    { "key": "steps", "type": "markdown", "label": "Steps to Reproduce" },
    { "key": "expected", "type": "markdown", "label": "Expected" },
    { "key": "actual", "type": "markdown", "label": "Actual" }
  ],
  "required_fields": ["title", "steps", "expected", "actual"],
  "attachments": ["https://example.com/screenshot.png"]
}
```

**Response 201**

```json
{
  "id": "uuid",
  "name": "My UI Bug",
  "scope": "user",
  "owner_id": "uuid",
  "preset": "ui_bug",
  "is_readonly": false,
  "version": 1,
  "created_at": "...",
  "updated_at": "..."
}
```

### KB (create with canonicalization)

**Request**

```json
{
  "title": "PostgreSQL FTS Guide",
  "url": "https://example.com/fts?utm=ad",
  "tags": ["postgres", "fts"]
}
```

**Response 201**

```json
{
  "id": "uuid",
  "title": "PostgreSQL FTS Guide",
  "url_original": "https://example.com/fts?utm=ad",
  "url_canonical": "https://example.com/fts",
  "tags": ["postgres", "fts"],
  "created_at": "...",
  "updated_at": "..."
}
```

---

## 7. Tech-stack alignment

- **Frontend:** Astro + React 19 consuming this REST API; TypeScript models mirror the request/response shapes here.
- **Backend:** Supabase PostgreSQL with RLS and PostgREST; custom endpoints (render, fork, AI, generators) implemented as minimal Node/Edge service behind the same domain.
- **CI/CD & Hosting:** GitHub Actions + DigitalOcean; smoke uses `/health`, login, and one KB CRUD.
