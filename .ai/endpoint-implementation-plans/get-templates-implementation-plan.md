# API Endpoint Implementation Plan: GET `/templates`

## 1. Przegląd punktu końcowego

Zwraca „efektywną" listę szablonów widocznych dla zalogowanego użytkownika: **globalne** (`scope='global'`) oraz **własne** użytkownika (`scope='user' AND owner_id=current_user`). Globalny szablon może być **nadpisany** przez użytkownika forkiem (po `origin_template_id`) lub przez szablon o tej samej nazwie – w „efektywnej" liście pokażemy tylko wariant użytkownika.

Zgodny ze stackiem: **Astro (API route)** ↔ **Supabase (PostgREST / RPC)** z **RLS**.

**JSON API Convention:** All responses use **snake_case** (REST standard).

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **URL:** `/templates`
- **Parametry zapytania (opcjonalne):**
  - `limit` — int ∈ [1,100], domyślnie 20 (twardy limit 100).
  - `after` — base64 dla pary `(updated_at,id)` do keyset pagination, np. `base64("2025-10-11T12:34:56.789Z|b3f9…-uuid")`.
  - `preset` — `ui_bug|api_bug` (filtr po predefiniowanych presetach lub brak filtra).
- **Nagłówki:**
  - `Authorization: Bearer <JWT>` (Supabase Auth)
  - `Accept: application/json`

## 3. Wykorzystywane typy

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

## 3. Szczegóły odpowiedzi

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

## 4. Przepływ danych

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

## 5. Względy bezpieczeństwa

- **Autoryzacja**: RLS gwarantuje, że użytkownik zobaczy tylko globalne lub własne rekordy.
- **IDOR**: brak dostępu do cudzych `user` szablonów dzięki RLS.
- **Walidacja wejścia**: `limit` (≤100), `after` musi dekodować się do `(timestamp, uuid)` i przechodzić regexy.
- **Cache**: odpowiedź per-user → `Cache-Control: private, max-age=60`; opcjonalnie `ETag` z `hash(userId:lastUpdatedPair)`.
- **Zgodność z politykami URL w DB**: nie przyjmujemy/nie zapisujemy URL – tylko odczyt, więc ryzyko XSS minimalne; escapowanie po stronie UI.
- **DoS**: twardy limit i proste filtry, brak `OFFSET`.

## 6. Obsługa błędów

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

## 7. Rozważania dotyczące wydajności

- **Keyset > OFFSET** dla skalowalności; indeksy z `updated_at DESC, id DESC`.
- **N+1** nie występuje (pojedyncze źródło).
- **Rozmiar payloadu**: pola zawsze present (nie opcjonalne filtry w MVP).
- **CDN**: niezalecany dla per-user danych; krótkie `max-age` prywatne wystarczą.
- **Plan zapytań**: monitorować `EXPLAIN ANALYZE` przy rosnącej liczbie rekordów.

## 8. Etapy wdrożenia

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

## 9. Snake_case Convention (MVP Decision)

**JSON API zwraca snake_case** (REST standard):

- DB: `owner_id`, `required_fields`, `origin_template_id`, `is_readonly`, `created_at`, `updated_at` ✅
- JSON response: `owner_id`, `required_fields`, `origin_template_id`, `is_readonly`, `created_at`, `updated_at` ✅
- TypeScript DTOs: snake_case w `types.ts` ✅
- Frontend (React): konwersi snake_case → camelCase w komponentach (np. via lib/camelCase.ts)

**Brak transformacji na API boundary** — wszystko snake_case end-to-end.
