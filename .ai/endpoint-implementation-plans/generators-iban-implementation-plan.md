# API Endpoint Implementation Plan: GET `/generators/iban`

## 1. Przegląd punktu końcowego

Generator zwraca syntaktycznie poprawny (checksum-valid) numer IBAN dla wybranego kraju (`DE` lub `AT`). Opcjonalny `seed` umożliwia deterministyczną generację (ten sam `seed` ⇒ ten sam IBAN). Brak zapisu do bazy; opcjonalnie rejestrujemy zdarzenie użycia.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- URL: `/generators/iban`
- Parametry zapytania:
  - **Wymagane**
    - `country`: `DE` | `AT`
  - **Opcjonalne**
    - `seed`: `string` — maks. 64 znaki; dopuszczalne `[A-Za-z0-9._-]`. Brak `seed` ⇒ losowy IBAN.
- Request Body: brak

### Walidacja wejścia (Zod)

```ts
const QuerySchema = z.object({
  country: z.enum(["DE", "AT"]),
  seed: z
    .string()
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/)
    .optional(),
});
```

## 3. Wykorzystywane typy

Minimalne DTO w `src/types.ts` (lub dopisane do istniejących):

```ts
export type IbanCountry = "DE" | "AT";
export interface IbanGenerateQuery {
  country: IbanCountry;
  seed?: string;
}
export interface IbanGenerateResponse {
  iban: string;
  country: IbanCountry;
  seed?: string;
}
```

## 4. Szczegóły odpowiedzi

- **200 OK**

```json
{ "iban": "string", "country": "DE|AT", "seed": "optional" }
```

- **400 Bad Request** — nieprawidłowy `country` lub `seed`.
- **401 Unauthorized** — jeżeli endpoint będzie za ochroną (opcjonalnie).
- **500 Internal Server Error** — błąd niespodziewany podczas generacji.

## 5. Przepływ danych

1. Klient → **Astro Server Endpoint** `src/pages/api/generators/iban.ts` (SSR; `export const prerender = false`).
2. Walidacja query (Zod) → normalizacja `seed`.
3. **IbanService.generate(country, seed?)** (czysta funkcja) → buduje BBAN, liczy cyfrę kontrolną mod‑97, składa IBAN.
4. (Opcjonalnie) zapis do `usage_events` przez Supabase (`kind='generator'`, `meta={ name:'iban', country, seedProvided }`) używając `locals.supabase` (zgodnie z `backend.mdc`).
5. Odpowiedź 200 + nagłówki cache (patrz niżej).

### Logika serwisu (deterministyczna)

- Hash `seed` → 32‑bit FNV‑1a.
- PRNG SplitMix32 z ziarna hash.
- **DE**: BLZ=8 cyfr, konto=10 cyfr → BBAN=18 cyfr.
- **AT**: BLZ=5 cyfr, konto=11 cyfr → BBAN=16 cyfr.
- Cyfry kontrolne: standard IBAN (przeniesienie `country` + `00` na koniec, transliteracja A=10..Z=35, `check=98 - (N mod 97)`).
- Wynik: `CC{check}{BBAN}` z długością 22 (DE) / 20 (AT).

### Przykłady testowe („golden values”)

- `GET /generators/iban?country=DE&seed=1234` → `DE86011870660241783056`
- `GET /generators/iban?country=AT&seed=1234` → `AT370118702417830564`

## 6. Względy bezpieczeństwa

- **Walidacja wejścia** (Zod) i limity długości.
- **Rate‑limit** w middleware (np. prosty token bucket w pamięci/Redis); komunikat 400 (wg dozwolonych kodów) z kodem aplikacyjnym `rate_limited`.
- **Brak danych wrażliwych** — nie logować pełnych IBAN‑ów na poziomie INFO w produkcji; wystarczy hash/ostatnie 4 cyfry.
- **CORS**: domyślnie konserwatywny; tylko nasz origin.
- **Deterministyczność**: `seed` nie ma znaczenia kryptograficznego; nie używać w kontekstach bezpieczeństwa.

## 7. Obsługa błędów

- 400: brak/nieprawidłowy `country`, nieprawidłowy `seed` (regex/limit).
- 401: brak autoryzacji (jeśli endpoint chroniony).
- 500: wyjątek w serwisie (np. niepowodzenie obliczeń).
- W odpowiedzi JSON zwracamy spójny envelope błędu:

```json
{ "error": { "code": "invalid_country", "message": "country must be 'DE' or 'AT'" } }
```

- (Opcjonalnie) rejestracja do `usage_events` z `meta.error_code`.

## 8. Rozważania dotyczące wydajności

- O(1) bez I/O — praktycznie natychmiastowe.
- **Cache**:
  - Gdy `seed` podany → `Cache-Control: public, max-age=31536000, immutable`.
  - Gdy `seed` brak → `Cache-Control: no-store`.
- **ETag** dla odpowiedzi deterministycznych (z `seed`).

## 9. Etapy wdrożenia

1. **Typy & schematy**

- Dodać `IbanCountry`, `IbanGenerateQuery`, `IbanGenerateResponse` do `src/types.ts`.
- Utworzyć `QuerySchema` (Zod) w pliku endpointu.

2. **Utils**

- `src/lib/utils/number.ts`: FNV‑1a (32‑bit), SplitMix32.
- `src/lib/utils/iban.ts`: `toIbanCheckDigits(country, bban)`, `padDigits(len, n)`.

3. **Serwis**

- `src/lib/services/iban.service.ts`:

```ts
export function generate(country: "DE" | "AT", seed?: string): string {
  const z = seed ?? crypto.randomUUID();
  const hash = fnv1a32(z);
  const rng = splitmix32(hash);
  const spec = country === "DE" ? { blz: 8, acct: 10 } : { blz: 5, acct: 11 };
  const blz = takeDigits(rng, spec.blz);
  const acct = takeDigits(rng, spec.acct);
  const bban = blz + acct;
  const check = toIbanCheckDigits(country, bban);
  return `${country}${check}${bban}`;
}
```

4. **Endpoint (Astro)**

- `src/pages/api/generators/iban.ts`:
  - `export const prerender = false;`
  - Parsowanie query → `QuerySchema.parse(...)`.
  - Wywołanie serwisu → payload `{ iban, country, seed? }`.
  - Nagłówki cache wg zasad.
  - Zgodnie z `backend.mdc`: korzystać z `locals.supabase` jeżeli logujemy użycie.

5. **Middleware**

- (Opcjonalnie) `src/middleware/rateLimit.ts` + rejestr w `src/middleware/index.ts` dla `/api/generators/*`.

6. **Telemetry**

- `usage_events` insert (opcjonalnie):

```ts
await locals.supabase.from("usage_events").insert({
  user_id: userId ?? null,
  kind: "generator",
  meta: { name: "iban", country, seedProvided: Boolean(seed) },
});
```

7. **Testy**

- **Unit**: algorytm checksumy, długości, dopuszczalne znaki `seed`.
- **Golden tests**: przypadki z sekcji przykładów.
- **E2E (Playwright)**: `GET /generators/iban?country=DE` (status 200, kształt odpowiedzi), `GET ...?country=XX` (400).

8. **Dokumentacja**

- Opisać endpoint w OpenAPI (YAML) i w README sekcji API.

9. **Release**

- CI: lint, test, build.
- Deploy: DigitalOcean (docker image) zgodnie z `tech-stack.md`.
- Monitoring: podstawowe logi + alert dla skoków błędów 400/500.

## 10. Przykładowa implementacja błędów (TS)

```ts
function badRequest(code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}
```
