/* ═══════════════════════════════════════════════════════════
   pdf-export.js — Zakah Calculator PDF Report Generator
   ═══════════════════════════════════════════════════════════ */
async function fetchReportDate() {
  let userTZ = 'UTC';
  try {
    userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) { 
  function formatDate(dt) {
    const tzAbbr = (() => {
      try {
        return new Intl.DateTimeFormat('en-US', {
          timeZone: userTZ,
          timeZoneName: 'short'
        }).formatToParts(dt).find(p => p.type === 'timeZoneName')?.value || userTZ;
      } catch (_) { return userTZ; }
    })();

    const display = dt.toLocaleDateString('en-GB', {
      timeZone: userTZ,
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) + ` (${tzAbbr})`;

    const parts = new Intl.DateTimeFormat('en-CA', {   
      timeZone: userTZ,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(dt);

    return { display, iso: parts };
  }
  try {
    const tzEncoded = encodeURIComponent(userTZ);
    const res = await fetch(
      `https://timeapi.io/api/time/current/zone?timeZone=${tzEncoded}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error('non-200');
    const data = await res.json();
    const dt = new Date(data.dateTime);
    return formatDate(dt);
  } catch (_) {
    return formatDate(new Date());
  }
}

/* ── Numeric value reader from input fields ─────────────── */
function _v(id) {
  return parseFloat(document.getElementById(id)?.value || 0) || 0;
}

function _fmt(n, cur) {
  if (n === 0) return `${cur} 0.00`;
  return `${cur} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/* ── Page-break guard ────────────────────────────────────── */
function _guard(doc, y, needed, addHeader) {
  if (y + needed > 278) {
    doc.addPage();
    y = _drawPageHeader(doc);
    if (addHeader) addHeader(doc, y);
  }
  return y;
}

/* ── Repeated page header (logo strip on subsequent pages) ─ */
function _drawPageHeader(doc) {
  const GOLD = [201, 168, 76];
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 210, 12, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 210, 2, 'F');
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ZAKAH CALCULATOR  |  Samin\'s Initiatives', 15, 8);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('cont.', 195, 8, { align: 'right' });
  return 18;
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT FUNCTION
   ══════════════════════════════════════════════════════════ */
async function exportZakatPDF() {
  /* Guard: jsPDF must be loaded */
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library is still loading. Please wait a moment and try again.');
    return;
  }

  const btn = document.getElementById('pdfExportBtn');
  const btnText = btn?.querySelector('.btn-label');
  const btnSpinner = btn?.querySelector('.btn-spin');
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Generating…';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';

  try {
    /* 1. Fetch date */
    const dateInfo = await fetchReportDate();

    /* 2. Re-compute all values (mirrors calc() logic) */
    const prices = getConvertedPrices();   // global fn from main script
    const { goldPerGram, silverPerGram } = prices;
    const cur  = typeof currentCurrency !== 'undefined' ? currentCurrency : 'BDT';
    const nType = typeof nisabType    !== 'undefined' ? nisabType    : 'silver';
    const cType = typeof calendarType !== 'undefined' ? calendarType : 'lunar';
    const sMethod = typeof stockMethod !== 'undefined' ? stockMethod : 'trade';

    /* Section A */
    const A = {
      'Cash on Hand':          _v('f_cashOnHand'),
      'Foreign Currency':      _v('f_cashForeign'),
      'Savings Account':       _v('f_bankSavings'),
      'Current / Checking':    _v('f_bankCurrent'),
      'FDR / Fixed Deposits':  _v('f_bankFD'),
      'bKash':                 _v('f_bkash'),
      'Nagad':                 _v('f_nagad'),
      'Upay':                  _v('f_upay'),
      'Cellfin':               _v('f_cellfin'),
      'Rocket / DBBL':         _v('f_rocket'),
      'PayPal / Payoneer':     _v('f_paypal'),
      'Other Digital Wallets': _v('f_othersWallet'),
      'Money Lent to Others':  _v('f_moneyLent'),
      'Salary / Bonus Due':    _v('f_salaryDue'),
    };
    const totalA = Object.values(A).reduce((s, v) => s + v, 0);

    /* Section B */
    const gold24kEq =
      _v('f_gold24k')   * (24/24) +
      _v('f_gold22k')   * (22/24) +
      _v('f_gold18k')   * (18/24) +
      _v('f_gold21k')   * (21/24) +
      _v('f_goldCoins') * 1;
    const goldValue   = gold24kEq * goldPerGram;
    const silverGrams = _v('f_silverGrams') + _v('f_silverBullion');
    const silverValue = silverGrams * silverPerGram;
    const B_entries = {
      [`Gold 24k: ${_v('f_gold24k').toFixed(3)}g`]:   _v('f_gold24k')   * goldPerGram,
      [`Gold 22k: ${_v('f_gold22k').toFixed(3)}g`]:   _v('f_gold22k')   * (22/24) * goldPerGram,
      [`Gold 18k: ${_v('f_gold18k').toFixed(3)}g`]:   _v('f_gold18k')   * (18/24) * goldPerGram,
      [`Gold 21k: ${_v('f_gold21k').toFixed(3)}g`]:   _v('f_gold21k')   * (21/24) * goldPerGram,
      [`Gold Coins/Bars 24k: ${_v('f_goldCoins').toFixed(3)}g`]: _v('f_goldCoins') * goldPerGram,
      [`Silver: ${_v('f_silverGrams').toFixed(3)}g`]:   _v('f_silverGrams') * silverPerGram,
      [`Silver Bullion: ${_v('f_silverBullion').toFixed(3)}g`]: _v('f_silverBullion') * silverPerGram,
    };
    const totalB = goldValue + silverValue;

    /* Section C */
    const rawStocks = _v('f_dseStocks') + _v('f_intlStocks');
    const rawMutual = _v('f_mutualFunds');
    const stocksVal = sMethod === 'trade' ? rawStocks : rawStocks * 0.25;
    const mutualVal = sMethod === 'trade' ? rawMutual : rawMutual * 0.25;
    const C = {
      [`DSE Stocks${sMethod === 'longterm' ? ' (25% proxy)' : ''}`]: stocksVal,
      [`International Stocks${sMethod === 'longterm' ? ' (25% proxy)' : ''}`]: sMethod === 'trade' ? _v('f_intlStocks') : _v('f_intlStocks') * 0.25,
      [`Mutual Funds / ETFs${sMethod === 'longterm' ? ' (25% proxy)' : ''}`]: mutualVal,
      'Bitcoin (BTC)':            _v('f_btc'),
      'Ethereum (ETH)':           _v('f_eth'),
      'Other Crypto':             _v('f_otherCrypto'),
      'GPF / Provident Fund':     _v('f_gpf'),
      'Sanchayapatra / NSC':      _v('f_nsc'),
      'Govt Bonds / Sukuk':       _v('f_bonds'),
      'Other Investment Schemes': _v('f_otherInvest'),
    };
    // Recalculate stocksVal correctly
    C[`DSE Stocks${sMethod === 'longterm' ? ' (25% proxy)' : ''}`] =
      sMethod === 'trade' ? _v('f_dseStocks') : _v('f_dseStocks') * 0.25;
    const totalC = Object.values(C).reduce((s, v) => s + v, 0);

    /* Section D */
    const D = {
      'Business Cash (in hand)':       _v('f_bizCash'),
      'Business Bank Balance':          _v('f_bizBank'),
      'Petty Cash / Float':             _v('f_pettyCash'),
      'Finished Goods':                 _v('f_finishedGoods'),
      'Raw Materials':                  _v('f_rawMaterials'),
      'Work in Progress (WIP)':         _v('f_wip'),
      'Trade Goods / Merchandise':      _v('f_tradeGoods'),
      'Trade Receivables':              _v('f_tradeRec'),
      'Advances Paid to Suppliers':     _v('f_advancePaid'),
      'Security Deposits Given':        _v('f_secDeposit'),
    };
    const totalD = Object.values(D).reduce((s, v) => s + v, 0);

    /* Section E */
    const E = {
      'Personal Loans Due':            _v('f_personalLoan'),
      'Credit Card Balance':           _v('f_creditCard'),
      'Mortgage (next 12 months)':     _v('f_mortgage12'),
      'Overdue Rent / Utilities':      _v('f_rentBills'),
      'Taxes Due':                     _v('f_taxesDue'),
      'Business Loans (12 months)':    _v('f_bizLoan'),
      'Trade Payables / Supplier Bills': _v('f_tradePayables'),
      'Salaries Payable':              _v('f_salariesPayable'),
      'Customer Advances Received':    _v('f_advanceReceived'),
    };
    const totalE = Object.values(E).reduce((s, v) => s + v, 0);

    /* Final results */
    const totalAssets = totalA + totalB + totalC + totalD;
    const netWealth   = Math.max(0, totalAssets - totalE);
    const SILVER_NISAB_G = 612.36;
    const GOLD_NISAB_G   = 87.48;
    const nisabValue = nType === 'silver'
      ? SILVER_NISAB_G * silverPerGram
      : GOLD_NISAB_G   * goldPerGram;
    const zakahRate  = cType === 'lunar' ? 0.025 : 0.02577;
    const isEligible = nisabValue > 0 && netWealth >= nisabValue;
    const zakahDue   = isEligible ? netWealth * zakahRate : 0;

    /* 3. Build PDF ─────────────────────────────────────────── */
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const ML = 15, MR = 15;
    const CW = 210 - ML - MR;  // 180mm

    /* COLOUR PALETTE */
    const GOLD_C    = [201, 168, 76];
    const DARK_C    = [17,  24,  39];
    const WHITE_C   = [255, 255, 255];
    const MUTED_C   = [120, 130, 150];
    const LGOLD_BG  = [252, 248, 234];   // light gold tint
    const LSEC_BG   = [244, 247, 252];   // light section row bg
    const GREEN_C   = [34,  160, 85];
    const RED_C     = [210, 70,  70];
    const TEAL_C    = [30,  180, 160];

    /* ── COVER HEADER ──────────────────────────────────────── */
    // Dark banner
    doc.setFillColor(...DARK_C);
    doc.rect(0, 0, 210, 48, 'F');

    // Top gold stripe
    doc.setFillColor(...GOLD_C);
    doc.rect(0, 0, 210, 3.5, 'F');

    // Logo circle
    doc.setFillColor(...GOLD_C);
    doc.circle(ML + 11, 24, 9.5, 'F');
    doc.setTextColor(...DARK_C);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ZC', ML + 11, 27.5, { align: 'center' });

    // Main title
    doc.setTextColor(...WHITE_C);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ZAKAH CALCULATOR', ML + 27, 20);

    // Brand subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GOLD_C);
    doc.text("Samin's Initiatives", ML + 27, 29);

    // Report tag
    doc.setFontSize(8.5);
    doc.setTextColor(190, 200, 220);
    doc.text('Zakah Assessment Report  |  1430H Method', ML + 27, 37);

    // Date block (right)
    doc.setTextColor(...GOLD_C);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(dateInfo.display, 210 - MR, 21, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(190, 200, 220);
    doc.text('Date of Report', 210 - MR, 28, { align: 'right' });
    doc.text(`ISO: ${dateInfo.iso}`, 210 - MR, 34, { align: 'right' });

    // Bottom gold stripe
    doc.setFillColor(...GOLD_C);
    doc.rect(0, 44.5, 210, 2, 'F');

    let y = 54;

    /* ── SETTINGS BANNER ───────────────────────────────────── */
    doc.setFillColor(...LGOLD_BG);
    doc.roundedRect(ML, y, CW, 20, 2.5, 2.5, 'F');
    doc.setDrawColor(...GOLD_C);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, 20, 2.5, 2.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 90, 20);
    doc.text('CALCULATION SETTINGS', ML + 4, y + 6.5);

    const settingItems = [
      ['Nisab Basis',   nType === 'silver' ? 'Silver — 612.36g' : 'Gold — 87.48g'],
      ['Calendar',      cType === 'lunar'  ? 'Lunar / Hijri (2.5%)' : 'Solar / Gregorian (2.577%)'],
      ['Stock Method',  sMethod === 'trade' ? 'Short-term Trading' : 'Long-term Investment (25% proxy)'],
      ['Currency',      cur],
    ];

    const colW = CW / 4;
    settingItems.forEach(([label, val], i) => {
      const sx = ML + 4 + i * colW;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_C);
      doc.text(label, sx, y + 13);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(80, 60, 10);
      doc.text(val, sx, y + 18);
    });

    y += 26;

    /* ── SECTION RENDERER ─────────────────────────────────── */

    function sectionHeader(title, y) {
      y = _guard(doc, y, 12, null);
      doc.setFillColor(...DARK_C);
      doc.rect(ML, y, CW, 9, 'F');
      doc.setFillColor(...GOLD_C);
      doc.rect(ML, y, 3.5, 9, 'F');
      doc.setTextColor(...WHITE_C);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(title, ML + 8, y + 6.2);
      return y + 9;
    }

    function dataRow(label, value, y, shade, bold) {
      y = _guard(doc, y, 7, null);
      if (shade) {
        doc.setFillColor(...LSEC_BG);
        doc.rect(ML, y, CW, 6.8, 'F');
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(bold ? 30 : 55, bold ? 40 : 55, bold ? 55 : 70);
      doc.text(label, ML + 5, y + 4.8);
      doc.setTextColor(bold ? ...GREEN_C : [80, 65, 20]);
      doc.text(value, 210 - MR - 3, y + 4.8, { align: 'right' });
      return y + 6.8;
    }

    function skippedRow(y) {
      y = _guard(doc, y, 7, null);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_C);
      doc.text('No entries recorded for this section.', ML + 5, y + 5);
      return y + 8;
    }

    function totalRow(label, value, y, colorArr) {
      y = _guard(doc, y, 8, null);
      const [tr, tg, tb] = colorArr || GREEN_C;
      doc.setFillColor(tr, tg, tb, 0.1);
      doc.setFillColor(240, 248, 242);
      doc.rect(ML, y, CW, 8, 'F');
      doc.setDrawColor(tr, tg, tb);
      doc.setLineWidth(0.3);
      doc.line(ML, y, ML + CW, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(tr, tg, tb);
      doc.text(label, ML + 5, y + 5.5);
      doc.text(value, 210 - MR - 3, y + 5.5, { align: 'right' });
      return y + 11;
    }

    function renderSection(title, entries, total, y, colorArr) {
      y = sectionHeader(title, y);
      const nonZero = Object.entries(entries).filter(([, v]) => v > 0);
      if (nonZero.length === 0) {
        y = skippedRow(y);
      } else {
        nonZero.forEach(([label, val], i) => {
          y = dataRow(label, _fmt(val, cur), y, i % 2 === 0, false);
        });
      }
      y = totalRow('Section Total', _fmt(total, cur), y, colorArr);
      return y + 2;
    }

    /* ── RENDER SECTIONS ──────────────────────────────────── */

    y = renderSection('SECTION A — CASH & LIQUID ASSETS', A, totalA, y, TEAL_C);
    y = renderSection('SECTION B — PRECIOUS METALS & JEWELRY', B_entries, totalB, y, GOLD_C);
    y = renderSection('SECTION C — INVESTMENTS & FINANCIAL ASSETS', C, totalC, y, TEAL_C);
    y = renderSection('SECTION D — BUSINESS ASSETS', D, totalD, y, [100, 80, 200]);

    /* Section E (Liabilities — negative) */
    y = sectionHeader('SECTION E — LIABILITIES & DEDUCTIONS', y);
    const nonZeroE = Object.entries(E).filter(([, v]) => v > 0);
    if (nonZeroE.length === 0) {
      y = skippedRow(y);
    } else {
      nonZeroE.forEach(([label, val], i) => {
        y = _guard(doc, y, 7, null);
        if (i % 2 === 0) {
          doc.setFillColor(252, 245, 245);
          doc.rect(ML, y, CW, 6.8, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(80, 50, 50);
        doc.text(label, ML + 5, y + 4.8);
        doc.setTextColor(...RED_C);
        doc.text('(-) ' + _fmt(val, cur), 210 - MR - 3, y + 4.8, { align: 'right' });
        y += 6.8;
      });
    }
    y = _guard(doc, y, 8, null);
    doc.setFillColor(252, 240, 240);
    doc.rect(ML, y, CW, 8, 'F');
    doc.setDrawColor(...RED_C);
    doc.setLineWidth(0.3);
    doc.line(ML, y, ML + CW, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...RED_C);
    doc.text('Total Liabilities', ML + 5, y + 5.5);
    doc.text('(-) ' + _fmt(totalE, cur), 210 - MR - 3, y + 5.5, { align: 'right' });
    y += 13;

    /* ── RESULTS SUMMARY ───────────────────────────────────── */
    y = _guard(doc, y, 70, null);

    // Summary header
    doc.setFillColor(...DARK_C);
    doc.rect(ML, y, CW, 11, 'F');
    doc.setFillColor(...GOLD_C);
    doc.rect(ML, y, 210 - ML - MR, 2, 'F');
    doc.setFillColor(...GOLD_C);
    doc.rect(ML, y, 3.5, 11, 'F');
    doc.setTextColor(...WHITE_C);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ZAKAH SUMMARY', ML + 8, y + 7.5);
    doc.setTextColor(...GOLD_C);
    doc.setFontSize(8);
    doc.text(isEligible ? 'ZAKAH OBLIGATORY' : 'NOT YET ELIGIBLE', 210 - MR - 3, y + 7.5, { align: 'right' });
    y += 11;

    // Summary grid
    const summaryRows = [
      ['Total Assets',          _fmt(totalAssets, cur),  TEAL_C, false],
      ['(-) Total Liabilities', _fmt(totalE, cur),       RED_C,  false],
      ['Net Zakatable Wealth',  _fmt(netWealth, cur),    GREEN_C, true],
      ['Nisab Threshold',       _fmt(nisabValue, cur),   MUTED_C, false],
      ['Rate Applied',          cType === 'lunar' ? '2.5% (Lunar/Hijri)' : '2.577% (Solar/Gregorian)', MUTED_C, false],
    ];

    summaryRows.forEach(([label, val, col, bold], i) => {
      y = _guard(doc, y, 8, null);
      const bg = i % 2 === 0 ? [245, 249, 254] : WHITE_C;
      doc.setFillColor(...bg);
      doc.rect(ML, y, CW, 8, 'F');
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 10 : 9);
      doc.setTextColor(60, 70, 90);
      doc.text(label, ML + 5, y + 5.5);
      doc.setTextColor(...col);
      doc.text(val, 210 - MR - 3, y + 5.5, { align: 'right' });
      y += 8;
    });

    // ZAKAH DUE — big highlight row
    y = _guard(doc, y, 16, null);
    const zakahBg = isEligible ? [228, 248, 236] : [248, 242, 228];
    doc.setFillColor(...zakahBg);
    doc.rect(ML, y, CW, 16, 'F');
    doc.setDrawColor(...(isEligible ? GREEN_C : GOLD_C));
    doc.setLineWidth(0.6);
    doc.rect(ML, y, CW, 16, 'S');
    doc.setFillColor(...(isEligible ? GREEN_C : GOLD_C));
    doc.rect(ML, y, 4, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 50, 40);
    doc.text('ZAKAH DUE THIS YEAR', ML + 9, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED_C);
    doc.text('Based on one full Hawl (1 Hijri year)', ML + 9, y + 12.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...(isEligible ? GREEN_C : [180, 140, 30]));
    doc.text(_fmt(zakahDue, cur), 210 - MR - 3, y + 10, { align: 'right' });
    y += 20;

    /* ── DISCLAIMER ────────────────────────────────────────── */
    y = _guard(doc, y, 20, null);
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_C);
    const disclaimer =
      "This report is generated for estimation purposes only. Metal prices and exchange rates are sourced " +
      "from third-party providers and may not reflect exact market values. Please consult a qualified Islamic " +
      "scholar for authoritative Zakah rulings. Samin's Initiatives does not warrant the accuracy of this report.";
    const lines = doc.splitTextToSize(disclaimer, CW - 4);
    doc.text(lines, ML + 2, y);
    y += lines.length * 4 + 4;

    /* ── FOOTER (every page) ────────────────────────────────── */
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(...DARK_C);
      doc.rect(0, 288, 210, 9, 'F');
      doc.setFillColor(...GOLD_C);
      doc.rect(0, 288, 210, 0.8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(180, 190, 210);
      doc.text("Samin's Initiatives  |  Zakah Calculator  |  100% Local Processing — No Data Shared", ML, 293);
      doc.text(`Page ${p} of ${totalPages}`, 210 - MR, 293, { align: 'right' });
    }

    /* 4. Save the PDF */
    doc.save(`zakah-report-${dateInfo.iso}.pdf`);

  } catch (err) {
    console.error('[PDF] Export failed:', err);
    alert('PDF generation failed. Please try again.');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Export PDF';
    if (btnSpinner) btnSpinner.style.display = 'none';
  }
}
