/* ============================================================
   SHONEN SCROLLS — home page
   Builds hero + featured marquees, series grid, size cards.
   ============================================================ */
(function () {
  'use strict';

  const stripHtml = (anime, posters) => posters.map((p) => {
    const idx = anime.posters.indexOf(p);
    return `
    <a class="mq-item" href="anime.html?anime=${encodeURIComponent(anime.id)}#p${anime.id}-${idx}">
      <img src="${p.src}" alt="${p.title}" loading="lazy" />
    </a>`;
  }).join('');

  function buildMarquee(animes, max) {
    const pool = [];
    animes.forEach((a) => a.posters.forEach((p) => pool.push({ a, p })));
    // deterministic interleave across series
    const chosen = [];
    let i = 0;
    while (chosen.length < max && pool.length) {
      chosen.push(pool[i % pool.length]);
      i += 7; // stride so we sample across all series
      if (i >= pool.length) i = (i + 3) % pool.length;
    }
    const one = chosen.map(({ a, p }) => stripHtml(a, [p])).join('');
    return one + one; // duplicated for seamless -50% loop
  }

  function buildAnimeGrid(animes) {
    const grid = document.getElementById('animeGrid');
    if (!animes.length) {
      grid.innerHTML = `<div style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">
        No series yet — drop designs into <b>designs/anime/&lt;anime&gt;/</b> and re-run <b>node tools/generate-manifest.js</b>.</div>`;
      return;
    }
    grid.innerHTML = animes.map((a, idx) => window.Gallery.animeCardHtml(a, idx % 4)).join('');
  }

  function buildSizes(sizes) {
    const grid = document.getElementById('sizesGrid');
    const order = ['A4', 'A5', 'A6'];
    const desc = {
      A4: 'The statement. Fits standard 8″ × 12″ frames — bold wall presence.',
      A5: 'The sweet spot. Perfect for desks, shelves and gallery walls.',
      A6: 'Pocket-sized charm. Great for corkboards, gifts and phone-stand decor.',
    };
    const popular = 'A5';
    grid.innerHTML = order.filter((k) => sizes[k]).map((k, idx) => {
      const s = sizes[k];
      return `
      <div class="size-card reveal ${k === popular ? 'popular' : ''}" data-delay="${idx}">
        ${k === popular ? '<span class="flag">Most popular</span>' : ''}
        <div class="paper"><div class="frame"><span>${k}</span></div></div>
        <h3>${k}</h3>
        <div class="dims">${s.inches}</div>
        <div class="price">${window.fmt(s.price)} <small>per print</small></div>
        <p class="desc">${desc[k]}</p>
        <a class="btn btn-ghost" style="margin-top:22px;" href="index.html#animes">Shop ${k}</a>
      </div>`;
    }).join('');
  }

  function init({ detail: store }) {
    const animes = store.animes || [];
    const total = animes.reduce((n, a) => n + (a.posters ? a.posters.length : 0), 0);

    /* hero count */
    const hc = document.getElementById('heroCount');
    if (hc) hc.textContent = total + '+';

    /* marquees */
    const hero = document.getElementById('heroMarquee');
    const feat = document.getElementById('featuredMarquee');
    if (hero && animes.length) hero.innerHTML = '<div class="marquee-track">' + buildMarquee(animes, 16) + '</div>';
    if (feat && animes.length) feat.innerHTML = '<div class="marquee-track">' + buildMarquee(animes, 18) + '</div>';

    /* series grid */
    buildAnimeGrid(animes);

    /* sizes */
    buildSizes(store.sizes || window.SIZES);

    /* poster stack */
    const stack = [document.getElementById('stackP1'), document.getElementById('stackP2'), document.getElementById('stackP3')];
    const pick = [0, 1, 2];
    animes.slice(0, 3).forEach((a, i) => {
      if (stack[i] && a.posters[pick[i]]) stack[i].src = a.posters[pick[i]].src;
    });

    /* trigger reveals that were added dynamically */
    requestAnimationFrame(() => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
      }, { threshold: 0.12 });
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => obs.observe(el));
    });
  }

  document.addEventListener('store:ready', init);
})();
