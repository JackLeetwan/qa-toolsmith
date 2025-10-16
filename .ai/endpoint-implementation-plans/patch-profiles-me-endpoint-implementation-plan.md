# API Endpoint Implementation Plan: PATCH `/profiles/me`

## 1. Przegląd punktu końcowego

Aktualizacja własnego profilu zalogowanego użytkownika w zakresie **nieuprzywilejowanych pól** (bez zmiany `role`). W tym MVP dopuszczamy inicjację **zmiany adresu e‑mail** (przy zachowaniu mechanizmu weryfikacji e‑mail w Supabase). Odczyt zaktualizowanego profilu zwracamy w odpowiedzi, jeśli zmiana nie wymaga potwierdzenia; w przeciwnym razie zwracamy status „pending verification" (202 Accepted).

**MVP Scope:** Only email changes; rate-limit via middleware per IP+userId.

## 2. Szczegóły żądania

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

## 3. Wykorzystywane typy

- **DTO** (z `types.ts`)

  ```ts
  export type ProfileDTO = Pick<ProfileRow, "id" | "email" | "created_at" | "updated_at"> & {
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

## 4. Szczegóły odpowiedzi

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

## 5. Przepływ danych

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

## 6. Względy bezpieczeństwa

- **RLS (Row‑Level Security) na `profiles`:**
  - `SELECT`/`UPDATE` tylko gdy `id = auth.uid()`.
  - Trigger lub middleware blokują zmianę `role`, `org_id`, `created_at`, `updated_at`.
- **Autoryzacja negatywna**: ignoruj/odrzucaj nieznane pola (ochrona przed mass‑assignment).
- **Rate limiting**: ~5–10 prób zmiany e‑mail / 15 min / IP + userId; odpowiedź `429` gdy przekroczono.
  - **Implementacja:** middleware z memory/Redis, klucz: `rl:profile_update:{userId}:{ip}`
- **Audyt**: log zdarzeń bezpieczeństwa (`email_change_requested`, `email_change_failed`) do logów aplikacyjnych z korelacją `requestId`.
- **Transport**: wymuś HTTPS, HSTS.
- **Walidacja danych**: canonicalization e‑mail (lowercase), ogranicz długości; sanity‑check nagłówków.

## 7. Obsługa błędów (mapowanie)

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

## 8. Rozważania dotyczące wydajności

- Operacja jednostkowa – brak gorących ścieżek.
- **Indeksy/ograniczenia:** `profiles.email` już `UNIQUE (citext)` – kolizje obsługiwane na poziomie Auth + DB constraint.
- **Zasoby zewnętrzne:** połączenie do Supabase Auth – timeout (np. 5s) i retry z backoff przy `5xx`.
- **Synchronizacja email:** trigger DB jest O(1), webhook może mieć opóźnienie (ok dla MVP).

## 9. Etapy wdrożenia

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
     FOR EACH ROW EXECUTE FUNCTION public.sync_auth_email_to_profile();
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

## 10. MVP Decisions

**Nie w MVP (przyszłość):**

- Verifying email change link (Supabase Auth obsługuje — tylko dokumentuj)
- Resend verification email endpoint (add later)
- Email change reason/audit table (use `usage_events` z `kind='profile'`)

**Audyt bez separate tabeli:**

- Trigger DB + logi do stdout/stderr (strukturalne JSON)
