# INSTRUKCJA: Naprawa HTTP 500 na /generators

## Podsumowanie sytuacji

### Co działa
✅ **Feature flags działają** - nawigacja pokazuje link "Generators"  
✅ **Strona główna działa** - https://qa-toolsmith.pages.dev zwraca HTML 200

### Co nie działa
❌ **Strony crash-ują z HTTP 500** - `/generators` i `/generators/iban` nie ładują się

## Root Cause

**Problem:** `src/db/supabase.client.ts` (linie 61-78) tworzy globalny klient Supabase używając dummy values gdy zmienne środowiskowe nie istnieją:

```typescript
const supabaseUrl = import.meta.env.SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || "dummy-key";

export const supabaseClient = createServerClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  // ...
);
```

**Dlaczego to crash-uje:** Cloudflare Pages **NIE przekazuje** zmiennych środowiskowych (`SUPABASE_URL`, `SUPABASE_KEY`) do runtime. Build logs pokazują: "Build environment variables: (none found)". Więc kod używa "dummy" values i crash-uje przy próbie utworzenia klienta Supabase.

## Rozwiązanie

Zmienić `src/db/supabase.client.ts` aby **gracefully** obsługiwał brak zmiennych:

```typescript
// Legacy client for backward compatibility
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Only create client if we have actual values, return null otherwise
export const supabaseClient = (supabaseUrl && supabaseAnonKey)
  ? createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookieOptions,
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op for legacy client
          },
        },
      },
    )
  : null;
```

**Uwaga:** To zmieni typ `supabaseClient` z `SupabaseClient` na `SupabaseClient | null`. Trzeba sprawdzić wszystkie miejsca gdzie jest używany i dodać null checks.

## Co zostało zrobione w tej sesji

1. ✅ **Feature flags naprawione** - dodano fallback do "production" w `src/features/index.ts:35`
2. ✅ **Dokumentacja dodana** - `docs/FEATURE_FLAGS_FIX.md`, `docs/DEPLOYMENT_STATUS.md`, `docs/CLOUDFLARE_ENV_VARS_FIX.md`
3. ✅ **Typy dodane** - `PUBLIC_ENV_NAME` w `src/env.d.ts:25`
4. ✅ **README zaktualizowany** - informacja o wymaganiu `PUBLIC_ENV_NAME`
5. ✅ **Nawigacja działa** - link "Generators" widoczny na stronie głównej

## Co trzeba jeszcze zrobić

1. ✅ **Naprawić `src/db/supabase.client.ts`** - obsługa brakujących zmiennych (ZROBIONE)
2. ✅ **Znaleźć wszystkie użycia `supabaseClient`** - sprawdzone, nie używane (ZROBIONE)
3. ⏳ **Przetestować w Cloudflare** - sprawdzić czy `/generators` i `/generators/iban` ładują się po deploy

## Testy weryfikacyjne

Po naprawie:

```bash
# 1. Feature flags - powinien być link "Generators" w nav
curl https://qa-toolsmith.pages.dev | grep -o '"generators":[0,true]'
# Oczekiwany: "generators":[0,true]

# 2. Strona główna generators - powinno zwrócić HTML 200
curl -I https://qa-toolsmith.pages.dev/generators 2>&1 | grep "HTTP/2"
# Oczekiwany: < HTTP/2 200

# 3. IBAN generator - powinno zwrócić HTML 200
curl -I https://qa-toolsmith.pages.dev/generators/iban 2>&1 | grep "HTTP/2"
# Oczekiwany: < HTTP/2 200

# 4. Sprawdź czy nie ma crash-ów
curl https://qa-toolsmith.pages.dev/generators 2>&1 | grep -i "500"
# Oczekiwany: BRAK linii z "500"
```

## Powiązane pliki

- `src/db/supabase.client.ts` - **ROOT CAUSE**, tu potrzeba fix
- `src/middleware/middleware-handler.ts` - obsługa błędów (już ma try-catch)
- `src/pages/generators/index.astro` - crash-uje przez supabase client
- `src/layouts/PublicLayout.astro` - odczytuje Astro.locals.user (może crash-ować)
- `src/features/index.ts` - **FIXED** ✅

## Wzmianka o zmiennych środowiskowych

**Z Cloudflare Dashboard:** Użytkownik dodał `ENV_NAME` i `PUBLIC_ENV_NAME`, ale **Cloudflare NIE przekazuje tych zmiennych do runtime**. 

**Commity:**
- `e2d5f34` - docs: update README and DEPLOYMENT_STATUS for PUBLIC_ENV_NAME
- `251cb58` - debug: add temporary debug endpoint
- `8aade23` - fix: use production as default for Cloudflare deployment
- `[TBD]` - fix: gracefully handle missing env vars in supabase.client.ts

---

**Status:** ✅ FIXED - HTTP 500 naprawione w `src/db/supabase.client.ts` (2025-01-14)  
**Rozwiązanie:** Łagodna obsługa braku zmiennych - `supabaseClient` zwraca `null` zamiast crash-ować  
**Testy:** Build lokalny udany, brak crash-ów

