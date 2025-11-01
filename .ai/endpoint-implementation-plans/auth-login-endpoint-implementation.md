# API Endpoint Implementation Plan: POST `/auth/login`

## 1. Przegląd punktu końcowego
Punkt końcowy logowania proxy’uje żądanie do Supabase Auth (ścieżka **password grant**), stosuje **rate‑limit per IP**, a następnie zwraca **token(y) JWT** oraz rekord **profilu** z tabeli `profiles`. Celem jest bezpieczne, szybkie logowanie oraz spójny kontrakt odpowiedzi dla frontendu (Astro + React). Endpoint działa po stronie serwera (Node/Edge), nigdy w przeglądarce.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **URL:** `/auth/login`
- **Nagłówki wejściowe:**
  - `Content-Type: application/json`
  - `X-Request-ID` *(opcjonalny; jeśli brak – generowany serwerowo)*
- **Body (JSON):**
  - **Wymagane:**
    - `email: string` *(RFC 5322; przechowywany i przetwarzany w lowercase)*
    - `password: string` *(min 8, max 128)*
  - **Opcjonalne:**
    - `mfa_type: 'totp' | 'webauthn' | 'recovery'`
    - `mfa_code: string`
    - `captcha_token: string`
    - `remember_me: boolean` *(wydłuża żywotność refresh tokena / cookie)*
- **Przykład żądania:**
```json
{
  "email": "user@example.com",
  "password": "s3cr3tP@ss",
  "remember_me": true
}
```

## 3. Wykorzystywane typy (DTO + Command)
**LoginRequestDTO**
```ts
export interface LoginRequestDTO {
  email: string;
  password: string;
  mfa_type?: 'totp' | 'webauthn' | 'recovery';
  mfa_code?: string;
  captcha_token?: string;
  remember_me?: boolean;
}
```

**LoginCommand** *(wewnętrzny model do serwisu – wzbogacony o IP/UA)*
```ts
export type LoginCommand = LoginRequestDTO & {
  ip: string;
  userAgent?: string;
};
```

**ProfileDTO** *(odwzorowuje tabelę `profiles`)*
```ts
export interface ProfileDTO {
  id: string;           // uuid = auth.users.id
  email: string;        // citext
  role: 'admin' | 'user';
  org_id?: string | null;
  created_at: string;   // ISO
  updated_at: string;   // ISO
}
```

**LoginResponseDTO**
```ts
export interface LoginResponseDTO {
  access_token: string;
  refresh_token?: string;
  token_type: 'bearer';
  expires_in: number;   // w sekundach
  profile: ProfileDTO;
}
```

**ErrorResponse**
```ts
export interface ErrorResponse {
  error: string;        // krótki kod (np. "invalid_credentials")
  message: string;      // opis przyjazny dla użytkownika
  request_id?: string;  // X-Request-ID do korelacji logów
}
```

## 4. Szczegóły odpowiedzi
- **200 OK** – poprawne logowanie
  - Body: `LoginResponseDTO`
  - Cookies *(zalecane)*:
    - `sb-access-token` — `HttpOnly; Secure; SameSite=Lax; Max-Age=expires_in`
    - `sb-refresh-token` — `HttpOnly; Secure; SameSite=Lax; Max-Age` dłuższy przy `remember_me=true`
- **400 Bad Request** – nieprawidłowe dane wejściowe (walidacja)
- **401 Unauthorized** – błędne poświadczenia / niepoprawne MFA
- **429 Too Many Requests** – przekroczony limit żądań (rate‑limit)
- **500 Internal Server Error** – błąd serwera / błąd dostawcy (Supabase)

**Przykład 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "profile": {
    "id": "a5e0e0b1-...",
    "email": "user@example.com",
    "role": "user",
    "org_id": null,
    "created_at": "2025-10-15T06:00:00Z",
    "updated_at": "2025-10-15T06:00:00Z"
  }
}
```

## 5. Przepływ danych
1. **Walidacja wejścia** (Zod/Joi): email, password, opcjonalne pola; sprawdzenie `Content-Type`.
2. **Rate‑limit per IP**: `RateLimiterService.consume(ip)` — po przekroczeniu → 429 + `Retry-After`.
3. **Logowanie do Supabase**: `AuthService.loginWithPassword(cmd)` z kluczem **service role** (server‑side).
4. **Pobranie profilu**: `ProfileService.getByUserId(session.user.id)` z krótkim **retry/backoff** (wyścig z triggerem tworzącym rekord `profiles`).
5. **Ustawienie ciasteczek** (HttpOnly/Secure) oraz budowa `LoginResponseDTO`.
6. **Audit/Telemetry**: zapis zdarzenia (sukces/porażka) bez danych wrażliwych.
7. **Odpowiedź 200** (lub odpowiedni kod błędu).

## 6. Względy bezpieczeństwa
- **Sekrety tylko na serwerze**: Supabase service key nigdy w kliencie.
- **Brute‑force**: rate‑limit + (opcjonalnie) captcha po N porażkach.
- **Cookies**: `HttpOnly`, `Secure`, `SameSite=Lax`; brak dostępu z JS.
- **CORS**: dozwolone wyłącznie domeny UI; `Access-Control-Allow-Credentials` → `true` tylko gdy konieczne.
- **IP za proxy**: zaufana lista proxy; wyciąganie IP z `X-Forwarded-For`.
- **Logi**: bez haseł/OTP/captcha; skrócone IP (np. /24) w audycie.
- **MFA**: obsłuż kody `mfa_required` / `mfa_invalid`; nie loguj sekretów TOTP.
- **Nagłówki ochronne** (po stronie serwera i/lub frontu): `X-Content-Type-Options: nosniff`, `Referrer-Policy`, CSP.
- **Spójność profilu**: krótki retry po udanym logowaniu (do 2–3 prób) w razie opóźnienia triggera.

## 7. Obsługa błędów
Zwracaj `ErrorResponse` i właściwe kody:
- **400** — `invalid_body` / `invalid_email` / `invalid_password`
- **401** — `invalid_credentials` / `mfa_required` / `mfa_invalid`
- **429** — `rate_limited` *(z nagłówkami `Retry-After`, `X-RateLimit-Remaining`)* 
- **500** — `auth_provider_error` / `unexpected_error`

**Audyt logowań** (zalecenie – tabela `auth_login_events` lub rozszerzenie `usage_events`):
```
id uuid PK,
user_id uuid NULL,
email text NULL,           -- hash lub zmaskowany
ip_cidr text,              -- np. 203.0.113.0/24
ua text,
status 'success'|'failure',
reason text NULL,          -- np. invalid_credentials, rate_limited
created_at timestamptz DEFAULT now()
```

## 8. Rozważania dotyczące wydajności
- **Dwuwarstwowy rate‑limit**: edge (NGINX/Traefik) + aplikacyjny (Redis).
- **Połączenia do DB**: pooling (jeśli bezpośredni dostęp).
- **Lekki payload**: wyłącznie niezbędne pola `profile`.
- **Idempotencja**: wielokrotne POST nie powinny modyfikować stanu (poza logiem audytu).
- **Krótki backoff** przy pobieraniu profilu (np. 2×50 ms) – minimalizacja latencji i flakiness.

## 9. Etapy wdrożenia (kroki)
1. **Konfiguracja**: sekrety Supabase (service key), Redis dla rate‑limit, CORS, zaufane proxy.
2. **Schemat**: utworzyć `auth_login_events` + indeksy (`created_at`, `ip_cidr`, `email`).
3. **Serwisy**:
   - `RateLimiterService` (Redis: klucz `rl:login:{ip}`, okno 60 s, limit np. 10).
   - `AuthService.loginWithPassword(cmd)` — mapowanie błędów Supabase → kody HTTP.
   - `ProfileService.getByUserId(uid)` — SELECT + retry/backoff.
4. **Walidacja**: schemat Zod dla `LoginRequestDTO`; twarde odrzucenie gdy `Content-Type` ≠ `application/json`.
5. **Handler**: endpoint `/auth/login` – kolejność: walidacja → rate‑limit → auth → profil → cookies → response.
6. **Observability**: logi strukturalne (JSON) z `request_id`, metryki sukces/porażka, licznik 429.
7. **Testy**:
   - Unit: walidacja DTO, mapowanie błędów.
   - Integracyjne: ścieżki 200/400/401/429/500; retry profilu.
   - E2E: szczęśliwa ścieżka; blokada po N błędach.
8. **Rollout**: staging → smoke → produkcja; alerty (wysoki współczynnik 401/429).

## 10. Pseudokod (TypeScript)

```ts
// rateLimiter.ts
export async function consume(ip: string) {
  const key = `rl:login:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  const limit = 10;
  if (count > limit) {
    const ttl = await redis.ttl(key);
    const err: any = new Error('rate_limited');
    err.status = 429;
    err.retryAfter = ttl > 0 ? ttl : 60;
    throw err;
  }
}

// authService.ts
export async function loginWithPassword(cmd: LoginCommand) {
  const { email, password } = cmd;
  const { data, error } = await supabaseAuth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 400 || error.status === 401) {
      const e: any = new Error('invalid_credentials');
      e.status = 401;
      throw e;
    }
    const e: any = new Error('auth_provider_error');
    e.status = 500;
    throw e;
  }
  return data; // { session: { access_token, refresh_token, expires_in, user:{ id } } }
}

// profileService.ts
export async function getByUserId(uid: string): Promise<ProfileDTO> {
  for (let i = 0; i < 3; i++) {
    const row = await db.oneOrNone<ProfileDTO>('select id, email, role, org_id, created_at, updated_at from profiles where id=$1', [uid]);
    if (row) return row;
    await new Promise(r => setTimeout(r, 50));
  }
  const e: any = new Error('profile_not_ready');
  e.status = 500;
  throw e;
}

// handler.ts
export default async function handler(req: Request) {
  const requestId = getOrCreateRequestId(req);
  const ip = getTrustedIp(req, trustedProxies);
  try {
    const body = await validate<LoginRequestDTO>(req);        // Zod/Joi
    await consume(ip);                                        // Rate-limit

    const { session } = await loginWithPassword({ ...body, ip, userAgent: req.headers.get('user-agent') ?? undefined });
    const profile = await getByUserId(session.user.id);       // krótki retry

    const resp: LoginResponseDTO = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: 'bearer',
      expires_in: session.expires_in,
      profile
    };

    const headers = setAuthCookies(session, body.remember_me === true);
    headers.set('X-Request-ID', requestId);
    return json(resp, { status: 200, headers });

  } catch (err: any) {
    return json<ErrorResponse>({
      error: err.message ?? 'unexpected_error',
      message: mapErrorToMessage(err),
      request_id: requestId
    }, {
      status: err.status ?? 500,
      headers: { 'X-Request-ID': requestId, ...(err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : {}) }
    });
  } finally {
    auditLoginAttempt(/* status, reason, email hash, ip/ua masked */);
  }
}
```

> **Uwaga o kodach statusu:** ponieważ endpoint wymaga limitowania per IP, użycie **429** jest standardowe i zalecane obok 200/201/400/401/404/500.
