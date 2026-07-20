# Security Policy

## Overview

The Zakah Calculator is designed with **privacy-first** and **security-first** principles:

- **100% client-side processing** — no data is sent to any server
- **No third-party tracking** — no analytics, cookies, or telemetry
- **Optional local persistence** — Privacy Mode (default ON) disables all storage
- **Encryption for backups** — optional encrypted JSON export with user-supplied passphrase
- **HTTPS recommended** — when deployed, always serve over HTTPS

---

## Security Features

### Data Privacy

| Feature | Mechanism |
|---------|-----------|
| **Form Data** | Stored in `localStorage` only when Privacy Mode is OFF (default is ON) |
| **Session-Only** | With Privacy Mode ON (default), all data exists only in memory during the session |
| **Calculations** | Performed entirely in the browser; no calculation data leaves the user's device |
| **Price Fetches** | Only fetch from `./data/metals.json` and `./data/rates.json` (same-origin) |
| **Backups** | User can export encrypted backups using AES-GCM with a user-supplied passphrase |

### Network Security

- No external JavaScript libraries are fetched (except jsPDF from CDN if user exports PDF)
- All static assets (HTML, CSS, JS, icons) are loaded from the same origin
- No tracking pixels, analytics, or third-party APIs
- Fetch calls use `cache: 'no-cache'` to prevent stale price data

### Client-Side Security

- All user input is validated before use (numeric fields, currency/language selectors)
- HTML output is escaped using `escapeHtml()` to prevent XSS
- Sensitive operations (backup import, password derivation) use Web Crypto APIs
- PBKDF2 key derivation with 600,000 iterations for encrypted backups

---

## Supported Security Protocols

### Web Crypto API

The app uses the Web Crypto API for encrypted backup functionality:

- **Key Derivation**: PBKDF2 with SHA-256, 600,000 iterations
- **Encryption**: AES-GCM (256-bit keys)
- **Salt**: 16 bytes of random data per backup
- **IV**: 12 bytes of random data per encryption operation

### Service Worker Caching

- **Cache Strategy**: Cache-first for static assets
- **Cache Versioning**: Version string changes invalidate old caches
- **Stale-While-Revalidate**: Dynamic requests (price data) use cache + refresh pattern

---

## Reporting Security Vulnerabilities

If you discover a security vulnerability, **please do not open a public issue**. Instead:

1. **Email the maintainer** at: [security@samin-yasar.dev](mailto:security@samin-yasar.dev)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

3. **Allow time for response**: The maintainer will acknowledge receipt within 48 hours and provide updates on progress

4. **Responsible Disclosure**: Please allow 30 days for a fix before publicly disclosing the vulnerability

---

## Security Limitations & Non-Goals

### What This App Does NOT Protect

- **Device Security**: If your device is compromised, the app cannot protect your data
- **Browser Exploits**: Vulnerabilities in the browser itself are outside the app's scope
- **Network Interception** (without HTTPS): Deploy over HTTPS to prevent man-in-the-middle attacks
- **Malware**: Malicious browser extensions or system malware could access `localStorage`

### Out of Scope

- Formal financial audit of Zakah calculation methodology (see DISCLAIMER in README)
- Exhaustive penetration testing (community reviews are welcome)
- Protection against quantum computing threats (future concern)

---

## Security Best Practices for Users

### When Using the App

1. **Enable Privacy Mode** (default) to prevent local data persistence
2. **Use HTTPS** when accessing the app from a remote server
3. **Don't share backups** — encrypted backups still require secure passphrase handling
4. **Close the browser** after completing sensitive calculations if not using Privacy Mode
5. **Keep your device updated** with the latest browser security patches

### When Contributing

1. **Never commit secrets** (API keys, email addresses, personal data)
2. **Use `.gitignore`** for local development artifacts
3. **Review code** before submitting — check for hardcoded credentials or sensitive data
4. **Test in Privacy Mode** to ensure data doesn't leak to storage
5. **Report issues responsibly** using this policy

---

## Dependency Security

This project has **minimal external dependencies**:

- **jsPDF** (optional, loaded via CDN for PDF export only)
  - Latest version is recommended
  - Check for security advisories at [npm](https://www.npmjs.com/package/jspdf)

### Monitoring for Vulnerabilities

- No build-time package managers (no `npm` dependencies to audit)
- If you fork this project and add dependencies, use `npm audit` to check for vulnerabilities
- Keep jsPDF updated if using PDF export

---

## Accessibility & Security

- **High Contrast Mode**: Improves readability without sacrificing security
- **Keyboard Navigation**: Allows use without mouse (accessibility + security benefit)
- **ARIA Labels**: Ensure screen readers don't expose sensitive info unintentionally

---

## Incident Response

If a vulnerability is discovered and exploited:

1. **Maintainer will assess** the impact and severity
2. **A fix will be developed** and tested
3. **Deployment**: Fix is committed to `main` and deployed to GitHub Pages
4. **Notification**: A security advisory may be published after the fix is released

---

## Version Compatibility

This policy applies to the **latest version** of the Zakah Calculator.

For older versions, security support is **best-effort only**. Users are encouraged to upgrade to the latest version for security patches.

---

## Questions or Feedback?

If you have questions about security practices, email: [security@samin-yasar.dev](mailto:security@samin-yasar.dev)

Thank you for helping keep the Zakah Calculator secure for all users. 🔒
