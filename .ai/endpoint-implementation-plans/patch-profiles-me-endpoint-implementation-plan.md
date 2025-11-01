# API Endpoint Implementation Plan: PATCH `/profiles/me`

## 1. Przegląd punktu końcowego
Aktualizacja własnego profilu zalogowanego użytkownika w zakresie **nieuprzywilejowanych pól** (bez zmiany `role` i `org_id`). W tym MVP dopuszczamy jedynie inicjację **zmiany adresu e‑mail** (przy zachowaniu mechanizmu weryfikacji e‑mail w Supabase). Odczyt zaktualizowanego profilu zwracamy w odpowiedzi, jeśli zmiana nie wymaga potwierdzenia; w przeciwnym razie zwracamy status „pending verification".

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
    "email": "user@example.com" // opcjonalnie; zmiana wymaga potwierdzenia e‑mail
  }
  ```
  **Zabronione pola:** `role`, `org_id`, `created_at`, `updated_at`, `id`.

- **Walidacja wejścia:**
  - `email` (jeśli podano): normalizacja `trim().toLowerCase()`, RFC5322-lite, długość ≤ 254.
  - brak „unknown fields" – odrzuć każde pole spoza whitelisty.
  - jeżeli body puste → `400 Bad Request` (brak zmian).

## 3. Wykorzystywane typy
- **DTO**
  ```ts
  // Zdefiniowane w types.ts
  export type ProfileDTO = Pick<ProfileRow, "id" | "email" | "created_at" | "updated_at"> & {
    role: Role; // constrain to API enum
  };
  ```

- **Command model**
  ```ts
  // Zdefiniowane w types.ts
  export type UpdateMyProfileCommand = Partial<Pick<ProfileRow, "email">>;
  ```

- **Response for pending verification**
  ```ts
  // Zdefiniowane w types.ts
  export interface PendingVerificationResponse {
    status: "pending_verification";
    message: string;
  }
  ```

## 4. Szczegóły odpowiedzi
- **200 OK** – zmiana wykonana (np. nie wymagająca potwierdzenia) lub brak faktycznych zmian:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-10-14T19:00:00.000Z",
    "updated_at": "2025-10-14T19:05:12.000Z"
  }
  ```
- **202 Accepted** – inicjacja zmiany e‑mail, wymagane potwierdzenie:
  ```json
  {
    "status": "pending_verification",
    "message": "Verification email sent to user@example.com"
  }
  ```
- **Błędy (format przykładowy):**
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
  - `500` błąd serwera

## 5. Przepływ danych
1. **Auth**: Middleware weryfikuje `Authorization: Bearer <JWT>` i pobiera `userId = auth.uid()`.
2. **Walidacja**: JSON → `UpdateMyProfileCommand`; odrzuć nieznane pola; waliduj `email`.
3. **Ścieżka bez zmiany**: jeśli brak pól lub wartości nie różnią się od obecnych → 200 z aktualnym `ProfileDTO`.
4. **Zmiana e‑mail**:
   - Wywołaj **Supabase Auth**: `supabase.auth.updateUser({ email })` z **tokenem użytkownika**.
   - Jeśli provider wymaga potwierdzenia e‑mail → Supabase wysyła mail potwierdzający; **nie aktualizuj** `profiles.email` wprost; zwróć `202` z `PendingVerificationResponse`.
   - Gdy Supabase dopuści natychmiastową zmianę (konfiguracja bez potwierdzenia) → zsynchronizuj `profiles.email` (patrz punkt 5): odczytaj profil i zwróć `200` z nowym `ProfileDTO`.
5. **Synchronizacja e‑mail (DB/trigger lub webhook):**
   - Zalecany **trigger DB** `AFTER UPDATE OF email ON auth.users` → `UPDATE profiles SET email = NEW.email, updated_at = now() WHERE id = NEW.id;`
   - Alternatywnie **webhook Supabase** „user.updated" → wywołanie funkcji serwerowej aktualizującej `profiles`.
6. **Odczyt końcowy**: pobierz `profiles` przez RLS (id = `auth.uid()`) i zmapuj do `ProfileDTO`.

## 6. Względy bezpieczeństwa
- **RLS (Row‑Level Security) na `profiles`:**
  - `SELECT`/`UPDATE` tylko gdy `id = auth.uid()`.
  - **CHECK**: trigger lub ograniczenie aplikacyjne blokujące zmianę `role`, `org_id`, `created_at`, `updated_at`.
- **Autoryzacja negatywna**: ignoruj/odrzucaj nieznane pola (ochrona przed mass‑assignment).
- **Rate limiting**: ~5–10 prób zmiany e‑mail / 15 min / IP + userId; odpowiedź `429` gdy przekroczono.
- **Audyt**: log zdarzeń bezpieczeństwa (`email_change_requested`, `email_change_denied`) do logów aplikacyjnych z korelacją `requestId`.
- **CSRF**: jeśli endpoint konsumowany przez sesje cookie – wymagany CSRF token; dla Bearer JWT w nagłówku – mniejsze ryzyko.
- **Transport**: wymuś HTTPS, HSTS.
- **Walidacja danych**: canonicalization e‑mail (lowercase), ogranicz długości; sanity‑check nagłówków.

## 7. Obsługa błędów (mapowanie)
| Sytuacja | HTTP | `error.code` | Uwagi |
|---|---:|---|---|
| Brak/niepoprawny JWT | 401 | `UNAUTHENTICATED` | Nie ujawniaj szczegółów |
| Puste body / same nieznane pola | 400 | `NO_CHANGES` | |
| Próba zmiany pól zabronionych | 403 | `FORBIDDEN_FIELD` | |
| Zły format e‑mail | 400 | `VALIDATION_ERROR` | details.email |
| E‑mail zajęty (Auth) | 409 | `EMAIL_TAKEN` | |
| Błąd transakcji / triggera | 500 | `INTERNAL` | |
| Limit żądań | 429 | `RATE_LIMITED` | Retry‑After |

**Logowanie błędów:** brak dedykowanej tabeli – użyj **ustrukturyzowanych logów** (JSON) z polami: `ts`, `requestId`, `userId`, `path`, `error.code`, `pg.code`, `stack`. (Opcjonalnie: osobna tabela `audit_log` w przyszłości.)

## 8. Rozważania dotyczące wydajności
- Operacja jednostkowa – brak gorących ścieżek. 
- **Indeksy/ograniczenia:** `profiles.email` już `UNIQUE (citext)` – kolizje obsługiwane na poziomie Auth; synchronizacja przez trigger ma O(1).
- **Zasoby zewnętrzne:** połączenie do Supabase Auth – uwzględnij timeout (np. 5s) i retry z backoff przy `5xx`.
- **Krótkie odpowiedzi**: brak zbędnych pól (minifikacja JSON nie wymagana).

## 9. Etapy wdrożenia
1. **DB**
   - [ ] Włącz/zweryfikuj RLS na `profiles` (`USING/WITH CHECK id = auth.uid()`).
   - [ ] Dodaj trigger `AFTER UPDATE OF email ON auth.users` → sync do `profiles.email` (lub webhook).
   - [ ] (Opcjonalnie) trigger zabezpieczający: `BEFORE UPDATE ON profiles` → zabroń zmiany `role`, `org_id` przez zwykłych userów.
2. **Backend (Astro server / API route)**
   - [ ] Middleware auth: ekstrakcja JWT → `userId`.
   - [ ] Schemat walidacji (`zod`/`valibot`): `UpdateMyProfileCommand` (whitelist, email).
   - [ ] `ProfilesService.updateMe(userId, cmd)`:
     - [ ] Short‑circuit gdy brak zmian.
     - [ ] Wywołanie `supabase.auth.updateUser({ email })` (token użytkownika).
     - [ ] Mapowanie rezultatów: `202` jeśli `email_change_sent`, inaczej `200`.
   - [ ] `ProfilesRepo`: odczyt `profiles` przez RLS i mapowanie do `ProfileDTO`.
   - [ ] Globalne mapowanie błędów (Postgresa `23505` → `409`, walidacja → `400`).
3. **Konfiguracja**
   - [ ] W Supabase włącz potwierdzanie zmiany e‑mail (recommended).
   - [ ] Sekrety/ENV: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (dla user), `SUPABASE_SERVICE_ROLE` (nie używamy w tym endpointcie), `RATE_LIMIT_*`.
4. **Testy**
   - [ ] Unit: walidacja command, mapowanie błędów.
   - [ ] Integracyjne (lokalny Supabase): happy path 200, pending 202, 400, 401, 403, 409.
   - [ ] E2E (Postman/Bruno): kolejne żądania z potwierdzeniem e‑mail (scenariusz ręczny).
5. **Observability**
   - [ ] Logi strukturalne (JSON) + `requestId`.
   - [ ] Alert na wzrost `409 EMAIL_TAKEN` lub `5xx`.
6. **Bezpieczeństwo**
   - [ ] Rate limiting / IP throttling.
   - [ ] Nagłówki bezpieczeństwa (w razie sesji cookie – CSRF).
7. **Dokumentacja**
   - [ ] OpenAPI/MD: opis pól, kody statusów, przykłady.
