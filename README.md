# ☽ Zakah Calculator — Samin's Initiatives

<div align="center">

**A comprehensive, scholarly-accurate Zakah calculator — built for the Ummah, with transparency and trust.**

[![License](https://img.shields.io/github/license/Samin-yasar/zakah?color=c9a84c&labelColor=1a1208)](./LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-c9a84c?labelColor=1a1208&logo=googlechrome&logoColor=c9a84c)](https://web.dev/progressive-web-apps/)
[![Open Source](https://img.shields.io/badge/Open-Source-c9a84c?labelColor=1a1208)](https://github.com/Samin-yasar/zakah)
[![100% Local](https://img.shields.io/badge/Processing-100%25%20Local-c9a84c?labelColor=1a1208)](https://github.com/Samin-yasar/zakah)
[![i18n](https://img.shields.io/badge/Languages-EN%20%7C%20বাং-c9a84c?labelColor=1a1208)](./translations/)

</div>

---

> **وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ**  
> *"Establish prayer and give Zakah."* — Quran 2:43

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Asset Categories](#asset-categories)
- [Calculation Methodology](#calculation-methodology)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [GitHub Actions — Automated Rate Updates](#github-actions--automated-rate-updates)
- [Internationalization (i18n)](#internationalization-i18n)
- [PWA Support](#pwa-support)
- [Local Data Persistence](#local-data-persistence)
- [PDF Export](#pdf-export)
- [Privacy & Security](#privacy--security)
- [Disclaimer](#disclaimer)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The **Zakah Calculator** is a free, open-source, client-side web application designed to help Muslims accurately estimate their annual Zakah obligation. It covers every major asset category — including physical cash, bank accounts, digital wallets, precious metals, stocks, cryptocurrency, provident funds, and business assets — while allowing users to deduct eligible short-term liabilities.

All computation happens **entirely in the user's browser**. No data is ever sent to a server, logged, or shared with any third party. The application works offline as a Progressive Web App (PWA) and saves form data locally so your entries persist across sessions.

---

## Live Demo

🔗 **[https://samin-yasar.dev/zakah](https://samin-yasar.dev/zakah)**

---

## Features

| Feature | Details |
|---|---|
| **5 Asset Sections** | Cash & Liquid, Precious Metals, Investments, Business Assets, Liabilities |
| **Live Metal Prices** | Gold (24k) and Silver (999) prices fetched from data files updated by GitHub Actions |
| **Multi-Currency** | BDT, USD, SAR, AED, GBP, AUD, INR, CAD, MYR, JPY, IDR |
| **Nisab Options** | Silver (612.36g, recommended) or Gold (87.48g) |
| **Calendar Types** | Lunar / Hijri (2.5%) or Solar / Gregorian (2.577%) |
| **Stock Methods** | Short-term Trading (full market value) or Long-term Investment (25% proxy) |
| **Auto-Save** | Form data auto-saved to `localStorage` — survives page refreshes |
| **Privacy Mode (Default ON)** | Session-only operation; disables all `localStorage` writes |
| **Encrypted Backup** | Local export/import of encrypted JSON backups (user passphrase) |
| **Profiles** | Multiple on-device profiles for yearly/scenario workflows |
| **Reminder Tools** | Local due-date reminders with optional Hijri-mode annual scheduling |
| **Data Footprint Dashboard** | View/delete local keys, size, and persistence footprint |
| **Explainability + Scenario Compare** | Formula trace panel and side-by-side silver/gold & lunar/solar comparison |
| **Guided Flow + Smart Hints** | Step-by-step wizard and local-only omission prompts |
| **Integrity Display** | Runtime release version and integrity hash panel |
| **PDF Export** | Download a formatted Zakah summary report via jsPDF |
| **Bilingual** | Full English and Bengali (বাংলা) UI with instant language switching |
| **Dark / Light Theme** | Artisan Islamic-themed icon toggle, persisted to `localStorage` |
| **PWA** | Installable on Android & iOS, offline-capable via Service Worker |
| **Tooltips** | Contextual scholarly guidance on every non-trivial field |
| **Accessibility** | ARIA roles, keyboard navigation, semantic HTML |
| **Privacy** | 100% local processing — no server, no analytics, no cookies |

---

## Asset Categories

### Section A — Cash & Liquid Assets
Physical cash on hand, foreign currency, savings/current/FDR bank accounts, digital wallets (bKash, Nagad, Upay, Cellfin, Rocket/DBBL, PayPal/Payoneer), money lent to others, and outstanding salary or bonuses.

> ⚠ Accrued bank interest (Riba) must be excluded from all balances and donated separately.

### Section B — Precious Metals & Jewelry
Gold (24k, 22k, 18k gram weights with automatic karat adjustment), silver (grams), silver coins and bullion. Gold and silver values are computed using live or manually entered per-gram prices.

> 📌 Under the Hanafi school, personal jewelry worn regularly by women is exempt. Include gold/silver held as savings or investment.

### Section C — Investments & Financial Assets
- **Stocks:** DSE (Bangladesh), international equities, mutual funds / ETFs
- **Cryptocurrency:** Bitcoin, Ethereum, and other digital assets (held for over one lunar year)
- **Pension & Savings:** GPF / Provident Fund, Sanchayapatra / NSC, government bonds / Sukuk, other investment schemes

### Section D — Business Assets
Business cash in hand, business bank balances, petty cash, inventory at current sale price (finished goods, raw materials, WIP, trade goods), trade receivables, supplier advances, and security deposits.

> ❌ Land, buildings, machinery, vehicles, and office equipment (PPE) are **not** Zakatable and must be excluded.

### Section E — Liabilities & Deductions
Personal loans due, credit card balances, mortgage installments (next 12 months only), overdue rent/utilities, taxes due, business loans (12 months), trade payables, salaries payable, and customer advances received.

> ⚠ Only deduct debts **due within the next 12 months**. For long-term loans, deduct only the upcoming 12 months of installments — not the total outstanding principal.

---

## Calculation Methodology

```
Net Zakatable Wealth = Total Assets − Total Eligible Liabilities

Zakah Due = Net Zakatable Wealth × Rate   (if Net Wealth ≥ Nisab)
```

| Parameter | Silver Nisab | Gold Nisab |
|---|---|---|
| Weight | 612.36g of silver | 87.48g of gold |
| Lunar rate | 2.5% | 2.5% |
| Solar rate | 2.577% | 2.577% |

**Nisab value** is computed dynamically using live (or manually entered) per-gram metal prices converted into the user's selected currency.

**Stock calculation methods:**
- *Short-term trading* — 2.5% applied to the full portfolio market value
- *Long-term investment* — 2.5% applied to 25% of the portfolio value (proxy for the company's Zakatable underlying assets)

---

## Project Structure

```
zakah/
├── .github/
│   └── workflows/
│       └── update-rates.yml        # GitHub Actions: fetches live metal & FX rates daily
│
├── data/
│   ├── metals.json                 # Gold & silver prices in USD/oz (updated by CI)
│   └── rates.json                  # Currency exchange rates relative to USD (updated by CI)
│
├── icons/                          # PWA app icons (72px → 512px)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
│
├── policies/
│   └── privacy-notice.html         # Privacy policy page
│
├── translations/
│   ├── en.js                       # English UI strings (window.LANG_DATA)
│   └── bn.js                       # Bengali UI strings (window.LANG_DATA)
│
├── index.html                      # Main application — all logic inline
├── LICENSE                         # Open-source license
├── manifest.json                   # PWA web app manifest
├── pdf-export.js                   # PDF generation logic (jsPDF)
├── styles.css                      # All styling — dark/light themes, responsive layout
└── sw.js                           # Service Worker — offline caching strategy
```

---

## Getting Started

### Prerequisites

No build tools, package managers, or server-side dependencies are required. The app is entirely static HTML/CSS/JS.

### Running Locally

**Option 1 — Any static file server:**

```bash
# Python (built-in)
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# PHP (built-in)
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

**Option 2 — VS Code Live Server:**

Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), right-click `index.html`, and select **"Open with Live Server"**.

> ⚠ Do **not** open `index.html` directly as a `file://` URL. The Service Worker and fetch calls for `data/metals.json` and `data/rates.json` require an HTTP origin.

### Deploying to GitHub Pages

1. Fork or clone this repository.
2. Go to **Settings → Pages** in your GitHub repository.
3. Set the source to the `main` branch, root directory (`/`).
4. GitHub Pages will serve the app at `https://<your-username>.github.io/<repo-name>/`.
5. Ensure the GitHub Actions workflow (`update-rates.yml`) has write permissions to commit updated `data/` files.

---

## Configuration

### `manifest.json`

Controls PWA metadata — app name, theme colour, display mode, and icon references. Update `name`, `short_name`, `start_url`, and `theme_color` if you fork this project.

### `data/metals.json`

Expected shape:

```json
{
  "gold_usd_per_oz": 3200.50,
  "silver_usd_per_oz": 32.80,
  "updated_at": "2026-03-14T06:00:00Z"
}
```

### `data/rates.json`

Expected shape (USD as base):

```json
{
  "base": "USD",
  "updated_at": "2026-03-14T06:00:00Z",
  "rates": {
    "BDT": 109.75,
    "SAR": 3.75,
    "AED": 3.67,
    "GBP": 0.79,
    "AUD": 1.55,
    "INR": 83.12,
    "CAD": 1.36,
    "MYR": 4.47,
    "JPY": 149.20,
    "IDR": 15650.00
  }
}
```

If either file is unavailable or malformed, the app falls back gracefully to a **manual price input** mode where the user can type current gold and silver prices per gram directly.

---

## GitHub Actions — Automated Rate Updates

The workflow at `.github/workflows/update-rates.yml` runs on a schedule (typically once or twice daily) and:

1. Fetches live gold and silver spot prices in USD/oz from a market data API.
2. Fetches current currency exchange rates (USD base) from a forex API.
3. Writes the results to `data/metals.json` and `data/rates.json`.
4. Commits and pushes the updated files to the repository.

This keeps price data reasonably current without requiring any server-side infrastructure. The app also caches fetched prices in `localStorage` for 24 hours (`CACHE_TTL_MS`) to minimise redundant network requests.

**To configure the workflow for your fork**, update any API keys or endpoint URLs referenced inside `update-rates.yml`. Most free-tier metal price APIs (e.g. Metals-API, GoldAPI.io) require an API key stored as a GitHub Actions Secret (`Settings → Secrets and variables → Actions`).

---

## Internationalization (i18n)

Language files live in `translations/` and export a single `window.LANG_DATA` object containing all UI strings.

| File | Language |
|---|---|
| `translations/en.js` | English |
| `translations/bn.js` | বাংলা (Bengali) |

Language is loaded dynamically at runtime via a `<script>` tag injection and stored in `localStorage` under the key `zakat_lang`. Switching language re-renders all `[data-i18n]` elements, `[data-i18n-btn]` buttons, and `[data-tip-key]` tooltips instantly without a page reload.

### Adding a New Language

1. Copy `translations/en.js` to `translations/xx.js` (where `xx` is the BCP-47 language code).
2. Translate every string value while keeping all key names identical.
3. Add a toggle button in the `#langToggle` pill in `index.html`:
   ```html
   <button onclick="setLang('xx')" id="btn-xx">XX</button>
   ```
4. Update `setLang()` in `index.html` to handle the new code if any RTL (`dir="rtl"`) adjustment is needed.

---

## PWA Support

The app is a fully installable Progressive Web App:

- **`manifest.json`** — declares app identity, icons, theme colour, and `display: standalone`.
- **`sw.js`** — Service Worker implements a cache-first strategy for all static assets (HTML, CSS, JS, icons), enabling full offline functionality after the first visit.
- **Install banner** — an `beforeinstallprompt`-driven install banner appears on Android after 3 seconds. On iOS/Safari, a manual hint (`Tap Share ⬆ then "Add to Home Screen"`) is shown instead.
- **Dismissed banners** — dismissal is stored in `localStorage` (`pwa_dismissed`) and suppressed for 30 days.

---

## Local Data Persistence

When **Privacy Mode is OFF**, form data is saved to **`localStorage`** under the key `zakat_form_data` every time input changes. When **Privacy Mode is ON** (default), persistence is disabled and data remains session-only in memory.

- All numeric field values (only non-zero values are stored to keep payload small)
- Nisab type (`silver` / `gold`)
- Calendar type (`lunar` / `solar`)
- Stock calculation method (`trade` / `longterm`)

On page load, saved data is restored before the first calculation runs, so users can close the browser and return later without losing their entries.

A brief gold toast notification **"Data saved locally"** confirms each save. The **Reset All Fields** button clears both the form inputs and the saved `localStorage` entry after a confirmation prompt.

> The app also uses `localStorage` for: currency preference (`zakat_currency`), language preference (`zakat_lang`), theme preference (`zakat_theme`), metal price cache (`zakat_metals`), FX rate cache (`zakat_fx`), and PWA dismissal timestamp (`pwa_dismissed`). None of these keys ever leave the user's device.

---

## PDF Export

Clicking **Export PDF** triggers `exportZakatPDF()` in `pdf-export.js`, which uses [jsPDF](https://github.com/parallax/jsPDF) (loaded via CDN) to generate a formatted PDF summary containing:

- Calculation date and settings (nisab basis, calendar type, currency)
- Per-section asset totals
- Total assets, total liabilities, and net Zakatable wealth
- Nisab threshold value and eligibility status
- Final Zakah due amount

The PDF is generated entirely client-side and downloaded directly — no data is sent anywhere.

---

## Privacy & Security

| Property | Detail |
|---|---|
| **Data storage** | `localStorage` only — on the user's device, never transmitted |
| **Network requests** | Only to `./data/metals.json` and `./data/rates.json` (same-origin static files) |
| **Third-party scripts** | jsPDF bundled locally (`./libs/jspdf.umd.min.js`) — no tracking scripts |
| **Third-party minimization** | Core app shell avoids external font network dependencies |
| **Analytics** | None |
| **Cookies** | None |
| **Ads** | None |
| **Server** | None required — fully static deployment |

The full privacy policy is available at [`/policies/privacy-notice`](./policies/privacy-notice.html).

---

## Disclaimer

> This calculator is provided as a **free educational tool for Zakah estimation purposes only**. Samin's Initiatives bears no responsibility or liability for any incorrect Zakah calculation arising from inaccurate, incomplete, or erroneous data entered by the user.
>
> Results are purely indicative estimates and **do not constitute a formal religious ruling (fatwa)**. Zakah is a serious act of worship (ibadah), and the accuracy of the calculation is entirely dependent on the correctness of the information provided.
>
> **For a binding and authoritative determination of your Zakah obligation, please consult a qualified Mufti or Islamic scholar (Aalim).** A scholar can account for your specific circumstances, applicable madhab (school of jurisprudence), and nuanced asset classifications that no general calculator can fully address.

---

## Contributing

Contributions are warmly welcomed — bug reports, new language translations, scholarly corrections, accessibility improvements, and feature suggestions all help the Ummah.

1. **Fork** this repository.
2. **Create** a feature branch: `git checkout -b feat/your-feature-name`
3. **Commit** your changes with a clear message: `git commit -m "feat: add Urdu translation"`
4. **Push** to your fork: `git push origin feat/your-feature-name`
5. **Open a Pull Request** with a description of what you changed and why.

### Areas Where Help Is Especially Appreciated

- **New language translations** — Urdu, Arabic, Malay, Indonesian, Turkish, French
- **Scholarly review** — corrections to asset classification notes, Nisab weights, or rate methodology
- **Accessibility audit** — screen reader testing, colour contrast verification
- **Additional asset types** — REITs, Islamic insurance (Takaful), offshore accounts
- **UI/UX improvements** — especially for mobile and low-bandwidth environments

Please open an issue before starting large changes so we can discuss the approach first.

---

## License

This project is licensed under the terms of the [LICENSE](./LICENSE) file in this repository.

---

<div align="center">

**Built with ☽ by [Samin Yasar](https://samin-yasar.dev)**  
*Building tools for the Ummah with transparency and trust*

[Privacy Policy](./policies/privacy-notice.html) · [Open Source](https://github.com/Samin-yasar/zakah) · [Contact](https://samin-yasar.dev/#contact)

</div>
