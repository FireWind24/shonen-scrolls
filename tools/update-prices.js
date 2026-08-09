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
const { loadPricing, DEFAULT_SIZES } = require('./pricing');

const ROOT = path.join(__dirname, '..');
const JS_OUT = path.join(ROOT, 'js', 'pricing.js');
const JSON_OUT = path.join(ROOT, 'assets', 'data', 'pricing.json');

const p = loadPricing();
if (!Object.keys(p.sizes).length && !p.bundles.length) {
  console.error('[update-pricing] assets/prices.csv is missing or unreadable — aborting.');
  process.exit(1);
}

const payload = {
  sizes: p.sizes,
  shipping: p.shipping,
  bundles: p.bundles,
};

/* sizes should always expose the three UI keys the store expects */
if (!payload.sizes.A4) payload.sizes.A4 = DEFAULT_SIZES.A4;
if (!payload.sizes.A5) payload.sizes.A5 = DEFAULT_SIZES.A5;
if (!payload.sizes.A6) payload.sizes.A6 = DEFAULT_SIZES.A6;

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
console.log('[update-pricing] bundles:', payload.bundles.map((b) => `${b.id}=${b.price} (${b.posters}p)`).join(', '));