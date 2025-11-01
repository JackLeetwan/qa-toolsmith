# API Endpoint Implementation Plan: GET `/templates`

## 1. Przegląd punktu końcowego
Zwraca „efektywną” listę szablonów widocznych dla zalogowanego użytkownika: **globalne** (`scope='global'`) oraz **własne** użytkownika (`scope='user' AND owner_id=current_user`). Globalny szablon może być **nadpisany** przez użytkownika forkiem (po `origin_template_id`) lub przez szablon o tej samej nazwie – w „efektywnej” liście pokażemy tylko wariant użytkownika.

Zgodny ze stackiem: **Astro (API route)** ↔ **Supabase (PostgREST / RPC)** z **RLS**.

## 2. Szczegóły żądania
- **Metoda HTTP:** `GET`
- **URL:** `/templates`
- **Parametry zapytania (opcjonalne):**
  - `limit` — int ∈ [1,100], domyślnie 20 (twardy limit 100).
  - `cursor` — base64 dla pary `(updated_at,id)` do keyset pagination, np. `base64("2025-10-11T12:34:56.789Z|b3f9…-uuid")`.
  - `preset` — `ui_bug|api_bug` (filtr po predefiniowanych presetach lub brak filtra).
  - `include` — lista flag rozdzielona przecinkami; obsługiwane: `fields` (dołącza pole `fields` – domyślnie **TAK** w MVP; można wyłączyć w przyszłości dla oszczędności transferu).
- **Nagłówki:**
  - `Authorization: Bearer <JWT>` (Supabase Auth)
  - `Accept: application/json`

## 3. Wykorzystywane typy
- **TemplateDto**
  ```ts
  type TemplateDto = {
    id: string
    name: string
    scope: 'global'|'user'
    ownerId: string | null
    preset: 'ui_bug'|'api_bug'|null
    fields?: Array<{key:string; type:string; label:string; help?:string; default?:unknown; options?:unknown}>
    requiredFields: string[]
    attachments: string[]
    originTemplateId: string | null
    isReadonly: boolean
    version: number
    createdAt: string
    updatedAt: string
  }
  ```
- **TemplateListResponse**
  ```ts
  type TemplateListResponse = {
    items: TemplateDto[]
    nextCursor?: string // base64(updated_at|id) ostatniego elementu
    hasMore: boolean
  }
  ```

## 3. Szczegóły odpowiedzi
- **200 OK**
  - `application/json` → `TemplateListResponse`
  - Przykład (skrócony):
    ```json
    {
      "items": [
        {
          "id":"7f8…","name":"UI bug","scope":"global","ownerId":null,
          "preset":"ui_bug","fields":[{"key":"steps","type":"text","label":"Steps"}],
          "requiredFields":["title","steps"],"attachments":[],
          "originTemplateId":null,"isReadonly":true,"version":1,
          "createdAt":"2025-10-10T09:10:11Z","updatedAt":"2025-10-10T09:10:11Z"
        }
      ],
      "nextCursor":"YmFzZTY0…",
      "hasMore": true
    }
    ```
- **401 Unauthorized** — brak/nieprawidłowy JWT.
- **400 Bad Request** — nieprawidłowy `limit`/`cursor`/`preset`.
- **500 Internal Server Error** — błąd serwera/bazy.

## 4. Przepływ danych
1. **Auth**: Astro API route weryfikuje JWT (Supabase client) i pozyskuje `userId` = `auth.uid()`.
2. **Źródło danych**: zapytanie do Supabase:
   - Preferowane: **widok lub funkcja** `templates_effective` z RLS, eliminująca globalne rekordy nadpisane przez użytkownika.
   - Alternatywa: zapytanie z poziomu API (service) z warunkami `WHERE` i `NOT EXISTS`.
3. **Keyset pagination**: jeżeli `cursor` podany → `WHERE (updated_at, id) < (:cursor_updated_at, :cursor_id)`.
4. **Filtry**: opcjonalnie `preset`.
5. **Sortowanie**: `ORDER BY updated_at DESC, id DESC` (spójne z indeksem).
6. **Mapowanie**: rekordy → `TemplateDto` (camelCase), ewentualne pominięcie `fields` gdy flaga nie ustawiona.
7. **Odpowiedź**: ustal `hasMore` na podstawie pobrania `limit+1` elementów; ostatni rekord → `nextCursor`.

**SQL szkic (widok/funkcja, logika „effective”):**
```sql
-- Widok z użyciem auth.uid() (Supabase) + eliminacja nadpisanych globali
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

**RLS (jeżeli czytamy bezpośrednio z `templates`):**
```sql
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_templates_self_or_global ON public.templates
FOR SELECT USING (scope = 'global' OR owner_id = auth.uid());
```

**Indeksy (wg planu DB, uzupełnienie pod keyset):**
```sql
CREATE INDEX IF NOT EXISTS idx_templates_owner_updated_id
  ON public.templates(owner_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_templates_scope_preset_updated
  ON public.templates(preset, scope, updated_at DESC, id DESC);
```

## 5. Względy bezpieczeństwa
- **Autoryzacja**: RLS gwarantuje, że użytkownik zobaczy tylko globalne lub własne rekordy.
- **IDOR**: brak dostępu do cudzych `user` szablonów dzięki RLS.
- **Walidacja wejścia**: `limit` (≤100), `cursor` musi dekodować się do `(timestamp, uuid)` i przechodzić regexy.
- **Cache**: odpowiedź per-user → `Cache-Control: private, max-age=60`; ustaw `ETag` z `hash(userId:lastUpdatedPair)`.
- **Zgodność z politykami URL w DB**: nie przyjmujemy/nie zapisujemy URL – tylko odczyt, więc ryzyko XSS minimalne; escapowanie po stronie UI.
- **DoS**: twardy limit i proste filtry, brak `OFFSET`.

## 6. Obsługa błędów
- **Format błędów API (spójny w projekcie):**
  ```json
  { "error": { "code": "BadRequest", "message": "invalid cursor", "details": {"cursor":"…"} } }
  ```
- **Mapowanie:**
  - Walidacja parametrów → `400`.
  - Brak/expired JWT → `401`.
  - Błąd Supabase/SQL → `500` (maskuj szczegóły, loguj pełny stack po stronie serwera).
- **Logowanie:** `level=error`, `requestId`, `userId|null`, `endpoint`, `params`, `duration_ms`; opcjonalny insert do tabeli błędów jeżeli istnieje.

## 7. Rozważania dotyczące wydajności
- **Keyset > OFFSET** dla skalowalności; indeksy z `updated_at DESC, id DESC`.
- **N+1** nie występuje (pojedyncze źródło). 
- **Rozmiar payloadu**: flaga `include=fields` pozwala wyłączyć ciężkie `fields` (w przyszłości). 
- **CDN**: niezalecany dla per-user danych; krótkie `max-age` prywatne wystarczą. 
- **Plan zapytań**: monitorować `EXPLAIN ANALYZE` przy rosnącej liczbie rekordów; dodać `WHERE preset = ?` indeks wspierający filtr.

## 8. Etapy wdrożenia
1. **DB**: utwórz/zmodyfikuj widok `templates_effective` (jak wyżej) i dopnij indeksy.
2. **RLS**: upewnij się, że polityka `read_templates_self_or_global` jest aktywna; testy RLS (global, self, cudzy → deny).
3. **Backend (Astro API route)**: `GET /templates`:
   - walidacja `query` (Zod), dekodowanie kursora,
   - budowa zapytania (service) z keyset i filtrami,
   - mapowanie do `TemplateDto` i złożenie `TemplateListResponse`.
4. **Observability**: request timing, `requestId`, strukturalne logi, maskowanie PII.
5. **Testy**:
   - **Unit**: walidacja parametrów, dekoder/enkoder kursora, sort/keyset, filtr `preset`.
   - **RLS**: testy integracyjne na Supabase – użytkownik A nie widzi `user` B.
   - **E2E**: happy path (bez kursora / z kursorem), override (user fork ukrywa global), filtr `preset`.
6. **Dokumentacja**: OpenAPI/MDX dla `GET /templates` (opis parametrów, przykłady odpowiedzi, kody błędów).
7. **Release**: pipeline CI (lint, testy, migra/seed, deploy), feature flag jeżeli potrzebna.

---
**Uwaga implementacyjna – alternatywa RPC:** zamiast widoku można udostępnić funkcję `rpc.list_templates_effective(limit int, cursor_ts timestamptz, cursor_id uuid, preset text)` z `SECURITY DEFINER`, co upraszcza paginację po stronie SQL i ogranicza transfer.
