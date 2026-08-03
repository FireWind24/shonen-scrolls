/*
 * generate-posters.js
 * Creates demo SVG posters inside designs/anime/<id>/ so the site looks
 * great out of the box. Delete these once you drop in your real designs.
 *
 * Run: node tools/generate-posters.js
 */
const fs = require('fs');
const path = require('path');
const meta = require('./anime-meta.json');

const W = 600;
const H = 900;
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'designs', 'anime');

// ---- tiny seeded RNG (mulberry32) ----
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = (rand, min, max) => min + rand() * (max - min);
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONT_DISPLAY = "Anton, 'Arial Narrow', 'Arial Black', sans-serif";
const FONT_KANJI = "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif";
const FONT_BODY = "Outfit, 'Segoe UI', sans-serif";

const MARK = `SHONEN SCROLLS`;

// ---------- decorative primitives ----------
function petals(rand, cx, cy, count, color) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = cx + r(rand, -140, 140);
    const y = cy + r(rand, -120, 120);
    const a = r(rand, 0, 360);
    const o = r(rand, 0.25, 0.9);
    const size = r(rand, 5, 11);
    s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)})"><ellipse rx="${size.toFixed(1)}" ry="${(size * 0.55).toFixed(1)}" fill="${color}" opacity="${o.toFixed(2)}"/><path d="M0 0 L0 ${(-size * 0.6).toFixed(1)}" stroke="${color}" stroke-width="1" opacity="${o.toFixed(2)}"/></g>`;
  }
  return s;
}
function rays(rand, cx, cy, n, r0, r1, color, opacity) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r(rand, -0.05, 0.05);
    const x1 = cx + Math.cos(a) * r0, y1 = cy + Math.sin(a) * r0;
    const x2 = cx + Math.cos(a) * r1, y2 = cy + Math.sin(a) * r1;
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${r(rand, 4, 12).toFixed(1)}" opacity="${opacity.toFixed(2)}" stroke-linecap="round"/>`;
  }
  return s;
}
function seigaiha(cx, cy, radius, color, o) {
  // one arc scale of the classic wave pattern
  const arcs = [];
  for (let i = 1; i <= 3; i++) {
    arcs.push(`<path d="M ${(cx - radius / i).toFixed(1)} ${cy.toFixed(1)} a ${(radius / i).toFixed(1)} ${(radius / i).toFixed(1)} 0 1 0 ${((radius * 2) / i).toFixed(1)} 0" fill="none" stroke="${color}" stroke-width="2" opacity="${o.toFixed(2)}"/>`);
  }
  return arcs.join('');
}
function torii(x, y, w, color, o) {
  const h = w * 0.9;
  return `<g transform="translate(${x} ${y})" opacity="${o.toFixed(2)}" stroke="${color}" fill="none" stroke-linecap="round">
    <line x1="${(w * 0.5)}" y1="0" x2="${(w * 0.5)}" y2="${h}" stroke-width="${(w * 0.07).toFixed(1)}"/>
    <path d="M ${(w * 0.5 - w * 0.5).toFixed(1)} ${(h * 0.55).toFixed(1)} Q ${(w * 0.5).toFixed(1)} ${(h * 0.35).toFixed(1)} ${(w * 0.5 + w * 0.5).toFixed(1)} ${(h * 0.55).toFixed(1)}" stroke-width="${(w * 0.08).toFixed(1)}"/>
    <line x1="${(w * 0.05).toFixed(1)}" y1="${(h * 0.35).toFixed(1)}" x2="${(w * 0.95).toFixed(1)}" y2="${(h * 0.35).toFixed(1)}" stroke-width="${(w * 0.12).toFixed(1)}"/>
  </g>`;
}
function halftoneGrid(x, y, w, h, step, r, color, o) {
  let s = '';
  for (let px = x; px < x + w; px += step) {
    for (let py = y; py < y + h; py += step) {
      s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${o.toFixed(3)}"/>`;
    }
  }
  return s;
}

// ---------- layout styles ----------
const STYLES = ['burst', 'wave', 'stripe', 'sun', 'minimal', 'grid'];

function buildPoster(anime, ch, idx) {
  const rand = rng(idx * 7919 + anime.id.length * 104729 + 13);
  const style = STYLES[idx % STYLES.length];
  const accent = anime.accent;
  const accent2 = anime.accent2;
  const bgBase = anime.accent3;
  const name = ch || 'Key Visual';
  const kanji = anime.kanji;

  // shared header/footer brand blocks
  const brandTop = `<g>
    <text x="40" y="64" font-family="${FONT_BODY}" font-size="21" letter-spacing="6" fill="#ffffff" opacity="0.85" font-weight="700">${MARK}</text>
    <line x1="40" y1="80" x2="${40 + 84}" y2="80" stroke="${accent2}" stroke-width="3"/>
  </g>`;
  const seriesTag = `<text x="40" y="${H - 56}" font-family="${FONT_BODY}" font-size="20" letter-spacing="4" fill="#ffffff" opacity="0.6" font-weight="500">${esc(anime.name.toUpperCase())}</text>`;

  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shade(bgBase, -14)}"/>
      <stop offset="1" stop-color="${bgBase}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.85"/>
      <stop offset="0.5" stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${bgBase}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="vr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${accent2}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${accent2}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="noise" width="120" height="120" patternUnits="userSpaceOnUse">
      <filter id="nz"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
      <rect width="120" height="120" filter="url(#nz)" opacity="0.5"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#noise)" opacity="0.07"/>
  <rect width="${W}" height="${H}" fill="none" stroke="${accent2}" stroke-opacity="0.35" stroke-width="4" x="18" y="18" width="${W - 36}" height="${H - 36}"/>
  ${brandTop}
  __INNER__
  ${seriesTag}
</svg>`;

  let inner = '';
  if (style === 'burst') {
    inner = `
      <g opacity="0.85">${rays(rand, W / 2, H * 0.4, 42, 60, Math.max(W, H) * 0.72, accent, 0.16)}</g>
      <circle cx="${W / 2}" cy="${H * 0.4}" r="${r(rand, 70, 110)}" fill="${accent}" opacity="0.9"/>
      <g transform="rotate(-90 ${W * 0.72} ${H * 0.42})">
        <text x="${W * 0.72}" y="${H * 0.42}" font-family="${FONT_KANJI}" font-size="150" fill="${accent2}" opacity="0.22" text-anchor="middle">${kanji}</text>
      </g>
      <text x="${W / 2}" y="${H * 0.40}" font-family="${FONT_DISPLAY}" font-size="120" fill="#0b0b10" text-anchor="middle" letter-spacing="4">${esc(name.toUpperCase())}</text>
      <text x="${W / 2}" y="${H * 0.54}" font-family="${FONT_DISPLAY}" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="14" opacity="0.9">— ${esc(kanji)} —</text>
      ${petals(rand, W / 2, H * 0.82, 26, accent2)}
      ${torii(W / 2 - 30, H * 0.68, 60, '#ffffff', 0.25)}`;
  } else if (style === 'wave') {
    const gy = H * 0.82;
    inner = `
      <circle cx="${r(rand, W * 0.2, W * 0.8)}" cy="${r(rand, H * 0.2, H * 0.45)}" r="${r(rand, 60, 130)}" fill="${accent2}" opacity="0.14"/>
      <text x="40" y="${H * 0.30}" font-family="${FONT_DISPLAY}" font-size="118" fill="#ffffff" letter-spacing="2">${esc(name.toUpperCase())}</text>
      <text x="42" y="${H * 0.30 + 46}" font-family="${FONT_KANJI}" font-size="40" fill="${accent2}" opacity="0.85">${kanji}</text>
      <g stroke="${accent}">
        ${seigaiha(W / 2, gy, 420, accent, 0.5)}
        ${seigaiha(W / 2, gy + 60, 340, accent2, 0.4)}
        ${seigaiha(W / 2, gy + 120, 260, accent, 0.35)}
      </g>
      <circle cx="80" cy="${gy - 30}" r="26" fill="${accent}"/>`;
  } else if (style === 'stripe') {
    let stripes = '';
    for (let i = 0; i < 9; i++) {
      const y = i * 110 - 60;
      stripes += `<rect x="-40" y="${y}" width="${W + 80}" height="46" transform="rotate(-14 ${W / 2} ${y})" fill="${i % 2 ? accent : accent2}" opacity="${i % 2 ? 0.22 : 0.14}"/>`;
    }
    inner = `
      ${stripes}
      <g transform="translate(0 0)">${halftoneGrid(20, 96, 210, 210, 26, 3, accent2, 0.5)}</g>
      <text x="${W - 50}" y="${H * 0.46}" font-family="${FONT_DISPLAY}" font-size="120" fill="#ffffff" text-anchor="end" letter-spacing="3">${esc(name.toUpperCase())}</text>
      <text x="${W - 52}" y="${H * 0.46 + 44}" font-family="${FONT_KANJI}" font-size="42" fill="${accent}" text-anchor="end">${kanji}</text>
      <line x1="0" y1="${H * 0.66}" x2="${W}" y2="${H * 0.66}" stroke="url(#vr)" stroke-width="6"/>`;
  } else if (style === 'sun') {
    const sx = W / 2, sy = H * 0.42;
    inner = `
      <g>${rays(rand, sx, sy, 36, 90, 360, accent, 0.35)}</g>
      <circle cx="${sx}" cy="${sy}" r="150" fill="${accent}" opacity="0.96"/>
      <circle cx="${sx}" cy="${sy}" r="150" fill="none" stroke="${accent2}" stroke-width="6" stroke-dasharray="4 12"/>
      <text x="${sx}" y="${H * 0.78}" font-family="${FONT_DISPLAY}" font-size="96" fill="#ffffff" text-anchor="middle" letter-spacing="2">${esc(name.toUpperCase())}</text>
      <text x="${sx}" y="${H * 0.78 + 40}" font-family="${FONT_KANJI}" font-size="34" fill="${accent2}" text-anchor="middle">${kanji}</text>
      ${torii(sx - 30, H * 0.62, 60, '#ffffff', 0.3)}`;
  } else if (style === 'minimal') {
    inner = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="${accent}" opacity="0.08"/>
      <rect x="40" y="${H * 0.24}" width="120" height="10" fill="${accent2}"/>
      <text x="40" y="${H * 0.42}" font-family="${FONT_DISPLAY}" font-size="104" fill="#ffffff" letter-spacing="1">${esc(name.toUpperCase())}</text>
      <text x="42" y="${H * 0.42 + 42}" font-family="${FONT_KANJI}" font-size="38" fill="${accent}" opacity="0.9">${kanji}</text>
      <circle cx="${W - 90}" cy="${H * 0.34}" r="70" fill="${accent}" opacity="0.16"/>
      <circle cx="${W - 90}" cy="${H * 0.34}" r="40" fill="none" stroke="${accent2}" stroke-width="2" opacity="0.5"/>
      <circle cx="${W - 90}" cy="${H * 0.34}" r="16" fill="${accent2}" opacity="0.9"/>
      ${petals(rand, W * 0.5, H * 0.78, 14, accent)}`;
  } else {
    // grid — neon synthwave floor
    inner = `
      <line x1="0" y1="${H * 0.62}" x2="${W}" y2="${H * 0.62}" stroke="${accent2}" stroke-width="2" opacity="0.6"/>
      <g stroke="${accent}" opacity="0.5" stroke-width="2">
        ${(() => { let s = ''; for (let i = 0; i <= 14; i++) { const x = (W / 14) * i; s += `<line x1="${x.toFixed(1)}" y1="${H * 0.62}" x2="${(x - 260).toFixed(1)}" y2="${H}" opacity="${(i / 14).toFixed(2)}"/>`; } return s; })()}
      </g>
      <g stroke="${accent2}" opacity="0.5" stroke-width="2">
        ${(() => { let s = ''; for (let i = 1; i <= 6; i++) { const y = H * 0.62 + i * 60; s += `<line x1="${(W / 2 - 70 - i * 55).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(W / 2 + 70 + i * 55).toFixed(1)}" y2="${y.toFixed(1)}"/>`; } return s; })()}
      </g>
      <circle cx="${W / 2}" cy="${H * 0.42}" r="140" fill="${accent}" opacity="0.9"/>
      <circle cx="${W / 2}" cy="${H * 0.42}" r="140" fill="none" stroke="${accent2}" stroke-width="4" stroke-dasharray="10 14"/>
      <text x="${W / 2}" y="${H * 0.30}" font-family="${FONT_DISPLAY}" font-size="120" fill="#ffffff" text-anchor="middle" letter-spacing="3">${esc(name.toUpperCase())}</text>
      <text x="${W / 2}" y="${H * 0.30 + 42}" font-family="${FONT_KANJI}" font-size="38" fill="${accent2}" text-anchor="middle">${kanji}</text>
      <g transform="translate(${W / 2} ${H * 0.42})">${petals(rand, 0, 0, 18, accent2)}</g>`;
  }

  return base.replace('__INNER__', inner);
}

let created = 0;
const REAL_IMG = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
for (const anime of meta.animes) {
  const dir = path.join(OUT, anime.id);
  if (!fs.existsSync(dir)) continue;
  const existing = fs.readdirSync(dir);
  const hasReal = existing.some((f) => REAL_IMG.has(path.extname(f).toLowerCase()));
  if (hasReal) {
    console.log(`  - ${anime.id}: skipped (real posters found)`);
    continue;
  }
  fs.mkdirSync(dir, { recursive: true });
  const chars = anime.characters || [];
  const count = Math.min(6, Math.max(4, chars.length));
  for (let i = 0; i < count; i++) {
    const ch = chars[i % chars.length];
    const slug = ch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const file = path.join(dir, `${slug}.svg`);
    fs.writeFileSync(file, buildPoster(anime, ch, i));
    created++;
  }
  console.log(`  - ${anime.id}: ${count} posters`);
}
console.log(`\nCreated ${created} demo posters under designs/anime/`);
