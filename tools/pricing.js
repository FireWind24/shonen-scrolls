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
  const n = Number(String(v || '').replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function asBool(v) {
  return /^(yes|true|y|1)$/i.test(String(v).trim());
}

function loadPricing() {
  const result = { sizes: {}, shipping: 200, bundles: [], shippingNote: '' };
  if (!fs.existsSync(CSV_FILE)) return result;

  const raw = parseRows(fs.readFileSync(CSV_FILE, 'utf8'));
  const rows = raw.filter((r) => !String(r[0] || '').trim().startsWith('#'));
  const header = rows.shift() || [];
  if (!/category/i.test(header.join(','))) return result;

  const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const I = {
    category: col('category'), code: col('code'), name: col('name'), price: col('price'),
    posters: col('posters'), free: col('free_delivery'), badge: col('badge'),
    tagline: col('tagline'), detail: col('detail'), features: col('features'),
  };

  for (const r of rows) {
    const get = (ix) => (ix >= 0 && ix < r.length ? r[ix].trim() : '');
    const category = get(I.category).toLowerCase();
    if (!category || category.startsWith('#')) continue;
    const code = get(I.code);
    const price = asNumber(get(I.price));

    if (category === 'sizes') {
      if (!code || price === null) continue;
      result.sizes[code] = { label: get(I.name) || code, inches: get(I.detail), price };
    } else if (category === 'shipping') {
      if (price === null) continue;
      result.shipping = price;
      result.shippingNote = get(I.detail) || get(I.name);
    } else if (category === 'bundles') {
      const posters = asNumber(get(I.posters));
      if (!code || price === null || !posters) continue;
      result.bundles.push({
        id: code,
        name: get(I.name) || code,
        posters,
        price,
        freeDelivery: asBool(get(I.free)),
        badge: get(I.badge),
        tagline: get(I.tagline),
        features: get(I.features).split(/\s*\|\s*/).filter(Boolean),
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