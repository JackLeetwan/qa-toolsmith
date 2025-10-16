# Architektura UI dla QA Toolsmith (MVP)

## 1. Przegląd struktury UI

### 1.1 Koncepcja ogólna

QA Toolsmith to aplikacja webowa zbudowana w architekturze **SPA (Single Page Application)** z wykorzystaniem Astro 5, React 19, TypeScript 5 i Tailwind 4. Interfejs użytkownika realizuje wzorzec **role-based access control (RBAC)** z dwoma rolami: **admin** i **user**, stosując JWT z Supabase Auth do uwierzytelniania i autoryzacji.

Architektura UI opiera się na **modułowym podejściu** z wyraźnie wydzielonymi obszarami funkcjonalnymi:

- **Templates** – zarządzanie szablonami raportów defektów
- **Charters** – prowadzenie sesji eksploracyjnych z timerem
- **Knowledge Base** – baza wiedzy z wyszukiwaniem FTS
- **Generators** – generatory danych testowych
- **Profile** – profil użytkownika
- **Admin** – panel administracyjny (tylko dla roli admin)

### 1.2 Założenia projektowe

1. **Mobile-first**: wszystkie widoki projektowane z priorytetem urządzeń mobilnych
2. **Minimal a11y baseline**: focus visible, labels dla pól formularzy, cele dotykowe ≥40px
3. **Offline-aware**: banner offline, retry queue dla idempotentnych operacji
4. **Optimistic UI**: natychmiastowe feedback dla częstych akcji (notatki, tagi)
5. **Spójne wzorce**: ujednolicone komponenty list, formularzy, błędów, ładowania

### 1.3 Zarządzanie stanem

- **TanStack Query** – cache zapytań API, mutacje, synchronizacja
- **Keyset pagination** – `?limit&after=cursor` dla stabilnej paginacji
- **URL-synced filters** – parametry filtrów i wyszukiwania w URL
- **localStorage** – autosave dla Charters (5s), historia generatorów (10 wpisów)

### 1.4 Obsługa błędów i stanów

| Kod HTTP | Obsługa UI                                                    |
| -------- | ------------------------------------------------------------- |
| 401      | Modal z re-login + zachowanie intencji użytkownika            |
| 403      | Banner informacyjny „Brak uprawnień"                          |
| 409      | Dialog rozwiązywania konfliktu (KB duplicate, active charter) |
| 422      | Inline errors w formularzach                                  |
| 429      | Banner z komunikatem o limicie i odliczaniem                  |
| 500      | Error boundary z opcją retry                                  |
| Offline  | Banner offline + kolejka retry dla GET                        |

---

## 2. Lista widoków

### 2.1 Widoki publiczne (bez autentykacji)

#### **Login** (`/login`)

**Główny cel:** Uwierzytelnienie użytkownika za pomocą email/hasło.

**Kluczowe informacje:**

- Formularz logowania (email, hasło)
- Link do rejestracji
- Komunikaty błędów (bez ujawniania, czy email istnieje)
- Rate limiting feedback (429)

**Kluczowe komponenty:**

- `LoginForm` – formularz z walidacją
- `AuthLayout` – layout dla stron auth (centred card)
- `ErrorAlert` – komunikaty błędów
- `Button` – CTA „Zaloguj się"

**UX, dostępność, bezpieczeństwo:**

- Autofocus na polu email
- Show/hide password toggle
- Enter submits form
- Rate limiting komunikat: „Za dużo prób. Spróbuj ponownie za X sekund"
- Nie ujawniamy, czy email istnieje („Nieprawidłowe dane logowania")
- HTTPS only
- ARIA labels dla pól

---

#### **Register** (`/register`)

**Główny cel:** Rejestracja nowego użytkownika.

**Kluczowe informacje:**

- Formularz rejestracji (email, hasło, potwierdzenie hasła)
- Wymagania dotyczące hasła (min. długość, znaki specjalne)
- Komunikat o wysłaniu email weryfikacyjnego
- Link do logowania

**Kluczowe komponenty:**

- `RegisterForm` – formularz z walidacją
- `PasswordStrengthIndicator` – wizualizacja siły hasła
- `AuthLayout`
- `SuccessMessage` – potwierdzenie rejestracji

**UX, dostępność, bezpieczeństwo:**

- Real-time walidacja hasła
- Potwierdzenie hasła musi się zgadzać
- Komunikat sukcesu: „Konto utworzone. Sprawdź email i potwierdź adres"
- Automatyczne logowanie po weryfikacji email (Supabase)
- Focus management w formularzu

---

### 2.2 Widoki chronione (wymagana autentykacja)

#### **Templates List** (`/templates`)

**Główny cel:** Wyświetlenie listy dostępnych szablonów (globalne + własne użytkownika). **Strona startowa aplikacji po zalogowaniu.**

**Kluczowe informacje:**

- Lista szablonów z nazwą, scope (global/user), preset (UI bug/API bug)
- Filtrowanie: scope (global/user/all), preset, nazwa
- Keyset pagination
- Status readonly dla globalnych (user), akcja Fork
- CTA: „Nowy szablon", „Fork" (dla globalnych)

**Kluczowe komponenty:**

- `TemplateList` – lista z kartami/rows
- `TemplateCard` – pojedynczy szablon (nazwa, scope badge, preset badge, akcje)
- `TemplateFilters` – filtry scope/preset/search
- `Pagination` – keyset pagination controls
- `EmptyState` – gdy brak szablonów
- `CreateTemplateButton` – FAB lub header button

**UX, dostępność, bezpieczeństwo:**

- Mobile: karty pionowo stackowane
- Desktop: grid 2-3 kolumny
- Filtry w collapsible drawer (mobile) lub sidebar (desktop)
- URL-synced filters: `/templates?scope=user&preset=ui_bug`
- Skeleton loading podczas fetch
- Fork button widoczny tylko dla globalnych (user role)
- Admin widzi wszystkie, user widzi global (readonly) + own (editable)

---

#### **Template Details** (`/templates/:id`)

**Główny cel:** Wyświetlenie szczegółów szablonu z możliwością edycji (user-owned) lub forku (global).

**Kluczowe informacje:**

- Nazwa, scope, preset, owner
- Lista pól (key, type, label, default value)
- Required fields (wyróżnione)
- Attachments (URL list)
- Akcje: Edit (user-owned), Fork (global), Delete (user-owned), Render (z wypełnionymi danymi)

**Kluczowe komponenty:**

- `TemplateHeader` – breadcrumb, nazwa, badges, akcje
- `TemplateFieldsList` – lista pól z typami
- `TemplateActions` – conditional buttons based on role/ownership
- `DeleteConfirmDialog` – potwierdzenie usunięcia
- `ForkDialog` – dialog z nazwą nowego szablonu

**UX, dostępność, bezpieczeństwo:**

- Readonly view dla globalnych (user role)
- Edit button → `/templates/:id/edit` (tylko user-owned lub admin na global)
- Fork button → dialog z nazwą → POST `/templates/:id/fork` → redirect do `/templates/:newId/edit`
- Delete button → confirm dialog → DELETE `/templates/:id` → redirect do `/templates`
- Breadcrumb: Templates > [Nazwa szablonu]
- 403 handling: redirect do list z toastem „Brak uprawnień"

---

#### **Template Edit** (`/templates/:id/edit`)

**Główny cel:** Edycja istniejącego szablonu (user-owned) lub tworzenie nowego.

**Kluczowe informacje:**

- Formularz edycji: nazwa, preset, scope (disabled if editing), fields[], required_fields[]
- Fields builder: dodawanie/usuwanie pól, key/type/label/default
- Attachments builder: lista URL
- Walidacja: required_fields ⊆ fields.key
- Save button (PATCH) / Cancel

**Kluczowe komponenty:**

- `TemplateForm` – główny formularz
- `FieldsBuilder` – dynamiczna lista pól z add/remove
- `RequiredFieldsSelector` – multi-select z dostępnych keys
- `AttachmentsBuilder` – lista URL z walidacją
- `FormActions` – Save, Cancel
- `ValidationErrors` – inline errors

**UX, dostępność, bezpieczeństwo:**

- Drag-and-drop reordering pól (nice-to-have, MVP: up/down buttons)
- Real-time walidacja required_fields
- Unsaved changes warning (beforeunload)
- 422 errors mapped to form fields
- Cancel → confirm if dirty → back to details
- Save → optimistic update → redirect to details
- Admin editing global: sprawdzenie roli, 403 dla user

---

#### **Template Create** (`/templates/new`)

**Główny cel:** Utworzenie nowego szablonu (user-scoped lub global dla admin).

**Kluczowe informacje:**

- Formularz jak w Edit, ale wszystkie pola puste
- Preset selector (UI bug, API bug, custom)
- Scope selector (user default, admin może wybrać global)
- Quick start: preset wypełnia przykładowe pola

**Kluczowe komponenty:**

- `TemplateForm` (reused from Edit)
- `PresetSelector` – radio buttons dla UI bug/API bug/custom
- `ScopeSelector` – conditional dla admin

**UX, dostępność, bezpieczeństwo:**

- Preset selector na początku (UI bug → wypełnia pola title, steps, expected, actual, environment, severity, priority)
- Scope: user domyślnie, admin widzi checkbox „Global template"
- Create button → POST `/templates` → redirect do `/templates/:id`

---

#### **Template Render** (`/templates/:id/render`)

**Główny cel:** Wypełnienie szablonu danymi i wygenerowanie Markdown raportu.

**Kluczowe informacje:**

- Formularz z polami z szablonu (required fields wyróżnione)
- Live preview Markdown (split view: form | preview)
- Attachments jako lista URL
- Copy to clipboard button
- AI Improve button (per field, jeśli enabled)

**Kluczowe komponenti:**

- `RenderForm` – formularz dynamiczny z pól szablonu
- `MarkdownPreview` – live preview renderowanego Markdown
- `CopyButton` – copy to clipboard
- `AIImproveButton` – per field (conditional)
- `AttachmentsList` – edytowalna lista URL

**UX, dostępność, bezpieczeństwo:**

- Split view (desktop: 50/50, mobile: tabs Form/Preview)
- Required fields validation przed Copy/Render
- Copy button → POST `/templates/:id/render` → clipboard → toast „Skopiowano"
- AI Improve → dialog z diff preview → accept/reject
- Attachments jako markdown list w sekcji Attachments
- Validation errors inline (422)
- Session storage auto-save (co 10s, recover on reload)

---

#### **Charters List** (`/charters`)

**Główny cel:** Lista sesji eksploracyjnych użytkownika z możliwością wznowienia aktywnej lub utworzenia nowej.

**Kluczowe informacje:**

- Lista charterów (goal, status: active/closed, started_at, ended_at, duration)
- Status badge (active/closed)
- Resume button dla active
- New Charter button (z sprawdzeniem active conflict)
- Keyset pagination

**Kluczowe komponenty:**

- `ChartersList` – lista kart
- `CharterCard` – goal, status, duration, akcje
- `NewCharterButton` – FAB
- `ResumeButton` – dla active charter
- `Pagination`
- `EmptyState`

**UX, dostępność, bezpieczeństwo:**

- Active charter na górze listy (sticky/pinned)
- Resume button → redirect do `/charters/:id/run`
- New Charter → sprawdzenie aktywnej sesji (409) → dialog „Masz aktywną sesję. Zakończyć?" → Yes: stop active + create new, No: cancel
- Sortowanie: active first, then by started_at desc
- Mobile: karty full-width, desktop: grid

---

#### **Charter Create** (`/charters/new`)

**Główny cel:** Utworzenie nowej sesji eksploracyjnej (goal, hypotheses).

**Kluczowe informacje:**

- Formularz: goal (textarea), hypotheses (textarea, markdown)
- Create & Start button → POST `/charters` + POST `/charters/:id/start` → redirect do `/charters/:id/run`

**Kluczowe komponenty:**

- `CharterForm` – goal, hypotheses
- `MarkdownEditor` – dla hypotheses z toolbar
- `FormActions` – Create & Start, Cancel

**UX, dostępność, bezpieczeństwo:**

- Goal: krótki textarea (max 200 chars)
- Hypotheses: markdown editor (max 5000 chars)
- Validation: goal required
- 409 handling (active conflict): modal „Zakończ aktywną sesję?" → Yes/No
- Cancel → back to list

---

#### **Charter Run** (`/charters/:id/run`)

**Główny cel:** Prowadzenie aktywnej sesji eksploracyjnej z timerem, notatkami i autosave.

**Kluczowe informacje:**

- Header: goal, timer (running/stopped), duration
- Hypotheses (readonly, collapsible)
- Notes list (tagged: bug/idea/question/risk, timestamp)
- Add note form (quick textarea + tag selector)
- Actions: Stop session, Export to Markdown
- Autosave status indicator

**Kluczowe komponenty:**

- `CharterHeader` – goal, timer display, Start/Stop button
- `Timer` – HH:MM:SS display z Start/Stop
- `HypothesesSection` – collapsible
- `NotesList` – lista notatek z tagami i timestamps
- `AddNoteForm` – quick add (textarea + tag radio)
- `ExportButton` – Export to Markdown
- `AutosaveIndicator` – „Zapisano" / „Zapisywanie..."

**UX, dostępność, bezpieczeństwo:**

- Timer w header, zawsze widoczny
- Keyboard shortcuts:
  - Alt+N: focus add note textarea
  - Alt+T: toggle timer
  - Alt+S: manual save
- Autosave: localStorage co 5s, API co 30s (debounced)
- Notes: optimistic add → API in background
- Stop session button → POST `/charters/:id/stop` → redirect do `/charters` z toastem
- Export → GET `/charters/:id/export` → download Markdown
- Offline banner: „Brak połączenia. Zmiany zostaną zapisane lokalnie"
- Resume: wczytanie z localStorage + sync z API
- Mobile: notes full-width, desktop: max-width 800px centered

---

#### **Charter Details** (`/charters/:id`)

**Główny cel:** Podgląd zakończonej sesji (readonly).

**Kluczowe informacje:**

- Goal, hypotheses, duration, started_at, ended_at
- Notes list (readonly)
- Export to Markdown button
- Back to list

**Kluczowe komponenty:**

- `CharterHeader` (readonly)
- `CharterMeta` – duration, dates
- `NotesList` (readonly)
- `ExportButton`

**UX, dostępność, bezpieczeństwo:**

- Breadcrumb: Charters > [Goal preview]
- Readonly, brak edycji
- Export działa jak w Run view
- Delete button (confirm dialog) → DELETE `/charters/:id`

---

#### **Knowledge Base List** (`/kb`)

**Główny cel:** Przeszukiwalna lista wpisów bazy wiedzy z filtrowaniem po tagach.

**Kluczowe informacje:**

- Search bar (FTS) z live search
- Tag filter (multi-select)
- Lista wpisów: title, url_canonical, tags, excerpt pierwszej notatki
- Add entry button
- Keyset pagination
- Export all button

**Kluczowe componenty:**

- `KBSearchBar` – search input z debounce
- `KBTagFilter` – multi-select tags
- `KBList` – lista kart
- `KBCard` – title, link, tags, excerpt, akcje
- `AddEntryButton` – FAB
- `ExportButton` – export all to JSON
- `Pagination`
- `EmptyState`

**UX, dostępność, bezpieczeństwo:**

- Search: debounce 300ms, URL-synced `/kb?q=postgres&tags=fts,search`
- Tags: autocomplete z istniejących tagów
- Card click → `/kb/:id`
- Edit/Delete buttons na karcie (hover/long-press)
- Export → GET `/kb/export` → download JSON
- Mobile: search + filters w collapsible drawer
- Skeleton loading
- Empty state: „Brak wyników" vs „Dodaj pierwszy wpis"

---

#### **KB Entry Create** (`/kb/new`)

**Główny cel:** Dodanie nowego wpisu do bazy wiedzy z kanonikalizacją URL.

**Kluczowe informacje:**

- Formularz: title, url, tags, first note
- URL canonicalization preview
- Duplicate detection (409 → dialog)

**Kluczowe komponenty:**

- `KBEntryForm` – title, url, tags, note
- `URLCanonicalizationPreview` – pokazuje canonical URL
- `TagsInput` – multi-tag input z autocomplete
- `DuplicateDialog` – obsługa 409
- `FormActions`

**UX, dostępność, bezpieczeństwo:**

- URL field: onBlur → preview canonical URL
- Title: autofill z URL (fetch page title, nice-to-have MVP)
- Tags: autocomplete + create new
- 409 (duplicate): dialog „Wpis o tym URL już istnieje. Dodać notatkę?" → Yes: redirect do `/kb/:existingId` z pre-filled note, No: cancel
- Validation: title required, url format
- Create → POST `/kb` → redirect do `/kb/:id`

---

#### **KB Entry Details** (`/kb/:id`)

**Główny cel:** Szczegóły wpisu z listą notatek i możliwością edycji.

**Kluczowe informacje:**

- Title, url_original, url_canonical (link), tags
- Notes list (z timestamps, editable)
- Add note form
- Edit entry button (title, tags)
- Delete entry button

**Kluczowe komponenty:**

- `KBEntryHeader` – title, URL (clickable), tags, akcje
- `KBNotesList` – lista notatek z timestamps
- `AddNoteForm` – quick add note
- `EditEntryButton` → dialog lub inline edit
- `DeleteEntryButton` – confirm dialog

**UX, dostępność, bezpieczeństwo:**

- URL canonical clickable (external link, target="\_blank" rel="noopener")
- Notes: optimistic add/delete
- Edit entry: inline edit title/tags lub modal
- Delete entry: confirm → DELETE `/kb/:id` → redirect do `/kb`
- Breadcrumb: Knowledge Base > [Title]
- Notes sortowanie: newest first

---

#### **Generators Hub** (`/generators`)

**Główny cel:** Centralne miejsce dostępu do wszystkich generatorów danych testowych.

**Kluczowe informacje:**

- Lista dostępnych generatorów jako karty/tiles:
  - IBAN (DE/AT)
  - Phone
  - Address
  - License Plates
  - Email
  - Company
  - Payment Card
  - GUID
  - Random String
- Każda karta: nazwa, opis, link do generatora

**Kluczowe komponenty:**

- `GeneratorsList` – grid kart
- `GeneratorCard` – nazwa, ikona, opis, link
- `GeneratorLayout` – wspólny layout dla wszystkich generatorów

**UX, dostępność, bezpieczeństwo:**

- Grid: mobile 1 col, tablet 2, desktop 3
- Card click → `/generators/:kind` (np. `/generators/iban`)
- Ikony dla każdego typu generatora
- Opis: krótki (1 linijka) z przykładem

---

#### **IBAN Generator** (`/generators/iban`)

**Główny cel:** Generowanie i walidacja IBAN dla DE/AT.

**Kluczowe informacje:**

- Form: country (DE/AT dropdown), seed (optional), mode (generate/validate)
- Results: IBAN, country, seed (if used), format (text/JSON)
- Copy button, Generate again
- Local history (10 last generated, localStorage)

**Kluczowe komponenty:**

- `IBANGeneratorForm` – country, seed, mode
- `IBANResult` – wynik z copy button
- `FormatToggle` – Text/JSON
- `GeneratorHistory` – lista ostatnich (collapsible)
- `ValidatorForm` – input IBAN, validate button
- `ValidationResult` – valid/invalid + reason

**UX, dostępność, bezpieczeństwo:**

- Mode tabs: Generate | Validate
- Generate:
  - Country dropdown (DE/AT)
  - Seed input (optional, numeric)
  - Generate button → GET `/generators/iban?country=DE&seed=123`
  - Result w card: IBAN, copy button, format toggle
  - History: sidebar (desktop) lub collapsible (mobile)
- Validate:
  - IBAN input (paste)
  - Validate button → GET `/validators/iban?iban=...`
  - Result: green check „Valid" lub red X „Invalid: [reason]"
- History stored in localStorage, max 10, FIFO
- Error 400: inline message „Nieprawidłowy kraj"

---

#### **Other Generators** (`/generators/:kind`)

**Główny cel:** Generowanie innych typów danych (phone, address, plates, email, company, card, guid, string).

**Kluczowe informacje:**

- Form: country (PL/DE/AT), seed (optional), kind-specific params
- Results: generated data, format (text/JSON)
- Copy button
- Local history

**Kluczowe komponenty:**

- `GeneratorForm` – country, seed, params
- `GeneratorResult` – wynik z copy
- `FormatToggle`
- `GeneratorHistory`

**UX, dostępność, bezpieczeństwo:**

- Ujednolicony pattern jak IBAN
- Kind-specific params:
  - Address: type (home/business)
  - Phone: type (mobile/landline)
  - String: length, charset
  - Card: type (visa/mastercard)
- Walidacja params, 400 → inline errors
- History per kind (localStorage key: `gen_history_${kind}`)

---

#### **Profile** (`/profile`)

**Główny cel:** Wyświetlenie i edycja profilu użytkownika.

**Kluczowe informacje:**

- Email (readonly, z Supabase Auth)
- Role badge (admin/user, readonly)
- Created at, updated at
- Change password link (Supabase flow)
- AI daily limit usage (jeśli AI enabled)
- Logout button

**Kluczowe komponenty:**

- `ProfileHeader` – email, role badge
- `ProfileMeta` – dates
- `AIUsageCard` – daily limit progress bar
- `ChangePasswordButton` – link do Supabase flow
- `LogoutButton`

**UX, dostępność, bezpieczeństwo:**

- Email niemodyfikowalny (Supabase auth.users)
- Role readonly
- AI usage: „Wykorzystano X / Y żądań dzisiaj" + progress bar
- Change password → Supabase resetPasswordForEmail flow
- Logout → POST `/auth/logout` → clear localStorage → redirect `/login`
- Delete account button: confirm dialog → usunięcie konta + kaskadowe usunięcie artefaktów (GDPR)

---

#### **Admin: Templates List** (`/admin/templates`)

**Główny cel:** Zarządzanie globalnymi szablonami (admin only).

**Kluczowe informacje:**

- Lista wszystkich globalnych szablonów
- Edit/Delete actions
- Create global template button
- Filtry jak w user list

**Kluczowe komponenty:**

- `AdminTemplatesList` – lista global templates
- `TemplateCard` – z admin actions
- `CreateGlobalTemplateButton`

**UX, dostępność, bezpieczeństwo:**

- 403 guard: redirect non-admin to `/templates`
- Lista: tylko scope=global
- Edit button → `/admin/templates/:id/edit`
- Delete: confirm → cascade check (forked templates info)
- Breadcrumb: Admin > Templates

---

#### **Admin: Template Edit** (`/admin/templates/:id/edit`)

**Główny cel:** Edycja globalnego szablonu (admin only).

**Kluczowe informacje:**

- Jak Template Edit, ale dla global scope
- Warning: „Zmiany wpłyną na wszystkie nowo tworzone foki"
- is_readonly checkbox (seedowane templates)

**Kluczowe komponenty:**

- `TemplateForm` (reused)
- `GlobalTemplateWarning` – alert o wpływie zmian
- `ReadonlyToggle` – checkbox

**UX, dostępność, bezpieczeństwo:**

- 403 guard
- Warning banner na górze
- Save → PATCH `/templates/:id` z admin JWT
- is_readonly: jeśli true, user nie może forknąć? (TBD, MVP: readonly info only)

---

#### **Admin: Profiles List** (`/admin/profiles`) (opcjonalne MVP)

**Główny cel:** Zarządzanie użytkownikami (admin only).

**Kluczowe informacje:**

- Lista użytkowników: email, role, created_at
- Filtrowanie po roli
- Keyset pagination
- Akcje: View details, Change role, Delete (nie w MVP?)

**Kluczowe komponenty:**

- `ProfilesList` – lista users
- `ProfileCard` – email, role, akcje
- `RoleChangeDialog` – zmiana roli

**UX, dostępność, bezpieczeństwo:**

- 403 guard
- MVP: tylko odczyt, brak edycji (poza scope)
- Future: zmiana roli, suspend, delete

---

### 2.3 Widoki specjalne

#### **404 Not Found** (`*`)

**Główny cel:** Obsługa nieistniejących tras.

**Kluczowe komponenty:**

- `NotFoundPage` – komunikat + link do home
- Illustration (optional)

---

#### **Error Boundary**

**Główny cel:** Obsługa nieoczekiwanych błędów aplikacji.

**Kluczowe komponenty:**

- `ErrorBoundary` – catch React errors
- Retry button
- Link do support (GitHub issues)

---

## 3. Mapa podróży użytkownika

### 3.1 Główne ścieżki użytkownika (User Stories)

#### **US-001: Rejestracja konta**

```
1. Użytkownik → `/register`
2. Wypełnia formularz (email, hasło)
3. Submit → POST `/auth/register` (Supabase)
4. Sukces → komunikat „Sprawdź email"
5. Email verification link → Supabase potwierdza
6. Auto-login → redirect `/templates`
```

**Punkty kontaktu UI:**

- RegisterForm (validation, success message)
- Email notification (Supabase)
- Auto-login (Supabase Auth)

---

#### **US-002: Logowanie i sesja**

```
1. Użytkownik → `/login`
2. Wprowadza email, hasło
3. Submit → POST `/auth/login`
4. Sukces → JWT w memory + profile cached
5. Redirect `/templates`
6. Sesja aktywna (JWT w TanStack Query context)
```

**Punkty kontaktu UI:**

- LoginForm (validation, rate limiting feedback)
- 401 handling (modal re-login)
- Session persistence check (JWT refresh? MVP: brak refresh token)

---

#### **US-003: Zarządzanie rolami**

```
Admin:
1. `/admin/templates` → lista global templates
2. Edit global → zmiany widoczne dla wszystkich
3. User próbuje edytować global → 403 → banner

User:
1. `/templates` → widzi global (readonly) + own
2. Click global → `/templates/:id` → readonly view + Fork button
3. Fork → dialog → POST `/templates/:id/fork` → own copy → `/templates/:newId/edit`
```

**Punkty kontaktu UI:**

- Role badge (Profile)
- Conditional buttons (Edit vs Fork)
- 403 error handling (banner)
- Admin navigation item (conditional)

---

#### **US-004: Presety raportów defektów**

```
1. `/templates/new`
2. Select preset: UI bug
3. Form wypełnia pola (title, steps, expected, actual, environment, severity, priority)
4. User modyfikuje/uzupełnia
5. Save → POST `/templates` → `/templates/:id`
6. Render → `/templates/:id/render`
7. Wypełnia required fields
8. Preview Markdown
9. Copy to clipboard → toast
```

**Punkty kontaktu UI:**

- PresetSelector (quick start)
- TemplateForm (pre-filled fields)
- RenderForm (required validation)
- MarkdownPreview (live)
- CopyButton (clipboard API)

---

#### **US-005: Fork i edycja szablonu**

```
1. `/templates` → global template
2. Click → `/templates/:id`
3. Fork button → dialog (nazwa nowego)
4. POST `/templates/:id/fork` → nowy user-scoped
5. Redirect `/templates/:newId/edit`
6. Edycja pól
7. Save → PATCH `/templates/:newId`
8. Revert field: button reset to origin value
```

**Punkty kontaktu UI:**

- Fork button (global templates dla user)
- ForkDialog (nazwa)
- TemplateForm (revert field buttons, origin_template_id metadata)

---

#### **US-006: Exploration Charter z czasomierzem**

```
1. `/charters` → New Charter button
2. Check active charter (409?) → dialog „Zakończyć poprzednią?"
3. → `/charters/new`
4. Wypełnia goal, hypotheses
5. Create & Start → POST `/charters` + POST `/charters/:id/start`
6. → `/charters/:id/run`
7. Timer start (auto)
8. Dodawanie notatek (Alt+N): tag, text
9. Autosave: localStorage co 5s, API co 30s
10. Stop session (Alt+T stop, button) → POST `/charters/:id/stop`
11. Export → GET `/charters/:id/export` → Markdown download
12. Redirect `/charters`
```

**Punkty kontaktu UI:**

- ChartersList (active charter highlighted)
- NewCharterButton (conflict check)
- CharterRunView (timer, notes, keyboard shortcuts)
- AutosaveIndicator
- ExportButton

---

#### **US-007: Dodawanie i deduplikacja linków w KB**

```
1. `/kb` → Add entry button
2. → `/kb/new`
3. Paste URL → onBlur canonical preview
4. Title autofill (nice-to-have)
5. Tags autocomplete
6. First note
7. Submit → POST `/kb`
8. 409 (duplicate) → dialog „Istnieje. Dodać notatkę?"
   - Yes → redirect `/kb/:existingId` z pre-filled note
   - No → cancel
9. 201 → redirect `/kb/:id`
```

**Punkty kontaktu UI:**

- KBEntryForm (URL canonicalization preview)
- TagsInput (autocomplete)
- DuplicateDialog (409 handling)

---

#### **US-008 & US-009: IBAN Generator i Walidator**

```
Generate:
1. `/generators/iban`
2. Mode: Generate
3. Select country (DE/AT)
4. Optional seed
5. Generate → GET `/generators/iban?country=DE&seed=123`
6. Result: IBAN, copy button
7. Format toggle: Text/JSON
8. History updated (localStorage)

Validate:
1. Mode: Validate
2. Paste IBAN
3. Validate → GET `/validators/iban?iban=...`
4. Result: Valid ✓ / Invalid ✗ + reason
```

**Punkty kontaktu UI:**

- Mode tabs (Generate/Validate)
- IBANGeneratorForm (country, seed)
- ValidatorForm (IBAN input)
- ValidationResult (valid/invalid feedback)
- GeneratorHistory (sidebar)

---

#### **US-012: Asystent AI do ulepszania treści**

```
1. `/templates/:id/render` → field description
2. AI Improve button (per field, jeśli enabled + limit nie przekroczony)
3. Click → POST `/ai/improve`
4. Loading spinner
5. Response: proposal + diff preview
6. Dialog: Accept / Reject
7. Accept → update field value (client-side)
8. Limit exceeded (429) → toast + manual tips fallback
```

**Punkty kontaktu UI:**

- AIImproveButton (conditional: AI_ENABLED, daily limit)
- AIProposalDialog (diff preview, accept/reject)
- 429 handling (toast + fallback tips)
- Daily limit indicator (Profile)

---

#### **US-013: Obsługa błędów i edge cases**

```
Offline autosave:
1. User w `/charters/:id/run`, offline
2. Banner „Brak połączenia"
3. Autosave → localStorage only
4. Online → sync z API (retry queue)

Duplikat KB:
1. POST `/kb` → 409
2. Dialog „Istnieje. Dodać notatkę?"

Wygaśnięcie sesji:
1. JWT expired → 401
2. Modal „Sesja wygasła. Zaloguj ponownie"
3. Login → return to original intent (URL preserved)
```

**Punkty kontaktu UI:**

- OfflineBanner (network status)
- DuplicateDialog (409)
- ReLoginModal (401, intent preservation)

---

### 3.2 Przepływy między widokami (Flow Diagram)

```
/login
  ↓ (auth success)
/templates (landing page)
  ├→ /templates/new → /templates/:id
  ├→ /templates/:id
  │   ├→ /templates/:id/edit → /templates/:id
  │   ├→ Fork → /templates/:newId/edit
  │   └→ /templates/:id/render
  │
  ├→ /charters
  │   ├→ /charters/new → /charters/:id/run
  │   ├→ /charters/:id (details, closed)
  │   └→ Resume → /charters/:id/run
  │
  ├→ /kb
  │   ├→ /kb/new → /kb/:id
  │   └→ /kb/:id
  │
  ├→ /generators
  │   ├→ /generators/iban
  │   └→ /generators/:kind
  │
  ├→ /profile
  │
  └→ /admin (admin only)
      ├→ /admin/templates
      │   └→ /admin/templates/:id/edit
      └→ /admin/profiles (optional MVP)
```

---

## 4. Układ i struktura nawigacji

### 4.1 Główna nawigacja (Top-level)

**Typ:** Horizontal navbar (desktop) + Hamburger menu (mobile)

**Elementy:**

1. **Logo/Brand** (left) → link do `/templates`
2. **Nav items** (center/left):
   - Templates
   - Charters
   - Knowledge Base
   - Generators
   - Profile
3. **Admin** (conditional, admin role):
   - Admin (dropdown lub `/admin` route)
4. **User menu** (right):
   - Avatar/Email
   - Dropdown: Profile, Logout

**Mobile:**

- Hamburger icon (top-left)
- Drawer z nav items (vertical)
- User menu w drawer (bottom)

**Sticky:** Yes (top navbar fixed)

---

### 4.2 Breadcrumbs

**Kontekstualna nawigacja** dla widoków szczegółowych:

Przykłady:

- `/templates/:id` → **Templates** > [Nazwa szablonu]
- `/templates/:id/edit` → **Templates** > [Nazwa] > Edit
- `/charters/:id` → **Charters** > [Goal preview]
- `/kb/:id` → **Knowledge Base** > [Title]
- `/admin/templates/:id/edit` → **Admin** > **Templates** > [Nazwa] > Edit

**Pozycja:** Pod główną nawigacją (lub wewnątrz page header)

---

### 4.3 Sub-navigation (w obrębie modułów)

#### Templates:

- List (all/global/user tabs lub filters)
- Actions: New, Fork (per item)

#### Charters:

- List (all/active/closed tabs lub filters)
- Actions: New, Resume (active)

#### Knowledge Base:

- Search bar (global w module)
- Tag filters
- Actions: Add entry, Export

#### Generators:

- Hub (lista generatorów)
- Per-generator: mode tabs (Generate/Validate dla IBAN)

---

### 4.4 FAB (Floating Action Button)

**Użycie:** Mobile-first CTA dla głównych akcji w listach

**Pozycja:** Bottom-right corner (fixed)

**Widoki:**

- `/templates` → New Template
- `/charters` → New Charter
- `/kb` → Add Entry

**Desktop:** Alternative: button w header

---

### 4.5 Modals i Dialogs

**Użycie:**

- Confirm actions (delete, discard changes)
- Conflict resolution (409, active charter)
- AI proposal preview (diff)
- Re-login (401)

**Pattern:** Overlay z backdrop dim, focus trap, Esc to close

---

## 5. Kluczowe komponenty

### 5.1 Komponenty UI (Shadcn/ui + custom)

#### **Button** (`/components/ui/button.tsx`)

- Variants: default, destructive, outline, ghost, link
- Sizes: sm, md, lg
- Loading state (spinner)
- Disabled state

#### **Input** (`/components/ui/input.tsx`)

- Text, email, password, number
- Error state (red border + message)
- Label (accessibility)

#### **Textarea** (`/components/ui/textarea.tsx`)

- Multiline input
- Auto-resize (optional)
- Char count (for limited fields)

#### **Select** (`/components/ui/select.tsx`)

- Dropdown (country, preset, status)
- Multi-select (tags)

#### **Checkbox, Radio** (`/components/ui/checkbox.tsx`, `/components/ui/radio-group.tsx`)

#### **Badge** (`/components/ui/badge.tsx`)

- Role badge (admin/user)
- Status badge (active/closed)
- Scope badge (global/user)
- Tag badge (KB, Charter notes)

#### **Card** (`/components/ui/card.tsx`)

- Container dla list items (Template, Charter, KB, Generator)
- Header, Content, Footer sections

#### **Dialog** (`/components/ui/dialog.tsx`)

- Modal overlay
- Confirm dialogs
- AI proposal preview

#### **Alert** (`/components/ui/alert.tsx`)

- Error alerts
- Warning (offline, rate limit)
- Success (toast alternative)

#### **Toast** (`/components/ui/toast.tsx`, `sonner` lub `react-hot-toast`)

- Success notifications
- Error feedback
- Copy confirmation

#### **Skeleton** (`/components/ui/skeleton.tsx`)

- Loading placeholders dla kart, list

#### **Tabs** (`/components/ui/tabs.tsx`)

- Mode switching (Generate/Validate)
- Status filters (active/closed)

#### **Progress** (`/components/ui/progress.tsx`)

- AI daily limit usage

---

### 5.2 Komponenty domenowe (custom)

#### **AuthLayout**

- Layout dla `/login`, `/register`
- Centered card, responsive

#### **AppLayout**

- Main layout dla chronionych widoków
- Navbar, breadcrumbs, main content, footer (optional)

#### **TemplateCard, CharterCard, KBCard, GeneratorCard**

- Reusable cards dla list views
- Actions (edit, delete, fork, etc.)

#### **TemplateForm**

- Formularz szablonu (create/edit)
- FieldsBuilder, RequiredFieldsSelector, AttachmentsBuilder

#### **RenderForm + MarkdownPreview**

- Split view dla render template
- Live preview

#### **Timer**

- Countdown/countup timer dla Charters
- Start/Stop/Reset controls

#### **NotesList + AddNoteForm**

- Lista notatek dla Charters/KB
- Quick add form z tag selector

#### **SearchBar**

- FTS search dla KB
- Debounced input (300ms)

#### **TagsInput**

- Multi-tag input z autocomplete
- Chip display

#### **Pagination**

- Keyset pagination controls
- Previous/Next buttons
- Disabled states

#### **EmptyState**

- Placeholder gdy brak danych
- CTA do dodania pierwszego elementu

#### **ErrorBoundary**

- Catch-all dla React errors
- Retry button

#### **OfflineBanner**

- Network status indicator
- Retry action

#### **AIImproveButton + AIProposalDialog**

- Per-field AI improve CTA
- Diff preview modal

#### **CopyButton**

- Clipboard API wrapper
- Success feedback (toast)

#### **ExportButton**

- Export to Markdown/JSON
- Download trigger

#### **ForkDialog, DeleteConfirmDialog, DuplicateDialog**

- Specific dialogs dla akcji

#### **AutosaveIndicator**

- Status autosave („Zapisano", „Zapisywanie...")

#### **ValidationErrors**

- Inline form errors (422 mapping)

---

### 5.3 Hooks (custom)

#### **useAuth**

- Current user profile, role, logout
- JWT token management (TanStack Query context)

#### **useTemplates, useCharters, useKB**

- TanStack Query hooks dla modułów
- List queries, mutations

#### **usePagination**

- Keyset pagination state
- URL sync

#### **useDebounce**

- Debounced input (search)

#### **useLocalStorage**

- Autosave, generator history

#### **useNetworkStatus**

- Online/offline detection
- Retry queue

#### **useKeyboardShortcuts**

- Global shortcuts (Alt+N, Alt+T, Alt+S)
- Scoped to specific views

---

### 5.4 Utilities

#### **api.ts**

- Axios/fetch wrapper z interceptors
- Auth header injection
- Error handling (401, 403, 409, 422, 429)

#### **urlCanonicalize.ts**

- URL canonicalization logic (KB)

#### **markdown.ts**

- Markdown parsing/rendering
- Sanitization

#### **clipboard.ts**

- Copy to clipboard wrapper

#### **dateFormatter.ts**

- Date/time formatting (started_at, ended_at, timestamps)

---

## 6. Mapowanie wymagań funkcjonalnych na elementy UI

### 6.1 Uwierzytelnianie i role (PRD 3.1)

| Wymaganie                 | Widok            | Komponent                             |
| ------------------------- | ---------------- | ------------------------------------- |
| Logowanie email/hasło     | `/login`         | `LoginForm`                           |
| Dwie role: admin/user     | Wszystkie widoki | `useAuth` hook, conditional rendering |
| Rate limit prób logowania | `/login`         | Error handling (429 → toast/alert)    |
| Wylogowanie               | Navbar user menu | `LogoutButton`                        |

---

### 6.2 Szablony raportów defektów (PRD 3.2)

| Wymaganie                      | Widok                   | Komponent                       |
| ------------------------------ | ----------------------- | ------------------------------- |
| Lista szablonów (global + own) | `/templates`            | `TemplatesList`, `TemplateCard` |
| Presety UI/API bug             | `/templates/new`        | `PresetSelector`                |
| Fork global → user             | `/templates/:id`        | `ForkButton`, `ForkDialog`      |
| Edycja user-owned              | `/templates/:id/edit`   | `TemplateForm`                  |
| Render do Markdown             | `/templates/:id/render` | `RenderForm`, `MarkdownPreview` |
| Copy to clipboard              | `/templates/:id/render` | `CopyButton`                    |
| Walidacja required fields      | `/templates/:id/render` | Validation logic, inline errors |

---

### 6.3 Exploration Charter (PRD 3.3)

| Wymaganie                                    | Widok                                | Komponent                              |
| -------------------------------------------- | ------------------------------------ | -------------------------------------- |
| Tworzenie charteru (goal, hypotheses)        | `/charters/new`                      | `CharterForm`                          |
| Timer start/stop                             | `/charters/:id/run`                  | `Timer`                                |
| Notatki z tagami [bug\|idea\|question\|risk] | `/charters/:id/run`                  | `NotesList`, `AddNoteForm`             |
| Autosave co 5s (localStorage)                | `/charters/:id/run`                  | `useLocalStorage`, `AutosaveIndicator` |
| Cykliczny zapis do DB                        | `/charters/:id/run`                  | Debounced API call (30s)               |
| Jedna aktywna sesja                          | `/charters/new`, `/charters`         | Conflict check (409 → dialog)          |
| Skróty Alt+N, Alt+T, Alt+S                   | `/charters/:id/run`                  | `useKeyboardShortcuts`                 |
| Eksport Markdown                             | `/charters/:id/run`, `/charters/:id` | `ExportButton`                         |

---

### 6.4 Knowledge Base (PRD 3.4)

| Wymaganie              | Widok     | Komponent                        |
| ---------------------- | --------- | -------------------------------- |
| Dodawanie linku        | `/kb/new` | `KBEntryForm`                    |
| Kanonikalizacja URL    | `/kb/new` | `URLCanonicalizationPreview`     |
| Deduplikacja           | `/kb/new` | 409 handling → `DuplicateDialog` |
| Wyszukiwanie FTS       | `/kb`     | `SearchBar`                      |
| Filtrowanie po tagach  | `/kb`     | `TagsFilter`                     |
| Edycja/usuwanie wpisów | `/kb/:id` | Edit/Delete buttons              |
| Eksport JSON           | `/kb`     | `ExportButton`                   |

---

### 6.5 Generatory danych (PRD 3.5)

| Wymaganie               | Widok                                   | Komponent                  |
| ----------------------- | --------------------------------------- | -------------------------- |
| IBAN DE/AT generator    | `/generators/iban`                      | `IBANGeneratorForm`        |
| IBAN walidator          | `/generators/iban`                      | `ValidatorForm`, mode tabs |
| Seed support            | `/generators/iban`, `/generators/:kind` | Seed input field           |
| Copy wyników            | Wszystkie generatory                    | `CopyButton`               |
| Format Text/JSON        | Wszystkie generatory                    | `FormatToggle`             |
| Historia (localStorage) | Wszystkie generatory                    | `GeneratorHistory`         |

---

### 6.6 Asystent AI (PRD 3.7)

| Wymaganie                | Widok                             | Komponent                               |
| ------------------------ | --------------------------------- | --------------------------------------- |
| Improve/Expand per field | `/templates/:id/render`, Charters | `AIImproveButton`                       |
| Diff preview             | Dialog                            | `AIProposalDialog`                      |
| Accept/Reject            | Dialog                            | Accept/Reject buttons                   |
| Limit dzienny            | `/profile`                        | `AIUsageCard` (progress bar)            |
| 429 handling             | Wszystkie z AI                    | Toast + fallback tips                   |
| AI_DISABLED toggle       | Wszystkie z AI                    | Conditional rendering `AIImproveButton` |

---

## 7. Obsługa stanów błędów i edge cases

### 7.1 Stany ładowania

| Stan                    | UI Feedback                        |
| ----------------------- | ---------------------------------- |
| Initial fetch (list)    | Skeleton cards                     |
| Fetch details           | Skeleton content + shimmer         |
| Mutation (save, delete) | Button loading spinner + disabled  |
| Long operation (AI)     | Modal spinner + „Przetwarzanie..." |

---

### 7.2 Stany puste

| Widok                         | Empty State                                            |
| ----------------------------- | ------------------------------------------------------ |
| `/templates` (brak szablonów) | „Brak szablonów. Utwórz pierwszy!" + CTA button        |
| `/charters` (brak charterów)  | „Brak sesji. Rozpocznij eksplorację!" + CTA            |
| `/kb` (brak wpisów)           | „Baza wiedzy jest pusta. Dodaj pierwszy link!" + CTA   |
| Search no results             | „Nie znaleziono wyników dla '[query]'" + clear filters |

---

### 7.3 Błędy API

| Kod | Lokalizacja                  | UI Response                                           |
| --- | ---------------------------- | ----------------------------------------------------- |
| 400 | Formularze                   | Inline validation errors (field-level)                |
| 401 | Global interceptor           | Modal „Sesja wygasła" + re-login + return to intent   |
| 403 | Action attempt               | Toast/Banner „Brak uprawnień do tej akcji"            |
| 404 | Route/Resource               | 404 page lub toast „Nie znaleziono" + redirect        |
| 409 | KB duplicate, active charter | Dialog z opcjami (merge, cancel)                      |
| 422 | Formularze                   | Inline errors mapped to fields                        |
| 429 | Rate limit, AI limit         | Banner/Toast „Limit przekroczony. Spróbuj za X minut" |
| 500 | Any request                  | Error boundary + retry button lub toast               |

---

### 7.4 Offline/Network

| Stan                        | UI Response                                          |
| --------------------------- | ---------------------------------------------------- |
| Network offline             | Banner na górze „Brak połączenia. Pracujesz offline" |
| Request failed (network)    | Retry button w toast                                 |
| Autosave offline (Charters) | Icon indicator + localStorage backup                 |
| Online restored             | Banner znika + sync queue (retry pending requests)   |

---

### 7.5 Edge Cases

| Przypadek                              | Obsługa                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Próba edycji global template (user)    | 403 → toast + redirect `/templates`                                            |
| Próba utworzenia 2. aktywnego charteru | 409 → dialog „Zakończyć poprzednią sesję?"                                     |
| Duplikat URL w KB                      | 409 → dialog „Istnieje wpis. Dodać notatkę do niego?"                          |
| Unsaved changes w formularzu           | beforeunload confirm „Masz niezapisane zmiany. Kontynuować?"                   |
| Session expired podczas edycji         | 401 → modal re-login + intent preservation (URL + form state w sessionStorage) |
| AI limit exceeded                      | 429 → toast + disable AI button + fallback tips                                |
| Invalid IBAN format                    | 400 → inline error „Nieprawidłowy format IBAN"                                 |
| Canonical URL kolizja (KB)             | 409 → jak duplikat URL                                                         |

---

## 8. Responsywność i dostępność

### 8.1 Breakpoints (Tailwind)

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (sm-lg)
- **Desktop:** ≥ 1024px (lg+)

### 8.2 Responsive Patterns

| Komponent                       | Mobile                            | Desktop                              |
| ------------------------------- | --------------------------------- | ------------------------------------ |
| Navbar                          | Hamburger menu (drawer)           | Horizontal nav items                 |
| Lists (Templates, Charters, KB) | Stack vertical (cards full-width) | Grid 2-3 columns                     |
| Filters                         | Collapsible drawer                | Sidebar (left)                       |
| Forms                           | Full-width fields                 | Max-width 600px centered             |
| Render split view (Markdown)    | Tabs (Form \| Preview)            | Split 50/50 horizontal               |
| Dialogs                         | Bottom sheet (pull-up)            | Centered modal                       |
| FAB                             | Visible (bottom-right)            | Optional (header button alternative) |

### 8.3 Minimal A11y Baseline (MVP)

| Wymaganie           | Implementacja                                                      |
| ------------------- | ------------------------------------------------------------------ |
| Focus visible       | Outline dla wszystkich interaktywnych elementów                    |
| Labels              | Wszystkie inputy z `<label>` lub `aria-label`                      |
| Touch targets       | Min. 40x40px dla buttons/links                                     |
| Alt text            | Images z `alt` (jeśli używane)                                     |
| Semantic HTML       | `<nav>`, `<main>`, `<article>`, `<button>` zamiast `<div onclick>` |
| Keyboard navigation | Tab order logiczny, Enter/Space activates buttons                  |
| ARIA attributes     | `aria-label`, `aria-describedby` dla złożonych komponentów         |
| Color contrast      | Min. 4.5:1 dla tekstu (Tailwind defaults OK)                       |

**Poza zakresem MVP:** Screen reader testing, ARIA live regions (poza krytycznymi alerts), full WCAG 2.1 AA compliance.

---

## 9. Bezpieczeństwo UI

### 9.1 Authentication Flow

- JWT token w memory (TanStack Query context, nie localStorage dla bezpieczeństwa XSS)
- Token expiry handling (401 → re-login modal)
- Logout clears all client-side state (TanStack Query cache, localStorage autosave)

### 9.2 Authorization (Role-based UI)

- `useAuth` hook sprawdza rolę
- Conditional rendering:
  - Admin menu item: `{role === 'admin' && <AdminNav />}`
  - Fork button: `{template.scope === 'global' && role === 'user' && <ForkButton />}`
  - Edit button (global template): `{role === 'admin' && <EditButton />}`
- Route guards: `/admin/*` → redirect non-admin to `/templates` (403)

### 9.3 Input Sanitization

- Markdown rendering: użycie biblioteki z sanitization (np. `marked` + DOMPurify)
- URL inputs: validacja format (http/https only), canonicalization
- Brak raw HTML injection w user content

### 9.4 Error Messages

- Nie ujawniamy szczegółów systemowych w błędach (np. „Database error" → „Coś poszło nie tak")
- Login errors: „Nieprawidłowe dane logowania" (nie „Email nie istnieje" ani „Błędne hasło")

### 9.5 HTTPS Only

- Całość aplikacji przez HTTPS (backend + frontend)
- Secure cookies (jeśli używane w przyszłości)

---

## 10. Podsumowanie kluczowych decyzji architektonicznych

1. **Landing page:** `/templates` (nie Dashboard w MVP)
2. **Nawigacja:** Top-level horizontal (desktop), hamburger (mobile)
3. **Role gating:** JWT-based, conditional UI, route guards (403 redirect)
4. **State management:** TanStack Query (cache, mutations, keyset pagination)
5. **Pagination:** Keyset (`?limit&after`), URL-synced
6. **Offline support:** Banner, localStorage autosave (Charters), retry queue
7. **Error handling:** Global interceptor, modals (401), toasts (429), inline (422), dialogs (409)
8. **Responsywność:** Mobile-first, Tailwind breakpoints
9. **Dostępność:** Minimal a11y baseline (focus, labels, touch targets)
10. **Bezpieczeństwo:** JWT in memory, role-based UI, input sanitization, no sensitive error details

---

## 11. Zalecenia do implementacji

1. **Rozpocznij od Layout i Auth:** `AppLayout`, `LoginForm`, `useAuth`
2. **Implementuj moduły iteracyjnie:** Templates → Charters → KB → Generators
3. **Reusable components first:** `Button`, `Input`, `Card`, `Dialog` (Shadcn/ui)
4. **TanStack Query setup:** Query client, auth context, error interceptor
5. **Mobile-first CSS:** Rozpocznij od mobile styles, potem media queries dla desktop
6. **Testowanie:** E2E dla kluczowych ścieżek (login → Templates CRUD → Charter CRUD → KB CRUD)
7. **Accessibility audit:** Focus indicators, labels, keyboard navigation po każdym module
8. **Error boundaries:** Jeden globalny + per-module dla krytycznych sekcji

---

## 12. Metryki sukcesu UI

| Metryka                        | Cel MVP                                           |
| ------------------------------ | ------------------------------------------------- |
| Time to interactive (TTI)      | < 3s na 3G                                        |
| Raport defektu (render + copy) | ≤ 3 min (z użyciem presetu)                       |
| Charter start to first note    | < 30s                                             |
| KB entry add (no conflict)     | < 1 min                                           |
| IBAN generate + copy           | < 10s                                             |
| Mobile usability               | Wszystkie akcje dostępne, touch targets ≥ 40px    |
| A11y baseline                  | Focus visible, labels present, keyboard navigable |

---

**Koniec dokumentu architektury UI dla QA Toolsmith MVP.**
