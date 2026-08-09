/*
 * tools/pricing.js
 * Shared Node module — parses assets/prices.csv (the single source of
 * truth for every price on the site) into a pricing object:
 *   { sizes: {CODE:{label,detail,price}}, shipping: 200, bundles: [...] }
 * Used by tools/update-prices.js (generates js/pricing.js) and
 * tools/generate-manifest.js (sizes block of the manifest) so both
 * always read from the one CSV.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'assets', 'prices.csv');

const DEFAULT_SIZES = {
  A4: { label: 'A4', detail: '8x12 inches', price: 250 },
  A5: { label: 'A5', detail: '6x8 inches', price: 150 },
  A6: { label: 'A6', detail: '4x6 inches', price: 100 },
};

/* minimal RFC-4180 CSV parser (handles quoted fields, embedded commas) */
function parseRows(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') {
      q = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n') {
      row.push(cell); cell = ''; rows.push(row); row = [];
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function romanize(n) {
  if (!Number.isInteger(n) || n < 1) return String(n);
  if (n > 39) return String(n);
  /* composed Unicode roman numerals (Ⅰ Ⅱ Ⅲ Ⅳ ... Ⅹ) to match the UI */
  const DIGIT = { 0: '', 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ', 5: 'Ⅴ', 6: 'Ⅵ', 7: 'Ⅶ', 8: 'Ⅷ', 9: 'Ⅸ' };
  return 'Ⅹ'.repeat(Math.floor(n / 10)) + DIGIT[n % 10];
}

function asNumber(v) {
  const s = String(v || '').replace(/[, ]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function asBool(v) {
  return /^(yes|true|y|1)$/i.test(String(v).trim());
}

function loadPricing() {
  const result = { sizes: {}, shipping: 200, bundles: [], shippingNote: '' };
  if (!fs.existsSync(CSV_FILE)) return result;

  let text = fs.readFileSync(CSV_FILE, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); /* strip BOM */

  /* The CSV is organized as small stacked tables, each headed by a
     section marker line (SIZES / SHIPPING / BUNDLES), a header line,
     then data rows. Spreadsheet-safe: no comment lines to mangle. */
  const rows = parseRows(text);
  let section = '';
  let skipNext = false;

  for (const r of rows) {
    const cells = r.map((c) => c.trim());
    if (!cells.some(Boolean)) continue;

    if (cells.length === 1 && /^(sizes|shipping|bundles)$/i.test(cells[0])) {
      section = cells[0].toLowerCase();
      skipNext = true; /* the next row is that section's header */
      continue;
    }
    if (skipNext) { skipNext = false; continue; }
    if (!section) continue;

    const priceCol = section === 'shipping' ? 1 : 3;
    const price = asNumber(cells[priceCol]);

    if (section === 'sizes') {
      if (!cells[0] || price === null) continue;
      result.sizes[cells[0]] = { label: cells[1] || cells[0], inches: cells[2] || '', price };
    } else if (section === 'shipping') {
      if (price === null) continue;
      result.shipping = price;
      result.shippingNote = cells[0];
    } else if (section === 'bundles') {
      const posters = asNumber(cells[2]);
      if (!cells[0] || price === null || !posters) continue;
      result.bundles.push({
        id: cells[0],
        name: cells[1] || cells[0],
        posters,
        price,
        freeDelivery: asBool(cells[4]),
        badge: cells[5],
        tagline: cells[6],
        features: (cells[7] || '').split(/\s*\|\s*/).filter(Boolean),
      });
    }
  }

  result.bundles.forEach((b, i) => {
    b.rank = i + 1;
    b.numeral = romanize(i + 1);
  });

  return result;
}

module.exports = { loadPricing, parseRows, romanize, DEFAULT_SIZES, CSV_FILE };