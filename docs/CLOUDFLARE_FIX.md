# Fix dla Cloudflare Pages Deployment

## Problem
Aplikacja zwracała HTTP 500 po deploy na Cloudflare Pages pomimo prawidłowych kluczy API.

## Przyczyna
Kod nie miał walidacji zmiennych środowiskowych, co powodowało błędy gdy zmienne nie były dostępne w runtime.

## Rozwiązanie

### 1. Dodano walidację zmiennych środowiskowych

**Plik:** `src/db/supabase.client.ts`

Dodano sprawdzenie czy wszystkie wymagane zmienne są dostępne z czytelnym komunikatem błędu.

### 2. Dodano obsługę błędów w middleware

**Plik:** `src/middleware/middleware-handler.ts`

Middleware teraz łagodnie obsługuje błędy braku zmiennych środowiskowych, pozwalając publicznym stronom działać nawet gdy Supabase nie jest skonfigurowany.

### 3. Dodano endpoint diagnostyczny

**Endpoint:** `/api/env-check`

Nowy endpoint pozwala sprawdzić czy wszystkie wymagane zmienne środowiskowe są ustawione bez ujawniania ich wartości.

### 4. Poprawiono nazwy zmiennych w dokumentacji

**Plik:** `README.md`

Zmieniono z `SUPABASE_ANON_KEY` na `SUPABASE_KEY` (zgodnie z kodem).

## Instrukcja dla Cloudflare Pages

### 1. Sprawdź ustawione zmienne środowiskowe

W dashboard Cloudflare Pages → Settings → Environment Variables upewnij się, że masz:

✅ **SUPABASE_URL**  
✅ **SUPABASE_KEY** (nie SUPABASE_ANON_KEY)  
✅ **SUPABASE_SERVICE_KEY**  
✅ **ENV_NAME** = production  
✅ **OPENROUTER_API_KEY** (opcjonalne)

### 2. Pobierz klucze z Supabase Dashboard

1. Otwórz Supabase Dashboard → Your Project → Settings → API
2. Skopiuj **anon public** key → użyj jako `SUPABASE_KEY`
3. Skopiuj **service_role** key → użyj jako `SUPABASE_SERVICE_KEY`
4. Upewnij się, że kopiujesz **pełne wartości** (long JWT tokens)

### 3. Zdeployuj zmiany

```bash
git add .
git commit -m "fix: add environment variable validation for Cloudflare deployment"
git push
```

### 4. Przetestuj po deploy

#### A. Sprawdź endpoint diagnostyczny:
```bash
curl https://qa-toolsmith.pages.dev/api/env-check
```

Oczekiwany wynik:
```json
{
  "supabase_url": true,
  "supabase_key": true,
  "supabase_service_key": true,
  "openrouter_api_key": true,
  "env_name": true,
  "all_set": true
}
```

Jeśli `all_set` jest `false`, sprawdź które zmienne są `false` i upewnij się że są ustawione w Cloudflare.

#### B. Sprawdź health endpoint:
```bash
curl https://qa-toolsmith.pages.dev/api/health
```

Oczekiwany wynik:
```json
{"status":"ok"}
```

#### C. Sprawdź stronę główną:
```bash
curl https://qa-toolsmith.pages.dev
```

Powinno zwrócić HTML strony głównej (status 200).

### 5. Jeśli nadal błędy

Sprawdź logs w Cloudflare Pages:
1. Idź do Cloudflare Pages → Deployments
2. Kliknij na najnowsze deployment
3. Sprawdź Functions logs

Błędy będą teraz bardziej szczegółowe i pokażą dokładnie która zmienna środowiskowa jest brakująca.

## Dodatkowe informacje

- Pełna dokumentacja deployment: `docs/deployment-cloudflare.md`
- Testowanie lokalne: `npm run build && npm run preview`
- Sprawdzanie zmiennych lokalnie: ustaw w `.env`

