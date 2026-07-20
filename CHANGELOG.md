# Changelog

All notable changes to the Zakah Calculator are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions are tagged with the format: `YYYY.MM.DD-zk#` (date-based with build number)

---

## [2026.04.17-zk1] — April 17, 2026

### Added

- **Full PWA Support** — Installable on Android, iOS, and desktop
- **Multi-Currency Support** — BDT, USD, SAR, AED, GBP, AUD, INR, CAD, MYR, JPY, IDR
- **Live Price Integration** — Daily updates via GitHub Actions for gold, silver, and currency rates
- **Bilingual UI** — English and Bengali (বাংলা) with instant language switching
- **Privacy-First Design** — Privacy Mode (default ON) prevents all local data persistence
- **Encrypted Backups** — AES-GCM encrypted JSON backups with user-supplied passphrases
- **Profile Management** — Save multiple calculation scenarios locally
- **Guided Wizard** — Step-by-step workflow for new users
- **Scenario Comparison** — Side-by-side comparison of silver vs gold, lunar vs solar Nisab
- **PDF Export** — Generate and download calculation summary as PDF
- **Accessibility Features** — Full keyboard navigation, ARIA labels, high-contrast mode
- **Service Worker Caching** — Works offline with last-known prices
- **Reminder System** — Set annual Zakah due-date reminders (Hijri or Gregorian)
- **Dark/Light Theme** — Artisan Islamic-themed toggle with system preference detection

### Features by Section

#### Cash & Liquid Assets
- Physical cash and foreign currency
- Bank account types: savings, current, fixed-deposit (FD)
- Digital wallets: bKash, Nagad, Upay, Cellfin, Rocket, PayPal, Payoneer
- Money lent to others and outstanding salary/bonuses

#### Precious Metals & Jewelry
- Gold (24k, 22k, 18k) with automatic karat adjustment
- Silver (grams, bullion, coins)
- Live or manual per-gram pricing

#### Investments & Financial Assets
- Stocks (DSE, international, mutual funds, ETFs)
- Cryptocurrency (Bitcoin, Ethereum, and others)
- Provident funds, bonds, insurance savings

#### Business Assets
- Business cash and bank balances
- Inventory at current sale price (finished goods, raw materials, WIP)
- Trade receivables and supplier advances

#### Liabilities & Deductions
- Personal and business loans (12-month installments only)
- Credit card balances
- Mortgage, rent, utilities, taxes
- Customer advances and supplier payables

### Methodology

- **Nisab Calculation** — Silver (612.36g) or Gold (87.48g) threshold
- **Zakah Rate** — 2.5% (lunar calendar) or 2.577% (solar calendar)
- **Stock Methods** — Short-term trading (full value) or long-term investment (25% proxy)
- **Currency Support** — All calculations in user's chosen currency with automatic FX conversion

---

## Versioning Strategy

### Release Cadence

- **Security Fixes**: Released immediately
- **Bug Fixes**: Released on ad-hoc basis or bundled with features
- **Features**: Released on an irregular schedule (user-driven)
- **Price Updates**: Daily automated updates (data/*.json via GitHub Actions)

### Version Format

```
YYYY.MM.DD-zk#

YYYY.MM.DD = Release date (ISO format)
zk = Zakah Calculator identifier
# = Build/patch number for that date (zk1, zk2, etc.)
```

Example: `2026.04.17-zk1` released April 17, 2026 (first build that day)

---

## Supported Versions

- **Latest version**: Receives all updates, security fixes, and feature additions
- **Previous version**: Receives critical security fixes only (best-effort)
- **Older versions**: No longer supported; users encouraged to upgrade

---

## Future Roadmap

### Potential Additions (Community Input Welcome)

- [ ] Additional languages: Urdu, Arabic, Malay, Indonesian, Turkish, French
- [ ] REIT and mutual fund support with yield considerations
- [ ] Islamic insurance (Takaful) asset classification
- [ ] Scholarly madhab selector (Hanafi, Shafi'i, Maliki, Hanbali) for methodology variations
- [ ] Mobile native apps (React Native, Flutter)
- [ ] API wrapper for integration with other fintech platforms
- [ ] Dark-mode preference persistence
- [ ] Accessibility audit and WCAG 2.1 AAA compliance
- [ ] Print-friendly calculation sheet

### Non-Goals

- Cloud account synchronization (conflicts with privacy-first design)
- Integration with banking APIs (privacy and security risk)
- Real-time market data integration (adds complexity; daily updates sufficient)
- Machine learning for asset classification (overkill for this use case)

---

## Breaking Changes

### For Version 2026.04.17-zk1

None — this is the initial stable release.

If future versions introduce breaking changes, they will be documented here with migration instructions.

---

## Known Issues

### Current Limitations

1. **Price Fetching**
   - Requires `data/metals.json` and `data/rates.json` to be accessible
   - Falls back gracefully to manual price input if fetch fails
   - Cached prices may be stale if deployed on a system without daily updates

2. **Offline Mode**
   - Works offline but prices are frozen at last successful fetch
   - Users cannot update prices in offline mode
   - Service Worker requires HTTPS or localhost (not `file://` URLs)

3. **Browser Support**
   - Requires modern browser (ES6 JavaScript, Web Crypto API)
   - Service Worker not supported on iOS < 14
   - Private browsing may limit localStorage functionality

4. **Encryption**
   - Backup passphrases must be user-managed; no password recovery
   - Encryption key strength depends entirely on passphrase entropy

### Workarounds & Recommendations

- **Price issues**: Check internet connection; refresh the page
- **Offline issues**: Ensure first visit is online so Service Worker caches all assets
- **Storage issues**: Disable Privacy Mode to enable localStorage persistence
- **Decryption failure**: Verify passphrase is correct (exact string match, case-sensitive)

---

## Credits

- **Author**: [Samin Yasar](https://samin-yasar.dev)
- **Contributors**: Community members who submit bug reports, translations, and suggestions
- **Scholarl References**: Islamic jurisprudence scholars (Hanafi, Shafi'i, Maliki, Hanbali schools)

---

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

---

## How to Report Issues

- **Bugs**: Open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Features**: Suggest ideas via the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- **Security**: See [SECURITY.md](SECURITY.md) for responsible vulnerability disclosure
- **Translations**: Use the [translation request template](.github/ISSUE_TEMPLATE/translation_request.md)

---

**Thank you for using the Zakah Calculator!** Your feedback and contributions help serve the Ummah with transparency and trust. 🙏
