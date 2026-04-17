const APP_VERSION = '2026.04.17-zk1';
const PRIVACY_MODE_DEFAULT = true;
let privacyMode = PRIVACY_MODE_DEFAULT;
let networkRequestCount = 0;

function lsGet(key, fallback = null) {
  if (privacyMode) return fallback;
  try {
    const val = localStorage.getItem(key);
    return val === null ? fallback : val;
  } catch (_) {
    return fallback;
  }
}
function lsSet(key, value) {
  if (privacyMode) return false;
  try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
}
function lsRemove(key) {
  if (privacyMode) return false;
  try { localStorage.removeItem(key); return true; } catch (_) { return false; }
}
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
  const saved = lsGet('zakat_theme');
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

  lsSet('zakat_theme', isLight ? 'light' : 'dark');
  updateThemeTooltip(isLight);
}

function updateThemeTooltip(isLight) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.setAttribute('data-tooltip', isLight ? 'Switch to night' : 'Switch to day');
}

/* ════════════════════════════════════════
   LANGUAGE LOADER
   ════════════════════════════════════════ */
let currentLang = lsGet('zakat_lang', 'en') || 'en';
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
  lsSet('zakat_lang', lang);
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-bn').classList.toggle('active', lang === 'bn');
  loadLang(lang, () => { applyLang(lang); calc(); });
}

/* ════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════ */
const TROY_OZ_TO_GRAM = 31.1035;
const BHORI_TO_GRAM   = 11.6638;
const CACHE_TTL_MS    = 24 * 60 * 60 * 1000;
const CURRENCY_SYMBOLS = { BDT:'৳', USD:'$', SAR:'﷼', AED: 'د.إ', GBP:'£', AUD:'A$', INR:'₹', CAD: 'C$', MYR: 'MR', JPY: '¥', IDR: 'RP' };
const METALS_URL = './data/metals.json';
const RATES_URL  = './data/rates.json';

/* ════════════════════════════════════════
   STATE
   ════════════════════════════════════════ */
let currentCurrency    = lsGet('zakat_currency', 'BDT') || 'BDT';
let nisabType          = 'silver';
let calendarType       = 'lunar';
let stockMethod        = 'trade';
let liveGoldUsdPerOz   = 0;
let liveSilverUsdPerOz = 0;
let fxRates            = {};
let pricesLive         = false;
let ratesTimestampMs   = 0;
let trustedRatesSource = 'none';
let profiles = {};
let activeProfile = 'default';
let reminderConfig = null;

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
  lsSet(key, JSON.stringify({ ts: Date.now(), data }));
}
function cacheRead(key) {
  try {
    const raw = lsGet(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
    return obj.data;
  } catch (_) { return null; }
}

/* ════════════════════════════════════════
   LIVE PRICE FETCHING
   ════════════════════════════════════════ */
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
    const staleMetal = (() => { try { const r = lsGet('zakat_metals'); return r ? JSON.parse(r).data : null; } catch(_) { return null; } })();
    const staleFx    = (() => { try { const r = lsGet('zakat_fx');     return r ? JSON.parse(r).data : null; } catch(_) { return null; } })();
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
  lsSet('zakat_currency', cur);
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

/* ════════════════════════════════════════
   SETTINGS TOGGLES
   ════════════════════════════════════════ */
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
  lsSet('zakat_contrast', on ? 'on' : 'off');
}

function updatePrivacyUi() {
  const btn = document.getElementById('privacyModeBtn');
  const status = document.getElementById('privacyModeStatus');
  if (!btn || !status) return;
  btn.classList.toggle('active', privacyMode);
  btn.textContent = privacyMode ? 'ON' : 'OFF';
  status.textContent = privacyMode
    ? 'Privacy mode is ON — local persistence is disabled.'
    : 'Privacy mode is OFF — local-only persistence is enabled.';
}

function togglePrivacyMode() {
  privacyMode = !privacyMode;
  updatePrivacyUi();
  if (privacyMode) {
    updateDataFootprint();
    return;
  }
  persistState();
}

function collectFormData() {
  const payload = {};
  FIELD_IDS.forEach(id => {
    const val = v(id);
    if (val > 0) payload[id] = val;
  });
  payload.nisabType = nisabType;
  payload.calendarType = calendarType;
  payload.stockMethod = stockMethod;
  payload.currency = currentCurrency;
  return payload;
}

function applyFormData(data = {}) {
  FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = data[id] || 0;
  });
  const cur = data.currency || currentCurrency;
  document.getElementById('currencySelect').value = cur;
  setCurrency(cur);
  setNisabType(data.nisabType || 'silver');
  setCalendar(data.calendarType || 'lunar');
  const target = data.stockMethod || 'trade';
  const lbl = document.querySelector(`#stockMethodGroup .radio-btn input[value="${target}"]`)?.closest('.radio-btn');
  if (lbl) selectRadio('stockMethod', target, lbl);
}

function persistState() {
  if (privacyMode) return;
  lsSet('zakat_form_data', JSON.stringify({ ts: Date.now(), data: collectFormData() }));
  lsSet('zakat_profiles', JSON.stringify(profiles));
  lsSet('zakat_active_profile', activeProfile);
  if (reminderConfig) lsSet('zakat_reminder', JSON.stringify(reminderConfig));
  updateDataFootprint();
}

function restoreState() {
  const saved = lsGet('zakat_form_data');
  if (saved) {
    try { applyFormData(JSON.parse(saved).data || {}); } catch (_) {}
  }
}

function loadProfiles() {
  try { profiles = JSON.parse(lsGet('zakat_profiles', '{}')) || {}; } catch (_) { profiles = {}; }
  if (!profiles.default) profiles.default = { name: 'default', data: {} };
  activeProfile = lsGet('zakat_active_profile', 'default') || 'default';
  renderProfiles();
}

function renderProfiles() {
  const sel = document.getElementById('profileSelect');
  if (!sel) return;
  sel.innerHTML = '';
  Object.keys(profiles).forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = (profiles[k].name || k).slice(0, 60);
    sel.appendChild(opt);
  });
  sel.value = profiles[activeProfile] ? activeProfile : 'default';
  sel.onchange = () => {
    activeProfile = sel.value;
    if (profiles[activeProfile]?.data) applyFormData(profiles[activeProfile].data);
    persistState();
    calc();
  };
}

function createProfile() {
  const name = prompt('New profile name (local only):');
  if (!name) return;
  const id = `profile_${Date.now()}`;
  profiles[id] = { name: name.trim().replace(/[<>"']/g, '').slice(0, 60), data: collectFormData() };
  activeProfile = id;
  renderProfiles();
  persistState();
}

function saveCurrentProfile() {
  if (!profiles[activeProfile]) profiles[activeProfile] = { name: activeProfile, data: {} };
  profiles[activeProfile].data = collectFormData();
  persistState();
  calc();
}

function deleteProfile() {
  if (activeProfile === 'default') return;
  delete profiles[activeProfile];
  activeProfile = 'default';
  renderProfiles();
  if (profiles.default?.data) applyFormData(profiles.default.data);
  persistState();
  calc();
}

async function deriveBackupKey(passphrase, salt) {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function exportEncryptedBackup() {
  const passphrase = document.getElementById('backupPassphrase')?.value || '';
  if (!passphrase) return alert('Enter a backup passphrase.');
  if (passphrase.length < 16) return alert('Use a stronger passphrase (minimum 16 characters).');
  const payload = {
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    data: { form: collectFormData(), profiles, reminderConfig, currency: currentCurrency }
  };
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload)));
  const out = {
    kdf: 'PBKDF2-SHA256',
    alg: 'AES-GCM-256',
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(cipher)))
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `zakah-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importEncryptedBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const passphrase = document.getElementById('backupPassphrase')?.value || '';
  if (!passphrase) return alert('Enter backup passphrase first.');
  if (passphrase.length < 16) return alert('Use a stronger passphrase (minimum 16 characters).');
  try {
    const raw = JSON.parse(await file.text());
    const salt = Uint8Array.from(atob(raw.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(raw.iv), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(raw.ct), c => c.charCodeAt(0));
    const key = await deriveBackupKey(passphrase, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const data = JSON.parse(new TextDecoder().decode(plain));
    if (data?.data?.form) applyFormData(data.data.form);
    profiles = data?.data?.profiles || profiles;
    reminderConfig = data?.data?.reminderConfig || reminderConfig;
    renderProfiles();
    persistState();
    calc();
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('json')) alert('Invalid backup file format.');
    else if (msg.includes('decrypt') || msg.includes('operation')) alert('Decryption failed. Check passphrase or file integrity.');
    else alert('Backup import failed.');
  } finally {
    event.target.value = '';
  }
}

function requestReminderPermission() {
  if (!('Notification' in window)) return alert('Notifications are not supported in this browser.');
  Notification.requestPermission();
}

function computeNextReminderDate(baseDate, mode) {
  if (!baseDate) return null;
  const d = new Date(baseDate + 'T00:00:00');
  const next = new Date(d);
  next.setDate(next.getDate() + (mode === 'lunar' ? 354 : 365));
  return next;
}

function saveReminder() {
  const dateVal = document.getElementById('zakahDueDate')?.value;
  const mode = document.getElementById('reminderCalendar')?.value || 'solar';
  if (!dateVal) return;
  reminderConfig = { date: dateVal, mode, savedAt: Date.now() };
  persistState();
  checkReminderNow();
}

function checkReminderNow() {
  if (!reminderConfig || !('Notification' in window)) return;
  const next = computeNextReminderDate(reminderConfig.date, reminderConfig.mode);
  if (!next) return;
  const diff = next.getTime() - Date.now();
  if (diff <= 24 * 60 * 60 * 1000 && Notification.permission === 'granted') {
    new Notification('Zakah Reminder', { body: `Zakah due reminder (${reminderConfig.mode === 'lunar' ? 'Hijri mode' : 'Solar mode'}) is near.` });
  }
}

function deleteStorageKey(key) {
  lsRemove(key);
  updateDataFootprint();
}

function updateDataFootprint() {
  const panel = document.getElementById('dataFootprint');
  if (!panel) return;
  if (privacyMode) {
    panel.textContent = 'Privacy mode ON: localStorage writes disabled.';
    return;
  }
  const keys = Object.keys(localStorage).filter(k => k.startsWith('zakat_') || k === 'pwa_dismissed');
  if (!keys.length) {
    panel.textContent = 'No local keys found.';
    return;
  }
  panel.innerHTML = keys.map(k => {
    const val = lsGet(k, '') || '';
    const size = new Blob([val]).size;
    return `<div class="footprint-item"><span>${escapeHtml(k)}</span><span>${size} bytes</span><button class="btn-reset tiny footprint-delete-btn" type="button" data-key="${encodeURIComponent(k)}">Delete</button></div>`;
  }).join('');
  panel.querySelectorAll('.footprint-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteStorageKey(decodeURIComponent(btn.getAttribute('data-key') || '')));
  });
}

function updateWizardLabel() {
  const el = document.getElementById('wizardStepLabel');
  if (el) el.textContent = `Step ${Math.min(currentStep + 1, STEPS.length)} of ${STEPS.length}`;
}

function goStep(index) {
  currentStep = Math.max(0, Math.min(STEPS.length - 1, index));
  navigateToHash(`#${STEPS[currentStep]}`);
  updateWizardLabel();
}
function nextStep() { goStep(currentStep + 1); }
function prevStep() { goStep(currentStep - 1); }

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
  if (count) count.textContent = `📡 Requests: ${networkRequestCount}`;
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
      fetch('./index.html', { cache: 'no-store' }).then(r => r.text()),
      fetch('./styles.css', { cache: 'no-store' }).then(r => r.text()),
      fetch('./sw.js', { cache: 'no-store' }).then(r => r.text()),
      fetch('./pdf-export.js', { cache: 'no-store' }).then(r => r.text())
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

  const filledCount = FIELD_IDS.filter(id => v(id) > 0).length;
  document.getElementById('progressFill').style.width =
    Math.min(100, Math.round(filledCount / FIELD_IDS.length * 100)) + '%';

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
  persistState();
}

/* ════════════════════════════════════════
   RESET
   ════════════════════════════════════════ */
function resetAll() {
  document.querySelectorAll('input[type="number"]').forEach(inp => inp.value = 0);
  lsRemove('zakat_form_data');
  if (profiles[activeProfile]) profiles[activeProfile].data = {};
  persistState();
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
      if (err.name !== 'AbortError') console.warn('[Share]', err);
    });
  } else {
    shareCopyLink();
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
  if (!(key in HASH_SECTION_MAP)) return;
  const sectionCardId = HASH_SECTION_MAP[key];
  if (sectionCardId) {
    const card = document.getElementById(sectionCardId);
    if (card && !card.classList.contains('open')) card.classList.add('open');
  }
  setTimeout(() => {
    const anchor = document.getElementById(key);
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const ts = parseInt(lsGet('pwa_dismissed', '0') || '0', 10);
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
btnDismiss?.addEventListener('click', () => { lsSet('pwa_dismissed', String(Date.now())); hideBanner(); });
if (isIos && !isStandalone) { setTimeout(showBanner, 3500); if (btnInstall) btnInstall.hidden = true; }
window.addEventListener('appinstalled', () => { hideBanner(); deferredPrompt = null; });

/* ════════════════════════════════════════
   INIT
   ════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const savedCur = lsGet('zakat_currency', 'BDT') || 'BDT';
  document.getElementById('currencySelect').value = savedCur;
  currentCurrency = savedCur;
  updateCurrencySymbols();
  updateNetworkBadge();
  updatePrivacyUi();
  if (lsGet('zakat_contrast') === 'on') document.documentElement.classList.add('high-contrast');
  try { reminderConfig = JSON.parse(lsGet('zakat_reminder', 'null')); } catch (_) { reminderConfig = null; }
  if (reminderConfig?.date) {
    const due = document.getElementById('zakahDueDate');
    const mode = document.getElementById('reminderCalendar');
    if (due) due.value = reminderConfig.date;
    if (mode) mode.value = reminderConfig.mode || 'solar';
  }
  loadProfiles();
  restoreState();

  document.getElementById('footerYear').textContent = new Date().getFullYear();

  document.getElementById('btn-en').classList.toggle('active', currentLang === 'en');
  document.getElementById('btn-bn').classList.toggle('active', currentLang === 'bn');
  document.querySelectorAll('.result-stat-value').forEach(el => {
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
  });

  window.addEventListener('online', updateNetworkBadge);
  window.addEventListener('offline', updateNetworkBadge);
  setInterval(() => { updateStaleStatus(); checkReminderNow(); }, 60000);
  updateDataFootprint();
  updateIntegrityPanel();
  updateWizardLabel();

  loadLang(currentLang, () => {
    applyLang(currentLang);
    calc();
    fetchPrices();
    if (window.location.hash) navigateToHash(window.location.hash);
  });
});
