/**
 * ═══════════════════════════════════════════════════════════════════════
 * ZAKAH CALCULATOR — Main Application Logic
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * A comprehensive, privacy-first Zakah calculation engine running entirely
 * in the browser. This single-file module handles:
 * 
 * 1. Theme Management — In-memory dark/light mode preference
 * 2. Internationalization (i18n) — Dynamic language loading and UI translation
 * 3. Currency & Price Fetching — Public metal & FX rate data with fallbacks
 * 4. Form State Management — In-memory amounts; no saved profiles or backups
 * 5. PDF Reports — User-owned downloads generated on the device
 * 6. Zakah Calculation Engine — Core logic for computing zakat liability
 * 7. Section Management — Grouped form sections and validation
 * 8. Wizard Navigation — Section-based guided flow with direct navigation
 * 9. Utility Functions — Support template and accessibility helpers
 * 
 * Architecture:
 * - No build process required; no external JS dependencies (optional jsPDF for PDF export)
 * - Financial inputs and settings are in-memory; legacy saved keys are removed
 * - Calculations run client-side; only public assets and rates are fetched
 * - Service Worker (sw.js) handles offline caching and app installation
 * 
 * Security:
 * - Financial inputs are never persisted or sent by the calculator
 * - Inputs validated and escaped before rendering to prevent XSS
 * - Web Crypto API is used only for the public release-integrity checksum
 * 
 * @version 2026.09.30-zk2
 * @author Samin Yasar <contact@samin-yasar.dev>
 * @license See LICENSE file for open-source license terms
 */

const APP_VERSION = '2026.09.30-zk2';
let networkRequestCount = 0;
const sessionValues = new Map();

function sessionGet(key, fallback = null) {
  return sessionValues.has(key) ? sessionValues.get(key) : fallback;
}

function sessionSet(key, value) {
  sessionValues.set(key, value);
}

/**
 * Sanitize HTML string to prevent XSS attacks
 * Escapes: & < > " '
 * Use when rendering user input or untrusted data to the DOM
 * @param {string} str — string to escape
 * @returns {string} — HTML-escaped string
 */
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ════════════════════════════════════════
   THEME TOGGLE — Artisan Islamic Icon
   ════════════════════════════════════════ */
(function initTheme() {
  const saved = sessionGet('zakat_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isLight = saved ? saved === 'light' : !prefersDark;
  if (isLight) document.documentElement.classList.add('light-theme');
})();

function toggleTheme() {
  const btn = document.getElementById('themeToggleBtn');
  const isLight = document.documentElement.classList.toggle('light-theme');
  document.body.classList.toggle('light-theme', isLight); 

  btn.classList.remove('spinning', 'ripple');
  void btn.offsetWidth;
  btn.classList.add('spinning', 'ripple');
  setTimeout(() => btn.classList.remove('spinning', 'ripple'), 600);

  sessionSet('zakat_theme', isLight ? 'light' : 'dark');
  updateThemeTooltip(isLight);
}

function updateThemeTooltip(isLight) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.setAttribute('data-tooltip', isLight ? 'Switch to night' : 'Switch to day');
}

/* ════════════════════════════════════════
   LANGUAGE LOADER
   ════════════════════════════════════════ */
let currentLang = sessionGet('zakat_lang', 'en') || 'en';
let L = {};

function loadLang(lang, callback) {
  const old = document.getElementById('lang-script');
  if (old) old.remove();
  const s = document.createElement('script');
  s.id  = 'lang-script';
  s.src = `translations/${lang}.js`;
  s.onload = () => {
    L = window.LANG_DATA || {};
    if (callback) callback();
  };
  s.onerror = () => {
    console.warn(`[i18n] translations/${lang}.js not found, falling back to en`);
    if (lang !== 'en') loadLang('en', callback);
  };
  document.head.appendChild(s);
}

function applyLang(lang) {
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  document.body.classList.toggle('lang-bn', lang === 'bn');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (L[key] !== undefined) el.textContent = L[key];
  });
  document.querySelectorAll('[data-i18n-btn]').forEach(el => {
    const key = el.getAttribute('data-i18n-btn');
    if (L[key] !== undefined) el.textContent = L[key];
  });

  document.querySelectorAll('[data-tip-key]').forEach(el => {
    const key = el.getAttribute('data-tip-key');
    if (L[key] !== undefined) el.setAttribute('data-tip', L[key]);
  });

  const nwRaw    = parseFloat(document.getElementById('r_netWealth')?.textContent?.replace(/[^\d.]/g,'') || '0');
  const nisabRaw = parseFloat(document.getElementById('r_nisabVal')?.textContent?.replace(/[^\d.]/g,'')  || '9999999');
  const badge    = document.getElementById('eligibleBadge');
  if (badge) badge.textContent = nwRaw >= nisabRaw ? (L.eligible || 'Zakah Obligatory ✓') : (L.not_eligible || 'Not Eligible Yet');
}

function setLang(lang) {
  currentLang = lang;
  sessionSet('zakat_lang', lang);
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-bn').classList.toggle('active', lang === 'bn');
  loadLang(lang, () => { applyLang(lang); calc(); updateWizardLabel(); });
}

/* ════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════ */
const TROY_OZ_TO_GRAM = 31.1035;
const BHORI_TO_GRAM   = 11.6638;
const CACHE_TTL_MS    = 24 * 60 * 60 * 1000;
const CURRENCY_SYMBOLS = { BDT:'৳', USD:'$', SAR:'﷼', AED: 'د.إ', GBP:'£', AUD:'A$', INR:'₹', CAD: 'C$', MYR: 'RM', JPY: '¥', IDR: 'Rp' };
const METALS_URL = './data/metals.json';
const RATES_URL  = './data/rates.json';

/* ════════════════════════════════════════
   STATE
   ════════════════════════════════════════ */
let currentCurrency    = sessionGet('zakat_currency', 'BDT') || 'BDT';
let nisabType          = 'silver';
let calendarType       = 'lunar';
let stockMethod        = 'trade';
let liveGoldUsdPerOz   = 0;
let liveSilverUsdPerOz = 0;
let fxRates            = {};
let pricesLive         = false;
let ratesTimestampMs   = 0;
let trustedRatesSource = 'none';


const FIELD_IDS = [
  'f_cashOnHand','f_cashForeign','f_bankSavings','f_bankCurrent','f_bankFD',
  'f_bkash','f_nagad','f_upay','f_cellfin','f_rocket','f_paypal','f_othersWallet',
  'f_moneyLent','f_salaryDue',
  'f_gold24k','f_gold22k','f_gold18k','f_gold21k','f_goldCoins',
  'f_silverGrams','f_silverBullion',
  'f_dseStocks','f_intlStocks','f_mutualFunds','f_btc','f_eth','f_otherCrypto',
  'f_gpf','f_nsc','f_bonds','f_otherInvest',
  'f_bizCash','f_bizBank','f_pettyCash',
  'f_finishedGoods','f_rawMaterials','f_wip','f_tradeGoods',
  'f_tradeRec','f_advancePaid','f_secDeposit',
  'f_personalLoan','f_creditCard','f_mortgage12','f_rentBills','f_taxesDue',
  'f_bizLoan','f_tradePayables','f_salariesPayable','f_advanceReceived'
];
const STEPS = ['settings','cash','metals','investments','business','liabilities','results'];
let currentStep = 0;


/* ════════════════════════════════════════
   CACHE HELPERS
   ════════════════════════════════════════ */
function cacheWrite(key, data) {
  sessionSet(key, JSON.stringify({ ts: Date.now(), data }));
}
function cacheRead(key) {
  try {
    const raw = sessionGet(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
    return obj.data;
  } catch (_) { return null; }
}

/**
 * ════════════════════════════════════════
 * LIVE PRICE FETCHING & CACHE MANAGEMENT
 * ════════════════════════════════════════
 * 
 * Fetches current gold, silver, and FX rates from data files.
 * Implements multi-level fallback:
 *   1. Fresh fetch from data/*.json
 *   2. Cached prices (24-hour TTL)
 *   3. Stale cached prices (beyond TTL but still available)
 *   4. Manual price input fallback (if all else fails)
 */

/**
 * Fetch live metal and currency exchange rates with cache + fallback logic
 * Updates global state: liveGoldUsdPerOz, liveSilverUsdPerOz, fxRates, pricesLive
 * @async
 * @param {boolean} isManualRefresh — user manually triggered refresh (bypass cache)
 * @returns {Promise<void>}
 * @fires onPricesReady() when prices are loaded
 */
async function fetchPrices(isManualRefresh = false) {
  const dot = document.getElementById('liveDot');
  const ts  = document.getElementById('priceTimestamp');
  const btn = document.getElementById('refreshBtn');

  dot.className = 'live-dot loading';
  ts.textContent = L.fetching || 'Fetching…';
  btn.disabled = true;
  btn.classList.add('spinning');
  setShimmer(true);

  if (!isManualRefresh) {
    const cached = cacheRead('zakat_metals');
    if (cached) {
      liveGoldUsdPerOz   = cached.gold;
      liveSilverUsdPerOz = cached.silver;
      const fxCached = cacheRead('zakat_fx');
      if (fxCached) {
        fxRates    = fxCached;
        pricesLive = true;
        onPricesReady('cache');
        return;
      }
    }
  }

  try {
    const [ratesRes, metalsRes] = await Promise.allSettled([
      fetch(RATES_URL,  { cache: 'no-cache' }),
      fetch(METALS_URL, { cache: 'no-cache' })
    ]);

    if (ratesRes.status === 'fulfilled' && ratesRes.value.ok) {
      const ratesData = await ratesRes.value.json();
      fxRates = ratesData.rates || ratesData;
    } else {
      throw new Error('rates.json unavailable');
    }

    let metalsOk = false;
    if (metalsRes.status === 'fulfilled' && metalsRes.value.ok) {
      const metalsData = await metalsRes.value.json();
      if (metalsData.gold_usd_per_oz && metalsData.silver_usd_per_oz) {
        liveGoldUsdPerOz   = metalsData.gold_usd_per_oz;
        liveSilverUsdPerOz = metalsData.silver_usd_per_oz;
        metalsOk = true;
      }
    }
    if (!metalsOk) throw new Error('Metal prices unavailable');

    cacheWrite('zakat_fx', fxRates);
    cacheWrite('zakat_metals', { gold: liveGoldUsdPerOz, silver: liveSilverUsdPerOz });
    ratesTimestampMs = Date.now();
    trustedRatesSource = 'live';
    pricesLive = true;
    onPricesReady('live');

  } catch (err) {
    console.warn('Price fetch failed:', err.message);
    const staleMetal = (() => { try { const r = sessionGet('zakat_metals'); return r ? JSON.parse(r).data : null; } catch(_) { return null; } })();
    const staleFx    = (() => { try { const r = sessionGet('zakat_fx');     return r ? JSON.parse(r).data : null; } catch(_) { return null; } })();
    if (staleMetal && staleFx) {
      liveGoldUsdPerOz   = staleMetal.gold;
      liveSilverUsdPerOz = staleMetal.silver;
      fxRates            = staleFx;
      pricesLive         = true;
      trustedRatesSource = 'stale';
      onPricesReady('stale');
    } else {
      dot.className  = 'live-dot error';
      ts.textContent = L.price_error || 'Fetch failed — using manual input';
      btn.disabled   = false;
      btn.classList.remove('spinning');
      setShimmer(false);
      showFallback();
      calc();
    }
  }
}

function onPricesReady(source) {
  const dot = document.getElementById('liveDot');
  const ts  = document.getElementById('priceTimestamp');
  const btn = document.getElementById('refreshBtn');
  dot.className  = 'live-dot';
  const now = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const srcLabel = source === 'cache' ? ' (cached)' : source === 'stale' ? ' (stale cache)' : '';
  ts.textContent = `${L.price_updated || 'Updated'}: ${now}${srcLabel}`;
  ratesTimestampMs = Date.now();
  trustedRatesSource = source;
  btn.disabled   = false;
  btn.classList.remove('spinning');
  setShimmer(false);
  hideFallback();
  updatePriceDisplay();
  updateFxBanner();
  calc();
}

function setShimmer(on) {
  ['goldPriceDisplay','silverPriceDisplay','fxRateDisplay'].forEach(id => {
    document.getElementById(id)?.classList.toggle('loading-shimmer', on);
  });
}

function showFallback() {
  document.getElementById('manualFallback').classList.add('visible');
  document.getElementById('fxBanner').style.display = 'none';
  document.getElementById('metalSourceBadge').className = 'source-badge error';
  document.getElementById('fxSourceBadge').className    = 'source-badge error';
}
function hideFallback() {
  document.getElementById('manualFallback').classList.remove('visible');
  document.getElementById('metalSourceBadge').className = 'source-badge active';
  document.getElementById('fxSourceBadge').className    = 'source-badge active';
}

/* ════════════════════════════════════════
   PRICE HELPERS
   ════════════════════════════════════════ */
function getConvertedPrices() {
  if (!pricesLive) {
    return {
      goldPerGram:   parseFloat(document.getElementById('goldPriceManual')?.value   || 0) || 0,
      silverPerGram: parseFloat(document.getElementById('silverPriceManual')?.value || 0) || 0,
    };
  }
  const rate = fxRates[currentCurrency] || 1;
  return {
    goldPerGram:   (liveGoldUsdPerOz   / TROY_OZ_TO_GRAM) * rate,
    silverPerGram: (liveSilverUsdPerOz / TROY_OZ_TO_GRAM) * rate,
  };
}

function updatePriceDisplay() {
  if (!pricesLive) return;
  const { goldPerGram, silverPerGram } = getConvertedPrices();
  const sym  = CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
  const rate = fxRates[currentCurrency] || 1;

  document.getElementById('goldUsdLabel').textContent   = `$${liveGoldUsdPerOz.toFixed(2)} USD/oz`;
  document.getElementById('silverUsdLabel').textContent = `$${liveSilverUsdPerOz.toFixed(2)} USD/oz`;
  document.getElementById('fxBaseLabel').textContent    = `USD → ${currentCurrency}`;
  document.getElementById('fxRateSub').textContent      = `1 USD = ${sym}${rate.toFixed(4)}`;
  document.getElementById('goldPriceDisplay').textContent   = `${sym} ${goldPerGram.toFixed(2)}`;
  document.getElementById('silverPriceDisplay').textContent = `${sym} ${silverPerGram.toFixed(2)}`;
  document.getElementById('fxRateDisplay').textContent      = `${rate.toFixed(4)}`;

  const isBDT = currentCurrency === 'BDT';
  const goldBhoriPrice   = goldPerGram   * BHORI_TO_GRAM;
  const silverBhoriPrice = silverPerGram * BHORI_TO_GRAM;
  document.getElementById('goldPerGramSub').textContent =
    isBDT ? `per gram · ${sym}${goldBhoriPrice.toLocaleString('en-US', {maximumFractionDigits:0})} / ভরি`
           : `per gram (${currentCurrency})`;
  document.getElementById('silverPerGramSub').textContent =
    isBDT ? `per gram · ${sym}${silverBhoriPrice.toLocaleString('en-US', {maximumFractionDigits:0})} / ভরি`
           : `per gram (${currentCurrency})`;
}

function updateFxBanner() {
  if (!pricesLive || !Object.keys(fxRates).length) return;
  const strip  = document.getElementById('fxRatesStrip');
  const banner = document.getElementById('fxBanner');
  const supported = ['BDT','USD','SAR','AED','GBP','AUD','INR','CAD','MYR','JPY','IDR'];
  strip.innerHTML = supported.map(cur => {
    const r = fxRates[cur];
    if (!r) return '';
    const sym = CURRENCY_SYMBOLS[cur] || cur;
    return `<div class="fx-rate-item">${cur} <span>${sym}${r.toFixed(2)}</span></div>`;
  }).join('');
  banner.style.display = 'flex';
}

/* ════════════════════════════════════════
   CURRENCY
   ════════════════════════════════════════ */
function setCurrency(cur) {
  currentCurrency = cur;
  sessionSet('zakat_currency', cur);
  updateCurrencySymbols();
  updatePriceDisplay();
  updateFxBanner();
  calc();
}

function updateCurrencySymbols() {
  const sym = CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
  document.querySelectorAll('.curr-pfx').forEach(el => el.textContent = sym);
  const pg = document.getElementById('pfxGold');
  const ps = document.getElementById('pfxSilver');
  if (pg) pg.textContent = sym;
  if (ps) ps.textContent = sym;
}

function fmt(n) {
  const sym = CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
  if (n === 0) return sym + ' 0';
  return sym + ' ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * ════════════════════════════════════════
 * SETTINGS & TOGGLES
 * ════════════════════════════════════════
 */

/**
 * Set Nisab threshold basis (silver or gold)
 * Updates UI buttons and triggers recalculation
 * @param {string} type — 'silver' or 'gold'
 * @returns {void}
 */
function setNisabType(type) {
  nisabType = type;
  document.getElementById('btn-silver').classList.toggle('active', type === 'silver');
  document.getElementById('btn-gold').classList.toggle('active',   type === 'gold');
  calc();
}
function setCalendar(type) {
  calendarType = type;
  document.getElementById('btn-lunar').classList.toggle('active', type === 'lunar');
  document.getElementById('btn-solar').classList.toggle('active', type === 'solar');
  calc();
}
function selectRadio(group, val, labelEl) {
  stockMethod = val;
  document.querySelectorAll('#stockMethodGroup .radio-btn').forEach(b => b.classList.remove('selected'));
  labelEl.classList.add('selected');
  calc();
}
function toggleSection(id) {
  document.getElementById(id).classList.toggle('open');
}

function toggleHighContrast() {
  const on = document.documentElement.classList.toggle('high-contrast');
  sessionSet('zakat_contrast', on ? 'on' : 'off');
}

function removeLegacySavedData() {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('zakat_') || key === 'pwa_dismissed');
    keys.forEach(key => localStorage.removeItem(key));
  } catch (_) {
    // Storage can be unavailable in private browsing; nothing is read or restored.
  }
}

const completedSteps = new Set();
let sectionPanels = [];

function sectionNames() {
  return [L.flow_setup || 'Setup', L.flow_cash || 'Cash', L.flow_metals || 'Metals',
    L.flow_investments || 'Investments', L.flow_business || 'Business',
    L.flow_liabilities || 'Deductions', L.flow_results || 'Results'];
}

function initSectionFlow() {
  sectionPanels = [document.querySelector('#settings + .settings-card'),
    ...['sec-cash', 'sec-metals', 'sec-invest', 'sec-biz', 'sec-liab', 'resultsPanel'].map(id => document.getElementById(id))];
  sectionPanels.forEach((panel, index) => {
    const heading = panel?.querySelector('.section-title, .settings-card-title, .results-title');
    if (heading) {
      heading.id = `flowHeading${index}`;
      panel.setAttribute('aria-labelledby', heading.id);
    }
  });
  const currencySlot = document.getElementById('setupCurrency');
  if (currencySlot) currencySlot.appendChild(document.getElementById('currencySelect'));
  document.querySelectorAll('.section-card .section-header').forEach(header => {
    header.removeAttribute('onclick');
    header.querySelector('.chevron')?.remove();
  });
  document.querySelectorAll('.field input').forEach(input => {
    const label = input.closest('.field')?.querySelector('label');
    if (label) label.htmlFor = input.id;
    input.autocomplete = 'off';
    if (input.type === 'number') input.step = 'any';
  });
  document.querySelectorAll('input[type="number"]').forEach(input => { input.value = 0; });
  sectionPanels[0]?.querySelectorAll('button, select').forEach(control => {
    control.addEventListener(control.tagName === 'SELECT' ? 'change' : 'click', () => {
      completedSteps.delete(0);
      updateWizardLabel();
    });
  });
  document.querySelectorAll('.section-card input').forEach(input => {
    input.addEventListener('input', () => {
      const index = sectionPanels.indexOf(input.closest('.section-card'));
      completedSteps.delete(index);
      updateWizardLabel();
    });
  });
  sectionPanels[6]?.after(document.getElementById('privacyDetailsCard'));
  goStep(0, false);
}

function updateWizardLabel() {
  const names = sectionNames();
  const completeCount = completedSteps.size;
  const label = document.getElementById('wizardStepLabel');
  if (label) label.textContent = `${L.flow_section || 'Section'} ${currentStep + 1} / ${STEPS.length} · ${names[currentStep]}`;
  const status = document.getElementById('sectionProgressLabel');
  if (status) status.textContent = `${completeCount} / 6 ${L.flow_reviewed || 'sections reviewed'}`;
  const bar = document.getElementById('sectionProgress');
  bar?.setAttribute('aria-valuenow', completeCount);
  bar?.setAttribute('aria-valuetext', status?.textContent || '');
  document.getElementById('progressFill').style.width = `${completeCount / 6 * 100}%`;
  const nav = document.getElementById('wizardDots');
  if (nav) {
    nav.replaceChildren();
    names.forEach((name, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'section-tab' + (index === currentStep ? ' active' : '') + (completedSteps.has(index) ? ' complete' : '');
      button.textContent = name;
      if (index === currentStep) button.setAttribute('aria-current', 'step');
      button.setAttribute('aria-label', `${name}${completedSteps.has(index) ? ` — ${L.flow_reviewed || 'reviewed'}` : ''}`);
      button.onclick = () => goStep(index);
      nav.appendChild(button);
    });
  }
  const previous = document.getElementById('sectionPrevious');
  const next = document.getElementById('sectionContinue');
  const skip = document.getElementById('sectionSkip');
  if (previous) previous.disabled = currentStep === 0;
  if (next) {
    next.hidden = currentStep === 6;
    next.textContent = currentStep === 5 ? (L.flow_view_results || 'Review results') : (L.flow_continue || 'Continue');
  }
  if (skip) skip.hidden = currentStep === 0 || currentStep === 6;
  const resultNotice = document.getElementById('resultReviewNotice');
  if (resultNotice) {
    resultNotice.hidden = completeCount === 6;
    resultNotice.textContent = L.flow_draft || 'Draft estimate: some sections have not been reviewed. Unfilled amounts count as zero.';
  }
}

function goStep(index, focus = true) {
  currentStep = Math.max(0, Math.min(STEPS.length - 1, index));
  sectionPanels.forEach((panel, panelIndex) => {
    if (!panel) return;
    panel.hidden = panelIndex !== currentStep;
    if (panelIndex === currentStep) panel.classList.add('open');
  });
  const details = document.getElementById('privacyDetailsCard');
  if (details) details.hidden = currentStep !== 6;
  document.querySelector('.quran-banner').hidden = currentStep !== 0;
  document.querySelector('.price-panel').hidden = currentStep !== 0 && currentStep !== 2;
  document.getElementById('fxBanner').hidden = currentStep !== 0 && currentStep !== 2;
  updateWizardLabel();
  if (focus) {
    const panel = sectionPanels[currentStep];
    panel?.setAttribute('tabindex', '-1');
    panel?.focus({ preventScroll: true });
    document.getElementById('sectionFlow')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
}

function nextStep() {
  if (currentStep >= 6) return;
  const invalid = [...sectionPanels[currentStep].querySelectorAll('input[type="number"]')].find(input => !input.checkValidity());
  if (invalid) { invalid.reportValidity(); return; }
  completedSteps.add(currentStep);
  goStep(currentStep + 1);
}

function prevStep() { goStep(currentStep - 1); }

function skipSection() {
  if (currentStep === 0 || currentStep === 6) return;
  const inputs = sectionPanels[currentStep].querySelectorAll('input[type="number"]');
  if ([...inputs].some(input => Number(input.value) > 0) && !confirm(L.flow_skip_confirm || 'Mark this section as not applicable and clear its amounts?')) return;
  inputs.forEach(input => { input.value = 0; });
  completedSteps.add(currentStep);
  calc();
  goStep(currentStep + 1);
}

function updateSmartHints({ totalAssets, liabTotal, cashTotal, metalTotal, investTotal, bizTotal }) {
  const hints = [];
  if (totalAssets > 0 && liabTotal === 0) hints.push('You entered assets but no liabilities due within 12 months. Confirm deductions.');
  if (cashTotal > 0 && v('f_bankFD') > 0) hints.push('Ensure accrued bank interest (Riba) is excluded.');
  if (investTotal > 0 && stockMethod === 'trade' && (v('f_dseStocks') + v('f_intlStocks')) > 0) hints.push('If stocks are long-term holdings, consider the 25% proxy method.');
  if (metalTotal === 0 && (v('f_gold24k') + v('f_silverGrams')) === 0) hints.push('If you own gold/silver, include only zakatable holdings.');
  if (bizTotal > 0 && v('f_tradePayables') === 0) hints.push('Business assets entered with zero trade payables — verify short-term liabilities.');
  document.getElementById('smartHints').innerHTML = hints.length ? `<ul>${hints.map(h => `<li>${h}</li>`).join('')}</ul>` : 'No critical omissions detected.';
}

function updateExplainability({ totalAssets, liabTotal, netWealth, nisabValue, zakahRate, zakahDue }) {
  document.getElementById('explainContent').textContent =
`Formula: Net Zakatable Wealth = Total Assets − Eligible Liabilities
Values: ${fmt(totalAssets)} − ${fmt(liabTotal)} = ${fmt(netWealth)}
Nisab Check: ${fmt(netWealth)} ${netWealth >= nisabValue ? '≥' : '<'} ${fmt(nisabValue)}
Zakah: ${fmt(netWealth)} × ${(zakahRate * 100).toFixed(3)}% = ${fmt(zakahDue)}
Assumptions: Only liabilities due within 12 months are deducted, and all calculations stay on-device.`;
}

function updateScenarioComparison(netWealth, silverPerGram, goldPerGram) {
  const silverN = 612.36 * silverPerGram;
  const goldN = 87.48 * goldPerGram;
  const sLunar = netWealth >= silverN ? netWealth * 0.025 : 0;
  const sSolar = netWealth >= silverN ? netWealth * 0.02577 : 0;
  const gLunar = netWealth >= goldN ? netWealth * 0.025 : 0;
  const gSolar = netWealth >= goldN ? netWealth * 0.02577 : 0;
  document.getElementById('scenarioCompare').textContent =
`Silver + Lunar: ${fmt(sLunar)}
Silver + Solar: ${fmt(sSolar)}
Gold + Lunar: ${fmt(gLunar)}
Gold + Solar: ${fmt(gSolar)}`;
}

function updateStaleStatus() {
  const el = document.getElementById('staleStatus');
  if (!el) return;
  const ageH = ratesTimestampMs ? ((Date.now() - ratesTimestampMs) / 3600000) : null;
  const stale = ageH !== null && ageH > 24;
  const src = trustedRatesSource === 'stale' ? 'stale cache' : trustedRatesSource;
  el.textContent = !ratesTimestampMs
    ? 'Rates status: waiting for first successful fetch.'
    : `Rates status: ${stale ? 'STALE' : 'fresh'} · source: ${src} · age: ${ageH.toFixed(1)}h`;
}

function updateNetworkBadge() {
  const online = navigator.onLine;
  const badge = document.getElementById('networkBadge');
  const count = document.getElementById('networkCountBadge');
  if (badge) badge.textContent = `🌐 Network: ${online ? 'online' : 'offline'}`;
  if (count) count.textContent = `📡 Fetch calls: ${networkRequestCount}`;
}

function buildSupportTemplate() {
  const text = [
    'Issue report (privacy-preserving)',
    `App version: ${APP_VERSION}`,
    `Browser: ${navigator.userAgent}`,
    `Language: ${currentLang}`,
    `Currency: ${currentCurrency}`,
    `Nisab: ${nisabType}, Calendar: ${calendarType}, Stock method: ${stockMethod}`,
    'Financial input values: [REDACTED]',
    'Issue details:',
    '- What happened?',
    '- Expected behavior?',
    '- Steps to reproduce?'
  ].join('\n');
  const el = document.getElementById('supportTemplate');
  if (el) el.value = text;
}

function copySupportTemplate() {
  const text = document.getElementById('supportTemplate')?.value || '';
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {
    alert('Copy failed. Please copy the template manually.');
  });
}

async function updateIntegrityPanel() {
  const out = document.getElementById('integrityPanel');
  if (!out || !window.crypto?.subtle) return;
  try {
    const [a, b, c, d] = await Promise.all([
      fetch('./index.html').then(r => r.text()),
      fetch('./styles.css').then(r => r.text()),
      fetch('./sw.js').then(r => r.text()),
      fetch('./pdf-export.js').then(r => r.text())
    ]);
    const bytes = new TextEncoder().encode(`${a}\n${b}\n${c}\n${d}\n${APP_VERSION}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
    out.textContent = `Version: ${APP_VERSION} · SHA-256: ${hex.slice(0, 24)}…`;
  } catch (_) {
    out.textContent = `Version: ${APP_VERSION} · Hash unavailable`;
  }
}

/* intercept network requests for trust-by-design indicator */
const _nativeFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  networkRequestCount += 1;
  updateNetworkBadge();
  return _nativeFetch(...args);
};

/* ════════════════════════════════════════
   MAIN CALCULATION
   ════════════════════════════════════════ */
function v(id) {
  return parseFloat(document.getElementById(id)?.value || 0) || 0;
}

function calc() {
  const { goldPerGram, silverPerGram } = getConvertedPrices();

  const cashTotal =
    v('f_cashOnHand') + v('f_cashForeign') +
    v('f_bankSavings') + v('f_bankCurrent') + v('f_bankFD') +
    v('f_bkash')  + v('f_nagad') +
    v('f_upay')   + v('f_cellfin') +
    v('f_rocket') + v('f_paypal') + v('f_othersWallet') +
    v('f_moneyLent') + v('f_salaryDue');

  const gold24kEquiv =
    v('f_gold24k')   * (24/24) +
    v('f_gold22k')   * (22/24) +
    v('f_gold18k')   * (18/24) +
    v('f_gold21k')   * (21/24) +
    v('f_goldCoins') * 1;

  const goldValue   = gold24kEquiv * goldPerGram;
  const silverGrams = v('f_silverGrams') + v('f_silverBullion');
  const silverValue = silverGrams * silverPerGram;
  const metalTotal  = goldValue + silverValue;

  document.getElementById('goldValTotal').textContent      = fmt(goldValue);
  document.getElementById('silverValTotal').textContent    = fmt(silverValue);
  document.getElementById('metalValTotalDisp').textContent = fmt(metalTotal);

  const rawStocks = v('f_dseStocks') + v('f_intlStocks');
  const rawMutual = v('f_mutualFunds');
  const stocksVal = stockMethod === 'trade' ? rawStocks : rawStocks * 0.25;
  const mutualVal = stockMethod === 'trade' ? rawMutual : rawMutual * 0.25;
  const cryptoTotal  = v('f_btc') + v('f_eth') + v('f_otherCrypto');
  const pensionTotal = v('f_gpf') + v('f_nsc') + v('f_bonds') + v('f_otherInvest');
  const investTotal  = stocksVal + mutualVal + cryptoTotal + pensionTotal;

  const bizLiquid      = v('f_bizCash') + v('f_bizBank') + v('f_pettyCash');
  const bizInventory   = v('f_finishedGoods') + v('f_rawMaterials') + v('f_wip') + v('f_tradeGoods');
  const bizReceivables = v('f_tradeRec') + v('f_advancePaid') + v('f_secDeposit');
  const bizTotal       = bizLiquid + bizInventory + bizReceivables;

  const personalLiab =
    v('f_personalLoan') + v('f_creditCard') + v('f_mortgage12') +
    v('f_rentBills')    + v('f_taxesDue');
  const bizLiab =
    v('f_bizLoan') + v('f_tradePayables') + v('f_salariesPayable') + v('f_advanceReceived');
  const liabTotal = personalLiab + bizLiab;

  const totalAssets = cashTotal + metalTotal + investTotal + bizTotal;
  const netWealth   = Math.max(0, totalAssets - liabTotal);

  const SILVER_NISAB_G = 612.36;
  const GOLD_NISAB_G   = 87.48;
  const nisabValue = nisabType === 'silver'
    ? SILVER_NISAB_G * silverPerGram
    : GOLD_NISAB_G   * goldPerGram;

  const metalLabel = nisabType === 'silver' ? '612.36g Silver' : '87.48g Gold';
  document.getElementById('nisabMetalDisp').textContent = metalLabel;
  document.getElementById('nisabValueDisp').textContent = fmt(nisabValue);

  const zakahRate     = calendarType === 'lunar' ? 0.025 : 0.02577;
  const rateLabel     = calendarType === 'lunar' ? '2.5%' : '2.577%';
  const calendarLabel = calendarType === 'lunar' ? 'Lunar (Hijri)' : 'Solar (Gregorian)';
  document.getElementById('zakahRateDisp').textContent = rateLabel;

  const isEligible = nisabValue > 0 && netWealth >= nisabValue;
  const zakahDue   = isEligible ? netWealth * zakahRate : 0;

  updateWizardLabel();

  document.getElementById('tot-cash').textContent   = fmt(cashTotal);
  document.getElementById('tot-metals').textContent = fmt(metalTotal);
  document.getElementById('tot-invest').textContent = fmt(investTotal);
  document.getElementById('tot-biz').textContent    = fmt(bizTotal);
  document.getElementById('tot-liab').textContent   = fmt(liabTotal);

  document.getElementById('r_totalAssets').textContent = fmt(totalAssets);
  document.getElementById('r_totalLiab').textContent   = fmt(liabTotal);
  document.getElementById('r_netWealth').textContent   = fmt(netWealth);
  document.getElementById('r_nisabVal').textContent    = fmt(nisabValue);
  document.getElementById('r_nisabSub').textContent    = metalLabel;
  document.getElementById('r_rateApplied').textContent = rateLabel;
  document.getElementById('r_rateSub').textContent     = calendarLabel;
  document.getElementById('r_zakahDue').textContent    = fmt(zakahDue);

  const pct = nisabValue > 0 ? Math.min(100, (netWealth / nisabValue) * 100) : 0;
  document.getElementById('nisabBarFill').style.width = pct + '%';
  document.getElementById('nisabPct').textContent     = pct.toFixed(1) + '%';

  const badge = document.getElementById('eligibleBadge');
  badge.textContent = isEligible ? (L.eligible || 'Zakah Obligatory ✓') : (L.not_eligible || 'Not Eligible Yet');
  badge.className   = 'results-eligible ' + (isEligible ? 'yes' : 'no');
  document.getElementById('r_netWealth').className = 'result-stat-value ' + (isEligible ? 'green' : '');

  document.getElementById('bd_cash').textContent   = fmt(cashTotal);
  document.getElementById('bd_metals').textContent = fmt(metalTotal);
  document.getElementById('bd_invest').textContent = fmt(investTotal);
  document.getElementById('bd_biz').textContent    = fmt(bizTotal);
  document.getElementById('bd_liab').textContent   = fmt(liabTotal);
  document.getElementById('bd_net').textContent    = fmt(netWealth);
  document.getElementById('bd_zakah').textContent  = fmt(zakahDue);

  updateSmartHints({ totalAssets, liabTotal, cashTotal, metalTotal, investTotal, bizTotal });
  updateExplainability({ totalAssets, liabTotal, netWealth, nisabValue, zakahRate, zakahDue });
  updateScenarioComparison(netWealth, silverPerGram, goldPerGram);
  updateStaleStatus();
  buildSupportTemplate();

}

/* ════════════════════════════════════════
   RESET
   ════════════════════════════════════════ */
function resetAll() {
  document.querySelectorAll('input[type="number"]').forEach(inp => inp.value = 0);
  completedSteps.clear();
  goStep(0, false);
  calc();
}

/* ════════════════════════════════════════
   SHARE MODAL
   ════════════════════════════════════════ */
function openShareModal() {
  const overlay = document.getElementById('shareOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => overlay.querySelector('.share-modal-close')?.focus(), 50);
}

function closeShareModal() {
  document.getElementById('shareOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('shareOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeShareModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeShareModal();
  });
});

function shareCopyLink() {
  const url = window.location.href;
  const btn = document.getElementById('copyLinkBtn');
  const label = btn.querySelector('[data-i18n]');
  navigator.clipboard.writeText(url).then(() => {
    btn.classList.add('copied');
    if (label) label.textContent = L.share_copied || 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      if (label) label.textContent = L.share_copy_link || 'Copy Link';
    }, 2500);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.classList.add('copied');
    if (label) label.textContent = L.share_copied || 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      if (label) label.textContent = L.share_copy_link || 'Copy Link';
    }, 2500);
  });
}

function shareFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

function shareWhatsApp() {
  const url  = window.location.href;
  const msg  = encodeURIComponent(`${L.share_whatsapp_msg || 'Calculate your Zakah accurately with this free, scholarly-precise calculator:'} ${url}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

function shareMore() {
  const shareData = {
    title: L.title || 'Zakah Calculator',
    text:  L.share_whatsapp_msg || 'Calculate your Zakah accurately with this free, scholarly-precise calculator:',
    url:   window.location.href,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(err => {
      if (err?.name !== 'AbortError') shareCopyLink();
    });
  } else {
    shareCopyLink();
  }
}

/* ════════════════════════════════════════
   SETTINGS DRAWER
   ════════════════════════════════════════ */
function openSettingsDrawer() {
  const drawer = document.getElementById('settingsDrawer');
  const overlay = document.getElementById('settingsDrawerOverlay');
  if (drawer && overlay) {
  drawer.inert = false;
  drawer.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  drawer.querySelector('button')?.focus();
  }
}

function closeSettingsDrawer() {
  const drawer = document.getElementById('settingsDrawer');
  const overlay = document.getElementById('settingsDrawerOverlay');
  if (drawer && overlay) {
  if (!drawer.classList.contains('open')) return;
  drawer.classList.remove('open');
  drawer.inert = true;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('settingsDrawerBtn')?.focus();
  }
}

/* ════════════════════════════════════════
   HASH / DEEP-LINK NAVIGATION
   ════════════════════════════════════════ */
const HASH_SECTION_MAP = {
  'section-a':   'sec-cash',
  'cash':        'sec-cash',
  'section-b':   'sec-metals',
  'metals':      'sec-metals',
  'gold':        'sec-metals',
  'section-c':   'sec-invest',
  'investments': 'sec-invest',
  'stocks':      'sec-invest',
  'crypto':      'sec-invest',
  'section-d':   'sec-biz',
  'business':    'sec-biz',
  'section-e':   'sec-liab',
  'liabilities': 'sec-liab',
  'results':     null,
  'summary':     null,
  'settings':    null,
  'prices':      null,
  'hero':        null,
  'quran':       null,
};

function navigateToHash(hash) {
  if (!hash || hash === '#') return;
  const key = hash.replace('#', '').toLowerCase();
  
  // Auto-expand privacy card if specifically targeted
  if (key === 'privacy-tools') {
    goStep(6, false);
    const privacyCard = document.getElementById('privacyDetailsCard');
    if (privacyCard) privacyCard.open = true;
  } else if (!(key in HASH_SECTION_MAP)) return;
  const sectionCardId = HASH_SECTION_MAP[key];
  const stepIndex = sectionCardId ? sectionPanels.findIndex(panel => panel?.id === sectionCardId)
    : ['results', 'summary'].includes(key) ? 6 : ['settings', 'prices', 'quran'].includes(key) ? 0 : -1;
  if (stepIndex >= 0) goStep(stepIndex, false);
  setTimeout(() => {
    const anchor = document.getElementById(key);
    if (anchor) {
      const headerOffset = 80;
      const elementPosition = anchor.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, 80);
}

window.addEventListener('hashchange', () => navigateToHash(window.location.hash));

/* ════════════════════════════════════════
   PWA — Service Worker & Install Prompt
   ════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      console.info('[SW] Registered, scope:', reg.scope);

      // ── Periodic Background Sync ──────────────────
      // Refreshes rates.json / metals.json once a day in the background.
      // Requires the site to be installed as a PWA and user engagement.
      if ('periodicSync' in reg) {
        try {
          const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
          if (status.state === 'granted') {
            await reg.periodicSync.register('zakah-rates-refresh', {
              minInterval: 24 * 60 * 60 * 1000   // at most once per day
            });
            console.info('[SW] Periodic sync registered.');
          }
        } catch (err) {
          console.warn('[SW] Periodic sync registration failed:', err);
        }
      }

      // ── Background Sync ───────────────────────────
      // The SW registers the sync tag itself when a fetch fails offline,
      // so nothing extra is needed here — the API just needs to be available.
      if (!('sync' in reg)) {
        console.info('[SW] Background Sync not supported in this browser.');
      }

    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  });

  // ── SW message listener ───────────────────────────
  // Handles messages posted by the service worker to all open windows.
  navigator.serviceWorker.addEventListener('message', event => {
    // A new SW version activated — offer a page refresh
    if (event.data?.type === 'SW_UPDATED') {
      console.info('[SW] App updated to', event.data.version);
      // Optional: show an "App updated — refresh?" toast here
    }

    // Periodic sync refreshed the rate data — re-render with fresh prices
    if (event.data?.type === 'RATES_UPDATED') {
      console.info('[SW] Rates updated in cache, reloading prices…');
      if (typeof fetchPrices === 'function') fetchPrices();
    }
  });
}

let deferredPrompt = null;
const banner     = document.getElementById('pwaBanner');
const btnInstall = document.getElementById('pwaBtnInstall');
const btnDismiss = document.getElementById('pwaBtnDismiss');
const iosHint    = document.getElementById('pwaIosHint');

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
              /safari/i.test(navigator.userAgent) &&
              !('standalone' in navigator && navigator.standalone);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     navigator.standalone === true;

function wasDismissed() {
  const ts = parseInt(sessionGet('pwa_dismissed', '0') || '0', 10);
  return ts && (Date.now() - ts) < 30 * 24 * 60 * 60 * 1000;
}
function showBanner() { if (isStandalone || wasDismissed()) return; banner.hidden = false; if (isIos) iosHint.hidden = false; }
function hideBanner()  { banner.hidden = true; }

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; setTimeout(showBanner, 3000); });
btnInstall?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') hideBanner();
    deferredPrompt = null;
  }
});
btnDismiss?.addEventListener('click', () => { sessionSet('pwa_dismissed', String(Date.now())); hideBanner(); });
if (isIos && !isStandalone) { setTimeout(showBanner, 3500); if (btnInstall) btnInstall.hidden = true; }
window.addEventListener('appinstalled', () => { hideBanner(); deferredPrompt = null; });

/* ════════════════════════════════════════
   INIT
   ════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const savedCur = sessionGet('zakat_currency', 'BDT') || 'BDT';
  document.getElementById('currencySelect').value = savedCur;
  currentCurrency = savedCur;
  updateCurrencySymbols();
  updateNetworkBadge();
  removeLegacySavedData();
  initSectionFlow();

  document.getElementById('footerYear').textContent = new Date().getFullYear();

  document.getElementById('btn-en').classList.toggle('active', currentLang === 'en');
  document.getElementById('btn-bn').classList.toggle('active', currentLang === 'bn');
  document.querySelectorAll('.result-stat-value').forEach(el => {
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
  });

  window.addEventListener('online', updateNetworkBadge);
  window.addEventListener('offline', updateNetworkBadge);
  setInterval(updateStaleStatus, 60000);
  updateIntegrityPanel();
  updateWizardLabel(); // This now also updates dots

  // Settings drawer accessibility
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSettingsDrawer();
  });

  loadLang(currentLang, () => {
    applyLang(currentLang);
    calc();
    fetchPrices();
    if (window.location.hash) navigateToHash(window.location.hash);
  });
});
