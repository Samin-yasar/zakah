/* ════════════════════════════════════════
   THEME TOGGLE — Artisan Islamic Icon
   ════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem('zakat_theme');
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

  localStorage.setItem('zakat_theme', isLight ? 'light' : 'dark');
  updateThemeTooltip(isLight);
}

function updateThemeTooltip(isLight) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.setAttribute('data-tooltip', isLight ? 'Switch to night' : 'Switch to day');
}

/* ════════════════════════════════════════
   LANGUAGE LOADER
   ════════════════════════════════════════ */
let currentLang = localStorage.getItem('zakat_lang') || 'en';
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
  refreshFieldTooltipMetadata();

  const nwRaw    = parseFloat(document.getElementById('r_netWealth')?.textContent?.replace(/[^\d.]/g,'') || '0');
  const nisabRaw = parseFloat(document.getElementById('r_nisabVal')?.textContent?.replace(/[^\d.]/g,'')  || '9999999');
  const badge    = document.getElementById('eligibleBadge');
  if (badge) badge.textContent = nwRaw >= nisabRaw ? (L.eligible || 'Zakah Obligatory ✓') : (L.not_eligible || 'Not Eligible Yet');
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('zakat_lang', lang);
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
const CACHE_KEYS = { metals: 'zakat_metals', fx: 'zakat_fx' };
// Explicit 24h TTL for required cache keys.
const CACHE_TTL_BY_KEY = {
  [CACHE_KEYS.metals]: CACHE_TTL_MS,
  [CACHE_KEYS.fx]: CACHE_TTL_MS
};
const CURRENCY_SYMBOLS = { BDT:'৳', USD:'$', SAR:'﷼', AED: 'د.إ', GBP:'£', AUD:'A$', INR:'₹', CAD: 'C$', MYR: 'MR', JPY: '¥', IDR: 'RP' };
const METALS_URL = './data/metals.json';
const RATES_URL  = './data/rates.json';
const FIELD_TOOLTIPS = {
  goldPriceManual: 'Current market price of 24k gold per gram in your selected currency.',
  silverPriceManual: 'Current market price of 999 silver per gram in your selected currency.',
  f_cashOnHand: 'Physical cash available with you now.',
  f_cashForeign: 'Foreign cash converted into your selected currency.',
  f_bankSavings: 'Savings account balance excluding any interest (Riba).',
  f_bankCurrent: 'Current/checking account balance excluding interest.',
  f_bankFD: 'Fixed deposit principal amount only; exclude interest.',
  f_bkash: 'Current bKash wallet balance.',
  f_nagad: 'Current Nagad wallet balance.',
  f_upay: 'Current Upay wallet balance.',
  f_cellfin: 'Current Cellfin wallet balance.',
  f_rocket: 'Current Rocket/DBBL wallet balance.',
  f_paypal: 'Current PayPal/Payoneer balance.',
  f_othersWallet: 'Any other mobile or digital wallet balances.',
  f_moneyLent: 'Recoverable money you lent to others.',
  f_salaryDue: 'Salary or bonus already earned but not yet received.',
  f_gold24k: 'Weight of 24k gold you own in grams.',
  f_gold22k: 'Weight of 22k gold you own in grams.',
  f_gold18k: 'Weight of 18k gold you own in grams.',
  f_gold21k: 'Weight of 21k gold you own in grams.',
  f_goldCoins: 'Weight of 24k gold bars/coins in grams.',
  f_silverGrams: 'Weight of silver you own in grams.',
  f_silverBullion: 'Weight of silver coins or bullion in grams.',
  f_dseStocks: 'Current market value of Bangladesh (DSE) stocks.',
  f_intlStocks: 'Current market value of international stocks.',
  f_mutualFunds: 'Current market value of mutual funds/ETFs.',
  f_btc: 'Current market value of your Bitcoin holdings.',
  f_eth: 'Current market value of your Ethereum holdings.',
  f_otherCrypto: 'Current market value of all other crypto holdings.',
  f_gpf: 'Accessible value of GPF/provident fund balance.',
  f_nsc: 'Principal value of Sanchayapatra/NSC holdings.',
  f_bonds: 'Current value of bonds or sukuk holdings.',
  f_otherInvest: 'Other investment schemes not listed above.',
  f_bizCash: 'Business cash currently in hand.',
  f_bizBank: 'Business bank balance available now.',
  f_pettyCash: 'Petty cash or business float kept for daily expenses.',
  f_finishedGoods: 'Sale value of finished goods inventory.',
  f_rawMaterials: 'Current sale-equivalent value of raw materials.',
  f_wip: 'Estimated sale value of work in progress.',
  f_tradeGoods: 'Sale value of trade goods/merchandise.',
  f_tradeRec: 'Receivables likely to be collected from customers.',
  f_advancePaid: 'Supplier advances paid that are recoverable.',
  f_secDeposit: 'Refundable security deposits paid by you.',
  f_personalLoan: 'Personal loan installments due within 12 months.',
  f_creditCard: 'Outstanding payable credit card balance.',
  f_mortgage12: 'Only the next 12 months of mortgage payments due.',
  f_rentBills: 'Overdue rent and utility bills currently due.',
  f_taxesDue: 'Taxes currently payable.',
  f_bizLoan: 'Business loan dues payable within 12 months.',
  f_tradePayables: 'Supplier invoices and trade payables due now.',
  f_salariesPayable: 'Unpaid salaries currently due to staff.',
  f_advanceReceived: 'Customer advances received for undelivered goods/services.'
};

/* ════════════════════════════════════════
   STATE
   ════════════════════════════════════════ */
let currentCurrency    = localStorage.getItem('zakat_currency') || 'BDT';
let nisabType          = 'silver';
let calendarType       = 'lunar';
let stockMethod        = 'trade';
let liveGoldUsdPerOz   = 0;
let liveSilverUsdPerOz = 0;
let fxRates            = {};
let pricesLive         = false;

/* ════════════════════════════════════════
   CACHE HELPERS
   ════════════════════════════════════════ */
function cacheWrite(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
}
function cacheRead(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || typeof obj.ts !== 'number' || !('data' in obj)) return null;
    const ttl = CACHE_TTL_BY_KEY[key] ?? CACHE_TTL_MS;
    if (Date.now() - obj.ts > ttl) return null;
    return obj.data;
  } catch (_) { return null; }
}
function cacheReadStale(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || !('data' in obj)) return null;
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
    const cached = cacheRead(CACHE_KEYS.metals);
    if (cached) {
      liveGoldUsdPerOz   = cached.gold;
      liveSilverUsdPerOz = cached.silver;
      const fxCached = cacheRead(CACHE_KEYS.fx);
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

    cacheWrite(CACHE_KEYS.metals, { gold: liveGoldUsdPerOz, silver: liveSilverUsdPerOz });
    cacheWrite(CACHE_KEYS.fx, fxRates);
    pricesLive = true;
    onPricesReady('live');

  } catch (err) {
    console.warn('Price fetch failed:', err.message);
    const cachedMetalData = cacheReadStale(CACHE_KEYS.metals);
    const cachedFxData    = cacheReadStale(CACHE_KEYS.fx);
    if (cachedMetalData && cachedFxData) {
      liveGoldUsdPerOz   = cachedMetalData.gold;
      liveSilverUsdPerOz = cachedMetalData.silver;
      fxRates            = cachedFxData;
      pricesLive         = true;
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
  document.getElementById('fxBanner').classList.add('fx-banner-hidden');
  document.getElementById('metalSourceBadge').className = 'source-badge error';
  document.getElementById('fxSourceBadge').className    = 'source-badge error';
}
function hideFallback() {
  document.getElementById('manualFallback').classList.remove('visible');
  document.getElementById('fxBanner').classList.remove('fx-banner-hidden');
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
  banner.classList.remove('fx-banner-hidden');
}

/* ════════════════════════════════════════
   CURRENCY
   ════════════════════════════════════════ */
function setCurrency(cur) {
  currentCurrency = cur;
  localStorage.setItem('zakat_currency', cur);
  updateCurrencySymbols();
  updatePriceDisplay();
  updateFxBanner();
  calc();
}

function getLabelText(labelEl) {
  if (!labelEl) return '';
  let text = '';
  labelEl.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('tooltip-icon')) {
      text += node.textContent;
    }
  });
  return text.replace(/\s+/g, ' ').trim();
}

function ensureFieldTooltips() {
  document.querySelectorAll('.field').forEach(field => {
    const input = field.querySelector('input[type="number"], input[type="text"], select');
    const label = field.querySelector('label');
    if (!input || !label) return;

    const fallback = FIELD_TOOLTIPS[input.id] || `Enter the value for ${getLabelText(label)}.`;
    let icon = label.querySelector('.tooltip-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'tooltip-icon';
      icon.textContent = '?';
      icon.setAttribute('data-tip', fallback);
      label.appendChild(icon);
    } else if (!icon.getAttribute('data-tip')) {
      icon.setAttribute('data-tip', fallback);
    }

  });
  refreshFieldTooltipMetadata();
}

function refreshFieldTooltipMetadata() {
  document.querySelectorAll('.field').forEach(field => {
    const input = field.querySelector('input[type="number"], input[type="text"], select');
    const label = field.querySelector('label');
    if (!input || !label) return;
    let icon = label.querySelector('.tooltip-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'tooltip-icon';
      icon.textContent = '?';
      label.appendChild(icon);
    }
    const labelText = getLabelText(label) || 'Field';
    const tip = icon.getAttribute('data-tip') || FIELD_TOOLTIPS[input.id] || `Enter the value for ${labelText}.`;
    if (!icon.getAttribute('data-tip')) icon.setAttribute('data-tip', tip);
    input.setAttribute('title', tip);
    input.setAttribute('aria-label', `${labelText}. ${tip}`);
  });
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

  const fieldIds = [
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
  const filledCount = fieldIds.filter(id => v(id) > 0).length;
  document.getElementById('progressFill').style.width =
    Math.min(100, Math.round(filledCount / fieldIds.length * 100)) + '%';

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
}

/* ════════════════════════════════════════
   RESET
   ════════════════════════════════════════ */
function resetAll() {
  document.querySelectorAll('input[type="number"]').forEach(inp => inp.value = 0);
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
  const ts = parseInt(localStorage.getItem('pwa_dismissed') || '0', 10);
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
btnDismiss?.addEventListener('click', () => { localStorage.setItem('pwa_dismissed', String(Date.now())); hideBanner(); });
if (isIos && !isStandalone) { setTimeout(showBanner, 3500); if (btnInstall) btnInstall.hidden = true; }
window.addEventListener('appinstalled', () => { hideBanner(); deferredPrompt = null; });

/* ════════════════════════════════════════
   INIT
   ════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  ensureFieldTooltips();
  const savedCur = localStorage.getItem('zakat_currency') || 'BDT';
  document.getElementById('currencySelect').value = savedCur;
  currentCurrency = savedCur;
  updateCurrencySymbols();

  document.getElementById('footerYear').textContent = new Date().getFullYear();

  document.getElementById('btn-en').classList.toggle('active', currentLang === 'en');
  document.getElementById('btn-bn').classList.toggle('active', currentLang === 'bn');

  loadLang(currentLang, () => {
    applyLang(currentLang);
    calc();
    fetchPrices();
    if (window.location.hash) navigateToHash(window.location.hash);
  });
});
