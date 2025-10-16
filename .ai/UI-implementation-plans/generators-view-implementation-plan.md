# Plan implementacji widoku Generators

## 1. Przegląd

Widok **Generators** obejmuje:

- **Generators Hub** (`/generators`) – centralny katalog generatorów danych testowych (kafelki/karty z opisami i linkami).
- **IBAN Generator** (`/generators/iban`) – generowanie i walidacja IBAN dla DE/AT (deterministycznie przez `seed`).
- **Other Generators** (`/generators/:kind`) – jednolity szablon dla pozostałych generatorów: phone, address, plates, email, company, card, guid, string.

Cel: szybkie odnajdywanie generatorów i sprawne generowanie/walidacja danych, z lokalną historią (max 10 w localStorage), ergonomią na mobile/desktop oraz zgodnością z PRD (MVP).

## 2. Routing widoku

- `GET /generators` → **GeneratorsHubView**
- `GET /generators/iban` → **IBANGeneratorView**
- `GET /generators/:kind` → **GenericGeneratorView** (dla: phone|address|plates|email|company|card|guid|string)
- Wspólny layout: **GeneratorLayout** (nagłówek, breadcrumb, opis sekcji, slot treści)
- Astro + React (zgodnie z tech stack); SSR w Astro, komponenty interaktywne montowane jako wyspy (`client:load` tam, gdzie potrzebne).

## 3. Struktura komponentów

```
GeneratorsLayout (layout wspólny)
└─ Route /generators → GeneratorsHubView
   └─ GeneratorsList
      ├─ GeneratorCard (IBAN)
      ├─ GeneratorCard (Phone)
      ├─ GeneratorCard (Address)
      ├─ GeneratorCard (License Plates)
      ├─ GeneratorCard (Email)
      ├─ GeneratorCard (Company)
      ├─ GeneratorCard (Payment Card)
      ├─ GeneratorCard (GUID)
      └─ GeneratorCard (Random String)

└─ Route /generators/iban → IBANGeneratorView
   ├─ Tabs (ModeTabs: Generate | Validate)
   ├─ IBANGeneratorForm (Generate mode)
   │  ├─ FormatToggle
   │  └─ IBANResult (with Copy)
   ├─ ValidatorForm (Validate mode)
   │  └─ ValidationResult
   └─ GeneratorHistory (sidebar desktop / collapsible mobile)

└─ Route /generators/:kind → GenericGeneratorView
   ├─ GeneratorForm (country/seed + parametry specyficzne)
   ├─ FormatToggle
   ├─ GeneratorResult (with Copy)
   └─ GeneratorHistory
```

## 4. Szczegóły komponentów

### GeneratorLayout

- **Opis**: Layout wspólny dla wszystkich generatorów; nagłówek sekcji, breadcrumb (Home → Generators → [Subroute]), miejsce na opis kontekstowy.
- **Elementy**: `<header>`, `<nav>`, `<main>`, slot na treść, shadcn/ui: `Breadcrumb`, `Card`, `Separator`.
- **Interakcje**: brak logiki domenowej; zarządza focus management po nawigacji (skok do `main`). Wspiera skróty klawiaturowe (np. Alt+N dla nowej generacji w kontekstach formularzy).
- **Walidacja**: n/d.
- **Typy**: `Props { title: string; description?: string; children: ReactNode }`.
- **Propsy**: `title`, `description`, `children`.

### GeneratorsList

- **Opis**: Grid kart z generatorami. Responsywny układ: 1 kol. (mobile), 2 (tablet), 3 (desktop).
- **Elementy**: siatka `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`, karty `GeneratorCard`.
- **Interakcje**: kliknięcie karty → nawigacja do `/generators/:kind`.
- **Walidacja**: n/d.
- **Typy**: `GeneratorMeta[]` (patrz sekcja 5).
- **Propsy**: `{ items: GeneratorMeta[] }`.

### GeneratorCard

- **Opis**: Pojedyncza karta generatora: ikona, nazwa, krótki opis z przykładem, link.
- **Elementy**: shadcn/ui `Card`, `Button`, ikony `lucide-react`.
- **Interakcje**: klik w całą kartę lub CTA → przejście do `href`.
- **Walidacja**: n/d.
- **Typy**: `GeneratorMeta`.
- **Propsy**: `{ item: GeneratorMeta }`.

### IBANGeneratorView

- **Opis**: Widok kontener dla trybów Generate/Validate oraz historii.
- **Elementy**: shadcn/ui `Tabs`, `Card`, `Select`, `Input`, `Button`, `Alert`, `Toast`, `Collapsible`.
- **Interakcje**: przełączanie zakładek; zapis/odczyt historii; kopiowanie do schowka; format Text/JSON.
- **Walidacja**: patrz formularze poniżej.
- **Typy**: `IbanViewState`, `IbanGenerateQuery`, `IbanGenerateResponse`, `IbanValidateQuery`, `IbanValidateResponse`.
- **Propsy**: brak (kontener routingu).

### IBANGeneratorForm (Generate)

- **Opis**: Formularz generowania IBAN (DE/AT, opcjonalny seed, przycisk Generate).
- **Elementy**: `Select` country (DE|AT), `Input` seed (opcjonalny, num./alfa), `Button` Generate, wynik w `IBANResult`, `FormatToggle`.
- **Zdarzenia**: `onSubmit` → `GET /generators/iban?country=...&seed?=...`; `onCopy` → schowek; `onFormatChange`.
- **Walidacja**:
  - `country ∈ {"DE","AT"}`.
  - `seed?: string` – max 64 znaków, regex `^[A-Za-z0-9._-]+$` (zbieżne z BE).
- **Typy**: `IbanGenerateQuery`, `IbanGenerateResponse`, `OutputFormat`.
- **Propsy**: `{ onGenerated?: (r: IbanGenerateResponse) => void }`.

### IBANResult

- **Opis**: Prezentacja wyniku (Text/JSON), przycisk Copy, ETag UX (opcjonalnie znacznik deterministyczności przy seed).
- **Elementy**: `Card`, `code`, `Button` (Copy), `Tooltip`.
- **Zdarzenia**: `onCopy` (toast sukcesu/niepowodzenia).
- **Walidacja**: n/d (tylko typy danych).
- **Typy**: `{ data: IbanGenerateResponse; format: OutputFormat }`.
- **Propsy**: `{ data: IbanGenerateResponse; format: OutputFormat }`.

### FormatToggle

- **Opis**: Przełącznik prezentacji wyniku: Text | JSON.
- **Elementy**: `SegmentedControl` lub `ToggleGroup` (shadcn/ui).
- **Zdarzenia**: `onChange("text"|"json")`.
- **Walidacja**: n/d.
- **Typy/Propsy**: `{ value: OutputFormat; onChange: (v: OutputFormat) => void }`.

### GeneratorHistory

- **Opis**: Lokalna historia (FIFO, max 10), per rodzaj generatora; kliknięcie pozycji wstawia wynik do widoku.
- **Elementy**: lista pozycji z timestampem; w mobile – `Collapsible`; w desktop – panel boczny.
- **Interakcje**: `onSelect(item)` – rehydratacja; `Clear` – opróżnia storage z confirm.
- **Walidacja**: limit 10; struktura zgodna z typami historii.
- **Typy**: `HistoryItem<T>`.
- **Propsy**: `{ items: HistoryItem<any>[]; onSelect: (item) => void; onClear: () => void }`.

### ValidatorForm (Validate)

- **Opis**: Walidacja IBAN wklejonego przez użytkownika.
- **Elementy**: `Input` (IBAN), `Button` Validate.
- **Zdarzenia**: `onSubmit` → `GET /validators/iban?iban=...`.
- **Walidacja (FE)**:
  - Normalizacja: usunięcie spacji, `toUpperCase()`.
  - Dozwolone znaki: `A‑Z 0‑9`.
  - Długości referencyjne: DE=22, AT=20 (wstępny hint; właściwe orzeczenie po BE).
- **Typy**: `IbanValidateQuery`, `IbanValidateResponse`.
- **Propsy**: `{ onValidated?: (r: IbanValidateResponse) => void }`.

### ValidationResult

- **Opis**: Komunikat wyniku walidacji (zielony check „Valid” / czerwony X „Invalid: reason”).
- **Elementy**: `Alert`/`Callout` + ikona.
- **Zdarzenia**: brak.
- **Walidacja**: n/d.
- **Typy/Propsy**: `{ data?: IbanValidateResponse }`.

### GenericGeneratorView + GeneratorForm/Result

- **Opis**: Szablon dla pozostałych generatorów; wspólne kontrolki country (PL/DE/AT), seed, parametry specyficzne (address/phone/string/card).
- **Elementy**: `Select` country, `Input` seed, pola specyficzne (np. length/charset dla string), `Button` Generate, `GeneratorResult`, `GeneratorHistory`.
- **Zdarzenia**: `onSubmit` → `GET /generators/{kind}?country=...&seed?=...&...`.
- **Walidacja**: wspólne (`seed`, `country`) + parametry specyficzne:
  - Address: `type ∈ {"home","business"}`
  - Phone: `type ∈ {"mobile","landline"}`
  - String: `length ∈ [1..1024]`, `charset ∈ {"alnum","hex","base64","printable"}`
  - Card: `type ∈ {"visa","mastercard"}`
- **Typy**: `GeneratorKind`, `Country`, `GenericGeneratorQuery`, `GenericGeneratorResponse`.
- **Propsy**: `{ kind: GeneratorKind }`.

## 5. Typy

```ts
// IBAN
export type IbanCountry = "DE" | "AT";
export type OutputFormat = "text" | "json";

export interface IbanGenerateQuery {
  country: IbanCountry;
  seed?: string; // <=64, /^[A-Za-z0-9._-]+$/
}
export interface IbanGenerateResponse {
  iban: string;
  country: IbanCountry;
  seed?: string;
}

export interface IbanValidateQuery {
  iban: string; // normalizowany (trim/spaces removed, uppercased)
}
export interface IbanValidateResponse {
  valid: boolean;
  reason?: string;
}

// Generic
export type GeneratorKind = "phone" | "address" | "plates" | "email" | "company" | "card" | "guid" | "string";
export type Country = "PL" | "DE" | "AT";

export type GenericParams =
  | { kind: "address"; type: "home" | "business" }
  | { kind: "phone"; type: "mobile" | "landline" }
  | { kind: "string"; length: number; charset: "alnum" | "hex" | "base64" | "printable" }
  | { kind: "card"; type: "visa" | "mastercard" }
  | { kind: "email" | "company" | "guid" | "plates" }; // bez dodatkowych pól w MVP

export interface GenericGeneratorQuery {
  country: Country;
  seed?: string; // <=64, /^[A-Za-z0-9._-]+$/
  params?: GenericParams;
}
export interface GenericGeneratorResponse {
  kind: GeneratorKind;
  country: Country;
  value: string | Record<string, unknown>;
  seed?: string;
}

// UI / ViewModel
export interface GeneratorMeta {
  kind: GeneratorKind | "iban";
  name: string;
  description: string;
  href: string; // /generators/:kind
  icon: React.ComponentType<any>;
  example?: string;
}

export interface HistoryItem<T> {
  ts: number; // epoch ms
  data: T;
  note?: string;
}

export interface UIError {
  code: string;
  message: string;
}

export interface IbanViewState {
  mode: "generate" | "validate";
  country: IbanCountry;
  seed?: string;
  format: OutputFormat;
  result?: IbanGenerateResponse;
  validation?: IbanValidateResponse;
  inputIban?: string;
  history: HistoryItem<IbanGenerateResponse>[];
  isLoading: boolean;
  error?: UIError;
}
```

## 6. Zarządzanie stanem

- **Poziom widoku (IBANGeneratorView)**: `useReducer<IbanViewState>` (redukuje rozproszenie setState przy wielu polach), inicjalizacja z URL‑query (np. `?country=DE&seed=...&mode=validate`).
- **Custom hooki**:
  - `useLocalHistory<T>(key: string, limit = 10)` – CRUD na historii (persist w `localStorage`, obsługa FIFO, schema guard).
  - `useIbanApi()` – adapter do API: `generate(query)`, `validate(query)` z `AbortController`, obsługa `loading/error`, mapowanie błędów 400→UI.
  - `useClipboard()` – bezpieczne kopiowanie do schowka z feedbackiem (toast).
  - `useMediaQuery()` – przełącznik sidebar/collapsible dla historii.
- **Synchronizacja**: zapisywanie ostatnich wartości formularza (country/seed/mode/format) w `localStorage` (klucz namespaced: `gen_pref_iban`).

## 7. Integracja API

- **Generate**: `GET /generators/iban?country=DE|AT&seed?=...`
  - Request: `IbanGenerateQuery`
  - Response: `IbanGenerateResponse`
  - Caching: dla zapytań z `seed` BE ustawia `Cache-Control: public, max-age=31536000, immutable`; FE może używać zwykłego `fetch` (opcjonalnie `If-None-Match`); dla braku `seed` użyć `cache: "no-store"`.
- **Validate**: `GET /validators/iban?iban=...`
  - Request: `IbanValidateQuery`
  - Response: `IbanValidateResponse`
- **Other**: `GET /generators/{kind}?country=PL|DE|AT&seed?=...&...`
  - Request: `GenericGeneratorQuery`
  - Response: `GenericGeneratorResponse`
- **Błędy**: 400 (`invalid_country`, `invalid_seed`, `bad_params`), 401 (opcjonalnie), 429 (rate limit); envelope błędu `{"error": {"code": string, "message": string}}`.
- **Bezpieczeństwo**: nie logować pełnych wartości IBAN w FE; seed traktować jako zwykły parametr (nie poufny).

## 8. Interakcje użytkownika

- **Hub**: kliknięcie karty → nawigacja do odpowiedniego generatora.
- **IBAN Generate**: wybór `country` → opcjonalny `seed` → `Generate` → wynik w karcie; `Copy` kopiuje w wybranym formacie; po sukcesie zapis do historii.
- **IBAN Validate**: wklejenie IBAN → `Validate` → zielony „Valid” lub czerwony „Invalid: reason”; input akceptuje `paste` i normalizuje dane.
- **History**: kliknięcie pozycji odtwarza wynik; `Clear history` kasuje z potwierdzeniem.
- **A11y**: focus na `main` po wejściu; `aria-live="polite"` dla wyników; klawisze: `Enter` submit, `Esc` zamyka collapsible, `Alt+H` fokus na historię (opcjonalnie).

## 9. Warunki i walidacja

- **Seed**: jeśli podany → `len ≤ 64`, regex `^[A-Za-z0-9._-]+$`; błąd inline przy naruszeniu (blokada submit).
- **Country**: `DE|AT` (IBAN) / `PL|DE|AT` (inne).
- **IBAN input (Validate)**:
  - Normalizacja: usuwanie spacji, `upper()`, weryfikacja znaków (`A‑Z0‑9`).
  - Wstępne długości: DE=22, AT=20 (komunikat pomocniczy); ostateczny werdykt po odpowiedzi BE (mod‑97).
- **Parametry specyficzne (Other)**: ścisłe domenowe zakresy (np. `string.length`), błędy inline; mapping `400 → Alert`.
- **Historia**: limit 10 (FIFO).

## 10. Obsługa błędów

- **400 Bad Request**: wyświetl `Alert` z komunikatem BE; podświetl pole, które spowodowało błąd; zachowaj wartości formularza.
- **401 Unauthorized** (jeśli BE chronione): przekierowanie miękkie do logowania + zachowanie stanu wejściowego.
- **429 Rate limited**: baner z informacją i sugestią spróbowania ponownie; backoff w hooku (np. 2s/5s).
- **Network/timeout**: baner „Brak połączenia / timeout” + retry; zachowanie danych; `AbortController` przy zmianie parametrów.
- **500**: ogólny komunikat z `requestId` (jeśli zwracany), log w konsoli tylko w trybie dev.

## 11. Kroki implementacji

1. **Routing**: dodać trasy w Astro (`/generators`, `/generators/iban`, `/generators/[kind]`) z layoutem **GeneratorLayout**.
2. **Typy**: dopisać/wyeksportować typy z sekcji 5 do `types.ts` (lub modułu widoku).
3. **UI Biblioteki**: podłączyć shadcn/ui (Button, Card, Tabs, Select, Input, Alert, Toast, Collapsible) i lucide-react (ikony).
4. **GeneratorsHubView**: zaimplementować `GeneratorsList` + `GeneratorCard` na bazie `GeneratorMeta[]` (z przykładami).
5. **IBANGeneratorView**: kontener z `Tabs` i sekcjami Generate/Validate + panel/collapsible **GeneratorHistory**.
6. **IBANGeneratorForm**: formularz (country/seed), walidacja klienta, integracja z `useIbanApi().generate`.
7. **IBANResult** + **FormatToggle**: prezentacja Text/JSON, przycisk Copy (hook `useClipboard()` + toast).
8. **ValidatorForm** + **ValidationResult**: formularz walidacji, normalizacja wejścia, integracja z `useIbanApi().validate`.
9. **useLocalHistory**: implementacja i wpięcie do widoku (klucz `gen_history_iban`).
10. **GenericGeneratorView**: szablon + `GeneratorForm/Result` (obsługa common params + specyficznych).
11. **A11y**: dodać etykiety, `aria-live`, skip‑link do `main`, focus ringi (Tailwind focus-visible).
12. **Obsługa błędów**: zunifikowany komponent `ErrorAlert` + mapowanie kodów (`invalid_country`, `invalid_seed`, `bad_params`, `rate_limited`).
13. **Telemetry (opcjonalnie)**: eventy UI (np. „copy_succeeded”, „history_used”) – bez danych wrażliwych.
14. **Testy**: unit (walidacja seed/IBAN input, hooki); Playwright E2E (happy path Generate/Validate, błędne parametry, historia).
15. **Dokumentacja**: krótkie README sekcji widoku + Storybook dla komponentów (opcjonalnie).

---

**Uwagi implementacyjne (zgodność z PRD/BE):**

- Parametry i walidacja `seed/country` są zgodne z BE. Błędy 400 wyświetlamy inline (komunikat pochodzący z BE), przy czym FE minimalnie wstępnie waliduje, aby ograniczyć niepotrzebne żądania.
- Historia jest per‑kind (`localStorage` klucz: `gen_history_${kind}`), max 10 pozycji (FIFO). Po kliknięciu elementu historii wynik jest rehydratowany do widoku.
- W trybie **Generate** bez `seed` żądania oznaczamy `cache: "no-store"`; z `seed` – domyślne `fetch` (BE ustawia `immutable`).
