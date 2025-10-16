# Generators View - Documentation

## Overview

The Generators view provides a centralized hub for test data generation and validation tools. It includes:

- **Generators Hub** (`/generators`) - catalog of all available generators
- **IBAN Generator** (`/generators/iban`) - generate and validate IBAN numbers for DE/AT
- **Other Generators** (`/generators/:kind`) - placeholder views for future generators

## Features

### IBAN Generator

#### Generate Mode

- Select country (Germany or Austria)
- Optional seed for deterministic generation
- Output format toggle (Text/JSON)
- Copy to clipboard functionality
- Local history (max 10 items, FIFO)

#### Validate Mode

- Input IBAN with automatic normalization
- Real-time format validation
- Checksum verification (mod-97)
- Detailed error messages

### History

- Stores last 10 generations per generator type
- Persistent in localStorage
- Click to rehydrate results
- Clear all with confirmation dialog
- Responsive: collapsible on mobile, sidebar on desktop

## Components Structure

```
GeneratorLayout (Astro layout)
├── GeneratorsHubView (/generators)
│   └── GeneratorsList
│       └── GeneratorCard (x9)
│
├── IBANGeneratorView (/generators/iban)
│   ├── Tabs (Generate/Validate)
│   ├── IBANGeneratorForm
│   │   ├── FormatToggle
│   │   └── IBANResult
│   ├── IBANValidatorForm
│   │   └── ValidationResult
│   └── GeneratorHistory (sidebar/collapsible)
│
└── GenericGeneratorView (/generators/:kind)
    └── [Placeholder for future generators]
```

## Custom Hooks

### `useIbanApi()`

Handles API communication for IBAN generation and validation.

**Methods:**

- `generate({ country, seed? })` - generates IBAN
- `validate({ iban })` - validates IBAN
- `clearError()` - clears error state

**State:**

- `isLoading: boolean` - request in progress
- `error: UIError | null` - error state

### `useLocalHistory<T>(key, limit)`

Manages persistent history in localStorage with FIFO limit.

**Methods:**

- `addItem(data, note?)` - adds item to history
- `clearHistory()` - removes all items
- `removeItem(timestamp)` - removes specific item

**State:**

- `items: HistoryItem<T>[]` - history items

### `useClipboard()`

Safe clipboard operations with toast feedback.

**Methods:**

- `copyToClipboard(text, successMessage?)` - copies text to clipboard

**State:**

- `isCopying: boolean` - copy operation in progress

## API Integration

### Generate IBAN

```
GET /api/generators/iban?country=DE&seed=test123
```

**Cache Strategy:**

- With seed: `Cache-Control: public, max-age=31536000, immutable`
- Without seed: `cache: "no-store"`

### Validate IBAN

```
GET /api/validators/iban?iban=DE89370400440532013000
```

**Cache Strategy:**

- `Cache-Control: public, max-age=300`

## Validation Rules

### Seed (Generate)

- Optional
- Max length: 64 characters
- Pattern: `/^[A-Za-z0-9._-]+$/`
- Error shown inline

### IBAN (Validate)

- Normalized automatically (spaces removed, uppercased)
- Min length: 15 characters
- Max length: 34 characters
- Country code: 2 letters (A-Z)
- Check digits: 2 digits (0-9)
- BBAN: alphanumeric only
- Country-specific lengths: DE=22, AT=20, PL=28
- Mod-97 checksum validation

## Accessibility

- ✅ ARIA labels on all interactive elements
- ✅ `aria-live="polite"` regions for results
- ✅ `role="status"` on validation results
- ✅ Focus management after navigation
- ✅ Screen reader announcements for state changes
- ✅ Keyboard navigation support
- ✅ Focus rings via Tailwind `focus-visible:`

## Local Storage Keys

- `gen_pref_iban` - user preferences (country, format, mode)
- `gen_history_iban` - IBAN generation history (max 10 items)

## Future Enhancements

Planned generators (currently placeholders):

- Phone Number Generator
- Address Generator
- License Plate Generator
- Email Generator
- Company Name Generator
- Payment Card Generator
- GUID Generator
- Random String Generator

## Known Limitations

- Node.js version requirement: >=18.20.8 (Astro 5 requirement)
- History limited to 10 items per generator type
- No cloud sync for history (localStorage only)
- No export/import for history
- Generic generators show "Coming Soon" placeholder
