<analiza_projektu>

### 1. Kluczowe komponenty projektu

Na podstawie analizy dostarczonych plików, w szczególności `README.md`, `docs/`, oraz struktury katalogu `src/`, zidentyfikowano następujące kluczowe komponenty i funkcjonalności aplikacji QA Toolsmith (MVP):

- **System Uwierzytelniania i Autoryzacji:**
  - Funkcjonalność: Rejestracja, logowanie/wylogowanie użytkownika przy użyciu e-maila i hasła.
  - Role: Dwie zdefiniowane role – `Admin` i `User`.
  - Bezpieczeństwo: Ograniczenie liczby prób logowania (rate limiting) i tymczasowa blokada konta.
  - Implementacja: Wykorzystuje Supabase Auth, co widać w plikach `src/lib/services/auth.service.ts` oraz w endpointach API w `src/pages/api/auth/`.

- **Szablony Raportów Błędów:**
  - Funkcjonalność: Predefiniowane szablony dla błędów UI i API. Możliwość forkowania i personalizacji szablonów przez użytkowników.
  - Eksport: Funkcja eksportu do formatu Markdown oraz kopiowania do schowka.
  - Zarządzanie: Szablony globalne zarządzane przez `Admina`.

- **Karta Eksploracji (Exploration Chart):**
  - Funkcjonalność: Sesje testów eksploracyjnych z celem (Goal) i hipotezami (Hypotheses).
  - Narzędzia: Wbudowany stoper, notatki tagowane (`bug`, `idea`, `question`, `risk`), skróty klawiszowe.
  - Zapis: Automatyczny zapis w `localStorage` co 5 sekund oraz w bazie danych po zakończeniu sesji.
  - Eksport: Eksport sesji do formatu Markdown.

- **Baza Wiedzy (Knowledge Base):**
  - Funkcjonalność: Operacje CRUD na linkach, notatkach i tagach.
  - Wyszukiwanie: Pełnotekstowe wyszukiwanie (PostgreSQL FTS) oraz filtrowanie po tagach.
  - Eksport: Możliwość eksportu danych w formacie JSON.

- **Generatory i Walidatory Danych Testowych:**
  - Funkcjonalność: Moduł do generowania i walidacji syntetycznych danych, w tym IBAN (dla DE/AT), numery telefonów, adresy, itp.
  - API: Dedykowane endpointy API (`/api/generators/iban`, `/api/validators/iban`), co potwierdza dokumentacja i kod w `src/pages/api/`.
  - Determinizm: Opcjonalny `seed` dla powtarzalnych wyników generowania.
  - UI: Interaktywny interfejs z historią operacji przechowywaną w `localStorage` (hook `useLocalHistory`).

- **Asystent AI:**
  - Funkcjonalność: Opcjonalne "ulepszanie" treści tekstowych (opisy, kroki, notatki).
  - Integracja: Połączenie z Openrouter.ai, co pozwala na elastyczność w wyborze modeli LLM.
  - Ograniczenia: Dzienny limit zapytań na użytkownika.
  - UX: Podgląd zmian (diff) przed ich akceptacją oraz mechanizm "dry-run" jako fallback.

- **Infrastruktura Testowa i CI/CD:**
  - Automatyzacja: Zdefiniowany pipeline CI/CD w GitHub Actions (`.github/workflows/ci.yml`).
  - Pokrycie: Istniejące testy jednostkowe (walidator IBAN), E2E (Playwright) oraz testy dymne (smoke tests).

### 2. Specyfika stosu technologicznego i jej wpływ na strategię testowania

Stos technologiczny ma bezpośredni wpływ na to, jak i co należy testować:

- **Frontend (Astro + React):**
  - **Astro 5:** Służy do renderowania statycznych lub serwerowych stron (`.astro`). Testowanie musi obejmować weryfikację poprawności generowanego HTML, ładowania zasobów oraz działania nawigacji (Astro View Transitions).
  - **React 19:** Używany do tworzenia interaktywnych wysp (komponentów) na stronach Astro (`client:load`). Wymaga to **testów komponentów** (np. przy użyciu Vitest i React Testing Library), aby zweryfikować ich logikę, stan i interakcje w izolacji. **Testy E2E** (Playwright) są kluczowe do sprawdzenia, czy hydracja komponentów React na stronach Astro przebiega poprawnie i czy interakcje działają w kontekście całej strony.
  - **TypeScript & Zod:** Zapewniają bezpieczeństwo typów. Strategia testowa powinna wykorzystywać te typy do tworzenia "pewnych" mocków i danych testowych. Testy powinny obejmować walidację schematów Zod, zwłaszcza na granicy systemu (API).
  - **Shadcn/ui & Tailwind CSS:** Komponenty UI są budowane na bazie tych technologii. Testy muszą objąć **testy wizualnej regresji** (np. z użyciem Playwright), weryfikację responsywności (RWD) oraz **testy dostępności (a11y)**, aby upewnić się, że niestandardowe komponenty są zgodne ze standardami WCAG.

- **Backend (Supabase):**
  - Jako Backend-as-a-Service (BaaS), Supabase eliminuje potrzebę testowania samej bazy danych czy serwera API. Strategia testowa skupia się na **testowaniu integracji z usługami Supabase**.
  - **Supabase Auth:** Należy testować logikę autoryzacji w aplikacji. Czy middleware (`src/middleware/index.ts`) poprawnie chroni ścieżki? Czy role użytkowników są respektowane przy dostępie do danych?
  - **Baza Danych (PostgreSQL):** Testy muszą weryfikować poprawność zapytań wykonywanych przez backend (endpointy Astro) do bazy danych za pomocą Supabase SDK. Szczególną uwagę należy zwrócić na operacje CRUD i poprawność zwracanych danych. Należy sprawdzić, czy triggery i funkcje bazodanowe (jeśli istnieją) działają zgodnie z oczekiwaniami.

- **Integracja AI (Openrouter.ai):**
  - Testowanie modeli AI jest trudne ze względu na ich niedeterministyczną naturę. Testy powinny skupić się na **integracji z API Openrouter**. Należy mockować odpowiedzi API, aby przetestować:
    - Poprawne obsługiwanie odpowiedzi sukcesu.
    - Graceful handling błędów (np. błędy API, przekroczenie limitu tokenów).
    - Działanie mechanizmu fallback.
    - Prawidłowe egzekwowanie dziennego limitu zapytań na użytkownika.

- **CI/CD (GitHub Actions, Docker):**
  - Istniejący pipeline CI jest fundamentem. Plan testów powinien zakładać jego rozbudowę i utrzymanie. Należy testować sam pipeline: czy poprawnie się uruchamia, czy błędy w testach blokują merge, czy proces budowania obrazu Docker działa poprawnie.

### 3. Priorytety testowe bazujące na strukturze repozytorium

Struktura projektu i dokumentacja wyraźnie wskazują, które obszary są najważniejsze:

1.  **Uwierzytelnianie i API (Najwyższy priorytet):** Katalogi `src/pages/api/auth/` oraz `docs/api/auth-login.md` wskazują, że jest to fundamentalna, dobrze zdefiniowana funkcjonalność. Bezpieczeństwo i stabilność logowania, rejestracji oraz autoryzacji są krytyczne dla działania całej aplikacji.
2.  **Generatory Danych i Walidatory:** Dedykowany katalog `src/pages/generators/` z podziałem na `iban.astro` i `[kind].astro`, rozbudowana dokumentacja (`docs/generators-view.md`, `docs/api/generators-iban.md`) oraz dedykowane komponenty React (`src/components/generators/`) świadczą o tym, że jest to kluczowa, rozbudowana i dobrze wyizolowana funkcjonalność. Należy priorytetowo potraktować testy API oraz interfejsu użytkownika tego modułu.
3.  **Podstawowe moduły CRUD (Baza Wiedzy, Szablony, Karty Eksploracji):** Chociaż ich UI jest oznaczone jako "W budowie" na stronach `.astro`, schemat bazy danych (`database.types.ts`) i logika biznesowa są już zdefiniowane. Testowanie API dla tych modułów (nawet jeśli jeszcze niepubliczne) powinno być priorytetem, aby zapewnić stabilny fundament pod przyszły interfejs.
4.  **Interfejs Użytkownika i Doświadczenie Użytkownika (UX):** Testowanie komponentów UI (`src/components/`), layoutów (`src/layouts/`) i ogólnej spójności wizualnej. Priorytetem jest tutaj główny widok (`Welcome.astro`), nawigacja (`TopBar.tsx`) oraz formularze.
5.  **Integracja z AI:** Jest to funkcja dodatkowa ("optional AI assistant"). Testy integracji i obsługi błędów są ważne, ale mają niższy priorytet niż podstawowa, deterministyczna funkcjonalność aplikacji.

### 4. Potencjalne obszary ryzyka

Obszary, które wymagają szczególnej uwagi podczas testowania:

- **Bezpieczeństwo i Kontrola Dostępu:**
  - **Ryzyko:** Nieautoryzowany dostęp użytkownika z rolą `User` do zasobów lub akcji przeznaczonych dla `Admina`. Błędna implementacja logiki w middleware lub bezpośrednio w endpointach API może prowadzić do eskalacji uprawnień.
  - **Uzasadnienie:** Aplikacja definiuje role, co implikuje istnienie chronionych zasobów. Konieczne są dedykowane testy bezpieczeństwa weryfikujące, czy użytkownik o niższych uprawnieniach nie może wykonać operacji administracyjnych.

- **Integralność Danych w Interakcji z `localStorage` i Bazą Danych:**
  - **Ryzyko:** Funkcja autosave w Karcie Eksploracji zapisuje dane w `localStorage` co 5 sekund, a w bazie danych dopiero po zamknięciu. Może to prowadzić do utraty danych lub niespójności, jeśli użytkownik zamknie przeglądarkę w nieoczekiwanym momencie.
  - **Uzasadnienie:** Złożona logika synchronizacji stanu między klientem a serwerem jest częstym źródłem błędów. Należy dokładnie przetestować scenariusze brzegowe (np. utrata połączenia, nagłe zamknięcie karty).

- **Zależność od Usług Zewnętrznych (Supabase, Openrouter.ai):**
  - **Ryzyko:** Aplikacja jest silnie uzależniona od dostępności i wydajności zewnętrznych usług. Błędy w API tych usług, zmiany w ich działaniu lub opóźnienia mogą degradować lub uniemożliwiać działanie kluczowych funkcji QA Toolsmith.
  - **Uzasadnienie:** Aplikacja musi być odporna na problemy z zewnętrznymi zależnościami. Testy muszą weryfikować, czy aplikacja poprawnie obsługuje błędy sieciowe, timeouty i komunikaty o błędach zwracane przez te usługi, informując o tym użytkownika w zrozumiały sposób.

- **Złożoność Stanu Frontendowego (Astro + React):**
  - **Ryzyko:** Hydracja komponentów React na stronach generowanych przez Astro może powodować błędy, np. "hydration mismatch". Zarządzanie stanem w komponentach React, które komunikują się z API i `localStorage` (np. `IBANGeneratorView`), może być skomplikowane i podatne na błędy.
  - **Uzasadnienie:** Połączenie dwóch różnych paradygmatów renderowania (SSR/SSG Astro i CSR React) wymaga dokładnych testów E2E, aby upewnić się, że interaktywność po stronie klienta działa poprawnie i bez nieoczekiwanych efektów ubocznych.

- **Walidacja Danych na Granicach Systemu:**
  - **Ryzyko:** Niewystarczająca walidacja danych wejściowych w endpointach API może prowadzić do błędów 500, zapisywania niepoprawnych danych w bazie, a w skrajnych przypadkach do luk bezpieczeństwa (np. XSS, jeśli dane są renderowane bez odpowiedniego escapowania).
  - **Uzasadnienie:** Mimo użycia Zod, każdy endpoint API jest potencjalnym wektorem ataku lub źródłem błędów. Należy systematycznie testować walidację dla każdego pola we wszystkich endpointach, włączając w to wartości graniczne, niepoprawne typy danych i złośliwe ciągi znaków.

</analiza_projektu>

# Kompleksowy Plan Testów dla Projektu "QA Toolsmith"

## 1. Wprowadzenie i Cele Testowania

### 1.1. Wprowadzenie

Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji internetowej "QA Toolsmith" w wersji MVP (Minimum Viable Product). Aplikacja ma na celu standaryzację i automatyzację codziennych zadań testerów oprogramowania. Plan ten został opracowany na podstawie analizy kodu źródłowego, dokumentacji technicznej oraz architektury systemu.

### 1.2. Cele Testowania

Głównym celem procesu testowania jest zapewnienie, że aplikacja QA Toolsmith w wersji MVP spełnia zdefiniowane wymagania funkcjonalne i niefunkcjonalne. Cele szczegółowe to:

- **Weryfikacja funkcjonalności:** Potwierdzenie, że wszystkie kluczowe funkcje, takie jak uwierzytelnianie, generatory danych, baza wiedzy, szablony i karty eksploracji, działają zgodnie ze specyfikacją.
- **Zapewnienie jakości i stabilności:** Identyfikacja i zaraportowanie defektów w celu podniesienia ogólnej jakości i niezawodności aplikacji przed wdrożeniem.
- **Ocena bezpieczeństwa:** Weryfikacja podstawowych mechanizmów bezpieczeństwa, w tym kontroli dostępu opartej na rolach oraz walidacji danych wejściowych.
- **Sprawdzenie użyteczności i UX:** Upewnienie się, że interfejs użytkownika jest intuicyjny, responsywny i dostępny dla użytkowników.
- **Weryfikacja integracji:** Potwierdzenie poprawnej komunikacji i obsługi błędów w integracji z usługami zewnętrznymi (Supabase, Openrouter.ai).

## 2. Zakres Testów

### 2.1. Funkcjonalności w Zakresie Testów

Testom poddane zostaną wszystkie funkcjonalności zdefiniowane w dokumentacji projektu (`README.md`):

1.  **Moduł Uwierzytelniania i Autoryzacji:** Rejestracja, logowanie, wylogowywanie, zarządzanie sesją, kontrola dostępu dla ról `Admin` i `User`, mechanizmy bezpieczeństwa (rate limiting).
2.  **Generatory i Walidatory Danych:**
    - Generator i walidator IBAN (DE, AT, PL) wraz z interfejsem użytkownika i API.
    - Interfejsy zastępcze ("Coming Soon") dla pozostałych generatorów.
3.  **Baza Wiedzy:** Pełen cykl operacji CRUD na wpisach i notatkach, wyszukiwanie pełnotekstowe, filtrowanie po tagach, eksport do JSON.
4.  **Szablony Raportów Błędów:** Zarządzanie szablonami globalnymi (Admin), forkowanie szablonów przez użytkowników, eksport do Markdown.
5.  **Karty Eksploracji:** Tworzenie i zarządzanie sesją, działanie stopera, tagowanie notatek, automatyczny zapis (`localStorage`, DB), eksport do Markdown.
6.  **Integracja z Asystentem AI:** Funkcjonalność "ulepszania" tekstu, obsługa limitów, mechanizm fallback.
7.  **Ogólna Architektura Aplikacji:** Routing, middleware, layout, motywy (jasny/ciemny).

### 2.2. Funkcjonalności Poza Zakresem Testów

- Testowanie infrastruktury usług zewnętrznych (Supabase, Openrouter.ai, DigitalOcean).
- Zaawansowane testy penetracyjne i audyty bezpieczeństwa (w zakresie MVP skupimy się na podstawowej weryfikacji).
- Testy wydajnościowe pod bardzo dużym obciążeniem (stress tests); przeprowadzone zostaną jedynie podstawowe testy obciążeniowe.
- Formalne badania użyteczności (usability studies) z grupą docelową.
- Testowanie jakości odpowiedzi generowanych przez modele AI (skupiamy się na integracji).

## 3. Typy Testów do Przeprowadzenia

| Typ Testu                              | Opis                                                                                                                                               | Narzędzia                                                       |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| **Testy Jednostkowe**                  | Weryfikacja pojedynczych funkcji, modułów i komponentów w izolacji. Rozbudowa istniejących testów dla logiki biznesowej (np. walidatory, helpery). | Vitest, React Testing Library                                   |
| **Testy Integracyjne (API)**           | Testowanie endpointów API w celu weryfikacji logiki biznesowej, integracji z bazą danych Supabase i poprawności kontraktów (request/response).     | Postman, Vitest (dla testów API)                                |
| **Testy End-to-End (E2E)**             | Automatyzacja scenariuszy użytkownika w przeglądarce, weryfikująca przepływy danych i integrację między UI a backendem.                            | Playwright                                                      |
| **Testy Dymne (Smoke Tests)**          | Szybki zestaw testów (manualnych lub automatycznych) uruchamiany po każdym wdrożeniu na środowisko, weryfikujący krytyczne ścieżki aplikacji.      | Playwright, Manualne                                            |
| **Testy Manualne (Eksploracyjne)**     | Swobodne, oparte na doświadczeniu testowanie aplikacji w celu znalezienia błędów, które trudno wykryć w zautomatyzowanych scenariuszach.           | -                                                               |
| **Testy Kompatybilności**              | Weryfikacja poprawnego działania i wyświetlania aplikacji na różnych przeglądarkach i urządzeniach.                                                | Przeglądarki (Chrome, Firefox, Safari), narzędzia deweloperskie |
| **Testy Dostępności (A11y)**           | Sprawdzenie zgodności aplikacji ze standardami WCAG 2.1 (poziom AA) za pomocą narzędzi automatycznych i testów manualnych.                         | Axe, czytniki ekranu (VoiceOver, NVDA)                          |
| **Testy Wydajnościowe (obciążeniowe)** | Podstawowe testy obciążeniowe dla kluczowych endpointów API (np. logowanie, generowanie danych) w celu oceny czasu odpowiedzi pod obciążeniem.     | k6, Artillery.io                                                |
| **Testy Bezpieczeństwa**               | Weryfikacja podstawowych aspektów bezpieczeństwa: kontrola dostępu oparta na rolach, walidacja danych wejściowych (ochrona przed XSS).             | Manualne, skanery (np. OWASP ZAP)                               |

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### 4.1. Moduł Uwierzytelniania

| ID      | Scenariusz                                                                       | Oczekiwany Rezultat                                                                              | Priorytet |
| :------ | :------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- | :-------- |
| AUTH-01 | **[Pozytywny]** Pomyślne logowanie z poprawnymi danymi                           | Użytkownik zostaje zalogowany i przekierowany na stronę główną.                                  | Krytyczny |
| AUTH-02 | **[Negatywny]** Próba logowania z niepoprawnym hasłem                            | Wyświetlany jest ogólny komunikat o błędzie (bez informacji, czy hasło, czy e-mail jest błędny). | Krytyczny |
| AUTH-03 | **[Negatywny]** Próba logowania z nieistniejącym e-mailem                        | Wyświetlany jest ogólny komunikat o błędzie.                                                     | Krytyczny |
| AUTH-04 | **[Pozytywny]** Pomyślna rejestracja nowego użytkownika                          | Konto zostaje utworzone, użytkownik jest automatycznie logowany i przekierowywany.               | Wysoki    |
| AUTH-05 | **[Negatywny]** Próba rejestracji na już istniejący e-mail                       | Wyświetlany jest komunikat o błędzie.                                                            | Wysoki    |
| AUTH-06 | **[Pozytywny]** Pomyślne wylogowanie                                             | Użytkownik zostaje wylogowany, sesja jest usuwana, następuje przekierowanie na stronę główną.    | Krytyczny |
| AUTH-07 | **[Bezpieczeństwo]** Przekroczenie limitu prób logowania                         | Po 10 nieudanych próbach logowania dalsze próby z danego IP są blokowane na 60 sekund.           | Krytyczny |
| AUTH-08 | **[Bezpieczeństwo]** Dostęp do ścieżki chronionej (`/kb`) bez logowania          | Użytkownik jest przekierowywany na stronę logowania.                                             | Krytyczny |
| AUTH-09 | **[Bezpieczeństwo]** Próba dostępu do panelu admina (`/admin`) przez rolę `User` | Dostęp jest zablokowany (przekierowanie lub błąd 403).                                           | Krytyczny |

### 4.2. Generator i Walidator IBAN

| ID     | Scenariusz                                                                             | Oczekiwany Rezultat                                                                          | Priorytet |
| :----- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :-------- |
| GEN-01 | **[Pozytywny]** Wygenerowanie losowego IBAN dla kraju DE                               | W polu wyniku pojawia się poprawny, 22-znakowy niemiecki IBAN. Wynik pojawia się w historii. | Krytyczny |
| GEN-02 | **[Pozytywny]** Wygenerowanie deterministycznego IBAN (z użyciem `seed`)               | Wygenerowany IBAN jest zawsze taki sam dla tego samego `seed` i kraju.                       | Wysoki    |
| GEN-03 | **[Pozytywny]** Pomyślna walidacja poprawnego numeru IBAN                              | Wyświetlany jest komunikat o poprawności numeru.                                             | Krytyczny |
| GEN-04 | **[Negatywny]** Walidacja IBAN z błędną sumą kontrolną                                 | Wyświetlany jest komunikat o niepoprawnej sumie kontrolnej.                                  | Wysoki    |
| GEN-05 | **[Negatywny]** Walidacja IBAN o niepoprawnej długości dla danego kraju                | Wyświetlany jest komunikat o niepoprawnej długości.                                          | Wysoki    |
| GEN-06 | **[UX]** Przełączanie formatu wyniku (Text/JSON)                                       | Widok wyniku aktualizuje się natychmiast, pokazując odpowiedni format.                       | Średni    |
| GEN-07 | **[UX]** Użycie historii do ponownego załadowania wyniku                               | Kliknięcie na pozycję w historii wypełnia formularz generowania i pokazuje poprzedni wynik.  | Średni    |
| GEN-08 | **[API]** Test endpointu `GET /api/generators/iban` z poprawnymi parametrami           | API zwraca status 200 i poprawny obiekt JSON z numerem IBAN.                                 | Krytyczny |
| GEN-09 | **[API]** Test endpointu `GET /api/generators/iban` bez wymaganego parametru `country` | API zwraca status 400 z komunikatem o błędzie walidacji.                                     | Krytyczny |

### 4.3. Baza Wiedzy

| ID    | Scenariusz                                                        | Oczekiwany Rezultat                                                      | Priorytet |
| :---- | :---------------------------------------------------------------- | :----------------------------------------------------------------------- | :-------- |
| KB-01 | **[Pozytywny]** Dodanie nowego wpisu z linkiem, tytułem i tagami  | Wpis pojawia się na liście. Dane są poprawnie zapisane w bazie.          | Krytyczny |
| KB-02 | **[Pozytywny]** Edycja istniejącego wpisu (zmiana tytułu i tagów) | Zmiany są widoczne na liście i poprawnie zapisane w bazie.               | Wysoki    |
| KB-03 | **[Pozytywny]** Usunięcie wpisu z bazy wiedzy                     | Wpis znika z listy.                                                      | Wysoki    |
| KB-04 | **[Pozytywny]** Wyszukiwanie pełnotekstowe                        | Lista wpisów jest filtrowana i wyświetla tylko te pasujące do zapytania. | Wysoki    |
| KB-05 | **[Pozytywny]** Filtrowanie wpisów po tagu                        | Lista wpisów wyświetla tylko te, które posiadają wybrany tag.            | Wysoki    |
| KB-06 | **[Negatywny]** Próba dodania wpisu z niepoprawnym adresem URL    | Wyświetlany jest błąd walidacji, wpis nie jest dodawany.                 | Wysoki    |

## 5. Środowisko Testowe

| Środowisko                      | Opis                                                                                                          | Cel                                              |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------ | :----------------------------------------------- |
| **Lokalne (Local)**             | Uruchomione na maszynie dewelopera/testera (`npm run dev`). Połączenie z lokalną instancją Supabase (Docker). | Testy jednostkowe, dewelopment, debugowanie.     |
| **Deweloperskie (Dev/Staging)** | Automatycznie wdrażane z gałęzi `develop` po pomyślnym przejściu CI. Dedykowana instancja na DigitalOcean.    | Testy integracyjne, E2E, manualne, akceptacyjne. |
| **Produkcyjne (Production)**    | Środowisko dostępne dla użytkowników końcowych. Wdrażane z gałęzi `main`.                                     | Testy dymne po wdrożeniu, monitoring.            |

## 6. Narzędzia do Testowania

- **Zarządzanie testami i błędami:** GitHub Issues / Projects
- **Testy jednostkowe i komponentowe:** Vitest, React Testing Library
- **Testy E2E i regresji wizualnej:** Playwright
- **Testy API:** Postman (dla testów eksploracyjnych), Vitest/Supertest (dla automatyzacji)
- **Testy wydajnościowe:** k6
- **Testy dostępności:** Axe DevTools (wtyczka do przeglądarki i integracja z Playwright)
- **CI/CD:** GitHub Actions

## 7. Harmonogram Testów

Proces testowy będzie prowadzony w sposób ciągły, zintegrowany z cyklem rozwoju oprogramowania.

- **Testy jednostkowe i integracyjne:** Pisane przez deweloperów równolegle z implementacją funkcjonalności i uruchamiane automatycznie w pipeline CI przy każdym pushu do repozytorium.
- **Testy E2E:** Uruchamiane automatycznie w pipeline CI przed mergem do gałęzi `develop` i `main`.
- **Testy manualne i eksploracyjne:** Przeprowadzane na środowisku Staging po wdrożeniu nowej funkcjonalności lub przed planowanym wydaniem.
- **Pełna regresja:** Uruchamiana przed każdym wdrożeniem na środowisko produkcyjne (automatyczna + kluczowe scenariusze manualne).

## 8. Kryteria Akceptacji Testów

### 8.1. Kryteria Wejścia (Entry Criteria)

- Kod źródłowy został pomyślnie zintegrowany i wdrożony na środowisku testowym.
- Wszystkie testy jednostkowe i integracyjne w pipeline CI zakończyły się sukcesem.
- Dokumentacja dla testowanej funkcjonalności jest dostępna.

### 8.2. Kryteria Wyjścia (Exit Criteria)

- 100% zaplanowanych testów dla krytycznych i wysokich priorytetów zostało wykonanych.
- Wszystkie testy automatyczne (jednostkowe, integracyjne, E2E) kończą się sukcesem.
- Brak otwartych błędów o priorytecie `Krytyczny`.
- Brak otwartych błędów o priorytecie `Wysoki`, które blokują podstawowe funkcjonalności.
- Współczynnik pokrycia kodu testami jednostkowymi utrzymuje się na poziomie > 80% dla nowej logiki biznesowej.

## 9. Role i Odpowiedzialności

| Rola                                | Odpowiedzialność                                                                                                                                                                                                             |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inżynier QA**                     | Tworzenie i utrzymanie planu testów, projektowanie scenariuszy testowych, automatyzacja testów E2E i API, wykonywanie testów manualnych i eksploracyjnych, raportowanie i weryfikacja błędów, zarządzanie procesem testowym. |
| **Deweloper**                       | Pisanie testów jednostkowych i integracyjnych, poprawa zgłoszonych błędów, code review (w tym review testów), wsparcie w analizie skomplikowanych defektów.                                                                  |
| **Project Manager / Product Owner** | Definiowanie priorytetów, akceptacja wyników testów, podejmowanie decyzji o wdrożeniu na produkcję.                                                                                                                          |

## 10. Procedury Raportowania Błędów

Wszystkie zidentyfikowane błędy będą raportowane jako "Issues" w repozytorium GitHub projektu.

### 10.1. Struktura Raportu Błędu

- **Tytuł:** Zwięzły i jednoznaczny opis problemu.
- **Opis:**
  - **Kroki do odtworzenia (Steps to Reproduce):** Numerowana lista kroków.
  - **Obserwowany rezultat (Actual Result):** Co się stało.
  - **Oczekiwany rezultat (Expected Result):** Co powinno się stać.
- **Środowisko:** (np. Lokalny, Staging; Przeglądarka + wersja, System operacyjny).
- **Załączniki:** Zrzuty ekranu, nagrania wideo, logi z konsoli.
- **Etykiety (Labels):** `bug`, priorytet (`critical`, `high`, `medium`, `low`), nazwa modułu (np. `auth`, `generators`).

### 10.2. Poziomy Priorytetu Błędów

- **Krytyczny (Critical):** Błąd blokujący podstawową funkcjonalność, powodujący utratę danych lub lukę bezpieczeństwa. Brak obejścia.
- **Wysoki (High):** Błąd znacznie utrudniający korzystanie z kluczowej funkcjonalności, ale istnieje obejście.
- **Średni (Medium):** Błąd w funkcjonalności drugorzędnej lub problem UI/UX, który nie uniemożliwia pracy.
- **Niski (Low):** Drobny błąd estetyczny, literówka, sugestia poprawy.
