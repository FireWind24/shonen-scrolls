/*
 * update-prices.js
 * Reads assets/prices.csv and regenerates the client-facing pricing file:
 *   - js/pricing.js             ->  window.__PRICES__ (loaded before cart.js on every page)
 *   - assets/data/pricing.json  ->  readable mirror for tooling / debugging
 * Run: node tools/update-prices.js   (runs automatically on every Vercel deploy)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadPricing } = require('./pricing');

const ROOT = path.join(__dirname, '..');
const JS_OUT = path.join(ROOT, 'js', 'pricing.js');
const JSON_OUT = path.join(ROOT, 'assets', 'data', 'pricing.json');

const p = loadPricing();

const payload = {
  sizes: p.sizes,
  shipping: p.shipping,
  bundlePrices: p.bundlePrices,
};

const js =
  '/* AUTO-GENERATED from assets/prices.csv — do not edit by hand.\n' +
  '   Regenerate with: node tools/update-prices.js\n' +
  '*/\nwindow.__PRICES__ = ' + JSON.stringify(payload, null, 2) + ';\n';

fs.writeFileSync(JS_OUT, js);
console.log('[update-pricing] wrote js/pricing.js');

fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2) + '\n');
console.log('[update-pricing] wrote assets/data/pricing.json');
console.log('[update-pricing] sizes:', Object.keys(payload.sizes).map((k) => `${k}=${payload.sizes[k].price}`).join(', '));
console.log('[update-pricing] shipping:', payload.shipping);
console.log('[update-pricing] bundlePrices:', Object.entries(payload.bundlePrices).map(([k, v]) => `${k}=${v}`).join(', '));
