# Troubleshooting Feature Flags na Produkcji

## Problem: Feature flags nie działają po dodaniu PUBLIC_ENV_NAME

### Symptomy
- Nawigacja jest ukryta (brak linków do Generators, Templates, etc.)
- W HTML props pokazują `"generators":false`
- `/api/env-check` nadal zwraca `env_name: false`

### Kroki diagnostyczne

#### 1. Weryfikuj zmienną w Cloudflare Dashboard
1. Otwórz: https://dash.cloudflare.com → Workers & Pages → qa-toolsmith
2. Settings → Environment Variables
3. Sprawdź czy dokładnie nazywa się `PUBLIC_ENV_NAME` (bez spacji, z dużymi literami)
4. Wartość powinna być `production` (małymi literami)
5. Środowisko: Production (nie Preview!)

#### 2. Manual Rebuild
1. Przejdź do: Deployments tab
2. Otwórz najnowszy deployment
3. Kliknij "Retry deployment" lub podobną opcję
4. Poczekaj na zakończenie buildu (2-3 minuty)

#### 3. Weryfikacja po rebuild
```bash
# Sprawdź czy nawigacja jest widoczna
curl -s https://qa-toolsmith.pages.dev | grep -i "generators"

# Powinieneś zobaczyć coś jak:
# "generators":[0,true]
```

#### 4. Jeśli nadal nie działa

**Problem A: Zmienna nie jest ustawiona jako PUBLIC**
- Cloudflare Pages wymaga prefixu `PUBLIC_` dla zmiennych dostępnych client-side
- Upewnij się że nazwa to dokładnie `PUBLIC_ENV_NAME` (nie `ENV_NAME`)

**Problem B: Build nie używa nowej zmiennej**
- Może być potrzebne całkowite wyczyszczenie buildu
- W Cloudflare Dashboard: Settings → Builds & deployments → Clear build cache

**Problem C: Wrong environment**
- Upewnij się że zmienna jest ustawiona w Production, nie w Preview
- Sprawdź czy custom domain używa Production environment

#### 5. Alternatywne rozwiązanie (tymczasowe)
Jeśli powyższe nie działa, możemy zmienić kod aby używał `ENV_NAME` po obu stronach:

```typescript
// src/lib/utils/environment.ts
export function getClientEnvName(): EnvName | null {
  // Tymczasowo użyj ENV_NAME zamiast PUBLIC_ENV_NAME
  const envName = import.meta.env.ENV_NAME;
  
  if (!envName || !["local", "integration", "production"].includes(envName)) {
    return null;
  }
  
  return envName as EnvName;
}
```

**Uwaga:** To rozwiązanie wymaga ustawienia `ENV_NAME` jako publicznej zmiennej w `src/env.d.ts`.

### Weryfikacja ostateczna

Po udanym fix, powinieneś zobaczyć:

1. **W HTML source:**
```html
<astro-island ... props="{..., &quot;generators&quot;:[0,true],...}"></astro-island>
```

2. **Na stronie:**
- Link "Generators" widoczny w nawigacji
- Kliknięcie prowadzi do `/generators/iban`

3. **W console:**
```javascript
// Brak błędów związanych z environment
```

---

**Ostatnia aktualizacja:** 2025-10-27  
**Status:** 🔴 Active investigation

