# Translation Guide

This guide explains how to contribute translations to the Zakah Calculator in your language.

## Table of Contents

1. [Overview](#overview)
2. [Supported Languages](#supported-languages)
3. [Step-by-Step Translation Process](#step-by-step-translation-process)
4. [Key Terminology & Context](#key-terminology--context)
5. [Testing Your Translation](#testing-your-translation)
6. [Submitting Your Translation](#submitting-your-translation)
7. [RTL (Right-to-Left) Considerations](#rtl-right-to-left-considerations)
8. [Common Challenges & Tips](#common-challenges--tips)

---

## Overview

The Zakah Calculator supports multiple languages through translation files in `translations/` folder. Each language file contains a JavaScript object with English keys and translated string values.

### Current Languages

| Language | File | Code | Native Name | Status |
|----------|------|------|-------------|--------|
| English | `en.js` | `en` | English | ✅ Official |
| Bengali | `bn.js` | `bn` | বাংলা | ✅ Official |

### Seeking Translations

We're actively looking for contributors to translate into:
- **Urdu** (`ur`)
- **Arabic** (`ar`) — Modern Standard Arabic (MSA) or regional variants
- **Malay** (`ms`)
- **Indonesian** (`id`)
- **Turkish** (`tr`)
- **French** (`fr`)
- **German** (`de`)

If you can translate into any of these (or another language), please open a [Translation Request issue](../.github/ISSUE_TEMPLATE/translation_request.md).

---

## Supported Languages

### BCP-47 Language Codes

The Zakah Calculator uses [BCP-47 language tags](https://tools.ietf.org/html/bcp47) for language codes:

| Language | Code | RTL? | Notes |
|----------|------|------|-------|
| English | `en` | LTR | Default language |
| Bengali | `bn` | LTR | Used in Bangladesh |
| Urdu | `ur` | RTL | Spoken in Pakistan, parts of India |
| Arabic | `ar` | RTL | Many regional variants |
| Malay | `ms` | LTR | Spoken in Malaysia, Brunei |
| Indonesian | `id` | LTR | Spoken in Indonesia |
| Turkish | `tr` | LTR | Spoken in Turkey |
| French | `fr` | LTR | Used globally |
| German | `de` | LTR | Used in Europe |

**RTL = Right-to-Left** languages require special UI handling (see [RTL Considerations](#rtl-right-to-left-considerations) below).

---

## Step-by-Step Translation Process

### Step 1: Create Translation File

1. **Clone the repository** (if not already done)
   ```bash
   git clone https://github.com/YOUR-USERNAME/zakah.git
   cd zakah
   git checkout -b feat/add-urdu-translation
   ```

2. **Copy the English translation as a template**
   ```bash
   cp translations/en.js translations/ur.js
   ```

3. **Open** `translations/ur.js` in your editor

### Step 2: Translate All Strings

The file has this structure:

```javascript
window.LANG_DATA = {
  "key_1": "English text here",
  "key_2": "Another English text",
  // ... more keys
};
```

**Replace only the English text** — keep all keys identical:

```javascript
window.LANG_DATA = {
  "key_1": "اردو ترجمہ یہاں",  // CHANGED
  "key_2": "ایک اور اردو متن",  // CHANGED
  // ... more keys (same keys as English)
};
```

### Step 3: Financial & Islamic Terminology

Certain terms require careful translation to maintain accuracy:

| English | Context | Urdu Example | Arabic Example |
|---------|---------|--------------|---|
| Zakah | Religious obligation to give alms | زکات | الزكاة |
| Nisab | Minimum wealth threshold | نصاب | النصاب |
| Khalifah | Gregorian/solar calendar | عام کنویشن کیلنڈر | التقويم الشمسي |
| Hijri | Islamic/lunar calendar | ہجری کیلنڈر | التقويم الهجري |
| Mahal | Types of property subject to Zakah | اموال | الأموال |
| Liability | Debt or obligation that reduces Zakah | ذمہ داری | الالتزام |
| Equity | Market value / net worth | حق مالکیت | حقوق الملكية |

**Best Practice**: 
- Use standard financial terms from banking/accounting in your language
- Consult Islamic dictionaries for religious terms
- If uncertain, provide both the translation and the English term in parentheses

### Step 4: Numbers & Currency Formatting

Some strings include placeholders for numbers and currencies. Keep these intact:

```javascript
// DON'T translate these placeholders:
"msg_net_wealth": "Your net zakatable wealth is {currency} {amount}"
//                                            ^^^^^^^^^  ^^^^^^
//                                            Keep these!

// CORRECT translation:
"msg_net_wealth": "آپ کی خالص زکوۃ کی دولت {currency} {amount} ہے"
```

Common placeholders:
- `{currency}` — Currency symbol (e.g., $, ৳, ﷼)
- `{amount}` — Numeric value (e.g., 50000, 1234.56)
- `{percent}` — Percentage rate (e.g., 2.5%, 2.577%)
- `{value}` — Generic numeric value

### Step 5: Add to Language Picker

Edit `index.html` and find the language toggle section:

```html
<div id="langToggle" class="lang-toggle">
  <button onclick="setLang('en')" id="btn-en" class="active">EN</button>
  <button onclick="setLang('bn')" id="btn-bn">বাং</button>
  <!-- ADD YOUR LANGUAGE BELOW -->
  <button onclick="setLang('ur')" id="btn-ur">اردو</button>
</div>
```

### Step 6: Handle RTL (if applicable)

If your language is RTL, edit the `setLang()` function in `app.js`:

**Find this section** (around line 113):
```javascript
function setLang(lang) {
  currentLang = lang;
  lsSet('zakat_lang', lang);
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-bn').classList.toggle('active', lang === 'bn');
  // ADD YOUR LANGUAGE TOGGLE HERE
  document.getElementById('btn-ur').classList.toggle('active', lang === 'ur');
```

**Then, add RTL direction change** (same function, after line 114):
```javascript
function applyLang(lang) {
  // Existing logic...
  document.body.classList.toggle('lang-bn', lang === 'bn');
  // ADD THIS LINE
  document.body.classList.toggle('lang-rtl', lang === 'ur');  // For RTL languages
```

**Note**: The CSS already has RTL support; just add `lang-rtl` class for RTL languages.

---

## Key Terminology & Context

### Asset Categories

These terms appear frequently in the calculator. Ensure consistency:

| Category | English | Context |
|----------|---------|---------|
| Liquidity | Cash & Liquid Assets | Bank savings, wallets, digital money |
| Metals | Precious Metals & Jewelry | Gold, silver, jewelry |
| Investment | Investments & Financial Assets | Stocks, crypto, bonds, funds |
| Business | Business Assets | Business inventory, receivables |
| Liability | Liabilities & Deductions | Loans, debts, obligations |

### Common Phrases

| English | Use Case | Notes |
|---------|----------|-------|
| "Zakah Obligatory" | Eligibility badge when net wealth ≥ Nisab | Congratulatory message |
| "Not Eligible Yet" | Eligibility badge when net wealth < Nisab | Encouraging message |
| "Enter your assets" | Help text for form sections | Instructional |
| "Deduct short-term liabilities only" | Liability section note | Important rule |
| "Processing 100% Local" | Privacy assurance | Emphasizes privacy |

---

## Testing Your Translation

### Local Testing

1. **Save your translation file**: `translations/ur.js`

2. **Start dev server**:
   ```bash
   python3 -m http.server 8080
   # or: npx serve .
   ```

3. **Open app**: `http://localhost:8080`

4. **Test language switch**:
   - Click your new language button in the top toolbar
   - Verify all text changes appear correctly
   - Check for any untranslated strings

### What to Check

- [ ] **All buttons and labels translate**
- [ ] **Tooltips appear in your language** (hover over info icons)
- [ ] **Form placeholders are translated**
- [ ] **Results panel shows translated category names**
- [ ] **Eligibility badge is translated**
- [ ] **Currency symbols display correctly**
- [ ] **Numbers format correctly** (thousands separators, decimal points)
- [ ] **RTL text aligns properly** (if RTL language)
- [ ] **No text overflow** in buttons or labels
- [ ] **Dark and light themes both work**

### Browser Compatibility

Test in:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browser (iOS Safari or Chrome Mobile)

### Accessibility Testing

- [ ] Tab through form fields → all labels in your language
- [ ] Screen reader reads content correctly (test with device accessibility settings)
- [ ] High contrast mode readable
- [ ] Keyboard-only navigation works

---

## Submitting Your Translation

### Method 1: Pull Request (Recommended)

1. **Commit your changes**:
   ```bash
   git add translations/ur.js
   git commit -m "feat: add Urdu translation"
   ```

2. **Push to your fork**:
   ```bash
   git push origin feat/add-urdu-translation
   ```

3. **Open a Pull Request** on GitHub:
   - Title: `[TRANSLATION] Add Urdu language support`
   - Description:
     ```markdown
     - Translated all strings in `translations/ur.js`
     - Added Urdu button to language picker
     - Tested in Chrome and Firefox
     - RTL support included (if applicable)
     ```

4. **Wait for review** → Maintainer will test and merge

### Method 2: Issue + Translation File

If you're not comfortable with Git/GitHub:

1. **Open a Translation Request issue** (.github/ISSUE_TEMPLATE/translation_request.md)
2. **Attach the translation file** (e.g., `ur.js`)
3. **Note any special considerations** (RTL, regional variants, etc.)
4. Maintainer will integrate and test

---

## RTL (Right-to-Left) Considerations

If you're translating into Arabic, Urdu, Persian, or Hebrew, your language is RTL.

### What Changes for RTL

1. **Text direction**: Reverses from left-to-right to right-to-left
2. **Alignment**: Buttons, labels, and layout elements flip
3. **Margins/padding**: Left/right sides swap
4. **Numbers**: Usually remain LTR even in RTL text

### Implementation

**In `styles.css`** (already included):
```css
/* RTL support — body gets lang-rtl class */
body.lang-rtl {
  direction: rtl;
  text-align: right;
}

body.lang-rtl .form-group {
  text-align: right;
  margin-right: 0;
  margin-left: 1rem;
}

/* And many more RTL overrides... */
```

**Testing RTL**:
1. Load your RTL translation in the app
2. Check DevTools Inspector → `<body>` element
3. Verify `lang-rtl` class is applied
4. All text should flow right-to-left
5. Form layout should mirror

---

## Common Challenges & Tips

### Challenge 1: "Nisab" is Not Translatable

**Problem**: "Nisab" is an Islamic term; how do I translate it?

**Solution**: 
- Use the transliteration of the Arabic term (e.g., "Nisab" in Urdu, "Nisaab" in Indonesian)
- Alternatively, provide a brief explanation: "Nisab (minimum wealth threshold)"
- Most Islamic terms are kept as-is across languages

### Challenge 2: Currency Symbols Don't Appear

**Problem**: Currency symbol shows as `?` or missing

**Solution**:
1. Verify your text editor saves file as UTF-8 (not ASCII or Latin-1)
2. Use HTML entity escapes if needed:
   ```javascript
   // Instead of: "৳"
   // Use: "&#2547;"
   ```
3. Test in multiple browsers

### Challenge 3: Text Overflows in Buttons

**Problem**: Translated text is longer than English, breaks button layout

**Solution**:
- **Use concise translations** where possible
- **Use abbreviations** (e.g., "Nisab" instead of "Nisab Threshold")
- **Report as a layout issue** → maintainer adjusts CSS

### Challenge 4: Regional Variants (Arabic, Spanish, etc.)

**Problem**: Multiple variants exist (e.g., Egyptian Arabic vs. Modern Standard Arabic)

**Solution**:
- Choose **Modern Standard Arabic (MSA)** for broad compatibility
- Or choose **most widely spoken regional variant** (e.g., Egyptian for Arabic)
- Add a note in the PR explaining your choice
- Future PRs can add regional variants (e.g., `ar-EG` for Egyptian Arabic)

### Tip 1: Use Glossary

Create a personal glossary while translating:
```
English         | Translation
----            | ----
Zakah           | زکات
Nisab           | نصاب
Cash            | نقد رقم
Jewelry         | زیورات
Eligible        | اہل
```

This ensures consistency across all strings.

### Tip 2: Review English Twice

Before translating:
1. Read the English translation file completely
2. Understand the context (form label, help text, error message)
3. Note any ambiguities or unclear phrases
4. Ask maintainer for clarification if needed

### Tip 3: Test with Real Data

After translating:
1. Enter actual asset values
2. Switch between your language and English
3. Verify numbers and calculations display correctly in both

### Tip 4: Get Community Feedback

If possible:
1. Share your translation with native speakers
2. Ask for feedback on terminology and phrasing
3. Iterate and improve

---

## Questions?

- **During translation**: Open a Discussion or comment on an issue
- **Submitting translation**: Use the Translation Request template (.github/ISSUE_TEMPLATE/translation_request.md)
- **Technical questions**: See [CONTRIBUTING.md](../CONTRIBUTING.md) or [DEVELOPMENT.md](./DEVELOPMENT.md)

---

**Thank you for bringing the Zakah Calculator to your language!** Your effort helps serve Muslims worldwide with a tool they can understand and trust. 🤝
