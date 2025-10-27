# Problem z Feature Flags na Produkcji

## 🚨 Problem

Na produkcji (https://qa-toolsmith.pages.dev) **NIE są widoczne** zakładki nawigacji, mimo że w `src/features/config.production.ts` flagi są ustawione na `true`:

```typescript
collections: {
  generators: true,  // ✅ Powinno być widoczne
  // ... inne flagi
}
```

## 🔍 Przyczyna

### Niespójność w użyciu zmiennych środowiskowych

Aplikacja używa **dwóch różnych zmiennych środowiskowych** dla tego samego celu:

1. **Server-side** (SSR) - używa: `import.meta.env.ENV_NAME`
   - Plik: `src/features/index.ts:34`
   
2. **Client-side** (React components) - używa: `import.meta.env.PUBLIC_ENV_NAME`
   - Plik: `src/lib/utils/environment.ts:9`

### Obecna sytuacja w Cloudflare

- ✅ `ENV_NAME=production` - **USTAWIONY** (w Cloudflare Dashboard)
- ❌ `PUBLIC_ENV_NAME` - **NIE USTAWIONY**

### Rezultat

1. Server-side 🤝→ Poprawnie odczytuje `ENV_NAME=production` → ładuje `config.production.ts` → widzi `generators: true`
2. Client-side 💔→ Próbuje odczytać `PUBLIC_ENV_NAME` → dostaje `undefined` → wraca do **safe defaults** (wszystko `false`)

**Efekt:** Nawigacja renderowana po stronie klienta pokazuje wszystkie linki jako ukryte.

## 📝 Co zostało zrobione w tej sesji

### 1. Naprawiono problem MessageChannel (deployment)
- **Problem:** React 19 używał `MessageChannel` dla SSR, niedostępnego w Cloudflare Workers
- **Rozwiązanie:** Dodano alias `react-dom/server.edge` w `astro.config.mjs`
- **Status:** ✅ DEPLOYED SUCCESSFULLY (commit `fbb9d99do`, `912b792`)

### 2. Dodano dokumentację
- `docs/DEPLOYMENT_STATUS.md` - pełna historia deploymentu

### 3. Zidentyfikowano problem z feature flags
- Wykryto niespójność między server-side i client-side
- Zidentyfikowano brak `PUBLIC_ENV_NAME` w Cloudflare

## 🔧 Rozwiązanie

### Opcja 1: Ustaw PUBLIC_ENV_NAME w Cloudflare (ZALECANE)

1. **Otwórz Cloudflare Dashboard:**
   - Workers & Pages → qa-toolsmith → Settings → Environment Variables

2. **Dodaj nową zmienną:**
   - **Name:** `PUBLIC_ENV_NAME`
   - **Value:** `production`
   - **Environment:** Production
   - **Type:** Plain text

3. **Redeploy:**
   - Uruchom manual redeploy z najnowszego commita
   - Albo push dowolną zmianę do trigger automatycznego build

### Opcja 2: Zmień kod na użycie jednej zmiennej (ALTERNATYWNE)

Zamiast używać `PUBLIC_ENV_NAME` dla client-side, zmień `src/lib/utils/environment.ts` aby używał `ENV_NAME`:

```typescript
export function getClientEnvName(): EnvName | null {
  // Zmień z PUBLIC_ENV_NAME na ENV_NAME
  const envName = import.meta.env.ENV_NAME;
  
  if (!envName || !["local", "integration", "production"].includes(envName)) {
    return null;
  }
  
  return envName as EnvName;
}
```

**Uwaga:** Ta opcja wymaga dodania `ENV_NAME` do `src/env.d.ts` jako publicznej zmiennej.

### Opcja 3: Konfiguracja Astro (KOMPLEKSOWA)

W `astro.config.mjs` dodaj konfigurację aby env vars były dostępne:

```javascript
export default defineConfig({
  // ... existing config
  env: {
    mode: "env",
  },
});
```

Ale to może wymagać dodatkowych zmian.

## ✅ Weryfikacja po naprawie

### 1. Sprawdź ENV_NAME:
```bash
curl https://qa-toolsmith.pages.dev/api/env-check
```

**Oczekiwany wynik:**
```json
{
  "env_name": true,
  "all_set": true
}
```

### 2. Sprawdź czy nawigacja jest widoczna:
- Otwórz https://qa-toolsmith.pages.dev
- Sprawdź czy link "Generators" jest widoczny w górnym menu
- Powinien być widoczny dla wszystkich użytkowników (niezalogowanych i zalogowanych)

### 3. Test lokalny z PUBLIC_ENV_NAME:
```bash
PUBLIC_ENV_NAME=production npm run dev
```

## 📂 Ważne pliki

- `src/features/config.production.ts` - flagi dla produkcji
- `src/features/index.ts:34` - server-side loading (ENV_NAME)
- `src/lib/utils/environment.ts:9` - client-side loading (PUBLIC_ENV_NAME)
- `src/components/TopBar.tsx` - renderowanie nawigacji (client-side)
- `src/layouts/PublicLayout.astro` - przekazywanie features do TopBar
- `wrangler.toml` - konfiguracja Cloudflare
- `astro.config.mjs` - konfiguracja Astro

## 🔗 Powiązane dokumenty

- `docs/DEPLOYMENT_STATUS.md` - historia deploymentu
- `docs/CLOUDFLARE_FIX.md` - fix dla Cloudflare
- `docs/api.md` - dokumentacja API

## 🎯 Następne kroki

1. ✅ **PIERWSZY KROK:** Dodaj `PUBLIC_ENV_NAME=production` do Cloudflare Dashboard
2. ✅ Redeploy aplikacji
3. ✅ Przetestuj nawigację na produkcji
4. ⏳ Jeśli nie zadziała - rozważ Opcję 2 (zmiana kodu)
5. ⏳ Dodaj testy E2E dla feature flags na produkcji

## 💡 Propozycje na przyszłość

1. **Ujednolicenie zmiennych:** Używaj zawsze tej samej zmiennej po obu stronach (SSR + client)
2. **Dodaj test:** E2E test który sprawdza czy nawigacja jest widoczna na produkcji
3. **Dokumentacja:** Dodaj do README informację o konieczności ustawienia `PUBLIC_ENV_NAME`
4. **TypeScript:** Dodaj `PUBLIC_ENV_NAME` do `src/env.d.ts` typów

---

**Ostatnia aktualizacja:** 2025-10-27 12:15 UTC  
**Autor:** Agent session fix MessageChannel deployment  
**Status:** 🔴 Problem zidentyfikowany, czeka na naprawę

