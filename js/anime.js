/* ============================================================
   SHONEN SCROLLS — anime gallery page
   Themes the page to the series and renders its poster shop grid.
   Poster grid rendering lives in the shared js/gallery.js.
   ============================================================ */
(function () {
  'use strict';

  function moreCard(a) {
    return window.Gallery.animeCardHtml(a, 0);
  }

  function init({ detail: store }) {
    const animes = store.animes || [];
    const sizes = store.sizes || window.SIZES;
    const id = new URLSearchParams(location.search).get('anime');
    const anime = animes.find((a) => a.id === id);

    if (!anime) {
      document.getElementById('posterGrid').innerHTML = `
        <div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px 0;">
          <h2 style="font-family:var(--font-display);font-size:40px;">Series not found</h2>
          <p style="margin:14px 0 24px;">This scroll may have rolled away.</p>
          <a class="btn btn-primary" href="index.html#animes">Back to the library</a>
        </div>`;
      return;
    }

    window.Gallery.applyTheme(anime.theme);

    /* page meta */
    document.title = `${anime.name} — Shonen Scrolls`;
    document.getElementById('heroTitle').textContent = anime.name;
    document.getElementById('heroKanji').textContent = anime.kanji || '';
    document.getElementById('heroTag').textContent = anime.tagline || '';
    document.getElementById('heroCount').textContent = anime.posters.length;
    document.getElementById('heroPrice').textContent = window.fmt(Math.min(...Object.values(sizes).map((s) => s.price)));
    document.getElementById('heroSizes').textContent = Object.keys(sizes).length;
    document.getElementById('heroKanjiBg').textContent = anime.kanji || anime.name.slice(0, 2);

    /* posters */
    const grid = document.getElementById('posterGrid');
    window.Gallery.renderPosterGrid(grid, anime.posters.map((p) => ({ anime, poster: p })), sizes, {
      seed: anime.id,
      quickEl: document.getElementById('sizeQuick'),
    });

    /* more series */
    const others = animes.filter((a) => a.id !== anime.id).slice(0, 3);
    const more = document.getElementById('moreGrid');
    if (others.length) more.innerHTML = others.map(moreCard).join('');
    else document.getElementById('moreSeries').style.display = 'none';

    /* deep-link scroll (e.g. from search) */
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        setTimeout(() => {
          if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('in');
          target.classList.add('flash');
          setTimeout(() => target.classList.remove('flash'), 2600);
        }, 200);
      }
    }

    requestAnimationFrame(() => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
      }, { threshold: 0.12 });
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => obs.observe(el));
    });
  }

  document.addEventListener('store:ready', init);
})();
