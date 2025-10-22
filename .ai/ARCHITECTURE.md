# QA Toolsmith Architecture Specification

This document consolidates the comprehensive architecture specifications for QA Toolsmith MVP, covering API design, authentication, database schema, UI architecture, technology stack, and testing strategy.

## Table of Contents

1. [API Design](#api-design)
2. [Authentication & Authorization](#authentication--authorization)
3. [Database Architecture](#database-architecture)
4. [UI Architecture](#ui-architecture)
5. [Technology Stack](#technology-stack)
6. [Testing Strategy](#testing-strategy)

---

## API Design

### Resources

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

### Endpoints

#### Conventions (applies to all list endpoints)

- **Pagination:** keyset via `?limit=50&after=cursor` where `cursor` encodes `(updated_at,id)`; default sort `updated_at desc, id desc`.
- **Filtering:** common filters per resource (e.g., `status`, `scope`, `tags`, `preset`, `q` for FTS-backed searches).
- **Errors:** JSON `{ "error": { "code": "string", "message": "string", "details": {} } }` with HTTP 400, 401, 403, 404, 409, 422, 429, 500.
- **Auth:** `Authorization: Bearer <JWT>` (Supabase) with RLS enforcing per-user access; `profiles.role in ('admin','user')`.
- **Content type:** `application/json`.

#### 2.1 Health & Session

- **GET `/health`** — liveness/readiness probe; returns `{ "status": "ok" }`. Required by PRD smoke checks.
- **POST `/auth/login`** — proxied to Supabase Auth (rate-limited per IP). Returns JWT & profile.
- **POST `/auth/logout`** — revoke session.

**Errors:** `429` for too many attempts (PRD), `401` invalid credentials.

#### 2.2 Profiles

- **GET `/profiles/me`** — current user profile.
  **Response:** `{ "id": "uuid", "email": "string", "role": "admin|user", "created_at": "...", "updated_at": "..." }`.
- **PATCH `/profiles/me`** — update own profile (non-privileged fields).
- **GET `/admin/profiles`** — admin-only list (paginated).

**Errors:** `403` for non-admin access.

#### 2.3 Templates

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

#### 2.4 Drafts (optional MVP)

- **GET `/drafts`**, **POST `/drafts`**, **GET `/drafts/{id}`**, **PATCH `/drafts/{id}`**, **DELETE `/drafts/{id}`** — CRUD of ephemeral WIP content; auto-expired by retention job.

#### 2.5 Charters

- **GET `/charters`** — list user's charters; filters: `status=active|closed`. Keyset pagination.
- **POST `/charters`** — create new charter (`goal`, `hypotheses`); if an active one exists, return `409` with pointer to it.
- **GET `/charters/{id}`**, **PATCH `/charters/{id}`**, **DELETE `/charters/{id}`** — CRUD.
- **POST `/charters/{id}/start`** — set `status=active`, `started_at=now()`; `409` if already active elsewhere.
- **POST `/charters/{id}/stop`** — set `status=closed`, `ended_at=now()`; DB `CHECK` ensures `ended_at>=started_at`.
- **GET `/charters/{id}/export`** — export to Markdown with Goal/Hypotheses/Notes/Duration.

**Notes subresource**

- **GET `/charters/{id}/notes`**, **POST `/charters/{id}/notes`**, **DELETE `/charters/{id}/notes/{noteId}`** — tagged notes `bug|idea|question|risk`; server sets `noted_at`.

#### 2.6 Knowledge Base

- **GET `/kb`** — list entries with FTS + tag filters.
  **Query:** `q=string&tags=tag1,tag2` (FTS on title + notes + tags; sort by relevance/date).
- **POST `/kb`** — add entry; server canonicalizes URL and deduplicates per user; `409` if canonical URL exists (return existing entry).
- **GET `/kb/{id}`**, **PATCH `/kb/{id}`**, **DELETE `/kb/{id}`** — CRUD.
- **GET `/kb/{id}/notes`**, **POST `/kb/{id}/notes`**, **DELETE `/kb/{id}/notes/{noteId}`** — manage notes.
- **GET `/kb/export`** — export all user KB as JSON.

**Validation:** title length 1–200; note ≤5000 chars; tags length/count limits per schema.

#### 2.7 Data Generators & Validators

- **GET `/generators/iban`** — generate valid IBAN for `country=DE|AT` with optional `seed`.
  **Query:** `country=DE|AT&seed=1234`
  **Response:** `{ "iban": "string", "country": "DE|AT", "seed": "optional" }`
  **Errors:** `400` invalid `country`.
- **GET `/validators/iban`** — validate IBAN; returns `{ "valid": true|false, "reason": "..." }`. Unit tests per PRD.
- **GET `/generators/{kind}`** — other local data (address, phone, plates, email, company, card, guid, string) with `country=PL|DE|AT` and optional `seed`. Return `400` with helpful message on bad params.

#### 2.8 AI Assistant

- **POST `/ai/improve`**, **POST `/ai/expand`** — process text fields, return proposed change + diff preview; on accept, the client applies changes.
  **Request:** `{ "context": "template|charter|kb", "field": "description|steps|hypotheses|notes", "text": "..." }`
  **Response:** `{ "proposal": "...", "diff": "...", "model": "...", "usage": { "prompt": 123, "completion": 45 } }`
  **Limits & toggles:** per-user daily cap via `ai_daily_usage`; global `AI_DISABLED` hides or rejects with `403`. Log metadata to `ai_invocations`. `429` when over quota.
- **GET `/ai/limits`** — return remaining daily allowance for the user.

#### 2.9 Stats & Events

- **POST `/events`** — record usage event `{ kind: 'charter'|'generator'|'kb', meta: {...} }`.
- **GET `/stats/summary`** — aggregate counts for charters, generators, kb (admin can view global; users see own).

---

## Detailed Endpoint Implementation Plans

### GET `/generators/iban`

**Overview**: Generates syntactically correct IBAN numbers for Germany (DE) and Austria (AT) with optional deterministic seeding.

**Request Details**:
- **Method**: GET
- **URL**: `/generators/iban`
- **Query Parameters**:
  - `country` (required): `"DE"` | `"AT"`
  - `seed` (optional): string ≤64 chars, pattern `/^[A-Za-z0-9._-]+$/`

**Response**:
```json
{
  "iban": "DE50185482443452538353",
  "country": "DE",
  "seed": "optional_seed"
}
```

**Implementation Details**:
- **Algorithm**: FNV-1a hash → SplitMix32 PRNG → BBAN generation → mod-97 checksum
- **DE Format**: 8-digit BLZ + 10-digit account → 22-char IBAN
- **AT Format**: 5-digit BLZ + 11-digit account → 20-char IBAN
- **Caching**: Immutable for seeded requests (31,536,000s), no-store for random
- **Validation**: Zod schema with regex patterns and length limits

**Error Codes**: `invalid_country`, `invalid_seed`, `rate_limited`

### GET `/templates`

**Overview**: Returns effective template list visible to authenticated user (global + owned, excluding overridden globals).

**Request Details**:
- **Method**: GET
- **URL**: `/templates`
- **Query Parameters**:
  - `limit` (optional): 1-100, default 20
  - `after` (optional): base64 cursor for keyset pagination
  - `preset` (optional): `"ui_bug"` | `"api_bug"`

**Response**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "UI Bug Report",
      "scope": "global",
      "preset": "ui_bug",
      "fields": [...],
      "required_fields": ["title", "steps"],
      "is_readonly": true
    }
  ],
  "next_cursor": "base64_encoded_cursor"
}
```

**Implementation Details**:
- **Data Source**: `templates_effective` view with UNION to handle overrides
- **Pagination**: Keyset on `(updated_at, id)` for stable performance
- **RLS**: Enforced via view policies, admin sees all, users see global + owned
- **Indexing**: BTREE on `(owner_id, updated_at DESC, id DESC)`
- **Sorting**: `ORDER BY updated_at DESC, id DESC`

**Error Codes**: `unauthenticated`, `validation_error`

### GET `/health`

**Overview**: Simple application health check endpoint for monitoring and deployment verification.

**Request Details**:
- **Method**: GET
- **URL**: `/health`
- **Parameters**: None

**Response**:
```json
{
  "status": "ok"
}
```

**Implementation Details**:
- **Purpose**: Required by PRD smoke tests
- **No Authentication**: Public endpoint for monitoring
- **Caching**: Optional TTL=5s for frequent monitoring
- **Future Extensibility**: Can add database checks, external service pings

### PATCH `/profiles/me`

**Overview**: Updates current user's profile with email change requiring verification.

**Request Details**:
- **Method**: PATCH
- **URL**: `/profiles/me`
- **Body**:
```json
{
  "email": "new@example.com"
}
```

**Response (Email Change)**:
```json
{
  "status": "pending_verification",
  "message": "Verification email sent to new@example.com"
}
```

**Response (Other Changes)**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user",
  "created_at": "2025-10-15T08:30:00.000Z",
  "updated_at": "2025-10-15T08:35:00.000Z"
}
```

**Implementation Details**:
- **Email Changes**: Supabase Auth `updateUser()` → automatic verification email
- **Rate Limiting**: Per-user IP sliding window (10 attempts/15min)
- **Synchronization**: Database trigger syncs email from `auth.users` to `profiles`
- **Security**: RLS prevents role/org updates, whitelists allowed fields
- **Validation**: Email normalization, RFC5322-lite format, uniqueness checks

**Error Codes**: `unauthenticated`, `forbidden_field`, `email_taken`, `rate_limited`

### GET `/profiles/me`

**Overview**: Retrieves current authenticated user's profile information.

**Request Details**:
- **Method**: GET
- **URL**: `/profiles/me`
- **Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user",
  "created_at": "2025-10-15T08:30:00.000Z",
  "updated_at": "2025-10-15T08:30:00.000Z"
}
```

**Implementation Details**:
- **Data Source**: `profiles` table with RLS
- **Performance**: PK lookup, minimal payload (<1KB)
- **Caching**: Private cache (max-age=30s), ETag support
- **Security**: RLS `id = auth.uid()`, no IDOR vulnerability
- **Error Handling**: 401 (no session), 404 (profile missing), 500 (DB error)

**Error Codes**: `unauthenticated`, `internal`

### Authentication & Authorization

- **Mechanism:** Supabase Auth JWT; include `Authorization: Bearer <token>` in requests. Profiles store role `admin|user`.
- **RLS policies:** enforce per-user access on all tables with `user_id`, allow admins broader `SELECT`; templates: global readable; user-owned readable/writable; global modifications admin-only.
- **Login rate limiting:** reverse proxy (Nginx) per-IP sliding window for `/auth/*` and generic per-token budget for write endpoints. PRD requires temporary lockout after repeated failures.

### Validation & Business Logic

- **Templates:** enforce `required_fields ⊆ fields.key`; validate `attachments` as HTTP/HTTPS URLs; maintain `UNIQUE(scope, lower(name), owner_id)`; presets `ui_bug|api_bug`; `is_readonly` for seeded globals.
- **Reports (render):** required fields must be present before Markdown rendering; attachments are URL list (no uploads in MVP).
- **Charters:** single active per user (partial `UNIQUE`); DB `CHECK` enforces status/ended_at invariants; keyboard shortcuts and local autosave are FE concerns, with periodic DB saves via API.
- **KB:** canonicalize & deduplicate URLs; FTS search; tag filters; note length ≤5000; export JSON. Conflicts return `409` with existing record.
- **AI:** daily quota via `ai_daily_usage`; log to `ai_invocations`; disabled mode via env denies calls.
- **Generators/Validators:** IBAN DE/AT generation & validation with mod-97; other local data generators per PRD; robust parameter validation; unit + property-based tests for IBAN.

### Common Error Codes

- `400` malformed input; `401` unauthenticated; `403` forbidden (e.g., editing global template as user); `404` not found; `409` conflict (KB duplicate, active charter exists); `422` schema/validation errors; `429` rate limited; `500` server error.

### Security & Performance

- **Transport:** HTTPS only; CORS restricted to app origin; JSON body size limit (e.g., 128KB). (Aligned with DO + Astro/React hosting.)
- **RLS-first design:** rely on PostgreSQL RLS + Supabase JWT claims to scope data access; server validates role-based routes (admin endpoints) as defense-in-depth.
- **Pagination:** keyset on `(updated_at,id)` for stable performance; appropriate composite BTREE/GIN indexes per table (FTS on KB).
- **Rate limits:** login & write-heavy endpoints rate-limited; AI endpoints capped by per-user quotas.
- **Privacy:** synthetic/test data only; no PII; support GDPR delete-on-request (delete account + cascade to user-owned artifacts).
- **Observability:** structured logs; smoke test includes `/health` and one CRUD path post-deploy (CI requirement).

---

## Authentication & Authorization

### User Stories Coverage

- **US-001 Rejestracja**: `/auth/register` + `POST /api/auth/signup` + auto-login po sukcesie; walidacja e‑mail/hasło; brak ujawniania istnienia konta; komunikaty sukcesu; brak SSO w MVP.
- **US-002 Logowanie i sesja**: `/auth/login`, `POST /api/auth/signin`, `POST /api/auth/signout`, TopBar (prawy górny róg), dostęp do generatorów i szablonów bez logowania (read‑only), **blokada działań wymagających zapisu/edycji**, rate‑limit prób, **blokada tymczasowa po serii błędów**, reset hasła (`/auth/reset`, `/auth/reset/confirm`).

### UI Architecture

#### Struktura stron, layoutów i nawigacji

**Nowe ścieżki:**

- `/auth/login` – strona logowania.
- `/auth/register` – strona rejestracji.
- `/auth/reset` – formularz żądania resetu hasła (wprowadzenie e‑maila).
- `/auth/reset/confirm` – formularz ustawienia nowego hasła po kliknięciu linku z e‑maila (token w URL).
- `/logout` (lub akcja POST/`/api/auth/signout`) – wylogowanie i przekierowanie na `/`.

**Layouty:**

- `src/layouts/PublicLayout.astro` – układ dla stron publicznych (generatory, KB w trybie read‑only, landing).
- `src/layouts/AuthLayout.astro` – lekki układ dla `/auth/*` (bez rozpraszaczy; focus na formularzu).
- `src/components/TopBar.astro` – _nagłówek globalny_ z prawym górnym przyciskiem:
  - Gdy **bez sesji**: pokazywany **„Zaloguj / Zarejestruj”** (link do `/auth/login` / `/auth/register`).
  - Gdy **z sesją**: menu użytkownika (e‑mail/avatar), link do „Profilu” (jeśli istnieje), **„Wyloguj”**.

**Gating (przełączanie trybu read‑only):**

- **Historia pracy i zasoby użytkownika** (lista charterów, własne szablony, historia KB) **wymagają zalogowania** zgodnie z US‑002; bez sesji ukrywamy te widoki lub pokazujemy CTA do logowania.

- Na stronach funkcji edycyjnych (np. KB CRUD, forki szablonów) przy braku sesji:
  - **Przyciski zapisu/edycji są wyszarzone** lub pokazują **modal logowania** (bez utraty wprowadzonych danych).
  - Wejścia w akcje REST zwracają **401** z komunikatem ogólnym, FE pokazuje toast z linkiem do logowania.

#### Walidacja i komunikaty błędów

**Pola i reguły (client‑side, powtórzone server‑side):**

- **email**: wymagany, max 254, format RFC 5322 (upraszczony), normalizacja `trim().toLowerCase()`.
- **password**: wymagane, min. 8 znaków, max 72 (BCrypt), zalecane: przynajmniej 1 litera i 1 cyfra.

**Zasada nieujawniania istnienia konta (US‑001/US‑002):**

- Rejestracja: błędy „email zajęty" mapowane na komunikat: **„Nie udało się utworzyć konta. Sprawdź dane."**
- Logowanie: zawsze **„Nieprawidłowe dane logowania."** bez wskazywania, co było błędne.
- Reset hasła – po submit zawsze: **„Jeśli konto istnieje, wyślemy instrukcję na e‑mail."**

**Komunikaty sukcesu:**

- Rejestracja: **„Konto utworzone. Zalogowano."** → przekierowanie (ostatnia strona lub `/`).
- Logowanie: **„Witaj ponownie!"** → przekierowanie (ostatnia strona lub `/`).
- Reset‑request: jw. (bez potwierdzenia istnienia konta).
- Reset‑confirm: **„Hasło zaktualizowane."** → automatyczne logowanie (jeśli token ważny) albo link do `/auth/login`.

#### Obsługa kluczowych scenariuszy

1. **Rejestracja (US‑001):**  
   Użytkownik wypełnia e‑mail/hasło → FE waliduje → POST do `/api/auth/signup` → po sukcesie sesja HTTP‑only ustawiona → redirect.
   Błąd „email exists" → komunikat ogólny, bez ujawniania.

2. **Logowanie (US‑002):**  
   FE waliduje → POST `/api/auth/signin` → po sukcesie sesja (cookie) → redirect.  
   Błędne dane → komunikat ogólny, UI anty‑brute‑force: _exponential backoff_ na poziomie FE.

3. **Wylogowanie:**  
   Akcja `POST /api/auth/signout` (lub `/logout`) czyści cookie i przekierowuje na `/`.

4. **Reset hasła (żądanie):**  
   FE POST `/api/auth/reset-request` z e‑mailem → zawsze komunikat „jeśli konto istnieje…".

5. **Reset hasła (potwierdzenie):**  
   Użytkownik otwiera link z maila `https://app/auth/reset/confirm#access_token=...&type=recovery` → strona odczytuje token z URL → POST `/api/auth/reset-change` z `new_password` → sukces/logowanie/redirect.

6. **Próba zapisu bez sesji:**  
   FE blokuje CTA (modal logowania) + BE zwraca 401, żeby egzekwować regułę.

### Backend Logic

#### API routes (Astro) i kontrakty

- **POST `/api/auth/signup`**  
  **Body:** `{ email: string, password: string }`  
  **200:** `{ userId: string }` + ustawione cookie sesji  
  **4xx/5xx:** `{ code: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "RATE_LIMITED" | "UNKNOWN_ERROR" }`  
  **Działanie:** `supabase.auth.signUp({ email, password })` → po sukcesie `signInWithPassword` (auto‑login zgodnie z US‑001).

- **POST `/api/auth/signin`**  
  **Body:** `{ email, password }`  
  **200:** `{ userId: string }` (+ cookie)  
  **4xx:** `INVALID_CREDENTIALS` (zawsze), opcjonalnie `RATE_LIMITED`.

- **POST `/api/auth/signout`**  
  **200:** `{ ok: true }` i wyczyszczone cookie sesji.

- **POST `/api/auth/reset-request`**  
  **Body:** `{ email }`  
  **200:** `{ ok: true }` (bez względu na istnienie konta).  
  **Działanie:** `supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://<host>/auth/reset/confirm" })`.

- **POST `/api/auth/reset-change`**  
  **Body:** `{ access_token, new_password }` (token pobierany z URL fragment albo query)  
  **200:** `{ ok: true }` (+ ewentualne automatyczne zalogowanie).

#### Walidacja wejścia (server‑side)

- Warstwa DTO + walidacja (`zod` na serwerze lub prosty validator własny).
- Normalizacja e‑maila (`lowercase`, `trim`), limity długości, białe znaki.
- _Zasada nieujawniania_ – mapujemy błędy Supabase (`User already registered`, `Invalid login credentials`) na uniwersalne kody.

#### Rate‑limiting i anty‑abuse

- **Blokada tymczasowa po serii błędów (zgodnie z PRD 3.1):** per **e‑mail (hash)** + **IP (hash)**, po **10** nieudanych próbach w **10 minut** ustawiamy `lock_until = now() + 15 min`. Podczas blokady `/api/auth/signin` zwraca **429** z kodem `RATE_LIMITED` i komunikatem ogólnym (bez ujawniania przyczyny). Implementacja minimalna: tabela `auth_throttle(email_hash, ip_hash, failures, window_started_at, lock_until)` z czyszczeniem rekordów starszych niż 24 h (cron lub job w aplikacji).

- Minimalny limiter IP dla endpointów `/api/auth/*` (np. token bucket w pamięci procesu lub prosta tabela w Postgres z TTL).
- Backoff po stronie FE (1s, 2s, 4s…).

#### Modele danych i spójność z istniejącymi tabelami

- **Seed pierwszego admina (PRD 3.1):** podczas deployu `SEED_ADMIN_EMAILS` (lista) jest mapowana na `profiles.role='admin'`. Pierwsza rejestracja tych e‑maili skutkuje nadaniem roli `admin` (lub migracja ustawia rolę od razu, jeśli użytkownik istnieje).

- Wykorzystujemy istniejące `auth.users` (Supabase) i `public.profiles` (PK = `auth.users.id`, pola min.: `email`, `role` = `admin|user`).

- Po rejestracji (trigger DB lub task po stronie aplikacji) tworzymy rekord w `profiles` z domyślną rolą `user`.

- RLS (Row‑Level Security) już obowiązuje w tabelach domenowych – polityki dopuszczają tylko `auth.uid() = created_by`.

### System Integration

#### Integracja i biblioteki

- `@supabase/supabase-js` – klient (browser i server).
- `@supabase/auth-helpers-astro` – zarządzanie sesją, ciasteczkami i SSR guards (wariant A).
- Zmienne środowiskowe: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (klient), `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer – **nie** do bundla FE).

#### Przepływy

**Rejestracja (US‑001):**  
`RegisterForm` → POST `/api/auth/signup` → `signUp` → natychmiastowe `signInWithPassword` → cookie → redirect.  
Ewentualne potwierdzenie e‑mail (jeśl. włączone globalnie) można pominąć w MVP, zgodnie z US‑001 („zostaje zalogowany").

**Logowanie/Wylogowanie (US‑002):**  
`LoginForm` → POST `/api/auth/signin` → cookie → redirect.  
Menu użytkownika → POST `/api/auth/signout` → redirect na `/`.

**Reset hasła:**  
`ResetRequestForm` → `/api/auth/reset-request` (zawsze 200) → e‑mail z linkiem `…/auth/reset/confirm`.  
`ResetConfirmForm` odczytuje `access_token` → `/api/auth/reset-change`.

#### Polityki bezpieczeństwa

- **Brak ujawniania istnienia e‑maila** – jak wyżej.
- **SameSite=Lax, HttpOnly, Secure** dla ciasteczek sesji (auth‑helpers).
- **CSRF:** POST‑y do `/api/auth/*` przyjmują tylko `Content-Type: application/json` i pochodzą z tej samej domeny; można dodać `csrfToken` w nagłówku i weryfikację w API route.
- **XSS:** komunikaty błędów i echo danych użytkownika są escapowane; brak wstrzykiwania unescaped HTML.
- **Rate‑limit** na endpointach + backoff FE.
- **RODO:** brak PII poza e‑mailem; realizujemy w przyszłości endpoint usuwania konta (poza zakresem US‑001/002).

---

## Database Architecture

### Table Schema

#### `profiles`

This table is managed by Supabase auth

- `id uuid PK` — = `auth.users.id`, `DEFAULT gen_random_uuid()`; `FK auth.users(id) ON DELETE CASCADE`.
- `email citext NOT NULL UNIQUE`
- `role text NOT NULL CHECK (role IN ('admin','user'))`
- `org_id uuid NULL` _(rezerwacja pod przyszły multi-tenant)_
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Triggery/func:** `AFTER INSERT ON auth.users` → insert do `profiles`; `set_timestamps()` dla `created_at/updated_at`.

#### `templates`

- `id uuid PK DEFAULT gen_random_uuid()`
- `name citext NOT NULL`
- `scope text NOT NULL CHECK (scope IN ('global','user'))`
- `owner_id uuid NULL FK → profiles(id) ON DELETE CASCADE` _(dla `scope='user'`; `NULL` dla global)_
- `preset text NULL CHECK (preset IN ('ui_bug','api_bug'))`
- `fields jsonb NOT NULL CHECK (jsonb_typeof(fields)='array')` _(uporządkowana tablica obiektów: `{key,type,label,help,default,options}`)_
- `required_fields text[] NOT NULL DEFAULT '{}'
- `attachments text[] NOT NULL DEFAULT '{}' CHECK (array_length(attachments,1) IS NULL OR array_length(attachments,1) <= 10)` _(walidacja URL elementów w triggerze)_
- `origin_template_id uuid NULL FK → templates(id) ON DELETE SET NULL` _(fork źródłowy)_
- `is_readonly boolean NOT NULL DEFAULT false`
- `version int NOT NULL DEFAULT 1`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Ograniczenia:**

- `UNIQUE (scope, lower(name), owner_id)`; dla `scope='global'` `owner_id IS NULL`.

**Triggery/func:**

- `set_timestamps()`;
- `ensure_required_fields_consistency()` — sprawdza, że `required_fields ⊆ fields.key`;
- `validate_attachments_urls()` — każdy element `attachments` przechodzi regex URL.

**Seed:** dwa globalne presety (`ui_bug`,`api_bug`) z `is_readonly=true`.

#### `drafts` _(opcjonalne w MVP)_

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `template_id uuid NULL FK → templates(id) ON DELETE SET NULL`
- `title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200)`
- `content jsonb NOT NULL` _(stan roboczy raportu/artefaktu)_
- `expires_at timestamptz NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Retencja:** job czyści przeterminowane szkice.

#### `charters`

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `goal text NOT NULL CHECK (length(goal) BETWEEN 1 AND 500)`
- `hypotheses text NULL`
- `summary_notes text NULL` _(skrót/markdown do exportu)_
- `status text NOT NULL CHECK (status IN ('active','closed'))`
- `started_at timestamptz NOT NULL DEFAULT now()`
- `ended_at timestamptz NULL`
- `version int NOT NULL DEFAULT 1` _(optimistic locking)_
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Walidacje:**

`CHECK ((status='active' AND ended_at IS NULL) OR (status='closed' AND ended_at IS NOT NULL AND ended_at>=started_at))`.

#### `charter_notes`

- `id uuid PK DEFAULT gen_random_uuid()`
- `charter_id uuid NOT NULL FK → charters(id) ON DELETE CASCADE`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `tag text NOT NULL CHECK (tag IN ('bug','idea','question','risk'))`
- `body text NOT NULL CHECK (length(body) <= 5000)`
- `noted_at timestamptz NOT NULL DEFAULT now()`

_(Tabela spełnia wymaganie tagowanych notatek w trakcie sesji)._

#### `kb_entries`

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200)`
- `url_original text NOT NULL`
- `url_canonical text NULL`
- `tags text[] NOT NULL DEFAULT '{}'`
- `search_vector tsvector NOT NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Ograniczenia/Triggery:**

- `UNIQUE (user_id, url_canonical) WHERE url_canonical IS NOT NULL`
- `canonicalize_url(url_original) → url_canonical` (BEFORE INSERT/UPDATE)
- `maintain_search_vector()` (title + powiązane notatki)

#### `kb_notes`

- `id uuid PK DEFAULT gen_random_uuid()`
- `entry_id uuid NOT NULL FK → kb_entries(id) ON DELETE CASCADE`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `body text NOT NULL CHECK (length(body) <= 5000)`
- `created_at timestamptz NOT NULL DEFAULT now()`

#### `ai_invocations`

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `action text NOT NULL CHECK (action IN ('improve','expand'))`
- `model text NULL`
- `tokens_prompt int NULL`
- `tokens_completion int NULL`
- `success boolean NOT NULL DEFAULT true`
- `error_code text NULL`
- `meta jsonb NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

#### `ai_daily_usage`

- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `day date NOT NULL`
- `used int NOT NULL DEFAULT 0`
- **PK:** `(user_id, day)`
- _(funkcja `can_invoke_ai(uid)` wykonuje UPSERT/przyrost w transakcji)_

#### `usage_events`

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `kind text NOT NULL CHECK (kind IN ('charter','generator','kb'))`
- `meta jsonb NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

**Retencja:** logiczna 90 dni (zadanie porządkujące).

### Relationships

- `profiles (1) — (N) templates` _(user-scoped)_; globalne szablony mają `owner_id=NULL`.
- `templates (N) — (1) templates` przez `origin_template_id` (fork).
- `profiles (1) — (N) drafts | charters | kb_entries | kb_notes | ai_invocations | ai_daily_usage | usage_events`.
- `charters (1) — (N) charter_notes` _(tagowane notatki sesji)_.
- `kb_entries (1) — (N) kb_notes` _(ON DELETE CASCADE)_.

**Kardynalności:**

- `profiles`→`charters`: 1:N, z częściowym `UNIQUE` zapewniającym jedną aktywną sesję na użytkownika.

### Indexes

**Wspólne listowanie/paginacja (keyset):**

- `templates`: BTREE `(owner_id, updated_at DESC, id DESC)` + dodatkowo `(preset, scope, updated_at DESC)`
- `charters`: BTREE `(user_id, updated_at DESC, id DESC)` + **partial unique** `UNIQUE (user_id) WHERE status='active'`
- `kb_entries`: BTREE `(user_id, updated_at DESC, id DESC)`; GIN `search_vector`; GIN-trgm na `title`; GIN na `tags`
- `kb_notes`: BTREE `(entry_id, created_at DESC)`
- `ai_daily_usage`: BTREE `(user_id, day)` **UNIQUE**
- `usage_events`: BTREE `(user_id, created_at DESC)` _(możliwość partycjonowania miesięcznego przy wzroście wolumenu)_

### RLS Policies

**Wymagane rozszerzenia i przygotowanie:**

- `pgcrypto` (dla `gen_random_uuid()`), `pg_trgm`, `unaccent` (opcjonalnie), `btree_gin`, `citext`.

**Funkcje pomocnicze (schemat `public`):**

- `is_admin(uid uuid) returns boolean` — `SECURITY DEFINER`, `STABLE`, z zawężonym `search_path`.

**Polityki (schematycznie, dla każdej tabeli z `user_id`):**

- `ENABLE RLS`

- `profiles`
  - `SELECT`: własny rekord `id = auth.uid()`; admin ma `USING (is_admin(auth.uid()))`.
  - `UPDATE`: tylko właściciel lub admin.

- `templates`
  - `SELECT`:
    - global: `scope='global'`
    - user-scoped: `owner_id = auth.uid()`
  - `INSERT/UPDATE/DELETE`:
    - global: tylko admin
    - user-scoped: tylko właściciel

- `drafts`, `charters`, `charter_notes`, `kb_entries`, `kb_notes`, `ai_invocations`, `ai_daily_usage`, `usage_events`
  - `SELECT/INSERT/UPDATE/DELETE`: `user_id = auth.uid()`; wyjątek: admin może `SELECT` wszystko.

**Widoki:**

- `templates_effective` — `SECURITY BARRIER`, łączy globalne i user-owned.

---

## UI Architecture

### Overview

QA Toolsmith to aplikacja webowa zbudowana w architekturze **SPA (Single Page Application)** z wykorzystaniem Astro 5, React 19, TypeScript 5 i Tailwind 4. Interfejs użytkownika realizuje wzorzec **role-based access control (RBAC)** z dwoma rolami: **admin** i **user**, stosując JWT z Supabase Auth do uwierzytelniania i autoryzacji.

Architektura UI opiera się na **modułowym podejściu** z wyraźnie wydzielonymi obszarami funkcjonalnymi:

- **Templates** – zarządzanie szablonami raportów defektów
- **Charters** – prowadzenie sesji eksploracyjnych z timerem
- **Knowledge Base** – baza wiedzy z wyszukiwaniem FTS
- **Generators** – generatory danych testowych
- **Profile** – profil użytkownika
- **Admin** – panel administracyjny (tylko dla roli admin)

### Key Concepts

1. **Mobile-first**: wszystkie widoki projektowane z priorytetem urządzeń mobilnych
2. **Minimal a11y baseline**: focus visible, labels dla pól formularzy, cele dotykowe ≥40px
3. **Offline-aware**: banner offline, retry queue dla idempotentnych operacji
4. **Optimistic UI**: natychmiastowe feedback dla częstych akcji (notatki, tagi)
5. **Spójne wzorce**: ujednolicone komponenty list, formularzy, błędów, ładowania

### State Management

- **TanStack Query** – cache zapytań API, mutacje, synchronizacja
- **Keyset pagination** – `?limit&after=cursor` dla stabilnej paginacji
- **URL-synced filters** – parametry filtrów i wyszukiwania w URL
- **localStorage** – autosave dla Charters (5s), historia generatorów (10 wpisów)

### Error Handling

| Kod HTTP | Obsługa UI                                                    |
| -------- | ------------------------------------------------------------- |
| 401      | Modal z re-login + zachowanie intencji użytkownika            |
| 403      | Banner informacyjny „Brak uprawnień"                          |
| 409      | Dialog rozwiązywania konfliktu (KB duplicate, active charter) |
| 422      | Inline errors w formularzach                                  |
| 429      | Banner z komunikatem o limicie i odliczaniem                  |
| 500      | Error boundary z opcją retry                                  |
| Offline  | Banner offline + kolejka retry dla GET                        |

### Views List

#### Public Views (no authentication)

- **Login** (`/login`): Formularz logowania z walidacją rate limiting
- **Register** (`/register`): Formularz rejestracji z walidacją siły hasła

#### Protected Views (authentication required)

- **Templates List** (`/templates`): Lista szablonów z filtrami, pagination, fork actions
- **Template Details** (`/templates/:id`): Szczegóły z conditional edit/fork/delete
- **Template Edit** (`/templates/:id/edit`): Formularz edycji z field builder
- **Template Create** (`/templates/new`): Nowe szablony z preset selection
- **Template Render** (`/templates/:id/render`): Wypełnianie i Markdown preview
- **Charters List** (`/charters`): Lista sesji z resume/new actions
- **Charter Create** (`/charters/new`): Formularz nowej sesji
- **Charter Run** (`/charters/:id/run`): Aktywna sesja z timerem i notatkami
- **Charter Details** (`/charters/:id`): Podgląd zakończonej sesji
- **Knowledge Base List** (`/kb`): Przeszukiwalna lista z tag filters
- **KB Entry Create** (`/kb/new`): Dodawanie z URL canonicalization
- **KB Entry Details** (`/kb/:id`): Szczegóły z notatkami i edit actions
- **Generators Hub** (`/generators`): Lista dostępnych generatorów
- **IBAN Generator** (`/generators/iban`): Generate/validate z history
- **Other Generators** (`/generators/:kind`): Generic generator interface
- **Profile** (`/profile`): Profil użytkownika z AI usage
- **Admin Templates** (`/admin/templates`): Zarządzanie global templates

### Navigation Structure

#### Main Navigation (Top-level)

Horizontal navbar (desktop) + Hamburger menu (mobile) z:
- Logo → `/templates`
- Nav items: Templates, Charters, Knowledge Base, Generators, Profile
- Admin conditional: Admin dropdown
- User menu: Avatar/email, Profile, Logout

#### Breadcrumbs

Contextual navigation:
- `/templates/:id` → Templates > [Nazwa szablonu]
- `/admin/templates/:id/edit` → Admin > Templates > [Nazwa] > Edit

#### FAB (Floating Action Button)

Mobile-first CTA:
- `/templates` → New Template
- `/charters` → New Charter
- `/kb` → Add Entry

### Key Components

#### UI Components (Shadcn/ui)

- **Button**: Variants (default/destructive/outline/ghost/link), sizes, loading state
- **Input**: Text/email/password/number, error state, labels
- **Textarea**: Multiline z auto-resize, char count
- **Select**: Dropdown dla country/preset/status
- **Checkbox/Radio**: Form controls
- **Badge**: Role/status/scope/tag badges
- **Card**: Container dla list items
- **Dialog**: Modal overlays, confirm dialogs
- **Alert**: Error/warning/success messages
- **Toast**: Success notifications (sonner)
- **Skeleton**: Loading placeholders
- **Tabs**: Mode switching (Generate/Validate)
- **Progress**: AI daily limit usage

#### Domain Components

- **AuthLayout**: Centered card dla auth pages
- **AppLayout**: Main layout z navbar/breadcrumbs/content
- **TemplateCard/CharterCard/KBCard**: Reusable list items
- **TemplateForm**: Dynamic form z field builder
- **RenderForm + MarkdownPreview**: Split view dla reports
- **Timer**: Countdown/countup z Start/Stop
- **NotesList + AddNoteForm**: Charter/KB notes management
- **SearchBar**: Debounced FTS search
- **TagsInput**: Multi-tag z autocomplete
- **Pagination**: Keyset pagination controls
- **EmptyState**: Placeholder gdy brak danych
- **ErrorBoundary**: Catch-all dla React errors
- **OfflineBanner**: Network status indicator
- **AIImproveButton + AIProposalDialog**: AI assistant integration
- **CopyButton**: Clipboard API wrapper
- **ExportButton**: Download Markdown/JSON
- **ForkDialog/DeleteConfirmDialog**: Specific action dialogs
- **AutosaveIndicator**: Save status feedback
- **ValidationErrors**: Form error display

#### Hooks

- **useAuth**: User profile, role, logout
- **useTemplates/useCharters/useKB**: TanStack Query hooks
- **usePagination**: Keyset pagination state
- **useDebounce**: Debounced search input
- **useLocalStorage**: Autosave, generator history
- **useNetworkStatus**: Online/offline detection
- **useKeyboardShortcuts**: Global shortcuts (Alt+N, Alt+T)

### Responsiveness & Accessibility

#### Breakpoints (Tailwind)
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (sm-lg)
- Desktop: ≥ 1024px (lg+)

#### Responsive Patterns
- **Navbar**: Hamburger (mobile), horizontal (desktop)
- **Lists**: Vertical stack (mobile), grid (desktop)
- **Filters**: Collapsible drawer (mobile), sidebar (desktop)
- **Forms**: Full-width (mobile), max-width centered (desktop)
- **Dialogs**: Bottom sheet (mobile), centered modal (desktop)

#### A11y Baseline
- Focus visible, labels present, touch targets ≥40px
- Semantic HTML, keyboard navigation, ARIA attributes
- Color contrast 4.5:1, alt text dla images

### Security & Error Handling

#### Authentication Flow
- JWT in memory (no localStorage), expiry handling → re-login modal
- Logout clears all client state

#### Authorization (RBAC)
- Role-based conditional rendering
- Route guards (403 redirect dla non-admin)
- Conditional buttons/actions

#### Input Sanitization
- Markdown rendering z DOMPurify
- URL validation, canonicalization
- No raw HTML injection

#### Error States
- 401: Modal re-login z intent preservation
- 403: Banner „Brak uprawnień"
- 409: Dialog z conflict resolution
- 422: Inline form errors
- 429: Banner z rate limit info
- 500: Error boundary z retry

---

## Technology Stack

### Frontend

- **Astro 5**: Fast, efficient pages and applications with minimal JavaScript
- **React 19**: Interactivity where needed
- **TypeScript 5**: Static typing for better IDE support
- **Tailwind 4**: Convenient styling
- **Shadcn/ui**: Library of accessible React components

### Backend

- **Supabase**: Complete backend solution providing:
  - PostgreSQL database
  - Multi-language SDKs as Backend-as-a-Service
  - Open-source, can be hosted locally or on own server
  - Built-in user authentication

### AI

- **OpenRouter.ai**: Communication with models through service:
  - Access to wide range of models (OpenAI, Anthropic, Google, and many others)
  - Allows setting financial limits on API keys

#### OpenRouter Service Architecture

**Purpose**: Provides AI-powered text improvement and expansion for defect reports, charters, and knowledge base entries.

**Core Features**:
- Multi-model support with automatic fallbacks (OpenAI, Anthropic, Google)
- Per-user daily usage limits and quota management
- Structured JSON responses with schema validation
- Comprehensive error handling and retry logic
- Rate limiting and circuit breaker patterns

**Integration Points**:
- **Database**: `ai_invocations`, `ai_daily_usage` tables for tracking and limits
- **Authentication**: User context for quota enforcement
- **Configuration**: Environment-based API key and model settings
- **Monitoring**: Health checks, usage metrics, error rates

### CI/CD and Hosting

- **GitHub Actions**: Creating CI/CD pipelines
- **DigitalOcean**: Hosting application via Docker image

### Testing

- **Vitest**: Unit testing framework, fast and Vite-compatible
  - 1,167 unit tests (34 test files)
  - Tests IBAN validator/generator, services, helpers, utility functions
- **Playwright**: E2E testing framework with multi-browser support
  - 10 E2E tests covering generators, navigation, authentication
  - Full diagnostics: traces, screenshots, videos (on failure)

---

## Testing Strategy

Multi-layer testing approach using Vitest for unit tests and Playwright for E2E/API tests:

| Test Type | Tool | Purpose | Location | Count |
|-----------|------|---------|----------|-------|
| **Unit Tests** | Vitest | Component logic, utilities, services | `src/__tests__/` | 1,167 tests (34 files) |
| **API Tests** | Playwright | Backend validation, contracts | `e2e/*.spec.ts` | Included in E2E |
| **E2E Tests** | Playwright | Full user workflows | `e2e/*.spec.ts` | 10 tests |
| **Contract Tests** | Vitest | DTO validation, snake_case | `src/__tests__/contracts/` | Included in unit |
| **RLS Tests** | Vitest | Database security policies | `src/__tests__/rls-*.test.ts` | Included in unit |
| **Smoke Tests** | Playwright | Post-deployment readiness | `e2e/*.spec.ts` | Included in E2E |
| **Property-Based Tests** | Vitest | IBAN validation edge cases | `src/__tests__/` | 1,000+ cases |

**Architecture**: Development uses local Supabase CLI, E2E tests use dedicated cloud Supabase project for isolation and reproducibility.

### Testing Principles

#### FIRST Principle
Tests should be **Fast**, **Independent**, **Repeatable**, **Self-validating**, and **Timely**.

#### Implementation Rules
- **No Sleeps**: Never use `sleep()`, `setTimeout()`, or arbitrary delays
- **No Global ESLint Disables**: Use targeted disables with justification only
- **No TypeScript Config Loosening**: Maintain same type safety as production code
- **Stable Selectors**: Use semantic selectors (`data-testid`, role, accessible names)
- **Test Isolation**: Each test runs in complete isolation with proper cleanup

### Unit Testing

**Framework**: Vitest (fast, Vite-native test runner)  
**Location**: `src/__tests__/`  
**Configuration**: `vitest.config.ts`

#### Best Practices

##### Test Doubles and Mocking
- **Leverage the `vi` object** - Use `vi.fn()` for function mocks, `vi.spyOn()` to monitor existing functions, and `vi.stubGlobal()` for global mocks
- **Prefer spies over mocks** when you only need to verify interactions without changing behavior
- **Master `vi.mock()` factory patterns** - Place mock factory functions at the top level of your test file, return typed mock implementations, and use `mockImplementation()` or `mockReturnValue()` for dynamic control during tests
- **Handle optional dependencies** with smart mocking - Use conditional mocking to test code with optional dependencies by implementing `vi.mock()` with the factory pattern for modules that might not be available in all environments

##### Test Structure and Organization
- **Create setup files** for reusable configuration - Define global mocks, custom matchers, and environment setup in dedicated files referenced in your `vitest.config.ts`
- **Structure tests for maintainability** - Group related tests with descriptive `describe` blocks, use explicit assertion messages, and follow the Arrange-Act-Assert pattern to make tests self-documenting
- **Configure jsdom for DOM testing** - Set `environment: 'jsdom'` in your configuration for frontend component tests and combine with testing-library utilities for realistic user interaction simulation

##### Assertions and Coverage
- **Use inline snapshots** for readable assertions - Replace complex equality checks with `expect(value).toMatchInlineSnapshot()` to capture expected output directly in your test file, making changes more visible in code reviews
- **Monitor coverage with purpose** - Configure coverage thresholds in `vitest.config.ts` to ensure critical code paths are tested, but focus on meaningful tests rather than arbitrary coverage percentages
- **Leverage TypeScript type checking** in tests - Enable strict typing in your tests to catch type errors early, use `expectTypeOf()` for type-level assertions, and ensure mocks preserve the original type signatures

##### Development Workflow
- **Make watch mode part of your workflow** - Run `vitest --watch` during development for instant feedback as you modify code, filtering tests with `-t` to focus on specific areas under development
- **Explore UI mode** for complex test suites - Use `vitest --ui` to visually navigate large test suites, inspect test results, and debug failures more efficiently during development

#### Specialized Test Patterns

##### Generate-and-Validate Pattern
Critical for IBAN generator testing - ensures generated values pass validation:

```typescript
describe('IBAN Generator Validation', () => {
  it('should generate valid IBANs that pass validation', () => {
    for (let i = 0; i < 100; i++) {
      const generated = generateIBAN('DE');
      const isValid = validateIBAN(generated);
      expect(isValid).toBe(true);
    }
  });
});
```

##### Property-Based Testing
Comprehensive edge case testing for IBAN validation (1,000+ test cases):

```typescript
describe('IBAN Property-Based Tests', () => {
  it('should validate all possible DE IBAN formats', () => {
    const testCases = generateIBANTestCases(1000, 'DE');
    testCases.forEach(testCase => {
      const result = validateIBAN(testCase.iban);
      expect(result).toBe(testCase.expected);
    });
  });
});
```

### API Testing

**Purpose**: Validate backend logic independent of UI using Playwright's `page.request`

#### IBAN Generator API
- **Endpoint**: `GET /api/generators/iban`
- **Parameters**: `country` (required: DE|AT|PL), `seed` (optional, max 64 chars)
- **Response**: `IbanGeneratorResponse` type
- **Public**: No authentication required

#### Golden Test Values
Deterministic generation with `seed=1234`:
- DE: `{"iban":"DE50185482443452538353","country":"DE","seed":"1234"}`
- AT: `{"iban":"AT471854824434525383","country":"AT","seed":"1234"}`

### E2E Testing

**Framework**: Playwright with Chromium/Desktop Chrome browser only  
**Architecture**: Cloud Supabase project for isolation and reproducibility  
**Configuration**: `playwright.config.ts` with diagnostic artifacts on failure only

#### Playwright Guidelines
- **Browser**: Initialize configuration only with Chromium/Desktop Chrome
- **Contexts**: Use browser contexts for isolating test environments
- **Selectors**: Use `data-testid` attributes for resilient test-oriented selectors
- **Locators**: `await page.getByTestId('selectorName')` for data-testid elements
- **API Testing**: Leverage API testing for backend validation
- **Visual Testing**: Implement visual comparison with `expect(page).toHaveScreenshot()`
- **Debugging**: Use codegen tool for test recording and trace viewer for debugging
- **Structure**: Follow 'Arrange', 'Act', 'Assert' approach for simplicity and readability

#### Cloud Supabase Setup
1. Create dedicated cloud project: `qa-toolsmith-e2e`
2. Configure `.env.test` with project credentials
3. Apply migrations: `supabase db push`
4. Create test user with auto-confirm enabled

### Smoke Testing

**Purpose**: Verify basic application readiness after deployment  
**Location**: `e2e/*.spec.ts` (integrated with E2E tests)  
**Trigger**: Post-deployment verification

#### Smoke Test Checklist
1. **Health Check**: `GET /api/health` returns 200
2. **Homepage Render**: Main page loads without errors
3. **Authentication**: Login/logout functionality works
4. **Basic CRUD**: At least one CRUD operation succeeds (Knowledge Base)

### Contract Testing

**Purpose**: Validate API responses conform to contracts (snake_case keys, TypeScript types)  
**Location**: `src/__tests__/contracts/dto-contracts.test.ts`

#### How It Works
- **Runtime Validation**: `validateSnakeCaseKeys()` validates all keys match snake_case pattern
- **Compile-Time Validation**: `expectTypeOf()` verifies fixture shapes match TypeScript types

### Page Object Model (POM)

**Purpose**: Encapsulate selectors and actions for maintainable tests  
**Location**: `e2e/pages/` (not `./e2e/page-objects`)

#### Naming Conventions
- **Locators**: `get*()` methods return `Locator`
- **Actions**: `do*()` methods perform user interactions
- **Verification**: `verify*()` methods assert expectations

#### Key Principles
1. **Single Responsibility**: Each page object handles ONE page only
2. **Encapsulation**: Hide implementation details; expose clean methods
3. **Stable Selectors**: Always use semantic selectors (`data-testid`, role, accessible names)
4. **Built-in Waiting**: Use Playwright's built-in waiting mechanisms; never use arbitrary sleeps

### Manual Testing

#### Prerequisites
- Node.js >=18.20.8
- Run `npm run dev` to start application at http://localhost:3000

#### Key Test Areas
1. **Generators Hub** (`/generators`): 9 generator cards, responsive layout
2. **IBAN Generator** (`/generators/iban`): Generate/validate modes, deterministic generation with seeds
3. **History**: Desktop sidebar, mobile collapsible, persistence across reloads
4. **Preferences**: Format, country, tab selection persistence
5. **Accessibility**: Keyboard navigation, focus management
6. **Responsive Design**: Mobile (375px), tablet (768px), desktop (1024px+)

### CI/CD Integration

**GitHub Actions**: Comprehensive testing pipeline on `push` to main/master branches
- **Pipeline Stages**: Lint → Build → Unit Tests → E2E Tests
- **Workers**: 1 (sequential, deterministic for E2E)
- **Artifacts**: HTML report, traces, videos (retained on failure only, 7 days)
- **Secrets Required**:
  - `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`
  - `OPENROUTER_API_KEY`
  - `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_USERNAME_ID`
- **Timeout**: 30 minutes for E2E tests
- **Browser**: Chromium only (matches local config)

### Debugging

#### Viewing Diagnostic Artifacts
```bash
npx playwright show-report              # HTML report with timeline
npx playwright show-trace test-results/<test-name>/trace.zip  # Detailed trace
```

#### Best Practices
✅ **DO**: Use `data-testid` selectors, Playwright's built-in waits, test locally before CI  
❌ **DON'T**: Use arbitrary `sleep()`, fragile selectors, disable ESLint globally
