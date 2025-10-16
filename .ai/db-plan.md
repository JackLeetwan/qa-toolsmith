# db-plan.md

## 1) Lista tabel (kolumny, typy, ograniczenia)

### 1.1 `profiles`

This table is managed by Supabase auth

- `id uuid PK` — = `auth.users.id`, `DEFAULT gen_random_uuid()`; `FK auth.users(id) ON DELETE CASCADE`.
- `email citext NOT NULL UNIQUE`
- `role text NOT NULL CHECK (role IN ('admin','user'))`
- `org_id uuid NULL` _(rezerwacja pod przyszły multi-tenant)_
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Triggery/func:** `AFTER INSERT ON auth.users` → insert do `profiles`; `set_timestamps()` dla `created_at/updated_at`.

---

### 1.2 `templates`

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

---

### 1.3 `drafts` _(opcjonalne w MVP)_

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `template_id uuid NULL FK → templates(id) ON DELETE SET NULL`
- `title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200)`
- `content jsonb NOT NULL` _(stan roboczy raportu/artefaktu)_
- `expires_at timestamptz NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

**Retencja:** job czyści przeterminowane szkice.

---

### 1.4 `charters`

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

---

### 1.5 `charter_notes`

- `id uuid PK DEFAULT gen_random_uuid()`
- `charter_id uuid NOT NULL FK → charters(id) ON DELETE CASCADE`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `tag text NOT NULL CHECK (tag IN ('bug','idea','question','risk'))`
- `body text NOT NULL CHECK (length(body) <= 5000)`
- `noted_at timestamptz NOT NULL DEFAULT now()`

_(Tabela spełnia wymaganie tagowanych notatek w trakcie sesji)._

---

### 1.6 `kb_entries`

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

---

### 1.7 `kb_notes`

- `id uuid PK DEFAULT gen_random_uuid()`
- `entry_id uuid NOT NULL FK → kb_entries(id) ON DELETE CASCADE`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `body text NOT NULL CHECK (length(body) <= 5000)`
- `created_at timestamptz NOT NULL DEFAULT now()`

---

### 1.8 `ai_invocations`

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

---

### 1.9 `ai_daily_usage`

- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `day date NOT NULL`
- `used int NOT NULL DEFAULT 0`
- **PK:** `(user_id, day)`
- _(funkcja `can_invoke_ai(uid)` wykonuje UPSERT/przyrost w transakcji)_

---

### 1.10 `usage_events`

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL FK → profiles(id) ON DELETE CASCADE`
- `kind text NOT NULL CHECK (kind IN ('charter','generator','kb'))`
- `meta jsonb NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

**Retencja:** logiczna 90 dni (zadanie porządkujące).

## 2) Relacje między tabelami

- `profiles (1) — (N) templates` _(user-scoped)_; globalne szablony mają `owner_id=NULL`.
- `templates (N) — (1) templates` przez `origin_template_id` (fork).
- `profiles (1) — (N) drafts | charters | kb_entries | kb_notes | ai_invocations | ai_daily_usage | usage_events`.
- `charters (1) — (N) charter_notes` _(tagowane notatki sesji)_.
- `kb_entries (1) — (N) kb_notes` _(ON DELETE CASCADE)_.

**Kardynalności:**

- `profiles`→`charters`: 1:N, z częściowym `UNIQUE` zapewniającym jedną aktywną sesję na użytkownika.

## 3) Indeksy

**Wspólne listowanie/paginacja (keyset):**

- `templates`: BTREE `(owner_id, updated_at DESC, id DESC)` + dodatkowo `(preset, scope, updated_at DESC)`
- `charters`: BTREE `(user_id, updated_at DESC, id DESC)` + **partial unique** `UNIQUE (user_id) WHERE status='active'`
- `kb_entries`: BTREE `(user_id, updated_at DESC, id DESC)`; GIN `search_vector`; GIN-trgm na `title`; GIN na `tags`
- `kb_notes`: BTREE `(entry_id, created_at DESC)`
- `ai_daily_usage`: BTREE `(user_id, day)` **UNIQUE**
- `usage_events`: BTREE `(user_id, created_at DESC)` _(możliwość partycjonowania miesięcznego przy wzroście wolumenu)_

## 4) Zasady PostgreSQL (RLS)

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
- `admin_stats_*` — `SECURITY DEFINER`, tylko `SELECT`.

## 5) Dodatkowe uwagi i decyzje projektowe

- UUID + `timestamptz` (UTC) konsekwentnie.
- Wspólny trigger `set_timestamps()` na `created_at/updated_at`.
- Brak trwałych „instancji raportów” w MVP – generacja Markdown w aplikacji.
- Walidacja `attachments` na DB + w aplikacji.
- Knowledge Base: kanonikalizacja i deduplikacja URL, pełnotekstowe wyszukiwanie (GIN), filtrowanie po tagach, notatki 1:N.
- Exploration Charter: tagowanie (`bug|idea|question|risk`) – `charter_notes`.
- Limity: tytuły ≤200 znaków, notatki ≤5000, tagi do 8 sztuk, każdy 1–24 znaków.
- Telemetria: `usage_events`, retencja 90 dni, możliwe partycjonowanie.
- Tech-stack: Supabase (PostgreSQL + Auth) – schemat i RLS zgodnie z wyborem.
