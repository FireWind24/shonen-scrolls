/* ============================================================
   SHONEN SCROLLS — shared gallery module
   Poster cards, series cards, theming, lightbox + cart wiring.
   Used by the anime gallery, search results and (series cards) home.
   ============================================================ */
(function () {
  'use strict';

  const SIZE_ICONS = {
    A4: '<svg width="26" height="39" viewBox="0 0 24 36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="1.5" y="1.5" width="21" height="33" rx="2"/><rect x="6.5" y="6" width="11" height="16" rx="1" fill="currentColor" opacity="0.3" stroke="none"/></svg>',
    A5: '<svg width="21" height="28" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="1.5" y="1.5" width="21" height="29" rx="2"/><rect x="6.5" y="6" width="11" height="13" rx="1" fill="currentColor" opacity="0.3" stroke="none"/></svg>',
    A6: '<svg width="16" height="21" viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="1.5" y="1.5" width="21" height="29" rx="2"/><rect x="6.5" y="6" width="11" height="9" rx="1" fill="currentColor" opacity="0.3" stroke="none"/></svg>',
  };

  function hexToRgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return `rgba(255,46,77,${a})`;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})`;
  }

  function applyTheme(t) {
    const r = document.documentElement.style;
    r.setProperty('--a1', t.accent);
    r.setProperty('--a2', t.accent2);
    r.setProperty('--a3', t.accent3);
    r.setProperty('--a1-glow', hexToRgba(t.accent, 0.5));
    r.setProperty('--a1-soft', hexToRgba(t.accent, 0.12));
  }

  function posterCardHtml(anime, p, sizes, i, seed, opts) {
    const key = `sz-${seed}-${i}`;
    const id = `p${seed}-${i}`;
    const realIdx = anime.posters.indexOf(p);
    const title = opts && opts.linkTitles
      ? `<a class="name" href="anime.html?anime=${encodeURIComponent(anime.id)}#p${anime.id}-${realIdx}">${p.title}</a>`
      : `<div class="name">${p.title}</div>`;
    const opts2 = Object.keys(sizes).map((k, idx) => {
      const s = sizes[k];
      return `
      <label class="size-opt">
        <input type="radio" name="size-${key}" value="${k}" ${idx === 1 ? 'checked' : ''} />
        <span class="opt">
          <span class="opt-icon">${SIZE_ICONS[k] || ''}</span>
          <b>${s.label}</b>
          <span class="opt-price">${window.fmt(s.price)}</span>
        </span>
      </label>`;
    }).join('');
    return `
    <div class="poster-card reveal" id="${id}" data-delay="${i % 3}">
      <div class="imgwrap">
        <img src="${p.src}" alt="${p.title}" loading="lazy" />
        <button class="zoom" aria-label="Preview">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
        </button>
      </div>
      <div class="body">
        <div>
          ${title}
          <div class="sub">${anime.name} · Premium matte print</div>
        </div>
        <div class="sizes-pick">${opts2}</div>
        <button class="add-btn" data-idx="${i}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add to cart
        </button>
      </div>
    </div>`;
  }

  function animeCardHtml(a, delay) {
    return `
    <a class="anime-card reveal" data-delay="${delay || 0}" style="--a1:${a.theme.accent}" href="anime.html?anime=${encodeURIComponent(a.id)}">
      <div class="thumb">
        <img src="${a.cover}" alt="${a.name}" loading="lazy" />
        <span class="kanji-tag">${a.kanji || '・'}</span>
        <span class="count-tag">${a.count} designs</span>
      </div>
      <div class="meta">
        <h3>${a.name}</h3>
        <p>${a.tagline}</p>
        <span class="go">→</span>
      </div>
    </a>`;
  }

  /* items: [{ anime: {...}, poster: { src, title } }] */
  function renderPosterGrid(container, items, sizes, opts) {
    opts = opts || {};
    const seed = opts.seed || 'grid';
    container.innerHTML = items.map((it, i) => posterCardHtml(it.anime, it.poster, sizes, i, seed, opts)).join('');

    const lightboxItems = items.map((it) => ({ src: it.poster.src, title: it.poster.title }));

    container.querySelectorAll('.imgwrap').forEach((w, i) => {
      w.addEventListener('click', () => window.Shop.Lightbox.open(lightboxItems, i));
    });

    container.querySelectorAll('.add-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.poster-card');
        const size = card.querySelector('input[type="radio"]:checked').value;
        const it = items[Number(btn.dataset.idx)];
        window.ShonenCart.add({ animeId: it.anime.id, anime: it.anime.name, title: it.poster.title, src: it.poster.src }, size, 1);
        window.Shop.toast(`${it.poster.title} (${size}) added to cart`);
      });
    });

    if (opts.quickEl) {
      opts.quickEl.querySelectorAll('.chip').forEach((c) => {
        c.addEventListener('click', () => {
          opts.quickEl.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
          c.classList.add('active');
          const want = c.dataset.size;
          container.querySelectorAll('.poster-card').forEach((card) => {
            if (!want) { const def = card.querySelector('input[value="A5"]'); if (def) def.checked = true; return; }
            const r = card.querySelector(`input[value="${want}"]`);
            if (r) r.checked = true;
          });
        });
      });
    }
  }

  window.SIZE_ICONS = SIZE_ICONS;
  window.Gallery = { applyTheme, posterCardHtml, animeCardHtml, renderPosterGrid };
})();
