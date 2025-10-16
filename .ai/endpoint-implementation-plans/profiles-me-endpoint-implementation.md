# API Endpoint Implementation Plan: GET `/profiles/me`

## 1. Przegląd punktu końcowego

Zwraca profil aktualnie zalogowanego użytkownika, bazując na sesji Supabase Auth. Dane pochodzą z tabeli `public.profiles` i są ograniczone przez RLS do rekordu użytkownika. Endpoint służy do wypełnienia kontekstu klienta (UI) oraz do serwerowych autoryzacji wtórnych.

## 2. Szczegóły żądania

- Metoda HTTP: **GET**
- Struktura URL: **/profiles/me**
- Parametry:
  - Wymagane: _(brak)_
  - Opcjonalne: _(brak)_
- Nagłówki istotne:
  - `Authorization: Bearer <access_token>` **lub** cookies Supabase (`sb-access-token`, `sb-refresh-token`) — zależnie od trybu uwierzytelnienia.
  - `Accept: application/json`
- Request Body: _(brak)_

## 3. Wykorzystywane typy

- **DTO:** `ProfileDTO` (z `types.ts`): `{ id: UUID, email: string, role: "admin"|"user", created_at: ISODateString, updated_at: ISODateString }`.
- **Typy pomocnicze:** `UUID`, `ISODateString`, `Role`.
- **Zod schema (nowa):**
  - `ProfileDtoSchema` – waliduje kształt odpowiedzi (mapowanie DB → DTO).

## 4. Szczegóły odpowiedzi

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

## 5. Przepływ danych

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

## 6. Względy bezpieczeństwa

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

## 7. Obsługa błędów

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

## 8. Rozważania dotyczące wydajności

- Ścieżka gorąca: pojedyncze zapytanie po kluczu głównym → O(1).
- Indeksy: `profiles.id` = PK – wystarczające.
- Odpowiedź mała (< 1 KB) – opóźnienia zdominowane przez sieć.
- Mikro-optymalizacje:
  - `select` tylko wymaganych pól.
  - `Cache-Control: private, max-age=30` + `ETag` (opcjonalne).
  - Brak N+1 i joinów.

## 9. Etapy wdrożenia

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
       return new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }), {
         status: 401,
       });
     }
     try {
       const profile = await getMyProfile(sb, user.id);
       if (!profile) {
         return new Response(JSON.stringify({ error: { code: "INTERNAL", message: "Profile missing" } }), {
           status: 404,
         });
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
       return new Response(JSON.stringify({ error: { code: "INTERNAL", message: "Unexpected error" } }), {
         status: 500,
       });
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
