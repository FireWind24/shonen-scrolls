/*
 * tools/pricing.js
 * Shared Node module — parses assets/prices.csv (the single source of
 * truth for every price on the site) into a pricing object:
 *   { sizes: {CODE:{label,detail,price}}, shipping: 200, bundlePrices: {id: price} }
 * The CSV is a simple flat price list:
 *     item,price (Rs)
 *     A4 poster,250
 *     ...
 * Only PRICES live in the sheet — sizes/packs are defined by the code
 * (DEFAULT_SIZES here, the BUNDLES array in js/bundles.js) and their
 * prices are overridden from the CSV. That keeps the sheet dead simple.
 * Used by tools/update-prices.js (generates js/pricing.js).
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

/* which rows the site understands — item name (lowercased) -> what it is.
   The seller keeps these exact names; unknown rows are skipped with a warning. */
const KNOWN_ITEMS = {
  'a4 poster': { type: 'size', id: 'A4' },
  'a5 poster': { type: 'size', id: 'A5' },
  'a6 poster': { type: 'size', id: 'A6' },
  'shipping per order': { type: 'shipping' },
  'genin pack': { type: 'bundle', id: 'genin' },
  'chunin pack': { type: 'bundle', id: 'chunin' },
  'jonin pack': { type: 'bundle', id: 'jonin' },
  'hokage pack': { type: 'bundle', id: 'hokage' },
  "collector's pack": { type: 'bundle', id: 'collector' },
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

function asNumber(v) {
  const s = String(v || '').replace(/[, ]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function loadPricing() {
  const result = {
    sizes: {},
    shipping: 200,
    shippingNote: '',
    bundlePrices: {},
  };
  for (const [code, d] of Object.entries(DEFAULT_SIZES)) {
    result.sizes[code] = { label: d.label, detail: d.detail, price: d.price };
  }
  if (!fs.existsSync(CSV_FILE)) return result;

  let text = fs.readFileSync(CSV_FILE, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); /* strip BOM */

  const rows = parseRows(text);
  for (const r of rows) {
    const item = String(r[0] || '').trim();
    const price = asNumber(r[1]);
    if (!item || !price) continue;

    const known = KNOWN_ITEMS[item.toLowerCase()];
    if (!known) {
      console.warn('[pricing] skipping unknown item in prices.csv:', item);
      continue;
    }
    if (known.type === 'size') {
      result.sizes[known.id].price = price;
    } else if (known.type === 'shipping') {
      result.shipping = price;
      result.shippingNote = item;
    } else {
      result.bundlePrices[known.id] = price;
    }
  }

  return result;
}

module.exports = { loadPricing, parseRows, DEFAULT_SIZES, KNOWN_ITEMS, CSV_FILE };
