# Endpoint Implementation Plans

This document consolidates implementation plans for all API endpoints in the QA Toolsmith MVP.

## Table of Contents

1. [GET `/generators/iban`](#get-generatorsiban)
2. [GET `/templates`](#get-templates)
3. [GET `/health`](#get-health)
4. [PATCH `/profiles/me`](#patch-profilesme)
5. [GET `/profiles/me`](#get-profilesme)

---

## GET `/generators/iban`

### 1. Przegląd punktu końcowego

Generator zwraca syntaktycznie poprawny (checksum-valid) numer IBAN dla wybranego kraju (`DE` lub `AT`). Opcjonalny `seed` umożliwia deterministyczną generację (ten sam `seed` ⇒ ten sam IBAN). Brak zapisu do bazy; opcjonalnie rejestrujemy zdarzenie użycia.

### 2. Szczegóły żądania

- Metoda HTTP: GET
- URL: `/generators/iban`
- Parametry zapytania:
  - **Wymagane**
    - `country`: `DE` | `AT`
  - **Opcjonalne**
    - `seed`: `string` — maks. 64 znaki; dopuszczalne `[A-Za-z0-9._-]`. Brak `seed` ⇒ losowy IBAN.
- Request Body: brak

### Walidacja wejścia (Zod)

```ts
const QuerySchema = z.object({
  country: z.enum(["DE", "AT"]),
  seed: z
    .string()
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/)
    .optional(),
});
```

### 3. Wykorzystywane typy

Minimalne DTO w `src/types.ts` (lub dopisane do istniejących):

```ts
export type IbanCountry = "DE" | "AT";
export interface IbanGenerateQuery {
  country: IbanCountry;
  seed?: string;
}
export interface IbanGenerateResponse {
  iban: string;
  country: IbanCountry;
  seed?: string;
}
```

### 4. Szczegóły odpowiedzi

- **200 OK**

```json
{ "iban": "string", "country": "DE|AT", "seed": "optional" }
```

- **400 Bad Request** — nieprawidłowy `country` lub `seed`.
- **401 Unauthorized** — jeżeli endpoint będzie za ochroną (opcjonalnie).
- **500 Internal Server Error** — błąd niespodziewany podczas generacji.

### 5. Przepływ danych

1. Klient → **Astro Server Endpoint** `src/pages/api/generators/iban.ts` (SSR; `export const prerender = false`).
2. Walidacja query (Zod) → normalizacja `seed`.
3. **IbanService.generate(country, seed?)** (czysta funkcja) → buduje BBAN, liczy cyfrę kontrolną mod‑97, składa IBAN.
4. (Opcjonalnie) zapis do `usage_events` przez Supabase (`kind='generator'`, `meta={ name:'iban', country, seedProvided }`) używając `locals.supabase` (zgodnie z `backend.mdc`).
5. Odpowiedź 200 + nagłówki cache (patrz niżej).

### Logika serwisu (deterministyczna)

- Hash `seed` → 32‑bit FNV‑1a.
- PRNG SplitMix32 z ziarna hash.
- **DE**: BLZ=8 cyfr, konto=10 cyfr → BBAN=18 cyfr.
- **AT**: BLZ=5 cyfr, konto=11 cyfr → BBAN=16 cyfr.
- Cyfry kontrolne: standard IBAN (przeniesienie `country` + `00` na koniec, transliteracja A=10..Z=35, `check=98 - (N mod 97)`).
- Wynik: `CC{check}{BBAN}` z długością 22 (DE) / 20 (AT).

### Przykłady testowe („golden values")

- `GET /generators/iban?country=DE&seed=1234` → `DE50185482443452538353`
- `GET /generators/iban?country=AT&seed=1234` → `AT471854824434525383`

### 6. Względy bezpieczeństwa

- **Walidacja wejścia** (Zod) i limity długości.
- **Rate‑limit** w middleware (np. prosty token bucket w pamięci/Redis); komunikat 400 (wg dozwolonych kodów) z kodem aplikacyjnym `rate_limited`.
- **Brak danych wrażliwych** — nie logować pełnych IBAN‑ów na poziomie INFO w produkcji; wystarczy hash/ostatnie 4 cyfry.
- **CORS**: domyślnie konserwatywny; tylko nasz origin.
- **Deterministyczność**: `seed` nie ma znaczenia kryptograficznego; nie używać w kontekstach bezpieczeństwa.

### 7. Obsługa błędów

- 400: brak/nieprawidłowy `country`, nieprawidłowy `seed` (regex/limit).
- 401: brak autoryzacji (jeśli endpoint chroniony).
- 500: wyjątek w serwisie (np. niepowodzenie obliczeń).
- W odpowiedzi JSON zwracamy spójny envelope błędu:

```json
{
  "error": {
    "code": "invalid_country",
    "message": "country must be 'DE' or 'AT'"
  }
}
```

- (Opcjonalnie) rejestracja do `usage_events` z `meta.error_code`.

### 8. Rozważania dotyczące wydajności

- O(1) bez I/O — praktycznie natychmiastowe.
- **Cache**:
  - Gdy `seed` podany → `Cache-Control: public, max-age=31536000, immutable`.
  - Gdy `seed` brak → `Cache-Control: no-store`.
- **ETag** dla odpowiedzi deterministycznych (z `seed`).

### 9. Etapy wdrożenia

1. **Typy & schematy**

- Dodać `IbanCountry`, `IbanGenerateQuery`, `IbanGenerateResponse` do `src/types.ts`.
- Utworzyć `QuerySchema` (Zod) w pliku endpointu.

2. **Utils**

- `src/lib/utils/number.ts`: FNV‑1a (32‑bit), SplitMix32.
- `src/lib/utils/iban.ts`: `toIbanCheckDigits(country, bban)`, `padDigits(len, n)`.

3. **Serwis**

- `src/lib/services/iban.service.ts`:

```ts
export function generate(country: "DE" | "AT", seed?: string): string {
  const z = seed ?? crypto.randomUUID();
  const hash = fnv1a32(z);
  const rng = splitmix32(hash);
  const spec = country === "DE" ? { blz: 8, acct: 10 } : { blz: 5, acct: 11 };
  const blz = takeDigits(rng, spec.blz);
  const acct = takeDigits(rng, spec.acct);
  const bban = blz + acct;
  const check = toIbanCheckDigits(country, bban);
  return `${country}${check}${bban}`;
}
```

4. **Endpoint (Astro)**

- `src/pages/api/generators/iban.ts`:
  - `export const prerender = false;`
  - Parsowanie query → `QuerySchema.parse(...)`.
  - Wywołanie serwisu → payload `{ iban, country, seed? }`.
  - Nagłówki cache wg zasad.
  - Zgodnie z `backend.mdc`: korzystać z `locals.supabase` jeżeli logujemy użycie.

5. **Middleware**

- (Opcjonalnie) `src/middleware/rateLimit.ts` + rejestr w `src/middleware/index.ts` dla `/api/generators/*`.

6. **Telemetry**

- `usage_events` insert (opcjonalnie):

```ts
await locals.supabase.from("usage_events").insert({
  user_id: userId ?? null,
  kind: "generator",
  meta: { name: "iban", country, seedProvided: Boolean(seed) },
});
```

7. **Testy**

- **Unit**: algorytm checksumy, długości, dopuszczalne znaki `seed`.
- **Golden tests**: przypadki z sekcji przykładów.
- **E2E (Playwright)**: `GET /generators/iban?country=DE` (status 200, kształt odpowiedzi), `GET ...?country=XX` (400).

8. **Dokumentacja**

- Opisać endpoint w OpenAPI (YAML) i w README sekcji API.

9. **Release**

- CI: lint, test, build.
- Deploy: DigitalOcean (docker image) zgodnie z `tech-stack.md`.
- Monitoring: podstawowe logi + alert dla skoków błędów 400/500.

### 10. Przykładowa implementacja błędów (TS)

```ts
function badRequest(code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}
```

---

## GET `/templates`

### 1. Przegląd punktu końcowego

Zwraca „efektywną" listę szablonów widocznych dla zalogowanego użytkownika: **globalne** (`scope='global'`) oraz **własne** użytkownika (`scope='user' AND owner_id=current_user`). Globalny szablon może być **nadpisany** przez użytkownika forkiem (po `origin_template_id`) lub przez szablon o tej samej nazwie – w „efektywnej" liście pokażemy tylko wariant użytkownika.

Zgodny ze stackiem: **Astro (API route)** ↔ **Supabase (PostgREST / RPC)** z **RLS**.

**JSON API Convention:** All responses use **snake_case** (REST standard).

### 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **URL:** `/templates`
- **Parametry zapytania (opcjonalne):**
  - `limit` — int ∈ [1,100], domyślnie 20 (twardy limit 100).
  - `after` — base64 dla pary `(updated_at,id)` do keyset pagination, np. `base64("2025-10-11T12:34:56.789Z|b3f9…-uuid")`.
  - `preset` — `ui_bug|api_bug` (filtr po predefiniowanych presetach lub brak filtra).
- **Nagłówki:**
  - `Authorization: Bearer <JWT>` (Supabase Auth)
  - `Accept: application/json`

### 3. Wykorzystywane typy

- **TemplateListItemDTO** (z `types.ts` — keyset page item)

  ```ts
  export type TemplateListItemDTO = Omit<
    TemplateEffectiveRow,
    | "fields"
    | "scope"
    | "preset"
    | "required_fields"
    | "is_readonly"
    | "origin_template_id"
  > & {
    fields: TemplateField[] | null;
    scope: TemplateScope | null;
    preset: TemplatePreset | null;
    required_fields: string[];
    is_readonly: boolean;
    origin_template_id: UUID | null;
  };
  ```

- **TemplateListResponse** (z `types.ts`)

  ```ts
  export type TemplateListResponse = KeysetPage<TemplateListItemDTO>;

  export interface KeysetPage<T> {
    items: T[];
    next_cursor?: string; // base64(updated_at|id)
  }
  ```

### 4. Szczegóły odpowiedzi

- **200 OK**
  - `application/json` → `TemplateListResponse`
  - **Pola zwracane w snake_case** (JSON REST convention)
  - Przykład (skrócony):
    ```json
    {
      "items": [
        {
          "id": "7f8…",
          "name": "UI bug",
          "scope": "global",
          "owner_id": null,
          "preset": "ui_bug",
          "fields": [{ "key": "steps", "type": "text", "label": "Steps" }],
          "required_fields": ["title", "steps"],
          "attachments": [],
          "origin_template_id": null,
          "is_readonly": true,
          "version": 1,
          "created_at": "2025-10-10T09:10:11Z",
          "updated_at": "2025-10-10T09:10:11Z"
        }
      ],
      "next_cursor": "YmFzZTY0…"
    }
    ```
- **401 Unauthorized** — brak/nieprawidłowy JWT.
- **400 Bad Request** — nieprawidłowy `limit`/`after`/`preset`.
- **500 Internal Server Error** — błąd serwera/bazy.

### 5. Przepływ danych

1. **Auth**: Astro API route weryfikuje JWT (Supabase client) i pozyskuje `userId` = `auth.uid()`.
2. **Źródło danych**: zapytanie do Supabase:
   - **Preferowane:** widok lub funkcja `templates_effective` z RLS, eliminująca globalne rekordy nadpisane przez użytkownika.
   - Widok SQL:
     ```sql
     CREATE OR REPLACE VIEW public.templates_effective AS
     SELECT u.*
     FROM public.templates u
     WHERE u.scope = 'user' AND u.owner_id = auth.uid()
     UNION ALL
     SELECT g.*
     FROM public.templates g
     WHERE g.scope = 'global'
       AND NOT EXISTS (
         SELECT 1 FROM public.templates u
         WHERE u.scope = 'user'
           AND u.owner_id = auth.uid()
           AND (u.origin_template_id = g.id OR lower(u.name) = lower(g.name))
       );
     ```
3. **Keyset pagination**: jeżeli `after` podany → dekoduj base64 → `WHERE (updated_at, id) < (:cursor_updated_at, :cursor_id)`.
4. **Filtry**: opcjonalnie `preset=ui_bug|api_bug`.
5. **Sortowanie**: `ORDER BY updated_at DESC, id DESC` (spójne z indeksem).
6. **Mapowanie**: rekordy → `TemplateListItemDTO` (snake_case w JSON).
7. **Odpowiedź**: pobierz `limit+1` elementów; jeśli więcej niż `limit` → `next_cursor` z ostatniego rekordu.

**Indeksy (wg planu DB):**

```sql
CREATE INDEX IF NOT EXISTS idx_templates_owner_updated_id
  ON public.templates(owner_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_templates_scope_preset_updated
  ON public.templates(preset, scope, updated_at DESC, id DESC);
```

**RLS (jeżeli czytamy bezpośrednio z `templates`):**

```sql
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_templates_self_or_global ON public.templates
FOR SELECT USING (scope = 'global' OR owner_id = auth.uid());
```

### 6. Względy bezpieczeństwa

- **Autoryzacja**: RLS gwarantuje, że użytkownik zobaczy tylko globalne lub własne rekordy.
- **IDOR**: brak dostępu do cudzych `user` szablonów dzięki RLS.
- **Walidacja wejścia**: `limit` (≤100), `after` musi dekodować się do `(timestamp, uuid)` i przechodzić regexy.
- **Cache**: odpowiedź per-user → `Cache-Control: private, max-age=60`; opcjonalnie `ETag` z `hash(userId:lastUpdatedPair)`.
- **Zgodność z politykami URL w DB**: nie przyjmujemy/nie zapisujemy URL – tylko odczyt, więc ryzyko XSS minimalne; escapowanie po stronie UI.
- **DoS**: twardy limit i proste filtry, brak `OFFSET`.

### 7. Obsługa błędów

- **Format błędów API (spójny w projekcie):**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "invalid limit",
      "details": { "limit": "…" }
    }
  }
  ```
- **Mapowanie:**
  - Walidacja parametrów → `400`.
  - Brak/expired JWT → `401`.
  - Błąd Supabase/SQL → `500` (maskuj szczegóły, loguj pełny stack po stronie serwera).
- **Logowanie:** `level=info`, `requestId`, `userId`, `endpoint`, `params`, `duration_ms`.

### 8. Rozważania dotyczące wydajności

- **Keyset > OFFSET** dla skalowalności; indeksy z `updated_at DESC, id DESC`.
- **N+1** nie występuje (pojedyncze źródło).
- **Rozmiar payloadu**: pola zawsze present (nie opcjonalne filtry w MVP).
- **CDN**: niezalecany dla per-user danych; krótkie `max-age` prywatne wystarczą.
- **Plan zapytań**: monitorować `EXPLAIN ANALYZE` przy rosnącej liczbie rekordów.

### 9. Etapy wdrożenia

1. **DB**: utwórz/zmodyfikuj widok `templates_effective` (jak wyżej) i dopnij indeksy.
   - [ ] Sprawdź czy widok już istnieje w schemacie
   - [ ] Jeśli nie → dodaj SQL migrację z view + indeksami
2. **RLS**: upewnij się, że polityka `read_templates_self_or_global` jest aktywna; testy RLS (global, self, cudzy → deny).
3. **Backend (Astro API route: `src/pages/api/templates/index.ts`)**:
   - [ ] Walidacja query (Zod): `limit` (1–100), `after` (base64-valid).
   - [ ] Dekodowanie kursora: `after` → `(updated_at, id)`.
   - [ ] Budowa zapytania (service) z keyset i filtrami.
   - [ ] Mapowanie do `TemplateListItemDTO` (snake_case!).
   - [ ] Złożenie `TemplateListResponse` z `next_cursor`.
4. **Observability**: request timing, `requestId`, strukturalne logi (JSON).
5. **Testy**:
   - **Unit**: walidacja parametrów, dekoder/enkoder kursora, sort/keyset, filtr `preset`.
   - **RLS**: testy integracyjne — użytkownik A nie widzi `user` B.
   - **E2E**: happy path (bez kursora / z kursorem), override (user fork ukrywa global), filtr `preset`.
6. **Dokumentacja**: OpenAPI/MDX dla `GET /templates` (parametry, odpowiedzi, kody błędów).
7. **Release**: CI (lint, testy, migracje, deploy), monitoring keyset performance.

### 10. Snake_case Convention (MVP Decision)

**JSON API zwraca snake_case** (REST standard):

- DB: `owner_id`, `required_fields`, `origin_template_id`, `is_readonly`, `created_at`, `updated_at` ✅
- JSON response: `owner_id`, `required_fields`, `origin_template_id`, `is_readonly`, `created_at`, `updated_at` ✅
- TypeScript DTOs: snake_case w `types.ts` ✅
- Frontend (React): konwersi snake_case → camelCase w komponentach (np. via lib/camelCase.ts)

**Brak transformacji na API boundary** — wszystko snake_case end-to-end.

---

## GET `/health`

### 1. Endpoint Overview

The GET `/health` endpoint serves as a simple application health check mechanism, providing information about system availability and readiness. It is required by the PRD (Product Requirements Document) for basic functionality tests (smoke checks).

### 2. Request Details

- HTTP Method: GET
- URL Structure: `/health`
- Parameters: None
- Headers: Standard HTTP headers
- Request Body: None (GET endpoint)

### 3. Types Used

```typescript
export interface HealthDTO {
  status: "ok";
}
```

This type is already defined in the `src/types/types.ts` file.

### 4. Response Details

- Status Code: 200 OK for successful response
- Content-Type: application/json
- Response Body:

```json
{
  "status": "ok"
}
```

### 5. Data Flow

1. Application receives a GET request to the `/health` endpoint
2. System checks basic application readiness
3. System returns a response with status code 200 and JSON `{ "status": "ok" }`

This endpoint does not require database access or interaction with external services.

### 6. Security Considerations

- **Authentication**: The endpoint should be publicly available without authentication to enable monitoring by external systems (e.g., Kubernetes, load balancers)
- **Authorization**: Not required
- **Data Validation**: Not applicable (no input data)
- **Rate Limiting**: Basic request rate limiting can be considered, but the endpoint should handle frequent queries from monitoring systems

### 7. Error Handling

- 500 Internal Server Error - in case of internal application issues
  ```json
  {
    "error": {
      "code": "internal_server_error",
      "message": "An unexpected server error occurred"
    }
  }
  ```

### 8. Performance Considerations

- Endpoint should be fast and lightweight, with minimal system load
- Additional operations that could delay the response should be avoided
- A caching mechanism for frequent queries can be considered (e.g., with TTL = 5s)

### 9. Implementation Steps

1. Create file `/src/pages/api/health.ts` with the endpoint implementation:

```typescript
import type { APIRoute } from "astro";
import type { HealthDTO } from "../../types/types";

export const prerender = false;

export const GET: APIRoute = async () => {
  // Simple implementation without additional checks
  const health: HealthDTO = { status: "ok" };

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
```

2. Create health service (optional) in `/src/lib/services/health.service.ts`:

```typescript
import type { HealthDTO } from "../../types/types";

export class HealthService {
  /**
   * Checks application health status
   * @returns Application health status
   */
  static getHealth(): HealthDTO {
    // More complex checks can be added in the future
    return { status: "ok" };
  }
}
```

3. Update endpoint to use the service (optional):

```typescript
import type { APIRoute } from "astro";
import { HealthService } from "../../lib/services/health.service";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const health = HealthService.getHealth();

    return new Response(JSON.stringify(health), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "internal_server_error",
          message: "An unexpected server error occurred",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
```

4. Add documentation for the endpoint in README or other appropriate location

5. Add health check to CI/CD configuration and development environments

6. Implement monitoring (optional) - set up alerts for when the `/health` endpoint starts returning errors

---

## PATCH `/profiles/me`

### 1. Przegląd punktu końcowego

Aktualizacja własnego profilu zalogowanego użytkownika w zakresie **nieuprzywilejowanych pól** (bez zmiany `role`). W tym MVP dopuszczamy inicjację **zmiany adresu e‑mail** (przy zachowaniu mechanizmu weryfikacji e‑mail w Supabase). Odczyt zaktualizowanego profilu zwracamy w odpowiedzi, jeśli zmiana nie wymaga potwierdzenia; w przeciwnym razie zwracamy status „pending verification" (202 Accepted).

**MVP Scope:** Only email changes; rate-limit via middleware per IP+userId.

### 2. Szczegóły żądania

- **Metoda HTTP:** `PATCH`
- **URL:** `/profiles/me`
- **Nagłówki:**
  - `Authorization: Bearer <JWT>` (token użytkownika z Supabase; RLS aktywne)
  - `Content-Type: application/json`
- **Parametry URL:** brak
- **Request Body (JSON):**

  ```jsonc
  {
    // wszystkie pola opcjonalne; tylko nieuprzywilejowane
    "email": "user@example.com", // opcjonalnie; zmiana wymaga potwierdzenia
  }
  ```

  **Zabronione pola:** `role`, `org_id`, `created_at`, `updated_at`, `id`.

- **Walidacja wejścia:**
  - `email` (jeśli podano): normalizacja `trim().toLowerCase()`, RFC5322-lite, długość ≤ 254.
  - brak „unknown fields" – odrzuć każde pole spoza whitelisty.
  - jeżeli body puste → `400 Bad Request` (brak zmian).

### 3. Wykorzystywane typy

- **DTO** (z `types.ts`)

  ```ts
  export type ProfileDTO = Pick<
    ProfileRow,
    "id" | "email" | "created_at" | "updated_at"
  > & {
    role: Role;
  };
  ```

- **Command model** (z `types.ts`)

  ```ts
  export type UpdateMyProfileCommand = Partial<Pick<ProfileRow, "email">>;
  ```

- **Response for pending verification** (z `types.ts`)
  ```ts
  export interface PendingVerificationResponse {
    status: "pending_verification";
    message: string;
  }
  ```

### 4. Szczegóły odpowiedzi

- **200 OK** – zmiana wykonana (nie wymagająca potwierdzenia email):

  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-10-14T19:00:00.000Z",
    "updated_at": "2025-10-14T19:05:12.000Z"
  }
  ```

- **202 Accepted** – inicjacja zmiany e‑mail, wymagane potwierdzenie przez link w emailu:

  ```json
  {
    "status": "pending_verification",
    "message": "Verification email sent to user@example.com"
  }
  ```

- **Błędy (format spójny z ErrorResponse):**

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid email",
      "details": { "email": "must be a valid address" }
    }
  }
  ```

  - `400` invalid payload / unknown field / puste body
  - `401` brak JWT / wygasła sesja
  - `403` próba modyfikacji pól uprzywilejowanych
  - `409` konflikt unikalności e‑mail / e‑mail zajęty
  - `429` rate-limited (zbyt wiele prób zmiany email w krótkim czasie)
  - `500` błąd serwera

### 5. Przepływ danych

1. **Auth**: Middleware weryfikuje `Authorization: Bearer <JWT>` i pobiera `userId = auth.uid()`.
2. **Rate-limit check**: Middleware sprawdza limit (5–10 prób/15min per IP+userId) → 429 jeśli exceeded.
3. **Walidacja**: JSON → `UpdateMyProfileCommand`; odrzuć nieznane pola; waliduj `email`.
4. **Ścieżka bez zmiany**: jeśli brak pól lub wartości nie różnią się od obecnych → 200 z aktualnym `ProfileDTO`.
5. **Zmiana e‑mail**:
   - Wywołaj **Supabase Auth**: `supabase.auth.updateUser({ email })` z **tokenem użytkownika**.
   - Supabase **automatycznie wysyła mail potwierdzający** (konfiguracja Supabase Auth).
   - Profil email zmieni się **asynchronicznie** gdy użytkownik kliknie link w emailu (trigger DB lub webhook obsługują sync).
   - **Zwróć 202** z `PendingVerificationResponse` oznaczając oczekiwanie na weryfikację.
6. **Synchronizacja e‑mail (DB trigger):**
   - Trigger `AFTER UPDATE OF email ON auth.users` → `UPDATE profiles SET email = NEW.email WHERE id = NEW.id;`
   - Lub webhook Supabase "user.updated" → endpoint synchronizujący.
7. **Zwróć odpowiedź:** 202 (pending) lub 200 (jeśli brak zmiany).

### 6. Względy bezpieczeństwa

- **RLS (Row‑Level Security) na `profiles`:**
  - `SELECT`/`UPDATE` tylko gdy `id = auth.uid()`.
  - Trigger lub middleware blokują zmianę `role`, `org_id`, `created_at`, `updated_at`.
- **Autoryzacja negatywna**: ignoruj/odrzucaj nieznane pola (ochrona przed mass‑assignment).
- **Rate limiting**: ~5–10 prób zmiany e‑mail / 15 min / IP + userId; odpowiedź `429` gdy przekroczono.
  - **Implementacja:** middleware z memory/Redis, klucz: `rl:profile_update:{userId}:{ip}`
- **Audyt**: log zdarzeń bezpieczeństwa (`email_change_requested`, `email_change_failed`) do logów aplikacyjnych z korelacją `requestId`.
- **Transport**: wymuś HTTPS, HSTS.
- **Walidacja danych**: canonicalization e‑mail (lowercase), ogranicz długości; sanity‑check nagłówków.

### 7. Obsługa błędów (mapowanie)

| Sytuacja                        | HTTP | `error.code`       | Uwagi                   |
| ------------------------------- | ---: | ------------------ | ----------------------- |
| Brak/niepoprawny JWT            |  401 | `UNAUTHENTICATED`  | Nie ujawniaj szczegółów |
| Puste body / same nieznane pola |  400 | `NO_CHANGES`       |                         |
| Próba zmiany pól zabronionych   |  403 | `FORBIDDEN_FIELD`  |                         |
| Zły format e‑mail               |  400 | `VALIDATION_ERROR` | details.email           |
| E‑mail zajęty (Auth)            |  409 | `EMAIL_TAKEN`      |                         |
| Przekroczony rate-limit         |  429 | `RATE_LIMITED`     | Retry‑After header      |
| Błąd transakcji / triggera      |  500 | `INTERNAL`         |                         |

**Logowanie:** ustrukturyzowane logi (JSON) z polami: `ts`, `requestId`, `userId`, `path`, `error.code`, `http_status`. (Brak dedykowanej tabeli — na razie stdout/stderr.)

### 8. Rozważania dotyczące wydajności

- Operacja jednostkowa – brak gorących ścieżek.
- **Indeksy/ograniczenia:** `profiles.email` już `UNIQUE (citext)` – kolizje obsługiwane na poziomie Auth + DB constraint.
- **Zasoby zewnętrzne:** połączenie do Supabase Auth – timeout (np. 5s) i retry z backoff przy `5xx`.
- **Synchronizacja email:** trigger DB jest O(1), webhook może mieć opóźnienie (ok dla MVP).

### 9. Etapy wdrożenia

1. **DB (Migrations)**
   - ✅ RLS na `profiles` (`USING/WITH CHECK id = auth.uid()`) — już powinno być
   - ✅ Trigger `AFTER UPDATE OF email ON auth.users` → sync do `profiles.email`:

     ```sql
     CREATE OR REPLACE FUNCTION public.sync_auth_email_to_profile()
     RETURNS TRIGGER AS $$
     BEGIN
       UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;

     DROP TRIGGER IF EXISTS sync_email_on_auth_user_update ON auth.users;
     CREATE TRIGGER sync_email_on_auth_user_update
     AFTER UPDATE OF email ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.sync_email_to_profile();
     ```

2. **Backend (Astro API route: `src/pages/api/profiles/me.ts`)**
   - [ ] Middleware auth: ekstrakcja JWT → `userId` + `ip`.
   - [ ] Middleware rate-limit: sprawdzenie `rl:profile_update:{userId}:{ip}` (5–10/15min).
   - [ ] Schemat walidacji (Zod): `UpdateMyProfileCommand` (whitelist, email validation).
   - [ ] `ProfilesService.updateMe(userId, cmd)`:
     - [ ] Short‑circuit gdy brak zmian → 200 z aktualnym ProfileDTO.
     - [ ] Wywołanie `supabase.auth.updateUser({ email })` (token użytkownika).
     - [ ] Mapowanie rezultatów:
       - Jeśli `user_confirmed_at` zmienił się lub `email` zmienił się → email verification sent
       - Zwróć **202** z `PendingVerificationResponse` (email pending).
     - [ ] Jeśli brak potwierdzenia wymagane → 200 z ProfileDTO (rzadkie).
   - [ ] Error mapping: Postgresa `23505` (unique violation) → `409`, walidacja → `400`, auth errors → `401`.

3. **Konfiguracja**
   - [ ] W Supabase Auth Panel: włącz "Email change requires confirmation" (domyślnie on).
   - [ ] ENV: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (dla user), timeout 5s.

4. **Middleware (Astro)**
   - [ ] Rate-limiter: `src/lib/middleware/rate-limit.ts`
     - Klucz: `rl:profile_update:{userId}:{ip}`
     - Okno: 15 minut
     - Limit: 10 prób (customizable)

5. **Testy**
   - [ ] Unit: walidacja command, mapowanie błędów, rate-limit logic.
   - [ ] Integracyjne (lokalny Supabase):
     - Happy path: zmiana email → 202 pending
     - No-op (same pola): 200 z ProfileDTO
     - Unknown field: 400 NO_CHANGES
     - Rate-limit exceeded: 429 RATE_LIMITED
     - Email unique violation: 409 EMAIL_TAKEN
     - Brak JWT: 401 UNAUTHENTICATED
   - [ ] E2E (Playwright): złóż zapytanie PATCH, sprawdź 202, kliknij link w emailu (ręcznie lub mock), sprawdź email się zmienił.

6. **Observability**
   - [ ] Logi strukturalne (JSON) z `requestId`, `userId`, `error.code`.
   - [ ] Metryki: licznik 202 (pending email), 409 (duplicate), 429 (rate-limited).

7. **Release**
   - [ ] Deploy: trigger SQL (jeśli nowy), middleware rate-limit.
   - [ ] Dokumentacja: OpenAPI/MD dla `PATCH /profiles/me` (opis pól, kody, przykłady).

### 10. MVP Decisions

**Nie w MVP (przyszłość):**

- Verifying email change link (Supabase Auth obsługuje — tylko dokumentuj)
- Resend verification email endpoint (add later)
- Email change reason/audit table (use `usage_events` z `kind='profile'`)

**Audyt bez separate tabeli:**

- Trigger DB + logi do stdout/stderr (strukturalne JSON)

---

## GET `/profiles/me`

### 1. Przegląd punktu końcowego

Zwraca profil aktualnie zalogowanego użytkownika, bazując na sesji Supabase Auth. Dane pochodzą z tabeli `public.profiles` i są ograniczone przez RLS do rekordu użytkownika. Endpoint służy do wypełnienia kontekstu klienta (UI) oraz do serwerowych autoryzacji wtórnych.

### 2. Szczegóły żądania

- Metoda HTTP: **GET**
- Struktura URL: **/profiles/me**
- Parametry:
  - Wymagane: _(brak)_
  - Opcjonalne: _(brak)_
- Nagłówki istotne:
  - `Authorization: Bearer <access_token>` **lub** cookies Supabase (`sb-access-token`, `sb-refresh-token`) — zależnie od trybu uwierzytelnienia.
  - `Accept: application/json`
- Request Body: _(brak)_

### 3. Wykorzystywane typy

- **DTO:** `ProfileDTO` (z `types.ts`): `{ id: UUID, email: string, role: "admin"|"user", created_at: ISODateString, updated_at: ISODateString }`.
- **Typy pomocnicze:** `UUID`, `ISODateString`, `Role`.
- **Zod schema (nowa):**
  - `ProfileDtoSchema` – waliduje kształt odpowiedzi (mapowanie DB → DTO).

### 4. Szczegóły odpowiedzi

- **200 OK** — `application/json`:
  ```json
  {
    "id": "b31b9b3c-0d7f-4d73-9d4a-1e5d9e2f2e1a",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-10-15T08:30:00.000Z",
    "updated_at": "2025-10-15T08:30:00.000Z"
  }
  ```
- **401 Unauthorized** — brak ważnej sesji/tonu dostępu.
- **404 Not Found** — sesja ważna, ale brak rekordu w `profiles` (skrajny przypadek niespójności).
- **500 Internal Server Error** — błąd DB/nieoczekiwany wyjątek.

Nagłówki odpowiedzi:

- `Cache-Control: private, max-age=30`
- `ETag: "W/<hash(updated_at,id)>"` (opcjonalnie; pozwala na 304 z warunkiem `If-None-Match`)
- `Vary: Authorization`
- `Content-Type: application/json; charset=utf-8`

### 5. Przepływ danych

1. **Middleware** (`src/middleware/index.ts`) tworzy klienta Supabase na podstawie cookies/nagłówka i umieszcza go w `locals.supabase` (zgodnie z `backend.mdc`).
2. **Handler** `GET /profiles/me` odczytuje sesję: `const { data: { user } } = await locals.supabase.auth.getUser()`.
3. Jeśli brak `user` → **401**.
4. Zapytanie do `public.profiles` z RLS (klient użytkownika, nie service-role):
   ```ts
   const { data, error } = await locals.supabase
     .from("profiles")
     .select("id,email,role,created_at,updated_at")
     .eq("id", user.id)
     .single();
   ```
5. Na sukces: mapowanie do `ProfileDTO` i walidacja `ProfileDtoSchema.parse(data)`.
6. Zwrócenie 200 z JSON.
7. Na wypadek `data == null` → **404**.
8. Na błąd DB → log + **500**.

### 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** tylko ważna sesja Supabase (Bearer lub cookies). Brak jawnych parametrów wejściowych.
- **Autoryzacja i RLS:** zapytanie wykonywane klientem użytkownika → polityki RLS ograniczają widoczność do `auth.uid() = profiles.id`.
  - Polityka (przykład SQL):
    ```sql
    alter table public.profiles enable row level security;
    create policy "own_profile_read"
      on public.profiles for select
      using (id = auth.uid());
    ```
- **Nagłówki bezpieczeństwa:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` (na warstwie ogólnej API).
- **Cache:** `private` i `Vary: Authorization` zapobiega mieszaniu odpowiedzi.
- **Unikanie IDOR:** brak ID w ścieżce; zawsze `me` + RLS.

### 7. Obsługa błędów

- Mapowanie na kody stanu:
  - Brak sesji/tokenu → **401** (`UNAUTHENTICATED`)
  - Rekord nie istnieje → **404** (`PROFILE_NOT_FOUND`)
  - Błąd DB/wyjątek → **500** (`INTERNAL`)
- Struktura błędów (lekka, bez koperty): `{ "error": { "code": "<ErrorCode>", "message": "<safe msg>" } }`
  - Dopuszczalne kody z `types.ts`: `UNAUTHENTICATED`, `INTERNAL`.
- Logowanie:
  - Serwer: `console.error` z korelacją `requestId`.
  - (Opcj.) Sentry/OTEL, jeśli dostępne.
  - Brak dedykowanej tabeli logów w DB – nie zapisujemy do bazy w tym MVP.

### 8. Rozważania dotyczące wydajności

- Ścieżka gorąca: pojedyncze zapytanie po kluczu głównym → O(1).
- Indeksy: `profiles.id` = PK – wystarczające.
- Odpowiedź mała (< 1 KB) – opóźnienia zdominowane przez sieć.
- Mikro-optymalizacje:
  - `select` tylko wymaganych pól.
  - `Cache-Control: private, max-age=30` + `ETag` (opcjonalne).
  - Brak N+1 i joinów.

### 9. Etapy wdrożenia

1. **Struktura plików**
   - `src/lib/services/profiles.service.ts`
   - `src/pages/api/profiles/me.ts` (Astro endpoint; `export const prerender = false`)
   - `src/lib/validation/profile.schema.ts`
   - `src/lib/http/http.ts` (pomocnicze `ok()` / `error()`)
   - `src/middleware/index.ts` (inicjalizacja `locals.supabase` zgodnie z `backend.mdc`)
2. **Zod schema**
   ```ts
   import { z } from "zod";
   export const ProfileDtoSchema = z.object({
     id: z.string().uuid(),
     email: z.string().email().max(254),
     role: z.enum(["admin", "user"]),
     created_at: z.string().datetime(),
     updated_at: z.string().datetime(),
   });
   export type ProfileDTO = z.infer<typeof ProfileDtoSchema>;
   ```
3. **Service: `getMyProfile`**
   ```ts
   // src/lib/services/profiles.service.ts
   import type { SupabaseClient } from "@supabase/supabase-js";
   import { ProfileDtoSchema } from "../validation/profile.schema";
   export async function getMyProfile(sb: SupabaseClient, userId: string) {
     const { data, error } = await sb
       .from("profiles")
       .select("id,email,role,created_at,updated_at")
       .eq("id", userId)
       .single();
     if (error) throw new Error(`DB_ERROR:${error.code ?? "UNKNOWN"}`);
     if (!data) return null;
     return ProfileDtoSchema.parse(data);
   }
   ```
4. **Endpoint**
   ```ts
   // src/pages/api/profiles/me.ts
   import type { APIContext } from "astro";
   import { getMyProfile } from "@/lib/services/profiles.service";
   export const prerender = false;
   export async function GET(ctx: APIContext) {
     const sb = ctx.locals.supabase;
     const {
       data: { user },
       error: authError,
     } = await sb.auth.getUser();
     if (authError || !user) {
       return new Response(
         JSON.stringify({
           error: { code: "UNAUTHENTICATED", message: "Sign in required" },
         }),
         {
           status: 401,
         },
       );
     }
     try {
       const profile = await getMyProfile(sb, user.id);
       if (!profile) {
         return new Response(
           JSON.stringify({
             error: { code: "INTERNAL", message: "Profile missing" },
           }),
           {
             status: 404,
           },
           {
             status: 404,
           },
         );
       }
       const body = JSON.stringify(profile);
       return new Response(body, {
         status: 200,
         headers: {
           "Content-Type": "application/json; charset=utf-8",
           "Cache-Control": "private, max-age=30",
           Vary: "Authorization",
         },
       });
     } catch (e) {
       console.error("[profiles/me]", e);
       return new Response(
         JSON.stringify({
           error: { code: "INTERNAL", message: "Unexpected error" },
         }),
         {
           status: 500,
         },
       );
     }
   }
   ```
5. **RLS (SQL migracja)** – jeśli nie włączone:
   ```sql
   alter table public.profiles enable row level security;
   drop policy if exists own_profile_read on public.profiles;
   create policy own_profile_read on public.profiles
     for select using (id = auth.uid());
   ```
6. **Middleware** – upewnij się, że w `src/middleware.ts`:
   - Tworzysz klientów Supabase (edge/server) i zapisujesz do `locals.supabase`.
   - Przekazujesz `requestId` w `ctx.locals` dla korelacji logów.
7. **Testy**
   - **Unit (Vitest):** mock `supabase-js`, test `getMyProfile` (sukces, brak danych, błąd DB).
   - **API (Vitest + `fetch`):** symulacja `sb.auth.getUser()` i sprawdzenie statusów 200/401/404/500.
   - **E2E (Playwright):** ścieżka zalogowanego użytkownika (cookie), sprawdzenie payloadu.
8. **Observability**
   - Dodaj `requestId` (np. UUID v4) do logów i nagłówka `X-Request-ID`.
9. **Twarde kontrakty**
   - Stabilny kształt DTO, walidowany Zodem.
   - Brak koperty odpowiedzi (czysty DTO) — zgodnie ze specyfikacją.
10. **Release**

- Deploy (GitHub Actions → DO) + migracje SQL RLS (jeśli wymagane).
- Smoke test: curl z ważnym tokenem + weryfikacja cache (`Vary`, `Cache-Control`).
