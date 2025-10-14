# API Endpoint Implementation Plan: GET `/profiles/me`

## 1. Przegląd punktu końcowego
Zwraca profil aktualnie zalogowanego użytkownika na podstawie tokena Supabase (JWT). Źródłem danych jest tabela `public.profiles` powiązana z `auth.users`. Endpoint nie przyjmuje parametrów wejściowych.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **URL:** `/profiles/me`
- **Nagłówki (wymagane):**
  - `Authorization: Bearer <JWT>` **lub** cookie sesyjne Supabase ustawiane przez klienta.
- **Parametry:** brak
- **Body:** brak

## 3. Wykorzystywane typy
- **DTO: `ProfileDTO`**
  ```ts
  type UUID = string;
  type ISODateString = string;
  interface ProfileDTO {
    id: UUID;
    email: string;
    role: 'admin' | 'user';
    created_at: ISODateString;
    updated_at: ISODateString;
  }
  ```
- **Envelope błędu: `ErrorResponse`**
  ```ts
  interface ErrorResponse {
    error: { code: string; message: string };
  }
  ```

## 4. Szczegóły odpowiedzi
- **200 OK** – treść:
  ```json
  {
    "id": "uuid",
    "email": "string",
    "role": "admin|user",
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  }
  ```
- **401 Unauthorized** – brak/niepoprawny/wygaśnięty token (`{ "error": { "code": "AUTH_UNAUTHORIZED", "message": "Unauthorized" } }`).
- **404 Not Found** – rzadkie: konto istnieje, ale rekord w `profiles` nie został utworzony/znaleziony (`PROFILE_NOT_FOUND`).
- **500 Internal Server Error** – nieoczekiwany błąd serwera (`INTERNAL_ERROR`).

## 5. Przepływ danych
1. **Middleware auth** (Astro): odczyt JWT z nagłówka/cookie → walidacja sygnatury (Supabase) → umieszczenie `userId` w `locals`.
2. **Route handler** `/profiles/me`: wywołuje `ProfileService.getCurrent(userId)`.
3. **Service**: deleguje do repozytorium (`ProfilesRepo.findById(userId)`), mapuje wiersz DB → `ProfileDTO`.
4. **DB/RLS**: zapytanie `SELECT * FROM public.profiles WHERE id = auth.uid()` (RLS egzekwuje własność).
5. **Response**: serializacja do JSON, ustawienie nagłówków `Cache-Control: no-store`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Supabase JWT. Endpoint wymaga ważnego tokena.
- **Autoryzacja/RLS:** polityka `SELECT` tylko dla `id = auth.uid()`.
  ```sql
  alter table public.profiles enable row level security;
  create policy "read own profile" on public.profiles
    for select using (id = auth.uid());
  ```
- **Twarde założenia:** trigger tworzący rekord `profiles` po rejestracji w `auth.users`.
- **Nagłówki:** `Cache-Control: no-store`, `Pragma: no-cache`. Brak danych wrażliwych w logach.
- **Rate limiting:** prosty limit (np. 30 req/min na `userId`/IP) w middleware.
- **CSRF:** nie dotyczy (GET + brak stanu modyfikującego), ale stosujemy `SameSite=Lax` dla cookies.

## 7. Obsługa błędów
- Mapowanie wyjątków na spójne kody:
  - brak tokena / invalid: **401 `AUTH_UNAUTHORIZED`**
  - RLS/record not found: **404 `PROFILE_NOT_FOUND`**
  - DB/niezidentyfikowany błąd: **500 `INTERNAL_ERROR`**
- **Logowanie:** strukturalne (JSON) z `requestId`, `userId`, `path`, `status`, `code`, `latency_ms`. Bez tokenów/PII.
- **(Opcjonalnie) Tabela logów:** `api_error_logs(id, time, path, method, user_id, status, code, message, stack_trunc, meta jsonb)` – asynchroniczny insert przez kolejkę lub `fire-and-forget`.

## 8. Rozważania dotyczące wydajności
- Zapytanie po PK (`profiles.id`) – O(1). Brak joinów.
- Utrzymuj payload minimalny (tylko wymagane pola).
- Ustaw `Connection: keep-alive`. Włącz kompresję HTTP na serwerze.
- Reuse połączenia do DB (Supabase client z puli).

## 9. Kroki implementacji
1. **Polityki RLS**
   ```sql
   alter table public.profiles enable row level security;
   create policy "read own profile" on public.profiles for select using (id = auth.uid());
   ```
2. **Middleware auth** (`src/middleware/auth.ts`)
   - Walidacja JWT (użyj Supabase helpera). Ustaw `locals.userId` i `locals.supabase`.
   - Dodaj `requestId` (z nagłówka `x-request-id` albo generuj UUID).
3. **Repozytorium** (`src/lib/repos/profiles.repo.ts`)
   ```ts
   export async function findById(supabase: SupabaseClient, id: string) {
     return supabase.from('profiles').select('id,email,role,created_at,updated_at').eq('id', id).maybeSingle();
   }
   ```
4. **Serwis** (`src/lib/services/profiles.service.ts`)
   ```ts
   export async function getCurrent(supabase: SupabaseClient, userId: string): Promise<ProfileDTO | null> {
     const { data, error } = await findById(supabase, userId);
     if (error) throw new DbError(error.message);
     return data ? ({
       id: data.id, email: data.email, role: data.role,
       created_at: data.created_at, updated_at: data.updated_at
     }) : null;
   }
   ```
5. **Endpoint Astro** (`src/pages/profiles/me.ts` **lub** `src/pages/api/profiles/me.ts`)
   ```ts
   export const prerender = false;
   import { getCurrent } from '@/lib/services/profiles.service';
   export async function GET({ locals }) {
     const userId = locals.userId;
     if (!userId) return new Response(JSON.stringify({ error:{code:'AUTH_UNAUTHORIZED', message:'Unauthorized'} }), { status: 401 });
     try {
       const dto = await getCurrent(locals.supabase, userId);
       if (!dto) return new Response(JSON.stringify({ error:{code:'PROFILE_NOT_FOUND', message:'Profile not found'} }), { status: 404 });
       return new Response(JSON.stringify(dto), { status: 200, headers: { 'Cache-Control': 'no-store' } });
     } catch (e: any) {
       locals.logger?.error({ code:'INTERNAL_ERROR', err:e?.message });
       return new Response(JSON.stringify({ error:{code:'INTERNAL_ERROR', message:'Unexpected error'} }), { status: 500 });
     }
   }
   ```
6. **Logger** (`src/lib/logger.ts`) – pino/własny wrapper; loguj w middleware i w handlerze.
7. **Testy**
   - **Unit:** mock `SupabaseClient` → `ProfilesRepo.findById`, `profiles.service.getCurrent`.
   - **Integracyjne (route):** z ważnym/bez tokena, z RLS, przypadek 404.
   - **E2E (Playwright):** zaloguj użytkownika → `GET /profiles/me` → asercja pól DTO.
8. **Observability**
   - Zmierz latency i rozmiar odpowiedzi; dodaj dashboard/alert na wzrost 401/500.
9. **Dokumentacja**
   - OpenAPI fragment dla `GET /profiles/me` + opis błędów i przykłady.
   - W README/API: wymagania nagłówków, przykładowe wywołanie `curl`.

## 10. Scenariusze błędów i kody stanu
- Brak nagłówka `Authorization` i brak sesji – **401**
- Token wygasł/nieprawidłowy – **401**
- RLS blokuje dostęp (nietrafiony `id`) – **404**
- Brak rekordu w `profiles` – **404**
- Błąd DB/infra – **500**

---

**Zgodność ze stackiem i zasadami:**
- Astro Server Endpoint (`export const prerender = false`), logika wyodrębniona do `services` i `repos`, walidacja (tu minimalna – brak body) Zod gotowy na przyszły rozwój.
- Supabase klient brany z `locals` (middleware) zamiast importu globalnego.
- Spójne kody błędów i struktura odpowiedzi, brak PII w logach, RLS wymuszony.
