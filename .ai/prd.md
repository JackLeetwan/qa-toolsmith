# Dokument wymagań produktu (PRD) - QA Toolsmith (MVP)

## 1. Przegląd produktu

QA Toolsmith to otwartoźródłowe, proste narzędzie webowe, które standaryzuje i automatyzuje powtarzalne zadania testerów: szybkie tworzenie raportów defektów, prowadzenie eksploracji z ustrukturyzowanymi notatkami, zarządzanie własną bazą wiedzy oraz generowanie danych testowych dla rynków DE/AT/PL. MVP ma być łatwe do wdrożenia publicznie, bez integracji z zewnętrznymi systemami i bez przechowywania prawdziwych danych osobowych.
Zakres MVP obejmuje: logowanie z rolami (admin/user), szablony raportów defektów, Exploration Chart, Knowledge Base z wyszukiwaniem i tagami, generatory danych (w tym IBAN DE/AT i walidator), asystenta AI do ulepszania treści, podstawowe testy (unit i E2E) oraz pipeline CI/CD z automatycznym wdrożeniem.

## 2. Problem użytkownika

Testerzy tracą czas na powtarzalne czynności: redagowanie raportów defektów od zera, chaotyczne notowanie w trakcie eksploracji, często w miejscach rozproszonych, szukanie sprawdzonych źródeł wiedzy oraz ręczne generowanie danych testowych dla różnych lokalizacji. Brakuje prostego narzędzia, które standaryzuje podstawowe artefakty testerskie i skraca czas operacji do minut, oraz stanowi podstawowy narzędziownik testera przy zachowaniu bezpieczeństwa i prostoty wdrożenia.
MVP rozwiązuje to, dostarczając minimalny, ale kompletny zestaw narzędzi: gotowe szablony z kopiowaniem do Markdown, Exploration Chart z czasomierzem i eksportem, lekką bazę wiedzy z wyszukiwaniem, praktyczne generatory danych oraz opcjonalne wsparcie AI do ulepszania treści.

## 3. Wymagania funkcjonalne

3.1 Uwierzytelnianie i role

- Logowanie/wylogowanie na podstawie e‑mail/hasła
- Dwie role: admin (zarządzanie szablonami globalnymi), user (fork i edycja lokalnych kopii). Pierwszy admin z seedem.
- Rate limit prób logowania, blokada tymczasowa po serii błędów, bez SSO w MVP.

  3.2 Szablony raportów defektów

- Pola minimalne: title, description, steps to reproduce, expected, actual, environment, attachments (w MVP jako lista URL), severity, priority.
- Dwa presety: UI bug, API bug. Globalne presety edytowalne przez admina; użytkownik może forknąć do przestrzeni własnej i modyfikować.
- Generowanie Markdown i przycisk Copy to clipboard. Walidacja pól wymaganych pod „raport ≤3 min”.

  3.3 Exploration Chart

- Tworzenie i prowadzenie charterów: goal, hypotheses, notes z tagami [bug|idea|question|risk], timer start/stop.
- Autosave co 5 s do localStorage oraz cykliczny zapis do DB; jedna aktywna sesja per użytkownik.
- Skróty: Alt+N (nowa notatka), Alt+T (toggle timer), Alt+S (zapis). Eksport do Markdown. Historia sesji w liście charterów.

  3.4 Knowledge Base (CRUD)

- Schema: title, url, note (wiele notatek per link), tags[], createdBy, updatedAt.
- Dodawanie linku z kanonikalizacją URL i deduplikacją; pełnotekstowe wyszukiwanie (Postgres FTS) oraz filtrowanie po tagach.
- Edycja i usuwanie wpisów; eksport JSON (import po MVP).

  3.5 Generatory danych (PL/DE/AT)

- IBAN generator (DE/AT) + walidator; telefon, adres z kodem pocztowym, tablice rejestracyjne, e‑mail, firma, dane karty płatniczej, GUID, ciąg znaków;

  3.6 Statystyki

- Zbieranie informacji o ilości wygenerowanych danych testowych (łącznie charty, dane i źródła wiedzy)

  3.7 Asystent AI

- Akcja Improve/Expand dla pól description/steps/hypotheses/notes z podglądem i możliwością akceptacji lub odrzucenia zmian.
- Konfiguracja ENV, limit dzienny per user (AI_MAX_REQUESTS_PER_USER_PER_DAY), przełącznik per user i tryb dry run.
- Fallback: gdy AI_DISABLED lub limit przekroczony, pokazywane są podpowiedzi manualne.

  3.8 Testy i jakość

- Unit: walidator IBAN (DE/AT), zestaw przypadków skrajnych; test generate‑and‑validate; property‑based na 1000 przypadków.
- E2E: Playwright headless, ścieżka login → add KB entry → edit → delete;
- Smoke po deployu (krótka ścieżka gotowości: GET /health, render strony głównej, logowanie, 1 CRUD).

  3.9 CI/CD i wdrożenie

- GitHub Actions: lint + unit + E2E; zielona kontrola jako bramka do main.
- Artefakty: logi testów i raporty dołączone do joba.

  3.10 Niefunkcjonalne

- Wydajność: TTFB < 1 s dla widoków list na próbkach MVP; operacje CRUD < 500 ms średnio na instancji referencyjnej.
- Dostępność: podstawowe skróty klawiaturowe, focus management, etykiety dla pól; pełne WCAG AA poza zakresem MVP.
- Prywatność: wyłącznie dane syntetyczne; brak PII/produkcyjnych danych.
- Obserwowalność: logi aplikacyjne, prosta sonda /health; brak telemetry i dashboardów w MVP.

  3.11 Prawne

- Dane użytkowników są przechowywane zgodnie z RODO.
- Prawo do wglądu i usunięcia danych (konto wraz z artefaktami) na wniosek użytkownika.

## 4. Granice produktu

4.1 Poza zakresem MVP

- integracje z Jira/GitLab/Confluence/Allure/SSO;
- aplikacje mobilne (obecnie tylko wersja web);
- zaawansowane RBAC, audyt zdarzeń, wersjonowanie treści;
- backupy; multi‑tenant i billing;
- własne modele AI i długie historie czatów;
- upload plików (tylko URL w attachments);

## 5. Historyjki użytkowników

US-001
Tytuł: Rejestracja konta
Opis: Jako nowy użytkownik chcę się zarejestrować, aby mieć dostęp do aplikacji
Kryteria akceptacji:

- Formularz rejestracyjny zawiera pola adresu email i hasła.
- Jeśli email już istnieje w systemie nie informujemy o tym.
- Po poprawnym wypełnieniu formularza i weryfikacji danych konto jest aktywowane
- Użytkownik otrzymuje potwierdzenie pomyślnej rejestracji i zostaje zalogowany

US-002
Tytuł: Logowanie i sesja
Opis: Jako użytkownik chcę zalogować się e‑mailem i hasłem, aby uzyskać dostęp do aplikacji.
Kryteria akceptacji:

- Logowanie działa z ważnymi danymi, po podaniu prawidłowych danych, użytkownik ma dostęp do systemu.
- Błędne dane skutkują komunikatem bez ujawniania, czy e‑mail istnieje, tylko nieprawidłowe dane.
- Dane dotyczące logowania przechowywane są w bezpieczny sposób

US-003
Tytuł: Zarządzanie rolami
Opis: Jako admin chcę mieć uprawnienia do edycji globalnych szablonów, a zwykły użytkownik tylko do własnych kopii.
Kryteria akceptacji:

- Admin widzi i edytuje globalne szablony, user widzi read‑only i może forknąć.
- Próba edycji globalnego szablonu przez usera zablokowana na FE i BE, kończy się 403 i komunikatem.
- Pierwszy admin istnieje po seedzie; możliwe dodawanie kolejnych adminów przez istniejącego admina.

US-004
Tytuł: Presety raportów defektów
Opis: Jako użytkownik chcę szybko utworzyć raport z predefiniowanego presetu (UI bug, API bug) i skopiować go do Markdown.
Kryteria akceptacji:

- Utworzenie raportu z presetu wypełnia wstępnie pola: title, steps, expected, environment.
- Wymagane pola są walidowane przed kopiowaniem.
- Kliknięcie Copy to clipboard generuje poprawny Markdown; linki z attachments są listą URL.

US-005
Tytuł: Fork i edycja szablonu
Opis: Jako użytkownik chcę sklonować globalny szablon do własnej przestrzeni i go edytować.
Kryteria akceptacji:

- Fork tworzy kopię z metadanymi pochodzenia; edycja nie wpływa na szablon globalny.
- Można przywrócić domyślne wartości danego pola jednym kliknięciem.
- Usunięcie własnej kopii nie usuwa globalnego szablonu.

US-006
Tytuł: Exploration Chart z czasomierzem
Opis: Jako tester chcę prowadzić charter z goal, hypotheses, notatkami tagowanymi oraz timerem, by mieć ustrukturyzowaną sesję.
Kryteria akceptacji:

- Start/Stop timer zapisuje czas trwania; autosave localStorage co 5 s i zapis do DB po zamknięciu.
- Skróty Alt+N/Alt+T/Alt+S działają w aktywnym oknie aplikacji.
- Eksport generuje Markdown z sekcjami Goal, Hypotheses, Notes, Duration.
- Jedna aktywna sesja na użytkownika; rozpoczęcie nowej pyta o zakończenie poprzedniej.

US-007
Tytuł: Dodawanie i deduplikacja linków w KB
Opis: Jako użytkownik chcę dodać link do KB z automatyczną kanonikalizacją i deduplikacją, aby unikać powtórzeń.
Kryteria akceptacji:

- Wklejenie URL wylicza canonical URL; jeśli istnieje, system proponuje dodanie notatki do istniejącego wpisu.
- Tagowanie wieloma tagami; wyszukiwanie FTS zwraca trafienia po tytule, notatkach i tagach.
- Edycja i usunięcie wpisu działają; eksport JSON zwraca pełne wpisy i notatki.

US-008
Tytuł: Walidator IBAN (DE/AT)
Opis: Jako użytkownik chcę sprawdzić, czy IBAN jest poprawny, aby szybko zweryfikować dane.
Kryteria akceptacji:

- Walidator potwierdza poprawność IBAN DE/AT zgodnie z algorytmem mod‑97 i długościami.
- Niepoprawne znaki/długość zwracają błąd walidacji z komunikatem.
- Testy unit pokrywają poprawne/niepoprawne i wartości brzegowe; generate‑and‑validate przechodzi.

US-009
Tytuł: Generator IBAN (DE/AT) z seed
Opis: Jako użytkownik chcę generować poprawne IBAN‑y dla DE/AT, również deterministycznie przez seed.
Kryteria akceptacji:

- Wygenerowany IBAN przechodzi walidator; podanie seed zwraca powtarzalny wynik.
- Można skopiować wynik jako Text lub JSON; API/URL obsługuje ?seed=1234.

US-010
Tytuł: Generatory danych lokalnych
Opis: Jako użytkownik chcę generować adresy, telefony, tablice, e‑maile i nazwy firm dla PL/DE/AT.
Kryteria akceptacji:

- Dla każdego typu można wybrać kraj; wynik spełnia podstawowe reguły formatu (TBD: regexy).
- Tryb Text/JSON i opcjonalny seed; kopiowanie działa; błędne parametry zwracają czytelny błąd.

US-011
Tytuł: Wyszukiwanie i filtrowanie KB
Opis: Jako użytkownik chcę szybko znaleźć wpisy po frazie i po tagach.
Kryteria akceptacji:

- FTS znajduje wpisy po słowach z tytułu, notatek i tagów;
- wyniki są sortowane wg trafności i daty.
- Filtrowanie po wielu tagach zawęża listę;
- pusta fraza przy aktywnych tagach nadal filtruje.

US-012
Tytuł: Asystent AI do ulepszania treści
Opis: Jako użytkownik chcę jednym kliknięciem ulepszyć opis defektu lub charter i mieć kontrolę nad zmianami.
Kryteria akceptacji:

- Klik Improve wywołuje usługę AI i pokazuje diff/preview;
- Użytkownik może zaakceptować lub odrzucić.
- Przekroczenie limitu dziennego wyświetla komunikat i podpowiedzi manualne; AI_DISABLED ukrywa akcję.
- Logujemy metadane wywołań (bez treści wrażliwych) do celów debug.

US-013
Tytuł: Obsługa błędów i edge cases
Opis: Jako użytkownik chcę czytelnych błędów w przypadku limitów, braku sieci i kolizji danych.
Kryteria akceptacji:

- Brak sieci podczas autosave pokazuje ostrzeżenie i nie traci notatek po powrocie online.
- Próba dodania duplikatu KB proponuje dołączenie notatki do istniejącego wpisu.
- Wygaśnięcie sesji podczas pracy powoduje soft‑prompt do ponownego logowania i bezpieczne odzyskanie danych formularza.

US-014
Tytuł: Eksport charterów i KB
Opis: Jako użytkownik chcę eksportować chartery do Markdown oraz KB do JSON.
Kryteria akceptacji:

- Eksport charteru tworzy plik/tekst w prawidłowej strukturze;
- KB JSON zawiera pola schema z sekcji 3.4.
- Długie treści są bezpiecznie escapowane;
- eksport nie zawiera danych sesyjnych ani PII.

## 6. Metryki sukcesu

- Dostępność publiczna: aplikacja dostępna pod publicznym URL, podstawowy smoke przechodzi.
- Jakość: zielony pipeline CI z unit (walidator IBAN) i E2E (KB CRUD); artefakty testów dołączone.
- Pokrycie ścieżek MVP: walidator IBAN pokryty testami wraz z generate‑and‑validate oraz co najmniej jedna pełna ścieżka CRUD (KB) przechodzi E2E.
- Użyteczność: raport defektu możliwy do przygotowania i skopiowania do Markdown w ≤ 3 min przy użyciu presetu.
