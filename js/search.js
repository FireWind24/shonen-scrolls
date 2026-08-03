/* ============================================================
   SHONEN SCROLLS — search page
   Live search across series (cards) and posters (buyable grid).
   Matching shared via window.SearchUtil in js/site.js.
   ============================================================ */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const sizes = () => (window.STORE ? window.STORE.sizes : window.SIZES) || window.SIZES;

  let animes = () => (window.STORE && window.STORE.animes) || [];

  function observeReveals() {
    requestAnimationFrame(() => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => obs.observe(el));
    });
  }

  function chip(label, q) {
    return `<button class="chip" data-q="${esc(q)}">${esc(label)}</button>`;
  }

  function popularChips() {
    const el = $('#popularChips');
    const names = animes().slice(0, 6).map((a) => a.name);
    const chars = ['Toji', 'Gojo', 'Sukuna', 'Naruto', 'Levi'];
    const qs = [...new Set([...names, ...chars])].slice(0, 8);
    el.innerHTML = `<span style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);align-self:center;margin-right:6px;">Popular</span>` + qs.map((n) => chip(n, n)).join('');
    el.querySelectorAll('.chip').forEach((c) => {
      c.addEventListener('click', () => {
        $('#pageSearchInput').value = c.dataset.q;
        runSearch();
      });
    });
  }

  function noResults(q) {
    return `
      <div class="search-none">
        <h2>Nothing found</h2>
        <p style="margin:12px 0 26px;">No series or posters match “${esc(q)}”. Try a character name or series.</p>
        <button class="btn btn-ghost" id="clearSearch">Clear search</button>
      </div>`;
  }

  function idleState() {
    return `
      <div class="search-none">
        <h2>Start typing</h2>
        <p style="margin-top:12px;">Search by poster or character (e.g. <b>Toji</b>) or by series (e.g. <b>jujutsu-kaisen</b>).</p>
      </div>`;
  }

  function runSearch() {
    const q = $('#pageSearchInput').value.trim();
    const qn = window.SearchUtil.normalize(q);
    const target = $('#searchResults');

    if (q) history.replaceState(null, '', 'search.html' + (qn ? '?q=' + encodeURIComponent(q) : ''));
    document.title = qn ? `Search: ${q} — Shonen Scrolls` : 'Search — Shonen Scrolls';

    if (!qn) { target.innerHTML = idleState(); observeReveals(); return; }

    const series = window.SearchUtil.series(qn, animes());
    const posters = window.SearchUtil.posters(qn, animes());

    if (!series.length && !posters.length) { target.innerHTML = noResults(q); observeReveals(); return; }

    let html = `<p class="search-summary">${posters.length + series.length} match${(posters.length + series.length) === 1 ? '' : 'es'} for <b>“${esc(q)}”</b></p>`;

    if (series.length) {
      html += `
        <div class="search-section">
          <h2 class="sec-title reveal">Series <span class="cnt">${series.length}</span></h2>
          <div class="anime-grid" id="searchSeriesGrid"></div>
        </div>`;
    }
    if (posters.length) {
      html += `
        <div class="search-section">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
            <h2 class="sec-title reveal">Posters <span class="cnt">${posters.length}</span></h2>
            <div class="chips" id="searchSizeQuick" style="margin:0;">
              <button class="chip active" data-size="">Default</button>
              <button class="chip" data-size="A4">All A4</button>
              <button class="chip" data-size="A5">All A5</button>
              <button class="chip" data-size="A6">All A6</button>
            </div>
          </div>
          <div class="poster-grid" id="searchPosterGrid"></div>
        </div>`;
    }
    target.innerHTML = html;

    if (series.length) {
      $('#searchSeriesGrid').innerHTML = series.map((a, i) => window.Gallery.animeCardHtml(a, i % 4)).join('');
    }
    if (posters.length) {
      window.Gallery.renderPosterGrid($('#searchPosterGrid'), posters, sizes(), { seed: 'search', quickEl: $('#searchSizeQuick'), linkTitles: true });
    }
    observeReveals();
  }

  function init({ detail: store }) {
    animes = () => store.animes || [];
    popularChips();

    const input = $('#pageSearchInput');
    const fromUrl = new URLSearchParams(location.search).get('q');
    if (fromUrl) { input.value = fromUrl; }

    let timer;
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 220); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); runSearch(); } });

    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'clearSearch') { input.value = ''; runSearch(); }
    });

    runSearch();
  }

  document.addEventListener('store:ready', init);
})();
