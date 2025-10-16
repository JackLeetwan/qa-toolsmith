# API Endpoint Implementation Plan: POST `/auth/login`

## 1. Przegląd punktu końcowego

Endpoint logowania proxy'uje żądanie do Supabase Auth (ścieżka **password grant**), stosuje **rate‑limit per IP**, a następnie zwraca **token JWT** oraz rekord **profilu** z tabeli `profiles`. Celem jest bezpieczne, szybkie logowanie oraz spójny kontrakt odpowiedzi dla frontendu (Astro + React). Endpoint działa po stronie serwera (Node/Edge), nigdy w przeglądarce. **MVP Scope:** Bearer JWT only (no cookies, no MFA, no refresh_token).

## 2. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **URL:** `/auth/login`
- **Nagłówki wejściowe:**
  - `Content-Type: application/json`
  - `X-Request-ID` _(opcjonalny; jeśli brak – generowany serwerowo)_
- **Body (JSON):**
  - **Wymagane:**
    - `email: string` _(RFC 5322; przechowywany i przetwarzany w lowercase)_
    - `password: string` _(min 8, max 128)_
  - **Zakaz:**
    - Brak pól: `mfa_type`, `mfa_code`, `captcha_token`, `remember_me` _(nie w MVP)_
- **Przykład żądania:**

```json
{
  "email": "user@example.com",
  "password": "s3cr3tP@ss"
}
```

## 3. Wykorzystywane typy (DTO + Command)

**LoginRequest** (z `types.ts`)

```ts
export interface LoginRequest {
  email: string;
  password: string;
}
```

**LoginCommand** _(wewnętrzny model do serwisu – wzbogacony o IP/UA)_

```ts
export type LoginCommand = LoginRequest & {
  ip: string;
  userAgent?: string;
};
```

**ProfileDTO** _(odwzorowuje tabelę `profiles`)_

```ts
export interface ProfileDTO {
  id: string; // uuid = auth.users.id
  email: string; // citext
  role: "admin" | "user";
  created_at: string; // ISO
  updated_at: string; // ISO
}
```

**LoginResponse** (z `types.ts`) — **MVP Minimal**

```ts
export interface LoginResponse {
  access_token: string; // Supabase JWT
  profile: ProfileDTO;
}
```

**ErrorResponse** (z `types.ts`)

```ts
export interface ErrorResponse {
  error: {
    code: string; // np. "invalid_credentials"
    message: string; // opis przyjazny dla użytkownika
    details?: Record<string, Json>;
  };
}
```

## 4. Szczegóły odpowiedzi

- **200 OK** – poprawne logowanie
  - Body: `LoginResponse`
  - **BRAK cookies w MVP** (tylko Bearer JWT w response)
- **400 Bad Request** – nieprawidłowe dane wejściowe (walidacja)
- **401 Unauthorized** – błędne poświadczenia
- **429 Too Many Requests** – przekroczony limit żądań (rate‑limit)
- **500 Internal Server Error** – błąd serwera / błąd dostawcy (Supabase)

**Przykład 200:**

```json
{
  "access_token": "eyJhbGciOi...",
  "profile": {
    "id": "a5e0e0b1-...",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-10-15T06:00:00Z",
    "updated_at": "2025-10-15T06:00:00Z"
  }
}
```

## 5. Przepływ danych

1. **Walidacja wejścia** (Zod/Valibot): email, password; sprawdzenie `Content-Type`.
2. **Rate‑limit per IP**: `RateLimiterService.consume(ip)` — po przekroczeniu → 429 + `Retry-After`.
3. **Logowanie do Supabase**: `AuthService.loginWithPassword(cmd)` z kluczem **service role** (server‑side).
4. **Pobranie profilu**: `ProfileService.getByUserId(session.user.id)` z krótkim **retry/backoff** (wyścig z triggerem tworzącym rekord `profiles`).
5. **Budowa LoginResponse** (only `access_token` + `profile`).
6. **Audit/Telemetry**: zapis zdarzenia do `usage_events` (sukces/porażka) z `kind='auth'` bez danych wrażliwych.
7. **Odpowiedź 200** (lub odpowiedni kod błędu).

## 6. Względy bezpieczeństwa

- **Sekrety tylko na serwerze**: Supabase service key nigdy w kliencie.
- **Brute‑force**: rate‑limit per IP + (opcjonalnie) czasowy lock po N porażkach.
- **Bearer JWT**: `Authorization: Bearer <token>` w nagłówku; brak cookies w MVP.
- **CORS**: dozwolone wyłącznie domeny UI; `Access-Control-Allow-Credentials` → `false` (bez cookies).
- **IP za proxy**: zaufana lista proxy; wyciąganie IP z `X-Forwarded-For`.
- **Logi**: bez haseł/OTP; skrócone IP (np. /24) w audycie.
- **Nagłówki ochronne** (po stronie serwera i/lub frontu): `X-Content-Type-Options: nosniff`, `Referrer-Policy`, CSP.
- **Spójność profilu**: krótki retry po udanym logowaniu (do 2–3 prób) w razie opóźnienia triggera.

## 7. Obsługa błędów

Zwracaj `ErrorResponse` i właściwe kody:

- **400** — `invalid_body` / `invalid_email` / `invalid_password`
- **401** — `invalid_credentials`
- **429** — `rate_limited` _(z nagłówkami `Retry-After`, `X-RateLimit-Remaining`)_
- **500** — `auth_provider_error` / `unexpected_error`

**Audyt logowań** — zapis do `usage_events`:

```ts
await supabase.from("usage_events").insert({
  user_id: userId ?? null, // null jeśli login failure
  kind: "auth",
  meta: {
    status: "success" | "failure",
    reason: "invalid_credentials" | "rate_limited" | null,
    ip_cidr: "203.0.113.0/24", // masked
    user_agent_hash: sha256(userAgent),
  },
});
```

## 8. Rozważania dotyczące wydajności

- **Dwuwarstwowy rate‑limit**: middleware (edge/Nginx) + aplikacyjny (memory/Redis).
- **Połączenia do DB**: pooling.
- **Lekki payload**: wyłącznie niezbędne pola `profile`.
- **Idempotencja**: wielokrotne POST nie powinny modyfikować stanu (poza logiem audytu).
- **Krótki backoff** przy pobieraniu profilu (np. 2×50 ms) – minimalizacja latencji i flakiness.

## 9. Etapy wdrożenia (kroki)

1. **Konfiguracja**: sekrety Supabase (service key), Redis dla rate‑limit, CORS, zaufane proxy.
2. **Serwisy**:
   - `RateLimiterService` (memory/Redis: klucz `rl:login:{ip}`, okno 60 s, limit 10).
   - `AuthService.loginWithPassword(cmd)` — mapowanie błędów Supabase → kody HTTP.
   - `ProfileService.getByUserId(uid)` — SELECT + retry/backoff.
3. **Walidacja**: schemat Zod dla `LoginRequest`; twarde odrzucenie gdy `Content-Type` ≠ `application/json`.
4. **Handler**: endpoint `/auth/login` – kolejność: walidacja → rate‑limit → auth → profil → response.
5. **Observability**: logi strukturalne (JSON) z `request_id`, metryki sukces/porażka, licznik 429.
6. **Testy**:
   - Unit: walidacja DTO, mapowanie błędów.
   - Integracyjne: ścieżki 200/400/401/429/500; retry profilu.
   - E2E: szczęśliwa ścieżka; blokada po N błędach.
7. **Rollout**: staging → smoke → produkcja; alerty (wysoki współczynnik 401/429).

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
    const err: any = new Error("rate_limited");
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
      const e: any = new Error("invalid_credentials");
      e.status = 401;
      throw e;
    }
    const e: any = new Error("auth_provider_error");
    e.status = 500;
    throw e;
  }
  return data; // { session: { access_token, expires_in, user:{ id } } }
}

// profileService.ts
export async function getByUserId(uid: string): Promise<ProfileDTO> {
  for (let i = 0; i < 3; i++) {
    const row = await db.oneOrNone<ProfileDTO>(
      "select id, email, role, created_at, updated_at from profiles where id=$1",
      [uid]
    );
    if (row) return row;
    await new Promise((r) => setTimeout(r, 50));
  }
  const e: any = new Error("profile_not_ready");
  e.status = 500;
  throw e;
}

// handler.ts
export default async function handler(req: Request) {
  const requestId = getOrCreateRequestId(req);
  const ip = getTrustedIp(req, trustedProxies);
  try {
    const body = await validate<LoginRequest>(req); // Zod
    await consume(ip); // Rate-limit

    const { session } = await loginWithPassword({ ...body, ip, userAgent: req.headers.get("user-agent") ?? undefined });
    const profile = await getByUserId(session.user.id); // krótki retry

    const resp: LoginResponse = {
      access_token: session.access_token,
      profile,
    };

    return json(resp, { status: 200, headers: { "X-Request-ID": requestId } });
  } catch (err: any) {
    // Log to usage_events with kind='auth'
    await auditLoginAttempt(err, body?.email, ip);

    return json<ErrorResponse>(
      {
        error: {
          code: err.message ?? "unexpected_error",
          message: mapErrorToMessage(err),
        },
      },
      {
        status: err.status ?? 500,
        headers: { "X-Request-ID": requestId, ...(err.retryAfter ? { "Retry-After": String(err.retryAfter) } : {}) },
      }
    );
  }
}
```

## Uwagi o MVP Scope

**Nie w MVP (dodać w przyszłości):**

- MFA (TOTP, WebAuthn, recovery codes)
- Refresh tokens (JWT session-based only)
- HttpOnly cookies (Bearer JWT in Authorization header)
- Captcha (brute-force protection via rate-limit)
- Remember-me (session expires on browser close)

**Audyt bez separate tabeli:**

- Użyj istniejącej `usage_events` z `kind='auth'` (zamiast `auth_login_events`)
- Trigger DB będzie logować zmiany (jeśli potrzebne)
