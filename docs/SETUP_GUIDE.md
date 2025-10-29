# Przewodnik Konfiguracji QA Toolsmith

Prosta instrukcja konfiguracji wszystkich wymaganych sekretów i zmiennych środowiskowych.

## 🎯 Ważne: Różnica między GitHub a Cloudflare

**GitHub Secrets** → do testów E2E w CI/CD

- `ENV_NAME = integration` (włączamy wszystkie funkcje do testowania)
- **Supabase credentials**: Zazwyczaj te same co w Cloudflare (production baza)

**Cloudflare Environment Variables** → do produkcji

- `ENV_NAME = production` (tylko MVP features włączone)
- **Supabase credentials**: Production credentials (gdy użytkownicy używają aplikacji)

**Uwaga**: Jeśli masz jedną bazę Supabase, użyj tych samych credentials w GitHub i Cloudflare. Jeśli masz separate bazy (dev/prod), użyj dev credentials w GitHub, prod credentials w Cloudflare.

## 📋 Wymagane dane wejściowe

Zanim zaczniesz, zbierz:

1. **Supabase credentials** - z Supabase Dashboard
2. **Cloudflare credentials** - z Cloudflare Dashboard
3. **Dostęp do GitHub** - do konfiguracji sekretów

---

## 🔐 KROK 1: Konfiguracja GitHub Secrets

### 1.1 Otwórz GitHub Repository Settings

1. Wejdź na: `https://github.com/{TWÓJ_USERNAME}/qa-toolsmith`
2. Kliknij **"Settings"** (na górze, ostatni element)
3. W lewym menu kliknij **"Secrets and variables"** → **"Actions"**
4. Kliknij **"New repository secret"**

### 1.2 Dodaj Sekrety Supabase

**Secret 1: `SUPABASE_URL`**

- **Name**: `SUPABASE_URL`
- **Secret**: `https://xxxxx.supabase.co` (twój URL)
- **Gdzie znaleźć**: Supabase Dashboard → Settings → API → Project URL

**Secret 2: `SUPABASE_KEY`**

- **Name**: `SUPABASE_KEY`
- **Secret**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key)
- **Gdzie znaleźć**: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

**Secret 3: `SUPABASE_SERVICE_KEY`**

- **Name**: `SUPABASE_SERVICE_KEY`
- **Secret**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service role key)
- **Gdzie znaleźć**: Supabase Dashboard → Settings → API → Project API keys → `service_role` (⚠️ NIE udostępniaj tego klucza)

**Secret 4: `ENV_NAME`**

- **Name**: `ENV_NAME`
- **Secret**: `integration`
- **Value**: `integration` dla testów E2E i GitHub Actions
- **Dlaczego nie `production`?**:
  - W CI testujemy E2E z production database, ale potrzebujemy włączyć WSZYSTKIE funkcje do testowania
  - W `integration` (zobacz `src/features/config.integration.ts`) są rozpoczęte: generators, charters, templates, knowledgeBase
  - W `production` (zobacz `src/features/config.production.ts`) dla MVP są wyłączone: charters, templates, knowledgeBase
  - Testujemy całą funkcjonalność, a nie tylko MVP features
- **Uwaga**: W Cloudflare Pages będziemy używać `production`, ale w GitHub Secrets używamy `integration`

**Secret 5: `OPENROUTER_API_KEY`** (opcjonalnie)

- **Name**: `OPENROUTER_API_KEY`
- **Secret**: `sk-or-v1-xxxxx`
- **Gdzie znaleźć**: https://openrouter.ai/keys (opcjonalnie, tylko jeśli używasz AI features)

### 1.3 Dodaj Sekrety Cloudflare

**Secret 6: `CLOUDFLARE_API_TOKEN`**

- **Name**: `CLOUDFLARE_API_TOKEN`
- **Secret**: (utworzysz w kroku 2.1)

**Secret 7: `CLOUDFLARE_ACCOUNT_ID`**

- **Name**: `CLOUDFLARE_ACCOUNT_ID`
- **Secret**: (pokazane w kroku 2.2)

**Secret 8: `CLOUDFLARE_PAGES_PROJECT_NAME`** (opcjonalnie)

- **Name**: `CLOUDFLARE_PAGES_PROJECT_NAME`
- **Secret**: `qa-toolsmith`
- **Note**: Domyślnie `qa-toolsmith`, ale możesz zmienić jeśli masz inną nazwę projektu

### 1.4 Weryfikacja GitHub Secrets

Po dodaniu wszystkich sekretów, lista w GitHub powinna wyglądać tak:

- ✅ SUPABASE_URL
  - ✅ SUPABASE_KEY
  - ✅ SUPABASE_SERVICE_KEY
  - ✅ ENV_NAME (`integration`)
  - ✅ OPENROUTER_API_KEY (jeśli dodałeś)
  - ✅ CLOUDFLARE_API_TOKEN
  - ✅ CLOUDFLARE_ACCOUNT_ID
  - ✅ CLOUDFLARE_PAGES_PROJECT_NAME (jeśli dodałeś)

---

## ☁️ KROK 2: Konfiguracja Cloudflare

### 2.1 Utwórz Cloudflare API Token

1. Wejdź na: https://dash.cloudflare.com/
2. Kliknij avatar (prawy górny róg) → **"My Profile"**
3. Z lewego menu wybierz **"API Tokens"**
4. Kliknij **"Create Token"**
5. Kliknij **"Get started"** przy template **"Cloudflare Pages - Edit"**
6. Skonfiguruj token:
   - **Permissions** (3 dropdowny):
     - **Pierwszy dropdown**: Wybierz **"Account"**
     - **Drugi dropdown**: Wybierz **"Cloudflare Pages"**
     - **Trzeci dropdown**: Wybierz **"Edit"**
   - **Account Resources**:
     - W pierwszym dropdown wybierz **"Include"**
     - W drugim dropdown wybierz **swój account** (np. "Jakub.litkowski@gmail.com's Account")
   - **Zone Resources**: Możesz pominąć (nie wymagane dla Pages)
   - **Client IP Address Filtering**: Zostaw puste (lub ustaw jeśli potrzebujesz)
   - **TTL**: Opcjonalnie, możesz ustawić datę wygaśnięcia
   - **Continue to summary** → **Create Token**
7. **⚠️ WAŻNE**: Skopiuj token (nie pokazuje się drugi raz!)
8. **Wróć do kroku 1.3** i dodaj ten token jako `CLOUDFLARE_API_TOKEN` w GitHub

### 2.2 Znajdź Cloudflare Account ID

1. W Cloudflare Dashboard znajdź URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/...`
2. **ACCOUNT_ID** to ta długo liczba w URL
3. Skopiuj ją i dodaj jako `CLOUDFLARE_ACCOUNT_ID` w GitHub (krok 1.3)

### 2.3 Utwórz Projekt Cloudflare Pages (jeśli jeszcze nie istnieje)

1. W Cloudflare Dashboard kliknij **"Workers & Pages"** (lewe menu)
2. Kliknij **"Create application"** → **"Pages"** → **"Connect to Git"**
3. Wybierz **"GitHub"** i podłącz swoje repozytorium `qa-toolsmith`
4. Kliknij **"Begin setup"**
5. Skonfiguruj project:
   - **Project name**: `qa-toolsmith` (lub dowolną nazwę)
   - **Production branch**: `master`
   - **Framework preset**: "None" lub "Astro"
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (zostaw puste)
6. Kliknij **"Save and Deploy"**

**⚠️ WAŻNE**: Przed kliknięciem "Save and Deploy", przeskocz do kroku 2.4!

### 2.4 Dodaj Environment Variables w Cloudflare Pages

1. Przed pierwszą deployment (lub jeśli project już istnieje):
2. W Cloudflare Pages → Twój projekt → **"Settings"** (górne menu)
3. Kliknij **"Environment Variables"** (lewe menu)
4. Kliknij **"Add variable"** i dodaj wszystkie:

**Dla Production (domyślne):**

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key)
SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role key)
ENV_NAME = production
```

**Uwaga**: W Cloudflare Pages używamy `production`, w GitHub Secrets używamy `integration` dla testów!

5. Każdą zmienną dodaj osobno:
   - Wpisz **Name** (dokładnie jak powyżej, wielkość liter ma znaczenie!)
   - Wpisz **Value**
   - Zostaw checkbox "Value for preview deployments" odznaczony (lub zaznaczony jak chcesz)
   - Kliknij **"Save"**

### 2.5 Weryfikacja Cloudflare Variables

Po dodaniu, lista powinna zawierać:

- ✅ SUPABASE_URL
- ✅ SUPABASE_KEY
- ✅ SUPABASE_SERVICE_KEY
- ✅ ENV_NAME
- ✅ OPENROUTER_API_KEY (jeśli dodałeś)

---

## ✅ KROK 3: Weryfikacja i Testowanie

### 3.1 Weryfikacja że wszystkie sekrety są ustawione

W GitHub:

- Settings → Secrets and variables → Actions
- Sprawdź czy wszystkie 8 sekretów są na liście

W Cloudflare:

- Workers & Pages → Twój projekt → Settings → Environment Variables
- Sprawdź czy wszystkie zmienne są dodane

### 3.2 Test CI Pipeline

1. Otwórz nowy Pull Request w repozytorium
2. GitHub Actions automatycznie uruchomi workflow `CI Pipeline`
3. Sprawdź czy wszystkie joby przechodzą:
   - ✅ Lint
   - ✅ Build
   - ✅ Test
   - ✅ E2E Tests

### 3.3 Test Deployment

1. Zmerguj PR do brancha `master`
2. GitHub Actions automatycznie uruchomi workflow `Deploy to Cloudflare Pages`
3. Sprawdź czy deployment się udał:
   - W GitHub Actions widzisz zielony ✓ przy "Deploy to Cloudflare Pages"
   - W Cloudflare Pages widzisz nowy deployment

### 3.4 Weryfikacja Działającej Aplikacji

Po udanym deployment:

1. Odwiedź: `https://qa-toolsmith.pages.dev` (lub twoja custom domain)
2. Sprawdź health endpoint:
   ```bash
   curl https://qa-toolsmith.pages.dev/api/health
   # Powinno zwrócić: {"status":"ok"}
   ```
3. Sprawdź czy zmienne są ustawione:
   ```bash
   curl https://qa-toolsmith.pages.dev/api/env-check
   # Powinno zwrócić: {"supabase_url":true,"supabase_key":true,..."all_set":true}
   ```

---

## 🆘 Troubleshooting

### Problem: CI Pipeline fails z "Missing secrets"

**Rozwiązanie:**

- Sprawdź czy wszystkie wymagane sekrety są dodane w GitHub Settings
- Sprawdź czy nazwy sekretów są dokładnie jak w liście (wielkość liter!)

### Problem: Deployment skipped

**Rozwiązanie:**

- Sprawdź czy `CLOUDFLARE_API_TOKEN` jest poprawny
- Sprawdź czy `CLOUDFLARE_ACCOUNT_ID` jest poprawny
- Zobacz logi GitHub Actions dla szczegółów

### Problem: Application nie działa po deployment (500 errors)

**Rozwiązanie:**

- Sprawdź czy environment variables są dodane w Cloudflare Pages
- Sprawdź endpoint `/api/env-check` - czy wszystkie zmienne są `true`?
- Sprawdź logi w Cloudflare Pages dashboard

### Problem: Nie widzę endpointu `/api/env-check`

**Rozwiązanie:**

- To normalne! Endpoint może być dostępny tylko jeśli został zaimplementowany
- Sprawdź endpoint `/api/health` zamiast tego

---

## 📚 Przydatne Linki

- **GitHub Secrets**: `https://github.com/{USERNAME}/qa-toolsmith/settings/secrets/actions`
- **Cloudflare Dashboard**: `https://dash.cloudflare.com`
- **Cloudflare API Tokens**: `https://dash.cloudflare.com/profile/api-tokens`
- **Supabase Dashboard**: `https://supabase.com/dashboard`
- **Dokumentacja Deployment**: `docs/deployment-cloudflare.md`

---

## ✨ To wszystko!

Po wykonaniu wszystkich kroków, aplikacja będzie automatycznie:

- ✅ Testowana przy każdym PR
- ✅ Deployowana do produkcji przy merge do `master`
- ✅ Available na `https://qa-toolsmith.pages.dev` (lub custom domain)

Powodzenia! 🚀

---

## 📚 Zobacz także

### Powiązana dokumentacja

- **[Cloudflare Deployment Guide](./deployment-cloudflare.md)** - Pełny przewodnik deployment (EN)
- **[Tech Stack](./tech-stack.md)** - Przegląd technologii i konfiguracji
- **[API Documentation](./api.md)** - Dokumentacja endpointów API
- **[Architecture Overview](../.ai/ARCHITECTURE.md)** - Architektura wysokiego poziomu
- **[README](../README.md)** - Przegląd projektu

### Konfiguracja

- **Zmienne środowiskowe**: Zobacz `.cursor/rules/backend-api.mdc` dla szczegółowej dokumentacji
- **Cloudflare Setup**: Zobacz sekcję "Cloudflare Pages Setup" w tym przewodniku
- **GitHub Secrets**: Zobacz sekcję "Konfiguracja GitHub Secrets" w tym przewodniku
