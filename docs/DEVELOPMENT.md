# Development Guide

This guide provides detailed instructions for setting up the Zakah Calculator for development, debugging, and testing.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Local Development Setup](#local-development-setup)
3. [Running the Development Server](#running-the-development-server)
4. [Browser DevTools & Debugging](#browser-devtools--debugging)
5. [Testing Service Worker](#testing-service-worker)
6. [Testing PWA Installation](#testing-pwa-installation)
7. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
8. [Performance Profiling](#performance-profiling)

---

## System Requirements

### Minimum

- **OS**: Windows, macOS, or Linux
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Node.js**: Optional (for using `npx serve`, etc.)
- **Python**: Optional (for `python3 -m http.server`)

### Recommended

- **Browser**: Latest version of Chrome or Firefox (best DevTools)
- **Editor**: VS Code with Live Server extension
- **Package Manager**: `npx` (comes with Node.js)

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/zakah.git
cd zakah
```

### 2. Install Dependencies (Optional)

If you want to use Node.js tools:

```bash
npm install  # or: yarn install, pnpm install
```

Note: The Zakah Calculator has **no required build dependencies**. Install only if you plan to use Node.js utilities (like `serve`, linting, etc.).

### 3. Install VS Code Extensions (Optional)

For a better development experience in VS Code:

- **Live Server** — Real-time browser refresh during file edits
- **Prettier** — Code formatter
- **ESLint** — JavaScript linter
- **CSS Peek** — Jump to CSS definitions

```bash
# VS Code CLI installation
code --install-extension ritwickdey.LiveServer
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension pranaygp.vscode-css-peek
```

---

## Running the Development Server

### Option 1: Python HTTP Server (Recommended)

Built-in to Python 3:

```bash
python3 -m http.server 8080
```

Then open: `http://localhost:8080`

**Why**: No dependencies, fast, reliable, built-in to most systems.

### Option 2: Node.js `serve`

Using npx (if Node.js installed):

```bash
npx serve .
```

Output will show the local URL (usually `http://localhost:3000`).

### Option 3: PHP Built-in Server

If PHP is installed:

```bash
php -S localhost:8080
```

### Option 4: VS Code Live Server

1. Install the Live Server extension
2. Right-click `index.html` in the file explorer
3. Select **"Open with Live Server"**
4. Browser opens automatically with live reload

### Option 5: Docker

```bash
docker run -p 8080:80 -v $(pwd):/usr/share/nginx/html nginx
```

Then open: `http://localhost:8080`

---

## Browser DevTools & Debugging

### Opening DevTools

**Chrome/Edge/Firefox:**
- Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (macOS)
- Or: Right-click → "Inspect"

### Key DevTools Tabs for Development

#### Console Tab

- View JavaScript errors and warnings
- Log custom messages using `console.log("[v0] ...")`
- Execute ad-hoc JavaScript to test functions

**Useful commands:**
```javascript
// Check current state
console.log(nisabType, calendarType, currentCurrency);

// Trigger calculation
calc();

// Check localStorage
console.log(localStorage.getItem('zakat_form_data'));

// Force Privacy Mode off (for testing persistence)
privacyMode = false;
persistState();
```

#### Application Tab (Chrome/Edge)

- **Storage** → **localStorage** — View saved form data
- **Storage** → **Session Storage** — View temporary data
- **Manifest** — View PWA manifest configuration
- **Service Workers** — Check SW registration and status

#### Network Tab

- Monitor HTTP requests to `data/metals.json` and `data/rates.json`
- Check response times and sizes
- Simulate slow network with throttling

**To simulate slow 3G:**
1. Open DevTools → Network tab
2. Click the throttling dropdown (usually says "No throttling")
3. Select "Slow 3G"
4. Refresh page to see realistic load times

#### Sources Tab

- Set breakpoints in JavaScript
- Step through code line-by-line
- Watch variable values during execution

**Example debugging session:**
1. Open `app.js` in Sources tab
2. Click on line number where `calc()` is called to add a breakpoint
3. Trigger the calculation (change a form input)
4. Step through using F10 (step over) or F11 (step into)

#### Elements/Inspector Tab

- Inspect HTML structure
- View CSS styles applied to elements
- Edit HTML/CSS temporarily to test changes
- Check ARIA roles and accessibility attributes

---

## Testing Service Worker

### Checking SW Status

1. Open DevTools → **Application** tab
2. Click **Service Workers** in the left sidebar
3. You'll see:
   - Registration status: "activated and running"
   - Scope: URL path where SW operates
   - Options: "Update on reload", "Offline", etc.

### Testing Offline Mode

1. **With DevTools open** (Network tab):
   - Check the **Offline** checkbox
   - Refresh the page
   - App should work fully (with cached prices)

2. **Simulate offline in DevTools**:
   - Network tab → throttling dropdown → "Offline"
   - Refresh page

3. **Check what's cached**:
   - Application tab → Cache Storage
   - Expand cache names (e.g., `zakah-calc-v11`)
   - View cached file list

### Clearing Service Worker Cache

To test a fresh installation or debug caching issues:

```javascript
// In DevTools Console:
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

Or manually:
1. DevTools → Application → Cache Storage
2. Right-click cache → Delete
3. Unregister Service Worker → Unregister button
4. Refresh page (SW re-registers and caches)

---

## Testing PWA Installation

### Android (Chrome)

1. Open app at `http://localhost:8080`
2. Wait 3 seconds — install banner appears
3. Tap **"Install"** → app added to home screen
4. Open app from home screen

**Debugging**: If banner doesn't appear:
- Check DevTools → Application → Manifest tab
- Verify `manifest.json` is valid JSON
- Ensure SSL certificate issues don't prevent installation

### iOS (Safari 15+)

1. Open app in Safari
2. Tap **Share** ⬆ button
3. Scroll down and tap **"Add to Home Screen"**
4. Name the app and tap **"Add"**
5. Open app from home screen

**Note**: iOS doesn't show an install banner; manual process required.

### Desktop (Chrome/Edge)

1. Open app in Chrome or Edge
2. Address bar shows an **install icon** (⊞ or ⬇)
3. Click icon → **"Install ..."**
4. App installed to Start menu (Windows) or Applications (macOS)
5. Opens in a standalone window

**Debugging**: Verify PWA requirements:
- HTTPS or localhost
- Valid `manifest.json`
- Service Worker registered
- Icon files (192×192, 512×512)

---

## Common Issues & Troubleshooting

### Issue: Service Worker Not Updating

**Problem**: Code changes don't reflect in the browser

**Solutions**:
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
2. Unregister SW: DevTools → Application → Service Workers → Unregister
3. Clear cache: DevTools → Application → Cache Storage → Delete all
4. Restart the dev server

### Issue: Prices Not Fetching

**Problem**: `data/metals.json` or `data/rates.json` returns 404

**Solutions**:
1. Verify dev server is running: Check terminal for errors
2. Verify file paths: Both files should exist in project root
3. Check fetch calls: DevTools → Network tab → look for failed requests
4. Manual price mode: Try entering prices manually if fetch fails (expected behavior)

### Issue: localStorage Data Not Persisting

**Problem**: Form data disappears on refresh

**Solutions**:
1. **Check Privacy Mode**: Open console and run:
   ```javascript
   console.log(privacyMode);  // Should be false to persist
   ```
2. **Toggle Privacy Mode**: Click Privacy Mode button in app UI
3. **Check browser settings**: Ensure cookies/storage is allowed for localhost
4. **Try a different browser**: Some browsers restrict storage in certain modes

### Issue: PDF Export Fails

**Problem**: Clicking "Export PDF" shows error

**Solutions**:
1. **Check jsPDF CDN**: Verify internet connection (CDN load required for PDF)
2. **Check browser console**: Error message shows root cause
3. **Fallback**: jsPDF is only loaded on demand; if CDN is blocked, export won't work
4. **Test in different browser**: Isolate browser-specific issues

### Issue: Accessibility Not Working

**Problem**: Screen reader doesn't read content correctly

**Solutions**:
1. **Verify ARIA labels**: DevTools → Inspector → check `aria-label` attributes
2. **Test keyboard navigation**: Tab through form fields
3. **Test high-contrast mode**: Toggle the accessibility panel (button in app header)
4. **Use a real screen reader**:
   - **Windows**: NVDA (free) or JAWS (paid)
   - **macOS**: VoiceOver (built-in, press Cmd+F5)
   - **Android**: TalkBack (built-in)
   - **iOS**: VoiceOver (built-in, Settings → Accessibility → VoiceOver)

---

## Performance Profiling

### Measuring Load Time

**Chrome DevTools**:
1. DevTools → Performance tab
2. Click red circle to start recording
3. Refresh the page
4. Click circle again to stop
5. Analyze the timeline

**Key metrics**:
- **First Contentful Paint (FCP)** — First content appears on screen
- **Largest Contentful Paint (LCP)** — Main content loaded
- **Time to Interactive (TTI)** — Page is usable

**Target**:
- FCP < 1.5s
- LCP < 2.5s
- TTI < 3.5s

### Measuring Calculation Speed

```javascript
// In DevTools Console:

// Time a single calculation
console.time('calc');
calc();
console.timeEnd('calc');

// Expected: < 50ms on modern hardware
```

### Measuring Memory Usage

```javascript
// In DevTools Console:
performance.memory;

// Shows: usedJSHeapSize, jsHeapSizeLimit, etc.
```

### Network Request Profiling

**DevTools → Network tab**:
- Filter by type (XHR for fetch calls, Images, etc.)
- Check file sizes
- Identify slow requests
- Test with throttling enabled (Slow 3G)

---

## Development Workflow

### Making Changes

1. **Edit file** (e.g., `app.js`, `styles.css`)
2. **Save file** (Ctrl+S)
3. **Refresh browser** (F5 or live-reload auto-refreshes)
4. **Check DevTools Console** for errors
5. **Test changes** in multiple browsers and devices

### Committing Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add Urdu translation"

# Push to your fork
git push origin feature-branch

# Open Pull Request on GitHub
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commit message conventions.

---

## Quick Tips

- **Disable cache**: DevTools → Network → "Disable cache" checkbox (while DevTools open)
- **Inspect live data**: DevTools → Console → `console.log(L)` to see translation data
- **Inspect state**: Console → `console.log({nisabType, calendarType, stockMethod, currentCurrency})`
- **Trigger error**: DevTools → Network → right-click request → "Replay XHR"
- **Mobile simulation**: DevTools → toggle device toolbar (Ctrl+Shift+M)

---

## Advanced Debugging

### Adding Custom Logs

Use `console.log("[v0] ...")` for custom debugging messages:

```javascript
function calc() {
  console.log("[v0] Calculation started", { nisabType, calendarType });
  
  // calculation logic
  
  console.log("[v0] Net wealth:", netWealth, "Nisab:", nisabValue);
}
```

These messages appear in the Console tab and help trace execution flow.

### Debugging Specific Functions

```javascript
// In DevTools Console:

// Call a function directly
calc();

// Inspect result of a helper function
getConvertedPrices();

// Check global state
window.privacyMode;
window.currentCurrency;
```

---

## Resources

- **MDN Web Docs**: https://developer.mozilla.org/
- **Web.dev**: https://web.dev/ (performance, PWA, accessibility)
- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/
- **Service Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

**Need help?** Open an issue on GitHub or refer to [CONTRIBUTING.md](../CONTRIBUTING.md) for contact information.
