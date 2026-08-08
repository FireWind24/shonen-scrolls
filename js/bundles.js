/* ============================================================
   SHONEN SCROLLS — shinobi bundles
   Pack data, the home-page bundle cards, and the "pick your
   posters" picker modal. Buyers choose the exact posters
   inside a pack before adding it to the cart.
   ============================================================ */
(function () {
  'use strict';

  const BUNDLES = [
    {
      id: 'genin', rank: 1, emoji: '🥷', name: 'Genin Pack',
      tagline: 'Every legend starts somewhere.',
      posters: 2, price: 500, freeDelivery: false, badge: '',
      features: ['2 × A4 posters'],
    },
    {
      id: 'chunin', rank: 2, emoji: '⚔️', name: 'Chunin Pack',
      tagline: "You've proven yourself.",
      posters: 5, price: 1000, freeDelivery: false, badge: '',
      features: ['4 × A4 posters', '+1 FREE A4 poster'],
    },
    {
      id: 'jonin', rank: 3, emoji: '🔥', name: 'Jonin Pack',
      tagline: 'Only the elite reach this rank.',
      posters: 8, price: 1500, freeDelivery: true, badge: 'BEST VALUE',
      features: ['6 × A4 posters', '+2 FREE A4 posters', '🚚 FREE delivery'],
    },
    {
      id: 'hokage', rank: 4, emoji: '👑', name: 'Hokage Pack',
      tagline: 'Lead your village... and your wall.',
      posters: 11, price: 2000, freeDelivery: true, badge: 'MOST POPULAR',
      features: ['8 × A4 posters', '+3 FREE A4 posters', '🚚 FREE delivery', '⚡ Priority processing'],
    },
    {
      id: 'collector', rank: 5, emoji: '💎', name: "Collector's Pack",
      tagline: 'For the true anime addict.',
      posters: 17, price: 3000, freeDelivery: true, badge: '',
      features: ['12 × A4 posters', '+5 FREE A4 posters', '🚚 FREE delivery', '⚡ Priority processing', '🎁 1 mystery bonus print'],
    },
  ];

  window.BUNDLES = BUNDLES;
  window.bundleById = (id) => BUNDLES.find((b) => b.id === id);

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => window.fmt ? window.fmt(n) : 'Rs ' + n;

  /* ----- bundle cards on the home page ----- */
  const TIERS = {
    genin: ['#ff2e4d', '#ff8a4d'],
    chunin: ['#ff7a3d', '#ffb03a'],
    jonin: ['#ffb03a', '#ffe08a'],
    hokage: ['#ffce4d', '#fff3c4'],
    collector: ['#c084fc', '#ff7ab8'],
  };
  const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];

  const CHECK_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>';
  const STACK_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 6-10 6L2 9z"/><path d="M2 15l10 6 10-6"/></svg>';
  const ARROW_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function cardHtml(b, i) {
    const [a1, a2] = TIERS[b.id] || ['var(--accent)', 'var(--accent-2)'];
    return `
    <div class="bundle-card reveal" data-delay="${i % 4}" style="--a1:${a1}; --a2:${a2}">
      ${b.badge ? `<span class="bundle-badge">${b.badge}</span>` : ''}
      <div class="bundle-head">
        <span class="bundle-rank">Rank ${ROMAN[b.rank - 1] || b.rank}</span>
        <span class="bundle-emoji">${b.emoji}</span>
      </div>
      <h3 class="bundle-name">${b.name}</h3>
      <p class="bundle-tag">${b.tagline}</p>
      <div class="bundle-stat">${STACK_ICON}<span><b>${b.posters}</b> A4 posters</span>${b.freeDelivery ? '<em class="bundle-free">FREE DELIVERY</em>' : ''}</div>
      <ul class="bundle-feats">${b.features.map((f) => `<li>${CHECK_ICON}<span>${f}</span></li>`).join('')}</ul>
      <div class="bundle-pricewrap">
        <span class="bundle-price">${fmt(b.price)}</span>
        <span class="bundle-per">per pack</span>
      </div>
      <button class="bundle-cta" data-bundle="${b.id}">Pick your posters ${ARROW_ICON}</button>
    </div>`;
  }

  function renderGrid() {
    const grid = document.getElementById('bundleGrid');
    if (!grid) return;
    grid.innerHTML = BUNDLES.map(cardHtml).join('');
    $$('.bundle-card [data-bundle]', grid).forEach((btn) => {
      btn.addEventListener('click', () => openPicker(window.bundleById(btn.dataset.bundle)));
    });
  }

  /* ----- picker modal ----- */
  const PICKER = `
  <div class="modal" id="bundleModal">
    <div class="modal-card bundle-picker">
      <div class="rel">
        <button class="modal-close" id="bpClose" aria-label="Close">✕</button>
      </div>
      <div id="bpHead"></div>
      <div class="bp-search"><input id="bpSearch" type="search" placeholder="Search posters…" autocomplete="off" /></div>
      <div class="bp-count" id="bpCount"></div>
      <div class="bp-scroll" id="bpScroll"><div class="bp-grid" id="bpGrid"></div></div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block" id="bpAdd" disabled>Add to cart</button>
      </div>
    </div>
  </div>`;

  let cur = null;       // current bundle
  let sel = [];         // chosen posters [{ title, sku, src, anime }]

  function picker() { return document.getElementById('bundleModal'); }

  function openPicker(b) {
    if (!b) return;
    cur = b;
    sel = [];
    const existing = window.ShonenCart.items.find((i) => i.animeId === 'bundle' && i.bundleId === b.id);
    if (existing && existing.selections) sel = existing.selections.map((s) => Object.assign({}, s));

    if (!picker()) {
      document.body.insertAdjacentHTML('beforeend', PICKER);
      $('#bpClose').addEventListener('click', closePicker);
      $('#bpAdd').addEventListener('click', addBundle);
      $('#bpSearch').addEventListener('input', () => renderGrid2($('#bpSearch').value));
      picker().addEventListener('click', (e) => { if (e.target === picker()) closePicker(); });
    }

    const tier = TIERS[b.id];
    if (tier) {
      picker().style.setProperty('--a1', tier[0]);
      picker().style.setProperty('--a2', tier[1]);
    }

    const head = $('#bpHead');
    head.innerHTML = `
      <div class="bp-head">
        <div>
          <h2>${b.emoji} ${b.name}</h2>
          <p class="sub">${b.tagline}</p>
        </div>
        <div class="bp-head-price">${fmt(b.price)}<small>${b.posters} posters · A4</small></div>
      </div>`;

    renderGrid2('');
    refreshCount();
    picker().classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#bpSearch').value = '';
  }

  function closePicker() {
    const p = picker();
    if (!p) return;
    p.classList.remove('open');
    document.body.style.overflow = '';
  }

  function allPosters() {
    return ((window.STORE && window.STORE.animes) || []).map((a) => a.posters.map((p) => ({ anime: a.name, animeId: a.id, title: p.title, sku: p.sku, src: p.src }))).flat();
  }

  function bpItemHtml(it) {
    const idx = sel.findIndex((s) => s.src === it.src);
    return `
    <button type="button" class="bp-item${idx > -1 ? ' on' : ''}" data-src="${it.src}" data-idx="${idx > -1 ? idx + 1 : ''}">
      <img src="${it.src}" alt="${it.title}" loading="lazy" />
      <span class="bp-tick">${idx > -1 ? idx + 1 : ''}</span>
      <span class="bp-name">${it.title}<i>${it.anime}</i></span>
    </button>`;
  }

  function renderGrid2(filter) {
    const grid = document.getElementById('bpGrid');
    if (!grid) return;
    const f = (filter || '').trim().toLowerCase();
    const pool = allPosters();
    if (!pool.length) {
      grid.innerHTML = '<div style="color:var(--muted);text-align:center;padding:40px 0;">No posters loaded yet.</div>';
      return;
    }
    const groups = {};
    pool.forEach((p) => { (groups[p.anime] = groups[p.anime] || []).push(p); });
    grid.innerHTML = Object.keys(groups).map((name) => {
      const ps = groups[name].filter((p) => !f || p.title.toLowerCase().includes(f) || (p.sku || '').toLowerCase().includes(f));
      if (!ps.length) return '';
      return `
      <div class="bp-group">
        <h5>${name} <span>${ps.length}</span></h5>
        <div class="bp-row">${ps.map(bpItemHtml).join('')}</div>
      </div>`;
    }).join('');
    $$('.bp-item', grid).forEach((el) => el.addEventListener('click', () => togglePick(el.dataset.src)));
  }

  function refreshCount() {
    const p = picker();
    if (!p) return;
    $('#bpCount').textContent = `${sel.length} / ${cur.posters} posters selected`;
    $('#bpAdd').disabled = sel.length !== cur.posters;
    $('#bpAdd').textContent = sel.length === cur.posters ? `Add to cart · ${fmt(cur.price)}` : `Pick ${cur.posters} posters`;
    $$('.bp-item', $('#bpGrid')).forEach((el) => {
      const idx = sel.findIndex((s) => s.src === el.dataset.src);
      el.classList.toggle('on', idx > -1);
      el.dataset.idx = idx > -1 ? idx + 1 : '';
      const tick = $('.bp-tick', el);
      if (tick) tick.textContent = idx > -1 ? idx + 1 : '';
    });
  }

  function togglePick(src) {
    const idx = sel.findIndex((s) => s.src === src);
    if (idx > -1) { sel.splice(idx, 1); }
    else if (sel.length >= cur.posters) {
      const first = $('.bp-item.on', $('#bpGrid'));
      if (first) { first.classList.add('full'); setTimeout(() => first.classList.remove('full'), 600); }
      window.Shop.toast(`Pack is full — deselect one to swap`, 'err');
      return;
    } else {
      const it = allPosters().find((p) => p.src === src);
      if (it) sel.push(it);
    }
    refreshCount();
  }

  function addBundle() {
    if (sel.length !== cur.posters) return;
    window.ShonenCart.addBundle(cur, sel.map((s) => Object.assign({}, s)));
    closePicker();
    window.Shop.toast(`${cur.name} added to cart`);
    window.Shop.openCart();
  }

  /* reveal observer for bundle cards */
  function initReveal() {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => obs.observe(el));
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderGrid();
    initReveal();
  });

  window.Bundles = { openPicker };
})();
