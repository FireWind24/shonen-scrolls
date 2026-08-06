/*
 * generate-manifest.js
 * Scans designs/anime/<anime>/ for poster images and builds
 * assets/data/manifest.json that the website loads.
 *
 * Run: node tools/generate-manifest.js   (re-run after adding posters)
 */
const fs = require('fs');
const path = require('path');
const meta = require('./anime-meta.json');

const ROOT = path.join(__dirname, '..');
const ANIME_DIR = path.join(ROOT, 'designs', 'anime');
const OUT_DIR = path.join(ROOT, 'assets', 'data');
const OUT_FILE = path.join(OUT_DIR, 'manifest.json');

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.avif']);

/* deterministic hue from a string so every new folder gets its own tasteful theme */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}
function themeForId(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const hue = h % 360;
  return {
    accent: hslToHex(hue, 84, 55),
    accent2: hslToHex(hue + 165, 78, 62),
    accent3: hslToHex(hue, 30, 9),
  };
}

function titleCase(id) {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const metaById = {};
for (const a of meta.animes) metaById[a.id] = a;

function codeFor(m, id) {
  if (m && m.code) return m.code;
  return id
    .split(/[-_]/)
    .filter((w) => w && !/^\d+$/.test(w))
    .map((w) => w[0])
    .join('')
    .toUpperCase() || id.slice(0, 3).toUpperCase();
}

/* ensure prefixes stay unique across the whole catalog */
function uniqueCode(m, id, used) {
  let code = codeFor(m, id);
  let base = code;
  let n = 2;
  while (used.has(code)) {
    code = base + n;
    n++;
  }
  used.add(code);
  return code;
}

const seen = new Set();
const usedCodes = new Set();
const animes = [];

/* clean base name: no SKU prefix, no trailing extensions (handles "x.jpg.jpg" leftovers) */
function baseOf(f) {
  let name = path.basename(f);
  name = name.replace(/^[a-z0-9]{1,7}-\d{3}[-_]/i, '');
  name = name.replace(/(\.[a-zA-Z0-9]+)+$/, '');
  return name;
}

/* poster title from the file name: no SKU prefix, no "poster-"/index prefix */
function titleFrom(f) {
  let base = baseOf(f);
  base = base.replace(/^poster[-_]/i, '');
  base = base.replace(/^\d+[-_]/i, '');
  return titleCase(base) || 'Poster';
}

/* existing SKU number from a prefixed filename (e.g. "SxF-019-...") — respected as-is */
function prefixNum(f) {
  const m = /^[a-z0-9]{1,7}-(\d{3})[-_]/i.exec(path.basename(f));
  return m ? parseInt(m[1], 10) : null;
}

if (fs.existsSync(ANIME_DIR)) {
  for (const id of fs.readdirSync(ANIME_DIR)) {
    const dir = path.join(ANIME_DIR, id);
    if (!fs.statSync(dir).isDirectory()) continue;
    const rel = (p) => 'designs/anime/' + id + '/' + p;

    const m = metaById[id] || null;
    const code = uniqueCode(m, id, usedCodes);

    const files = fs
      .readdirSync(dir)
      .filter((f) => IMG_EXT.has(path.extname(f).toLowerCase()))
      .sort((a, b) => {
        const pa = prefixNum(a), pb = prefixNum(b);
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return (baseOf(a) + path.extname(a)).localeCompare(baseOf(b) + path.extname(b), undefined, { numeric: true, sensitivity: 'base' });
      });

    let nextNum = 1;
    for (const f of files) {
      const p = prefixNum(f);
      if (p != null && p >= nextNum) nextNum = p + 1;
    }

    const posters = files.map((f) => {
      const ext = path.extname(f);
      let num = prefixNum(f);
      if (num == null) { num = nextNum; nextNum++; }
      const sku = `${code}-${String(num).padStart(3, '0')}`;
      const wanted = `${sku}-${baseOf(f)}${ext}`;
      let final = f;
      if (wanted !== f) {
        const to = path.join(dir, wanted);
        if (!fs.existsSync(to)) {
          fs.renameSync(path.join(dir, f), to);
          final = wanted;
        }
      }
      return {
        src: rel(final),
        title: titleFrom(f),
        sku,
      };
    });

    if (posters.length === 0) continue;

    const theme = m
      ? { accent: m.accent, accent2: m.accent2, accent3: m.accent3 }
      : themeForId(id);

    animes.push({
      id,
      code,
      name: m ? m.name : titleCase(id),
      kanji: m ? m.kanji : '',
      tagline: m ? m.tagline : 'New collection — fresh prints every week.',
      theme,
      cover: posters[0].src,
      count: posters.length,
      posters,
    });
    seen.add(id);
  }
}

// keep meta order for the known ones, then extras
const ordered = [];
for (const a of meta.animes) {
  const found = animes.find((x) => x.id === a.id);
  if (found) ordered.push(found);
}
for (const a of animes) if (!seen.has(a.id) || !ordered.includes(a)) ordered.push(a);

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = {
  generated: new Date().toISOString(),
  sizes: {
    A4: { label: 'A4', inches: '8" × 12"', price: 250 },
    A5: { label: 'A5', inches: '6" × 8"', price: 150 },
    A6: { label: 'A6', inches: '4" × 6"', price: 100 },
  },
  animes: ordered,
};

/* embedded copy so the site also works when opened straight from disk */
fs.writeFileSync(path.join(OUT_DIR, 'manifest.js'), 'window.__MANIFEST__ = ' + JSON.stringify(manifest, null, 2) + ';\n');

fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2));
console.log(`manifest.json written with ${ordered.length} anime:`);
for (const a of ordered) console.log(`  - ${a.name} (${a.id}) — ${a.count} posters`);
