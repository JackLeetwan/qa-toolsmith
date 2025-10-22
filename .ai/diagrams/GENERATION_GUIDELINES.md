# Instrukcje Generowania Diagramów Mermaid

Ten dokument zawiera kompleksowe wytyczne do generowania diagramów Mermaid dla projektu QA Toolsmith. Zawiera instrukcje dla trzech głównych typów diagramów: architektury autentykacji, podróży użytkownika oraz architektury UI.

## Typy Diagramów

### 1. Diagram Architektury Autentykacji (Sequence Diagram)

**Plik docelowy:** `.ai/diagrams/auth.md`

Jesteś specjalistą ds. bezpieczeństwa, którego zadaniem jest utworzenie diagramu Mermaid w celu wizualizacji przepływu autentykacji dla modułu logowania i rejestracji.

**Przed utworzeniem diagramu:**
1. Przeanalizuj wszystkie przepływy autentykacji wymienione w dokumentacji
2. Zidentyfikuj głównych aktorów i ich interakcje
3. Określ procesy weryfikacji i odświeżania tokenów
4. Dostarcz krótki opis każdego kroku autentykacji

**Elementy do uwzględnienia:**
- Pełny cykl życia procesu autentykacji w nowoczesnej aplikacji używającej React, Astro i Supabase Auth
- Komunikacja między aktorami: Przeglądarka, Middleware, Astro API, Supabase Auth
- Wyraźne punkty przekierowania użytkownika lub weryfikacji tokenu
- Przepływ danych po wdrożeniu nowych wymagań autentykacji
- Jak działa sesja użytkownika po zalogowaniu i jak system reaguje na wygaśnięcie tokenu
- Proces odświeżania tokenu i ochrona przed nieautoryzowanym dostępem

**Składnia:**
```mermaid
sequenceDiagram
```

### 2. Diagram Podróży Użytkownika (State Diagram)

**Plik docelowy:** `.ai/diagrams/journey.md`

Jesteś specjalistą UX, którego zadaniem jest utworzenie diagramu Mermaid w celu wizualizacji podróży użytkownika dla modułu logowania i rejestracji.

**Przed utworzeniem diagramu:**
1. Wypisz wszystkie ścieżki użytkownika wymienione w dokumentacji
2. Zidentyfikuj główne podróże i ich odpowiadające stany
3. Określ punkty decyzyjne i alternatywne ścieżki
4. Dostarcz krótki opis celu każdego stanu

**Elementy do uwzględnienia:**
- Ścieżki użytkownika oparte na istniejących wymaganiach
- Korzystanie z aplikacji jako niezalogowany użytkownik
- Dostęp do głównej funkcjonalności aplikacji
- Logowanie się, tworzenie konta, odzyskiwanie hasła
- Podróż użytkownika na wysokim poziomie zgodna z wymaganiami projektu i historiami użytkownika
- Punkty decyzyjne i alternatywne ścieżki
- Przepływ po weryfikacji e-mail
- Skupienie się na ścieżkach biznesowych, a nie aspektach technicznych

**Składnia:**
```mermaid
stateDiagram-v2
```

### 3. Diagram Architektury UI (Flowchart)

**Plik docelowy:** `.ai/diagrams/ui.md`

Jesteś doświadczonym architektem oprogramowania, którego zadaniem jest utworzenie diagramu Mermaid w celu wizualizacji architektury stron Astro i komponentów React dla modułu logowania i rejestracji.

**Przed utworzeniem diagramu:**
1. Wypisz wszystkie komponenty wymienione w dokumentacji
2. Zidentyfikuj główne strony i ich odpowiadające komponenty
3. Określ przepływ danych między komponentami
4. Dostarcz krótki opis funkcjonalności każdego komponentu

**Elementy do uwzględnienia:**
- Zaktualizowaną strukturę UI po wdrożeniu nowych wymagań
- Layouts, server pages i aktualizacje istniejących komponentów
- Grupowanie elementów według funkcjonalności
- Kierunek przepływu danych między komponentami
- Moduły odpowiedzialne za stan aplikacji
- Podział na komponenty współdzielone i komponenty specyficzne dla stron
- Zależności między komponentami związanymi z autentykacją a resztą aplikacji
- Wyróżnij komponenty, które wymagały aktualizacji ze względu na nowe wymagania

**Składnia:**
```mermaid
flowchart TD
```

## Wspólne Zasady Składni Mermaid

### Ogólne Wytyczne

- **Rozpoczęcie diagramu:** Zawsze rozpoczynaj od deklaracji typu diagramu
- **Analiza wstępna:** Umieść analizę wymagań w tagach `<analysis_type>` przed diagramem
- **Spójne nazewnictwo:** Używaj polskiego języka i spójnych nazw w całym dokumencie
- **Limit długości linii:** NIE przekraczaj 80 znaków w pojedynczej linii kodu Mermaid
- **Unikaj złożonych wyrażeń:** NIE umieszczaj adresów URL, endpointów, nawiasów, długich nazw funkcji ani złożonych wyrażeń w nazwach diagramu
- **Format nazw:** Zamiast `[Strona Główna<br/>(Kreator Reguł)]` używaj `[Kreator Reguł]`

### Sequence Diagrams (Autentykacja)

- **Autonumber:** Używaj atrybutu `autonumber` dla przejrzystości sekwencji kroków
- **Spójne odstępy:** Utrzymuj spójne odstępy między elementami dla czytelności diagramu
- **Deklaracja aktorów:** Zawsze używaj `participant` do deklarowania aktorów przed rozpoczęciem sekwencji
- **Poprawna kolejność:** Pamiętaj o poprawnej kolejności elementów w sekwencji (nadawca, strzałka, odbiorca)
- **Aktywacja:** Używaj właściwego cyklu aktywacji i dezaktywacji elementów

**Typy strzałek:**
- `->` - zwykłe strzałki (np. `Browser->API`)
- `-->` - przerywane strzałki (np. `API-->Browser: Token expired`)
- `->>` - strzałki z pustymi grotami (np. `Browser->>Auth: Login request`)
- `-->>` - przerywane strzałki z pustymi grotami

**Bloki warunkowe:**
```mermaid
alt Authentication successful
    Browser->>Dashboard: Redirect to dashboard
else Authentication failed
    Browser->>LoginPage: Show error message
end
```

**Bloki równoległe:**
```mermaid
par Send confirmation email
    API->>EmailService: Send verification
and Update user status
    API->>Database: Update status
end
```

### State Diagrams (Podróż Użytkownika)

- **Stany początkowe/końcowe:** Muszą być poprawnie zdefiniowane z `[*]`
- **Stany złożone:** Używaj do grupowania powiązanych stanów
- **Rozgałęzienia:** Używaj poprawnej składni dla punktów decyzyjnych

**Stany złożone:**
```mermaid
state "Proces Rejestracji" as Rejestracja {
    [*] --> FormularzRejestracji
    FormularzRejestracji --> WalidacjaDanych
    WalidacjaDanych --> WyslanieMaila
}
```

**Punkty decyzyjne:**
```mermaid
state if_weryfikacja <<choice>>
WeryfikacjaTokena --> if_weryfikacja
if_weryfikacja --> TokenPoprawny: Token OK
if_weryfikacja --> TokenNiepoprawny: Token błędny
```

**Notatki:**
```mermaid
FormularzLogowania: Użytkownik może się zalogować
note right of FormularzLogowania
    Formularz zawiera pola email i hasło
    oraz link do odzyskiwania hasła
end note
```

### Flowchart Diagrams (Architektura UI)

- **ID węzłów:** Spójne formatowanie, rozróżniana wielkość liter, muszą być unikalne
- **Kształty węzłów:**
  - `[Tekst]` - prostokąty
  - `(Tekst)` - zaokrąglone prostokąty
  - `((Tekst))` - okręgi
  - `{Tekst}` - romby
  - `>Tekst]` - flagi
  - `[[Tekst]]` - podprogramy

**Subgrafy (grupowanie):**
```mermaid
subgraph "Moduł Autentykacji"
    A[Formularz Logowania]
    B[Walidacja Danych]
    C[Zarządzanie Sesją]
end
```

**Typy połączeń:**
- `-->` - standardowe strzałki
- `---` - linie bez strzałek
- `-.->` - linie kropkowane ze strzałkami
- `==>` - grube linie ze strzałkami
- `--Tekst-->` - strzałki z etykietami

**Stylizacja:**
```mermaid
A:::styleClass --> B

classDef styleClass fill:#f96,stroke:#333,stroke-width:2px;
```

## Częste Błędy do Uniknięcia

### Sequence Diagrams
- Brak deklaracji sekcji Mermaid i typu diagramu na początku
- Niepoprawna składnia strzałek (np. -> zamiast ->>)
- Używanie niedozwolonych znaków w identyfikatorach bez umieszczania ich w cudzysłowach
- Niezbalansowane bloki kodu (brakujące end dla rozpoczętych bloków)
- Niepoprawne zagnieżdżanie bloków warunkowych

### State Diagrams
- Brak deklaracji sekcji Mermaid i typu diagramu na początku
- Niepoprawne stany decyzyjne (brakujący choice, fork, join)
- Brakujące stany początkowe i końcowe ([*])
- Niespójne nazewnictwo stanów
- Niezamknięte zagnieżdżone stany (brakujący zamykający nawias klamrowy)

### Flowchart Diagrams
- Brak deklaracji sekcji Mermaid i typu diagramu na początku
- Nieprawidłowe ID węzłów (zawierające niedozwolone znaki)
- Niezamknięte subgrafy (brakujący "end" dla rozpoczętego "subgraph")
- Niezamknięte nawiasy kwadratowe w opisach węzłów
- Niespójne kierunki przepływu (mieszanie TD i LR bez uzasadnienia)

## Proces Tworzenia Diagramów

1. **Analiza wymagań:** Przeprowadź analizę wstępną i umieść ją w odpowiednich tagach `<analysis_type>`
2. **Planowanie:** Zaplanuj podejście do diagramu na podstawie zebranych wymagań
3. **Implementacja:** Utwórz diagram zgodnie z wytycznymi składniowymi
4. **Recenzja:** Dokładnie przejrzyj diagram pod kątem błędów składniowych i problemów z renderowaniem
5. **Korekta:** Wprowadź niezbędne poprawki dla poprawy przejrzystości i dokładności
6. **Finalizacja:** Umieść końcowy diagram w tagach `<mermaid_diagram>`

## Pliki Referencyjne

Podczas tworzenia diagramów odwołuj się do następujących plików:
- `[project-prd.md](mdc:.ai/prd.md)` - główne wymagania projektu

## Narzędzia i Zasoby

- **Mermaid Live Editor:** https://mermaid.live/ - do testowania diagramów
- **Dokumentacja Mermaid:** https://mermaid.js.org/ - pełna dokumentacja składni
- **Visual Studio Code:** z rozszerzeniem Mermaid do podglądu na żywo
