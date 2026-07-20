# Zakah Calculator — Architecture & Design

## Overview

The Zakah Calculator is a **client-side only, stateless** Progressive Web App (PWA) that:

- Runs entirely in the user's browser (no server backend required)
- Performs all Zakah calculations locally without transmitting data
- Works offline via Service Worker caching
- Stores user preferences and form data locally (when Privacy Mode is OFF)
- Fetches live metal prices and currency rates from static data files

This document provides a high-level overview of the system architecture, module responsibilities, and design decisions.

---

## System Architecture

### High-Level Flow

```
User Opens App (index.html)
    ↓
Load HTML + CSS + JavaScript (cached by SW on repeat visits)
    ↓
Initialize Theme, Language, Privacy Mode
    ↓
Fetch Live Prices (metals.json, rates.json)
    ↓
Restore Saved Form Data (if Privacy Mode OFF and data exists)
    ↓
Render UI with current settings
    ↓
User Enters Asset Values → Calculation Updates in Real-time
    ↓
User Can: Export PDF, Save Profile, Switch Language/Currency, etc.
```

### Deployment Model

- **No server required** — Entire app can run from static file hosting (GitHub Pages, Vercel, AWS S3, etc.)
- **Recommended**: Deploy over HTTPS
- **Service Worker**: Enables offline access after first visit
- **Data files**: `data/metals.json` and `data/rates.json` updated daily by GitHub Actions

---

## Module Breakdown

### 1. **index.html** — Main Document

**Purpose**: Single-page application structure, form markup, layout skeleton

**Key Sections**:
- Header with theme toggle and language selector
- Settings panel (Nisab type, calendar, stock method, currency)
- Five-section form (Cash, Metals, Investments, Business, Liabilities)
- Results panel showing calculation breakdown
- Utility panels (PDF export, profiles, data footprint, reminders)

**i18n Pattern**:
- Elements tagged with `data-i18n` use dynamic text replacement
- Buttons tagged with `data-i18n-btn` for button labels
- Tooltips tagged with `data-tip-key` for context hints

**Accessibility**:
- Semantic HTML: `<main>`, `<section>`, `<form>`, `<fieldset>`, `<button>`
- ARIA labels: `aria-label`, `aria-describedby`, `aria-current`
- Keyboard navigation: Tab order, Enter to submit forms, Esc to close modals

---

### 2. **app.js** — Core Application Logic

**Size**: ~1,260 lines (single file by design for simplicity and speed)

**Responsibility**: All business logic, state management, event handling, calculations

#### Key Sections:

##### **A. Theme System** (lines 32–59)
- Tracks light/dark mode preference
- Loads from `localStorage` or system preference
- Updates CSS class on `<html>` element
- Applies animation on toggle

```javascript
toggleTheme() → add/remove 'light-theme' class → persist to localStorage
```

##### **B. Internationalization (i18n)** (lines 61–114)
- Dynamic language loading via script injection
- Language stored in `localStorage['zakat_lang']`
- Replaces all `data-i18n`, `data-i18n-btn`, `data-tip-key` elements
- Recalculates eligibility badge on language switch

```javascript
setLang(lang) → fetch translations/{lang}.js → applyLang() → calc()
```

##### **C. State Management** (lines 116–161)
- Global variables for app state: `nisabType`, `calendarType`, `stockMethod`, currency, prices, etc.
- `FIELD_IDS` array defines all form input IDs for serialization
- `STEPS` array defines the guided wizard flow

##### **D. Price Fetching** (lines 180–260)
- Fetches `data/metals.json` and `data/rates.json` via `Promise.allSettled()`
- Falls back to **cache** (24-hour TTL) if fetch fails
- Falls back to **stale cache** if both fresh and TTL'd cache unavailable
- Falls back to **manual input mode** if all fetch attempts fail
- Updates UI with "live", "cached", "stale", or "error" badge

```javascript
fetchPrices() → Promise.allSettled([rates, metals])
    → Success: cache + update UI
    → Cache miss: fallback to stale cache
    → All fail: show manual input form
```

##### **E. Currency & Formatting** (lines 302–380)
- `getConvertedPrices()` converts USD/oz to per-gram prices in selected currency
- `fmt(n)` formats numbers with currency symbol and locale-aware separators
- `updateCurrencySymbols()` updates all `[class*="curr-"]` elements

##### **F. Settings Toggles** (lines 383–410)
- `setNisabType()`, `setCalendar()`, `selectRadio()` update state and trigger recalculation
- `toggleHighContrast()` for accessibility
- `togglePrivacyMode()` enables/disables localStorage persistence

##### **G. Form State (localStorage)** (lines 433–535)
- `collectFormData()` serializes all form values + settings
- `applyFormData()` restores form values and triggers necessary UI updates
- `persistState()` debounced save to localStorage
- `profiles` system allows multiple saved calculations

##### **H. Encrypted Backup System** (lines 537–630)
- Uses Web Crypto API (PBKDF2 + AES-GCM)
- `deriveBackupKey()` derives encryption key from user passphrase
- `exportEncryptedBackup()` encrypts form data as Base64 JSON
- `importEncryptedBackup()` decrypts and restores form

##### **I. Calculation Engine** (lines 632–850)
- **`calc()`** main calculation function:
  1. Collect all asset values by section
  2. Convert to base currency (handling live/manual/fallback prices)
  3. Calculate Nisab threshold (silver or gold basis)
  4. Deduct liabilities
  5. Compare net wealth to Nisab
  6. Calculate Zakah due (2.5% or 2.577% depending on calendar)
  7. Update all result displays

```javascript
calc() {
  totalAssets = sum(all asset sections in base currency)
  totalLiabilities = sum(eligible liabilities)
  netWealth = totalAssets - totalLiabilities
  nisabValue = nisabThreshold(nisabType, prices, currency)
  zakahDue = netWealth >= nisabValue ? netWealth * rate : 0
  updateResultPanel(netWealth, nisabValue, zakahDue)
}
```

##### **J. Result Display & Formatting** (lines 852–950)
- `updateResultsPanel()` renders calculation breakdown
- `updateEligibilityBadge()` shows "Zakah Obligatory" or "Not Eligible Yet"
- Handles scenario comparison (silver vs gold, lunar vs solar)

##### **K. Wizard Navigation** (lines 952–1050)
- `goToStep(n)` navigates through 7-step guided wizard
- Shows hints for incomplete sections
- Tracks which steps have been filled
- Progress bar visualization

##### **L. Utility Functions** (lines 1052–1150)
- `resetAll()` clears form and confirmation
- `dataFootprint()` shows localStorage usage
- `clearAllData()` wipes all saved data with confirmation
- `showToast()` brief notifications

##### **M. Reminder System** (lines 1152–1260)
- Sets annual Zakah due date reminders
- Supports Hijri (lunar) year recurrence
- Local notifications using browser API
- Stored in localStorage for persistence

---

### 3. **pdf-export.js** — PDF Generation

**Purpose**: Export calculation summary as a PDF file

**Function**: `exportZakatPDF()`

**Steps**:
1. Collect all section data and results
2. Create jsPDF instance with A4 format
3. Add header (title, date, settings)
4. Add section breakdowns (assets, liabilities)
5. Add calculation summary
6. Add eligibility status and Zakah due
7. Trigger download

**Dependencies**: jsPDF (loaded via CDN on demand)

**Known Limitations**:
- Page breaks may occur unexpectedly if very large numbers
- Images/icons not embedded in PDF
- Font support limited to jsPDF built-in fonts

---

### 4. **sw.js** — Service Worker

**Purpose**: Enable offline functionality, cache management, background updates

**Caching Strategy**: **Cache-first** with network fallback

**Cache Versioning**:
```javascript
const CACHE_VERSION = 'zakah-v2026.04.17-zk1';
```
Bump this version string to invalidate all old caches on deploy.

**Cached Assets**:
- `index.html`
- `app.js`, `pdf-export.js`, `sw.js`
- `styles.css`
- `icon-*.png` (all sizes)
- `manifest.json`

**Non-Cached**:
- `data/metals.json` — fetched fresh, falls back to network cache
- `data/rates.json` — fetched fresh, falls back to network cache
- `translations/*.js` — cached after initial fetch

**Lifecycle**:
```
install event → cache all static assets
activate event → remove old versioned caches
fetch event → return cached asset if available, else fetch and cache
```

---

### 5. **styles.css** — Presentation

**Purpose**: All styling for layout, themes, responsiveness, animations

**Key Sections**:
- **Root CSS variables**: Colors, fonts, spacing, shadows
- **Theme system**: `:root` (dark), `.light-theme` (light), `.high-contrast`
- **Layout**: Flexbox-based responsive grid
- **Components**: Form inputs, buttons, cards, modals, badges
- **Animations**: Smooth transitions, loading shimmer, button ripple
- **Responsive**: Mobile-first breakpoints (`@media (min-width: ...)`)

**Color System**:
- Dark mode: muted golds, dark grays, accent highlights
- Light mode: light backgrounds, dark text
- High contrast: stronger separation, no subtle shades

---

### 6. **translations/*.js** — Internationalization

**Files**:
- `translations/en.js` — English (default)
- `translations/bn.js` — Bengali (বাংলা)

**Format**:
```javascript
window.LANG_DATA = {
  "key_name": "English string",
  "another_key": "Another string",
  // ...
};
```

**Usage Pattern**:
1. HTML elements tagged with `data-i18n="key_name"`
2. On language switch, app replaces element text with `LANG_DATA[key_name]`

**Adding a New Language**:
1. Copy `en.js` to `xx.js` (BCP-47 code)
2. Translate all values, keeping keys identical
3. Add button to language toggle in HTML
4. Test in app

---

### 7. **data/*.json** — Live Data

#### **data/metals.json**
```json
{
  "gold_usd_per_oz": 2500.00,
  "silver_usd_per_oz": 28.50,
  "updated_at": "2026-03-14T06:00:00Z"
}
```

Updated daily by `.github/workflows/update-rates.yml`

#### **data/rates.json**
```json
{
  "base": "USD",
  "updated_at": "2026-03-14T06:00:00Z",
  "rates": {
    "BDT": 109.75,
    "USD": 1.0,
    "SAR": 3.75,
    // ... other currencies
  }
}
```

Updated daily by GitHub Actions workflow

---

### 8. **manifest.json** — PWA Configuration

**Purpose**: Define Progressive Web App metadata

**Key Fields**:
- `name` — Full app name
- `short_name` — Home screen label
- `icons` — App icons at multiple resolutions
- `theme_color` — Toolbar color (Android)
- `background_color` — Splash screen color
- `display` — `"standalone"` (app-like)
- `start_url` — Entry point
- `orientation` — `"portrait"`

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser localStorage (when Privacy Mode OFF)           │
│  - zakat_form_data: all form values + settings           │
│  - zakat_lang, zakat_theme, zakat_currency              │
│  - zakat_metals, zakat_fx: price cache                   │
│  - zakat_profiles: saved scenarios                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
         ┌─────────────────────────────┐
         │   app.js (State Manager)    │
         │                             │
         │ - Global variables          │
         │ - Event handlers            │
         │ - calc() function           │
         │ - Form serialization        │
         └──────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ↓             ↓             ↓
    ┌────────┐    ┌────────┐    ┌────────┐
    │ Fetch  │    │ Form   │    │ PDF    │
    │ Prices │    │ Events │    │ Export │
    └────┬───┘    └────┬───┘    └───┬────┘
         │             │            │
         ↓             ↓            ↓
   data/metals.json  index.html  pdf-export.js
   data/rates.json   styles.css
```

---

## Key Design Decisions

### 1. **Single File (app.js) Rationale**

**Decision**: Keep all logic in one file instead of modularizing

**Rationale**:
- ✅ No build process required
- ✅ Simple mental model for contributors
- ✅ Fast load time (~1260 lines, well-commented)
- ✅ Easy debugging (no hidden imports)
- ❌ Trade-off: Larger single file (mitigated by comments and organization)

**Alternative Considered**: ES6 modules → rejected due to complexity without build tools

### 2. **localStorage for Persistence**

**Decision**: Use browser localStorage instead of IndexedDB or server-side storage

**Rationale**:
- ✅ Simple, synchronous API
- ✅ Good browser support (99%+)
- ✅ Clear privacy model (user can see/delete data)
- ❌ Trade-off: Size limit (~5–10MB)

**Privacy Mode**: Default-ON to respect user privacy by default

### 3. **Client-Side Only Architecture**

**Decision**: No server backend; all computation in browser

**Rationale**:
- ✅ Zero server costs
- ✅ Maximum privacy (data never leaves device)
- ✅ Works offline
- ✅ Complies with GDPR/privacy regulations
- ❌ Trade-off: No user accounts or cloud sync

### 4. **Static Price Data Files**

**Decision**: Fetch prices from `data/*.json` instead of live APIs

**Rationale**:
- ✅ No dependency on third-party APIs
- ✅ Predictable, cached by Service Worker
- ✅ GitHub Actions can update daily
- ✅ Works offline (user can have stale prices)
- ❌ Trade-off: Delayed price updates (daily instead of real-time)

### 5. **Service Worker Cache Strategy**

**Decision**: Cache-first for static assets, network-first for price data

**Rationale**:
- ✅ App works offline for calculation with cached prices
- ✅ Reduces network traffic
- ✅ Fast page loads
- ❌ Trade-off: Users see stale prices if offline

---

## Performance Considerations

### Load Time

- **First Visit**: ~2–3 seconds (fetch HTML + CSS + JS + price data)
- **Repeat Visit**: <500ms (all cached by Service Worker)

### Calculation Speed

- **Single calc()**: <50ms (JavaScript is fast for this workload)
- **Real-time updates**: Instant (on every form input change)

### Memory Usage

- **Typical session**: <5MB (form data + prices in memory)
- **localStorage footprint**: ~1–2MB for all saved data

### Network

- **Initial load**: ~3 requests (HTML, CSS/JS, prices)
- **Subsequent**: 0–1 requests (Service Worker serves cache; price refresh optional)

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| ES6 (modern JS) | ✅ | ✅ | ✅ | ✅ |
| Web Crypto API | ✅ | ✅ | ✅ | ✅ |
| Service Workers | ✅ | ✅ | ✅ (iOS 14+) | ✅ |
| PWA Install | ✅ | ✅ (partial) | ✅ (iOS 15+) | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| Flexbox | ✅ | ✅ | ✅ | ✅ |

**Target**: Modern browsers (last 2 years of releases)

---

## Testing Strategy

### Unit Testing
- Calculation engine: test Nisab threshold, rate application, liability deduction
- Currency conversion: test multiple FX rates
- Helper functions: date parsing, number formatting

### Integration Testing
- Fetch prices → cache → fallback to manual
- Switch language → all UI updates
- Toggle Privacy Mode → localStorage behavior

### Manual Testing
- Form entry and real-time calculation
- PDF export
- Offline mode (disconnect network)
- Profile management
- Encrypted backup/restore

---

## Future Extensibility

### Potential Additions (without major refactor)

1. **More Languages**: Copy `en.js`, translate, add button
2. **More Currencies**: Add to `data/rates.json`
3. **Additional Asset Types**: Add form fields + calculation logic
4. **Mobile App**: Wrap existing HTML in Capacitor or React Native
5. **API Wrapper**: Expose calculation engine as JSON API
6. **Database Sync** (optional): Add Backend with user accounts and cloud sync

### Breaking Changes Would Require

- Modularization (if file size becomes unmanageable)
- Build process (if dependencies added)
- Backend (if user accounts/sync needed)

---

## Maintenance & Deployment

### Workflow

1. **Code changes** → commit to feature branch
2. **Tests** → manual testing checklist + code review
3. **Merge to main** → GitHub Actions triggers (if configured)
4. **Deploy to GitHub Pages** → automatic (main branch = live)
5. **Update prices** → daily GitHub Actions job updates `data/*.json`

### Rollback

- Revert commit on main
- GitHub Pages auto-deploys previous version

---

## Summary

The Zakah Calculator is a **lightweight, privacy-first client-side application** that prioritizes:

1. **Simplicity** — Single file, no build, easy to understand
2. **Privacy** — All processing local, opt-in persistence
3. **Offline-first** — Works without network (Service Worker)
4. **Accessibility** — Semantic HTML, keyboard navigation, screen reader support
5. **Performance** — Fast load and calculation times
6. **Extensibility** — Easy to add languages, currencies, asset types

Contributions should respect these principles.

---

**For questions about the architecture, see [CONTRIBUTING.md](CONTRIBUTING.md) or open an issue.**
