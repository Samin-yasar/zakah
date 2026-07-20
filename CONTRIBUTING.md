# Contributing to the Zakah Calculator

Thank you for your interest in contributing to the Zakah Calculator! Contributions from the community—whether code, translations, bug reports, or documentation improvements—are what make this tool useful for the Ummah.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [How to Contribute](#how-to-contribute)
6. [Code Style Guide](#code-style-guide)
7. [Commit Message Conventions](#commit-message-conventions)
8. [Testing Checklist](#testing-checklist)
9. [Submitting a Pull Request](#submitting-a-pull-request)

---

## Code of Conduct

We're committed to maintaining a respectful, inclusive community. Contributors are expected to:

- **Be respectful** of all participants, regardless of background or experience
- **Be constructive** in feedback and discussions
- **Respect privacy** — never share personal or sensitive data
- **Honor the Islamic context** — this project serves a religious purpose; maintain reverence for the subject matter

Violations of these expectations will result in issues or PRs being closed.

---

## Getting Started

### Prerequisites

No build tools or package managers are required. The Zakah Calculator is a **static HTML/CSS/JavaScript** application.

### Fork & Clone

1. **Fork** this repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/zakah.git
   cd zakah
   ```
3. **Add upstream** to track the original repo:
   ```bash
   git remote add upstream https://github.com/Samin-yasar/zakah.git
   ```

---

## Development Setup

### Running Locally

The app must be served over HTTP (not `file://`) because the Service Worker and fetch calls require a proper origin.

**Option 1: Python**
```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

**Option 2: Node.js**
```bash
npx serve .
```

**Option 3: PHP**
```bash
php -S localhost:8080
```

**Option 4: VS Code Live Server**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → "Open with Live Server"

### Browser DevTools

- Open `http://localhost:8080` in your browser
- Press `F12` to open DevTools
- Use the **Console** tab to debug JavaScript errors
- Use the **Application** tab to inspect `localStorage`, Service Worker, and the manifest

### Testing the Service Worker

1. With the app running, open DevTools → **Application** tab
2. Click **Service Workers** in the left sidebar
3. You'll see the SW status and can simulate offline mode
4. Refresh the page and the app should work offline (data cached from previous visit)

### Testing PWA Installation

**Android:**
- Open the app in Chrome
- A banner appears after 3 seconds
- Tap "Install" to add to home screen

**iOS/Safari:**
- Open the app in Safari
- Tap Share ⬆ → "Add to Home Screen"
- No install banner is shown (iOS limitation)

---

## Project Structure

```
zakah/
├── .github/
│   ├── workflows/
│   │   └── update-rates.yml        # GitHub Actions: fetch live prices
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       ├── feature_request.md
│       └── translation_request.md
│
├── data/
│   ├── metals.json                 # Gold & silver prices (USD/oz)
│   └── rates.json                  # FX rates (relative to USD)
│
├── icons/                          # PWA app icons (72px–512px)
├── policies/                       # Privacy policy page
├── translations/                   # i18n language files
│   ├── en.js
│   └── bn.js
│
├── app.js                          # Core application logic
├── index.html                      # Main HTML document
├── styles.css                      # All styling (dark/light themes)
├── pdf-export.js                   # PDF generation
├── sw.js                           # Service Worker
├── manifest.json                   # PWA manifest
├── CONTRIBUTING.md                 # This file
├── SECURITY.md                     # Vulnerability disclosure
├── ARCHITECTURE.md                 # System design overview
└── LICENSE                         # Open-source license
```

---

## How to Contribute

### Bug Reports

1. **Search existing issues** to ensure it's not a duplicate
2. **Open a new issue** using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
3. Include:
   - Detailed reproduction steps
   - Browser and device information
   - App version (see Integrity & Version panel)
   - Screenshots if applicable

### Feature Requests

1. **Discuss first** — open an issue to propose your idea before starting implementation
2. Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Explain the use case and why this feature matters
4. If it involves Islamic jurisprudence, cite scholarly references

### Code Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
   Use prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `style/`, `test/`

2. **Make your changes**:
   - Edit only the files necessary for your change
   - Add JSDoc comments to functions
   - Keep diffs focused and readable

3. **Test thoroughly** (see Testing Checklist below)

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add Urdu translation"
   ```
   See [Commit Message Conventions](#commit-message-conventions)

5. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Open a Pull Request** with the [PR template](.github/pull_request_template.md)

### Translations

Translations are highly valued contributions!

1. **Add a new language**:
   - Copy `translations/en.js` to `translations/xx.js` (where `xx` is the BCP-47 language code)
   - Translate all string values, keeping keys identical
   - Test in the app by loading the new language

2. **Add to language picker**:
   - Edit `index.html` and find `#langToggle`
   - Add a new button: `<button onclick="setLang('xx')" id="btn-xx">XX</button>`
   - If RTL (e.g., Arabic, Urdu), update the `setLang()` function logic

3. **Verify translations**:
   - All tooltips appear correctly
   - Number formatting works (thousands separators, decimal points)
   - Currency symbols display properly
   - Check for text overflow in forms

### Documentation

- **README** — end-user focused overview
- **CONTRIBUTING.md** — this file; contributor workflow
- **ARCHITECTURE.md** — system design for developers
- **SECURITY.md** — vulnerability disclosure policy
- **docs/DEVELOPMENT.md** — detailed dev setup
- **docs/TRANSLATION.md** — translation guide
- **docs/DEPLOYMENT.md** — deployment to GitHub Pages

Improvements to any documentation are welcome!

---

## Code Style Guide

### JavaScript

- **Indentation**: 2 spaces (enforced by `.editorconfig`)
- **Semicolons**: Always use them
- **Var/Let/Const**: Prefer `const` and `let`, avoid `var`
- **Naming**:
  - Functions: camelCase (e.g., `fetchPrices`, `calculateZakah`)
  - Constants: UPPER_SNAKE_CASE (e.g., `CACHE_TTL_MS`, `TROY_OZ_TO_GRAM`)
  - IDs: kebab-case (e.g., `#privacyModeBtn`, `#r_netWealth`)

### Function Documentation

Add JSDoc comments to all functions:

```javascript
/**
 * Fetches live metal and FX rates from data files.
 * Falls back to cached prices or manual input mode if fetch fails.
 * @param {boolean} isManualRefresh - Whether user initiated a refresh
 * @returns {Promise<void>}
 */
async function fetchPrices(isManualRefresh = false) {
  // ...
}
```

### HTML

- Use semantic elements: `<main>`, `<header>`, `<section>`, `<form>`, `<button>`
- Include `aria-label`, `aria-describedby`, and ARIA roles for accessibility
- Data attributes for i18n: `data-i18n`, `data-i18n-btn`, `data-tip-key`
- Form inputs should have associated `<label>` elements

### CSS

- Use CSS variables defined in `:root` for colors and spacing
- Responsive design: mobile-first approach
- Dark and light theme support via `.light-theme` class
- No external font dependencies (keep network requests minimal)

### Comments

- Write comments for *why*, not *what*. Code should be self-explanatory for the latter.
- Use block comments (`/* ... */`) for sections and function headers
- Use inline comments (`//`) sparingly for complex logic

---

## Commit Message Conventions

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — code style changes (formatting, missing semicolons, etc.)
- `refactor` — code refactoring without feature changes
- `perf` — performance improvements
- `test` — test additions or changes
- `chore` — build, CI/CD, dependencies

**Examples**:
```bash
git commit -m "feat: add Urdu translation"
git commit -m "fix: prevent multiple simultaneous price fetches"
git commit -m "docs: clarify Nisab calculation in README"
git commit -m "refactor: extract price formatting into helper function"
```

---

## Testing Checklist

Before submitting a PR, verify:

### Functional Testing

- [ ] **Desktop browser**: Chrome, Firefox, Safari (latest versions)
- [ ] **Mobile browser**: iOS Safari, Chrome Mobile
- [ ] **All asset categories** work with values entered
- [ ] **All currencies** calculate correctly
- [ ] **Nisab options** (silver/gold) switch correctly
- [ ] **Calendar types** (lunar/solar) produce correct rates
- [ ] **Stock methods** (trade/longterm) calculate correctly
- [ ] **PDF export** generates and downloads without errors

### Offline & PWA Testing

- [ ] Service Worker caches on first visit
- [ ] App works fully offline (refresh while disconnected)
- [ ] Install banner/hints appear correctly
- [ ] Data persists across sessions (if Privacy Mode is OFF)
- [ ] Clearing storage clears all saved data

### Accessibility Testing

- [ ] Keyboard navigation works (Tab, Shift+Tab, Enter)
- [ ] Screen reader reads form labels and values correctly
- [ ] High contrast mode is readable
- [ ] Color is not the only indicator of status (e.g., error states)
- [ ] Links and buttons have clear focus indicators

### i18n (if translation-related)

- [ ] All strings from English version are translated
- [ ] Numbers format correctly for the locale
- [ ] RTL languages display properly (if applicable)
- [ ] Tooltips and hints translate correctly

### Privacy & Security

- [ ] Privacy Mode toggle works (ON = no `localStorage`)
- [ ] No sensitive data logged to console
- [ ] No external API calls made during calculation
- [ ] Backup encryption/decryption works (if applicable)

### Performance

- [ ] Initial load time is < 2 seconds
- [ ] No console warnings or errors
- [ ] No JavaScript errors in any browser
- [ ] Calculations complete instantly (< 100ms)

---

## Submitting a Pull Request

1. **Update your branch** with latest changes from upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

3. **Open a Pull Request** on GitHub:
   - Use the [PR template](.github/pull_request_template.md)
   - Link to related issues
   - Describe what changed and why
   - Mention any breaking changes

4. **Respond to feedback**:
   - Address code review comments
   - Push additional commits (don't force-push unless instructed)
   - Re-request review once changes are made

5. **Wait for merge**:
   - Maintainer will merge once PR is approved
   - Your commits will be preserved in git history

---

## Questions?

- **General questions**: Open a [Discussion](https://github.com/Samin-yasar/zakah/discussions) if GitHub supports it, or an issue
- **Security issues**: See [SECURITY.md](SECURITY.md) — **do not open a public issue**
- **Reach out**: Contact the maintainer at the info provided in the [README](README.md)

---

**Thank you for contributing to the Zakah Calculator and serving the Ummah!** 

Your time and effort help improve this tool for the Muslim community. We deeply appreciate your support. 🤝
