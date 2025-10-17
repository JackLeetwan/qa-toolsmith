# Specyfikacja architektury modułu **Rejestracja / Logowanie / Reset hasła** (US‑001, US‑002)

**Projekt:** QA Toolsmith (MVP)  
**Źródła:** PRD (`US‑001 Rejestracja`, `US‑002 Logowanie i sesja`) oraz stack technologiczny.  
**Cel:** dodać rejestrację, logowanie, wylogowanie i odzyskiwanie hasła, nie naruszając istniejących funkcji (generatory, KB, szablony) dostępnych _bez logowania_, przy jednoczesnym egzekwowaniu wymogu logowania do operacji zapisu/edycji.  
**Backend:** Supabase (PostgreSQL + Auth). **Frontend:** Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui.

---

## 0. Założenia i ograniczenia

- Zgodnie z PRD: dwie role (`admin`, `user`), ale moduł auth w MVP obsługuje wyłącznie proces **email+hasło** (bez SSO).
- Użytkownik **może używać** generatorów i podglądać treści **bez logowania**, ale **nie może zapisywać/edytować** (PRD 3.1, US‑002).
- Nie ujawniamy, czy dany e‑mail istnieje w systemie (US‑001, US‑002) – wszystkie błędy są „nieprecyzyjne” (np. „Nieprawidłowe dane”).
- Obsługa resetu hasła jest wymagana (US‑002).
- Konfiguracja SSR/SSG **nie jest zmieniana** – poniżej opisujemy warianty zgodne z aktualnym `astro.config.mjs`:
  - **Wariant A (SSR/hybrid)** – sprawdzanie sesji w `onRequest` i serwerowe renderowanie stanu zalogowania (zalecane).
  - **Wariant B (SSG/static)** – minimalny JS do hydratacji nagłówka i ładowanie sesji po stronie klienta; trasy /auth są generowane statycznie, a akcje idą do API routes.

---

## 1) ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Struktura stron, layoutów i nawigacji

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

\*\*Gating (przełączanie trybu read‑only):

- **Historia pracy i zasoby użytkownika** (lista charterów, własne szablony, historia KB) **wymagają zalogowania** zgodnie z US‑002; bez sesji ukrywamy te widoki lub pokazujemy CTA do logowania.
  \*\*
- Na stronach funkcji edycyjnych (np. KB CRUD, forki szablonów) przy braku sesji:
  - **Przyciski zapisu/edycji są wyszarzone** lub pokazują **modal logowania** (bez utraty wprowadzonych danych).
  - Wejścia w akcje REST zwracają **401** z komunikatem ogólnym, FE pokazuje toast z linkiem do logowania.

### 1.2 Podział odpowiedzialności: strony Astro vs. komponenty React

- **Strony Astro (`/auth/*`)** – ramy strony, SSR/SSG, meta, przekierowania (np. jeśli już zalogowany → `/`), _opcjonalnie_ `onRequest` do sprawdzania sesji (wariant A).
- **Komponenty React (client)** – formularze i interakcje:
  - `LoginForm.tsx`, `RegisterForm.tsx`, `ResetRequestForm.tsx`, `ResetConfirmForm.tsx`.
  - Walidacja, kontrola stanu, blokada wielokrotnych submitów, obsługa błędów/komunikatów.
  - Integracja z API routes lub bezpośrednio z Supabase (patrz rozdz. 3).

**Biblioteki UI:** shadcn/ui (Input, Button, Form, Alert), Tailwind.

**Walidacja po stronie klienta:**

- (Zalecane) `zod` + `@hookform/resolvers/zod` + `react-hook-form`, żeby mieć spójność z walidacją serwerową.
- Alternatywnie: natywne atrybuty HTML + wzorce RegExp.

### 1.3 Walidacja i komunikaty błędów

**Pola i reguły (client‑side, powtórzone server‑side):**

- **email**: wymagany, max 254, format RFC 5322 (upraszczony), normalizacja `trim().toLowerCase()`.
- **password**: wymagane, min. 8 znaków, max 72 (BCrypt), zalecane: przynajmniej 1 litera i 1 cyfra.

**Zasada nieujawniania istnienia konta (US‑001/US‑002):**

- Rejestracja: błędy „email zajęty” mapowane na komunikat: **„Nie udało się utworzyć konta. Sprawdź dane.”**
- Logowanie: zawsze **„Nieprawidłowe dane logowania.”** bez wskazywania, co było błędne.
- Reset hasła – po submit zawsze: **„Jeśli konto istnieje, wyślemy instrukcję na e‑mail.”**

**Komunikaty sukcesu:**

- Rejestracja: **„Konto utworzone. Zalogowano.”** → przekierowanie (ostatnia strona lub `/`).
- Logowanie: **„Witaj ponownie!”** → przekierowanie (ostatnia strona lub `/`).
- Reset‑request: jw. (bez potwierdzenia istnienia konta).
- Reset‑confirm: **„Hasło zaktualizowane.”** → automatyczne logowanie (jeśli token ważny) albo link do `/auth/login`.

### 1.4 Obsługa kluczowych scenariuszy

1. **Rejestracja (US‑001):**  
   Użytkownik wypełnia e‑mail/hasło → FE waliduje → POST do `/api/auth/signup` → po sukcesie sesja HTTP‑only ustawiona → redirect.  
   Błąd „email exists” → komunikat ogólny, bez ujawnienia.

2. **Logowanie (US‑002):**  
   FE waliduje → POST `/api/auth/signin` → po sukcesie sesja (cookie) → redirect.  
   Błędne dane → komunikat ogólny, UI anty‑brute‑force: _exponential backoff_ na poziomie FE.

3. **Wylogowanie:**  
   Akcja `POST /api/auth/signout` (lub `/logout`) czyści cookie i przekierowuje na `/`.

4. **Reset hasła (żądanie):**  
   FE POST `/api/auth/reset-request` z e‑mailem → zawsze komunikat „jeśli konto istnieje…”.

5. **Reset hasła (potwierdzenie):**  
   Użytkownik otwiera link z maila `https://app/auth/reset/confirm#access_token=...&type=recovery` → strona odczytuje token z URL → POST `/api/auth/reset-change` z `new_password` → sukces/logowanie/redirect.

6. **Próba zapisu bez sesji:**  
   FE blokuje CTA (modal logowania) + BE zwraca 401, żeby egzekwować regułę.

---

## 2) LOGIKA BACKENDOWA

### 2.1 API routes (Astro) i kontrakty

> Stosujemy serwerowe API routes, aby: (a) ujednolicić zarządzanie ciasteczkami sesyjnymi, (b) centralnie mapować błędy Supabase na nasze kody, (c) zastosować rate‑limiting.

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

**Kontrakty TypeScript (serwis domenowy):**

```ts
// src/services/auth/AuthService.ts
export interface AuthService {
  signUp(email: string, password: string): Promise<{ userId: string }>;
  signIn(email: string, password: string): Promise<{ userId: string }>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(accessToken: string, newPassword: string): Promise<void>;
}
export type AuthErrorCode = "INVALID_INPUT" | "INVALID_CREDENTIALS" | "RATE_LIMITED" | "UNKNOWN_ERROR";
```

### 2.2 Walidacja wejścia (server‑side)

- Warstwa DTO + walidacja (`zod` na serwerze lub prosty validator własny).
- Normalizacja e‑maila (`lowercase`, `trim`), limity długości, białe znaki.
- _Zasada nieujawniania_ – mapujemy błędy Supabase (`User already registered`, `Invalid login credentials`) na uniwersalne kody.

### 2.3 Obsługa wyjątków i logowanie

- Wspólna funkcja `mapSupabaseError(e): AuthErrorCode`.
- Logujemy **kody** i **kontekst techniczny** (request id, ip hash) bez PII.
- Dla nieprzewidzianych wyjątków zwracamy `UNKNOWN_ERROR` i HTTP 500.

### 2.4 Rate‑limiting i anty‑abuse

- **Blokada tymczasowa po serii błędów (zgodnie z PRD 3.1):** per **e‑mail (hash)** + **IP (hash)**, po **10** nieudanych próbach w **10 minut** ustawiamy `lock_until = now() + 15 min`. Podczas blokady `/api/auth/signin` zwraca **429** z kodem `RATE_LIMITED` i komunikatem ogólnym (bez ujawniania przyczyny). Implementacja minimalna: tabela `auth_throttle(email_hash, ip_hash, failures, window_started_at, lock_until)` z czyszczeniem rekordów starszych niż 24 h (cron lub job w aplikacji).

- Minimalny limiter IP dla endpointów `/api/auth/*` (np. token bucket w pamięci procesu lub prosta tabela w Postgres z TTL).
- Backoff po stronie FE (1s, 2s, 4s…).
- Reverse‑proxy (jeżeli kontener ma Nginx) może egzekwować dodatkowe limity – nie zmieniamy jednak obecnej infrastruktury; opis stanowi _opcję_.

- Minimalny limiter IP dla endpointów `/api/auth/*` (np. token bucket w pamięci procesu lub prosta tabela w Postgres z TTL).
- Backoff po stronie FE (1s, 2s, 4s…).
- Reverse‑proxy (jeżeli kontener ma Nginx) może egzekwować dodatkowe limity – nie zmieniamy jednak obecnej infrastruktury; opis stanowi _opcję_.

### 2.5 Modele danych i spójność z istniejącymi tabelami

- **Seed pierwszego admina (PRD 3.1):** podczas deployu `SEED_ADMIN_EMAILS` (lista) jest mapowana na `profiles.role='admin'`. Pierwsza rejestracja tych e‑maili skutkuje nadaniem roli `admin` (lub migracja ustawia rolę od razu, jeśli użytkownik istnieje).

- Wykorzystujemy istniejące `auth.users` (Supabase) i `public.profiles` (PK = `auth.users.id`, pola min.: `email`, `role` = `admin|user`).
- Po rejestracji (trigger DB lub task po stronie aplikacji) tworzymy rekord w `profiles` z domyślną rolą `user`.
- RLS (Row‑Level Security) już obowiązuje w tabelach domenowych – polityki dopuszczają tylko `auth.uid() = created_by`.

### 2.6 Renderowanie server‑side i `astro.config.mjs`

- **Wariant A – SSR/hybrid (zalecany):**
  - W plikach `.astro` użyć `onRequest` + `getSupabase(event)` (z `@supabase/auth-helpers-astro`) do pobrania sesji na serwerze.
  - `TopBar.astro` otrzymuje `user` z SSR → brak migotania UI.
  - Strony wymagające logowania (np. `/app/*`) mają guard: brak sesji → `return Response.redirect("/auth/login?next=/app/...")`.

- **Wariant B – SSG/static:**
  - `TopBar.astro` hydratowany klientem (`client:load`) i pobiera sesję przez `createBrowserClient`.
  - API routes pozostają serwerowe – cookies zarządzane centralnie w `/api/auth/*`.
  - Guard realizowany nawigacją klientową (redirect po wykryciu braku sesji) + weryfikacja **również** w API.

> W obu wariantach **nie zmieniamy** istniejących ustawień `astro.config.mjs`; wybór ścieżek jest kompatybilny z aktualnym adapterem.

---

## 3) SYSTEM AUTENTYKACJI (Supabase + Astro)

### 3.1 Integracja i biblioteki

- `@supabase/supabase-js` – klient (browser i server).
- `@supabase/auth-helpers-astro` – zarządzanie sesją, ciasteczkami i SSR guards (wariant A).
- Zmienne środowiskowe: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (klient), `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer – **nie** do bundla FE).

### 3.2 Przepływy

**Rejestracja (US‑001):**  
`RegisterForm` → POST `/api/auth/signup` → `signUp` → natychmiastowe `signInWithPassword` → cookie → redirect.  
Ewentualne potwierdzenie e‑mail (jeśl. włączone globalnie) można pominąć w MVP, zgodnie z US‑001 („zostaje zalogowany”).

**Logowanie/Wylogowanie (US‑002):**  
`LoginForm` → POST `/api/auth/signin` → cookie → redirect.  
Menu użytkownika → POST `/api/auth/signout` → redirect na `/`.

**Reset hasła:**  
`ResetRequestForm` → `/api/auth/reset-request` (zawsze 200) → e‑mail z linkiem `…/auth/reset/confirm`.  
`ResetConfirmForm` odczytuje `access_token` → `/api/auth/reset-change`.

### 3.3 Polityki bezpieczeństwa

- **Brak ujawniania istnienia konta** – jak wyżej.
- **SameSite=Lax, HttpOnly, Secure** dla ciasteczek sesji (auth‑helpers).
- **CSRF:** POST‑y do `/api/auth/*` przyjmują tylko `Content-Type: application/json` i pochodzą z tej samej domeny; można dodać `csrfToken` w nagłówku i weryfikację w API route.
- **XSS:** komunikaty błędów i echo danych użytkownika są escapowane; brak wstrzykiwania unescaped HTML.
- **Rate‑limit** na endpointach + backoff FE.
- **RODO:** brak PII poza e‑mailem; realizujemy w przyszłości endpoint usuwania konta (poza zakresem US‑001/002).

---

## 4) Komponenty, moduły, pliki

```
src/
├─ layouts/
│  ├─ PublicLayout.astro
│  └─ AuthLayout.astro
├─ components/
│  ├─ TopBar.astro                 // SSR/SSG: pokazuje stan zalogowania + CTA
│  ├─ auth/
│  │  ├─ LoginForm.tsx
│  │  ├─ RegisterForm.tsx
│  │  ├─ ResetRequestForm.tsx
│  │  └─ ResetConfirmForm.tsx
│  └─ ui/…                         // shadcn/ui
├─ pages/
│  ├─ auth/
│  │  ├─ login.astro
│  │  ├─ register.astro
│  │  ├─ reset.astro
│  │  └─ reset/
│  │     └─ confirm.astro
│  ├─ logout.astro                 // albo akcja w API
│  └─ api/
│     └─ auth/
│        ├─ signin.ts
│        ├─ signup.ts
│        ├─ signout.ts
│        ├─ reset-request.ts
│        └─ reset-change.ts
├─ services/
│  └─ auth/
│     ├─ AuthService.ts            // kontrakt
│     ├─ supabaseAuthService.ts    // implementacja adaptera
│     └─ errorMapping.ts
└─ middleware/
   └─ requireAuth.ts               // guard SSR (wariant A)
```

---

## 5) Stany UI i treści komunikatów (wyciąg)

- **Wygaśnięcie sesji podczas pracy (US-013 z PRD):** globalny interceptor 401 wywołuje **soft‑prompt** do ponownego logowania (modal `/auth/login`), zachowując **stan formularza w pamięci** (Local Storage/In‑Memory) i automatycznie retry’ując akcję po odzyskaniu sesji.

- **LoginForm**
  - _Loading_ (disable, spinner), _Error_ („Nieprawidłowe dane logowania.”), _Success_ (redirect).
- **RegisterForm**
  - _Error_ („Nie udało się utworzyć konta. Sprawdź dane.”), _Success_ („Konto utworzone. Zalogowano.”).
- **ResetRequestForm**
  - _Success_ („Jeśli konto istnieje, wyślemy instrukcję na e‑mail.”).
- **ResetConfirmForm**
  - _Error_ („Nie udało się ustawić nowego hasła.”), _Success_ („Hasło zaktualizowane.”).

---

## 6) Testowalność i scenariusze E2E (skrót)

- Smoke (po deployu): render strony głównej, `/auth/login`, poprawne logowanie, wylogowanie.
- E2E (Playwright):
  1. `login_success` – logowanie i widoczność CTA „Wyloguj”.
  2. `login_invalid` – błąd ogólny bez różnicowania przyczyny.
  3. `register_then_login` – rejestracja → automatyczne logowanie.
  4. `reset_password_flow` – żądanie resetu → ustawienie nowego hasła → logowanie.
  5. `unauth_blocked_write` – próba zapisu KB bez sesji → modal logowania + 401 w API.
  6. `kb_crud_after_login` – **login → add KB entry → edit → delete** zgodnie z PRD 3.8 (wymaga zalogowania).

---

## 7) Zgodność z istniejącą aplikacją

- Publiczne widoki pozostają dostępne bez logowania (generatory, KB read‑only, presety read‑only).
- Nowe strony `/auth/*` są **dedykowane** (US‑001/US‑002) i nie wpływają na istniejące ścieżki.
- `TopBar` ma nieinwazyjny toggle stanu zalogowania; brak zmian w logice domenowej poza dodaniem sprawdzania `auth.uid()` w API/DB (już zgodne z PRD 3.1).
- Brak zmian w `astro.config.mjs`; używamy kompatybilnych mechanizmów SSR/SSG jak w pkt. 2.6.

---

## 8) Wymagane zmienne/konfiguracja

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (runtime FE + BE).
- `SUPABASE_SERVICE_ROLE_KEY` (tylko BE, do ewentualnych operacji serwerowych).
- `AUTH_RESET_REDIRECT_URL=https://<host>/auth/reset/confirm` (konfiguracja Supabase Auth).
- (Opcjonalnie) `AUTH_RATE_LIMIT_WINDOW`, `AUTH_RATE_LIMIT_MAX`.

---

## 9) Ryzyka i decyzje architektoniczne

- **Brak ujawniania istnienia e‑maila** może pogorszyć UX – wymaganie PRD jest nadrzędne.
- **SSR vs SSG:** jeśli aktualny adapter to SSG, akceptujemy „migotanie” przy pierwszym renderze TopBar (znikome).
- **Rate‑limit:** bez zewnętrznego cache’a limiter w pamięci procesu nie skaluje się horyzontalnie – wystarczy w MVP.

---

## 10) Dalsze kroki (poza zakresem US‑001/002)

- Strona profilu (edycja e‑maila/hasła), dezaktywacja konta (RODO), 2FA w przyszłości.
- Telemetria zdarzeń auth (logowanie, reset) – tylko metadane, bez PII.

---

---

## 11) Mapowanie pokrycia wymagań (US-001, US-002)

- **US-001 Rejestracja**: `/auth/register` + `POST /api/auth/signup` + auto‑login po sukcesie; walidacja e‑mail/hasło; brak ujawniania istnienia konta; komunikaty sukcesu; brak SSO w MVP.
- **US-002 Logowanie i sesja**: `/auth/login`, `POST /api/auth/signin`, `POST /api/auth/signout`, TopBar (prawy górny róg), dostęp do generatorów i szablonów bez logowania (read‑only), **blokada działań wymagających zapisu/edycji**, rate‑limit prób, **blokada tymczasowa po serii błędów**, reset hasła (`/auth/reset`, `/auth/reset/confirm`).

**Koniec specyfikacji.**
