/* ============================================================
   SHONEN SCROLLS — shared site logic
   Loads manifest, injects shared chrome (footer/cart/modal/toast),
   wires global UI, exposes helpers.
   ============================================================ */
(function () {
  'use strict';

  /* ----- helpers ----- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmt = (n) => 'Rs ' + Number(n).toLocaleString('en-PK');

  window.$$ = $$;
  window.fmt = fmt;

  /* ----- search matching (shared with the search page) ----- */
  function normalize(s) { return String(s || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim(); }
  window.SearchUtil = {
    normalize,
    series(q, animes) {
      const n = normalize(q);
      if (!n) return [];
      return animes.filter((a) => normalize(a.name + ' ' + (a.kanji || '') + ' ' + a.id).includes(n));
    },
    posters(q, animes) {
      const n = normalize(q);
      if (!n) return [];
      const out = [];
      for (const a of animes) {
        for (const p of a.posters) {
          if (normalize(p.title + ' ' + a.name + ' ' + (a.kanji || '')).includes(n)) out.push({ anime: a, poster: p });
        }
      }
      return out;
    },
  };

  /* ----- navbar search widget ----- */
  function initSearch() {
    const input = document.getElementById('searchInput');
    const drop = document.getElementById('searchDrop');
    if (!input || !drop) return;
    const animes = () => (window.STORE && window.STORE.animes) || [];

    const FULL_PLACEHOLDER = 'Search posters & series…';
    input.addEventListener('focus', () => { input.placeholder = FULL_PLACEHOLDER; if (input.value.trim()) renderSuggestions(input.value); });
    input.addEventListener('blur', () => { input.placeholder = 'Search'; });

    const close = () => { drop.hidden = true; };
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

    function renderSuggestions(raw) {
      const q = raw.trim();
      const qn = window.SearchUtil.normalize(q);
      if (!qn) { close(); return; }
      const series = window.SearchUtil.series(qn, animes()).slice(0, 4);
      const posters = window.SearchUtil.posters(qn, animes()).slice(0, 6);

      if (!series.length && !posters.length) {
        drop.innerHTML = `<div class="s-empty">No matches for “${esc(q)}”</div>`;
        drop.hidden = false;
        return;
      }
      let html = '<div class="s-list">';
      if (series.length) {
        html += `<div class="s-group">Series</div>` + series.map((a) => `
          <a class="s-item" href="anime.html?anime=${encodeURIComponent(a.id)}">
            <img src="${a.cover}" alt="" />
            <span><b>${esc(a.name)}</b><small>${a.count} designs</small></span>
          </a>`).join('');
      }
      if (posters.length) {
        html += `<div class="s-group">Posters</div>` + posters.map((r) => {
          const idx = r.anime.posters.indexOf(r.poster);
          return `<a class="s-item" href="anime.html?anime=${encodeURIComponent(r.anime.id)}#p${r.anime.id}-${idx}">
            <img src="${r.poster.src}" alt="" />
            <span><b>${esc(r.poster.title)}</b><small>${esc(r.anime.name)}</small></span>
          </a>`;
        }).join('');
      }
      html += '</div>';
      html += `<div class="s-all" data-q="${esc(q)}">See all results →</div>`;
      drop.innerHTML = html;
      drop.hidden = false;

      drop.querySelectorAll('.s-item').forEach((a) => a.addEventListener('click', close));
      const all = drop.querySelector('.s-all');
      if (all) all.addEventListener('click', () => { window.location.href = 'search.html?q=' + encodeURIComponent(q); });
    }

    input.addEventListener('input', () => renderSuggestions(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        close();
        const q = input.value.trim();
        if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q);
      } else if (e.key === 'Escape') {
        close();
        input.blur();
      }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrap')) close(); });
  }

  /* editable: your WhatsApp number for orders, with country code, digits only */
  const BUSINESS_WHATSAPP = '923215247883';

  /* ----- shared chrome markup ----- */
  const FOOTER = `
  <footer class="footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="brand" href="index.html">
            <img src="assets/android-chrome-192x192.png" alt="Shonen Scrolls" />
          </a>
          <p class="about">Premium anime posters, hand-printed and shipped to your wall. Pick a series, pick a size, bring it home.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <div class="footer-links">
            <a href="index.html">Home</a>
            <a href="index.html#animes">All series</a>
            <a href="index.html#featured">Featured scrolls</a>
            <a href="index.html#sizes">Sizes & prices</a>
            <a href="custom.html">Custom design</a>
          </div>
        </div>
        <div>
          <h4>Support</h4>
          <div class="footer-links">
            <a href="index.html#sizes">Size guide</a>
            <a href="index.html#craft">Print quality</a>
            <a href="#" onclick="return false">Shipping info</a>
          </div>
        </div>
        <div>
          <h4>Studio</h4>
          <div class="footer-social">
            <a class="social-btn social-wa" href="https://wa.me/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>WhatsApp</span>
            </a>
            <a class="social-btn social-ig" href="https://www.instagram.com/shonenscrolls_/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
              <span>Instagram</span>
            </a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Shonen Scrolls. All rights reserved.</span>
        <span class="kanji">少年巻物</span>
        <span>Fan-art prints — all series belong to their respective owners.<br /><span class="credit"><span class="k">Designed by</span> <a href="https://www.instagram.com/umarduino/" target="_blank" rel="noopener">umarduino</a></span></span>
      </div>
    </div>
  </footer>`;

  const CART = `
  <div class="overlay" id="overlay"></div>
  <aside class="cart-drawer" id="cartDrawer" aria-label="Shopping cart">
    <div class="cart-head">
      <h3>Your cart</h3>
      <div class="cart-head-actions">
        <button class="cart-clear" id="cartClear">Clear cart</button>
        <button class="close" id="cartClose" aria-label="Close cart">✕</button>
      </div>
    </div>
    <div class="cart-body" id="cartBody"></div>
    <div class="cart-foot">
      <div class="cart-total cart-ship"><span class="lbl">Shipping</span><span class="amt" id="cartShip">Rs 200</span></div>
      <div class="cart-total"><span class="lbl">Total</span><span class="amt" id="cartTotal">Rs 0</span></div>
      <button class="btn btn-primary btn-block" id="checkoutBtn">Checkout <svg class="btn-caret" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M15 2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm4.5 5.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5z"/></svg></button>
      <p class="cart-note">A4 Rs 250 · A5 Rs 150 · A6 Rs 100 · + Rs 200 shipping · Paid on WhatsApp</p>
    </div>
  </aside>`;

  const MODAL = `
  <div class="modal" id="checkoutModal" role="dialog" aria-modal="true" aria-label="Checkout">
    <div class="modal-card">
      <div class="rel"><button class="modal-close" id="checkoutClose" aria-label="Close checkout">✕</button></div>
      <div id="coForm">
        <h2>Checkout</h2>
        <p class="sub">Review your order and drop your delivery details.</p>
        <div class="order-summary">
          <h4>Order summary</h4>
          <div id="coSummary"></div>
          <div class="os-total">Total <span id="coTotal">Rs 0</span></div>
        </div>
        <form id="coFormEl" class="form-grid" novalidate>
          <div class="field"><label for="coName">Full name *</label><input id="coName" name="name" autocomplete="name" placeholder="e.g. Yuji Itadori" /></div>
          <div class="field"><label for="coPhone">Phone / WhatsApp *</label><input id="coPhone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="e.g. 0300 1234567" /></div>
          <div class="field full"><label for="coAddress">Delivery address *</label><textarea id="coAddress" name="address" autocomplete="street-address" placeholder="House / flat, street, area"></textarea></div>
          <div class="field"><label for="coCity">City *</label><input id="coCity" name="city" autocomplete="address-level2" placeholder="City" /></div>
          <div class="field"><label for="coPincode">Postal code (optional)</label><input id="coPincode" name="pincode" type="tel" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="e.g. 46000" /></div>
          <div class="field full"><label for="coNote">Notes (optional)</label><textarea id="coNote" name="notes" placeholder="Anything we should know?"></textarea></div>
        </form>
        <div class="modal-actions">
          <button class="btn btn-primary btn-block" id="coSubmit">Place order on WhatsApp <svg class="btn-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8"/></svg></button>
          <button class="btn btn-ghost btn-block" id="coCopy">Copy order summary <svg class="btn-caret" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.5 2a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H12a.5.5 0 0 1 0-1h.5A1.5 1.5 0 0 1 14 2.5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-12A1.5 1.5 0 0 1 3.5 1H4a.5.5 0 0 1 0 1z"/><path d="M10 .5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5.5.5 0 0 0-.5.5V2a.5.5 0 0 0 .5.5h5A.5.5 0 0 0 11 2v-.5a.5.5 0 0 0-.5-.5.5.5 0 0 1-.5-.5"/></svg></button>
        </div>
      </div>
      <div id="coSuccess" style="display:none;">
        <div class="success-mark">✓</div>
        <h2 style="text-align:center;">Order received!</h2>
        <p class="sub" style="text-align:center;">We've opened WhatsApp with your order ready to send. Hit send and we'll confirm your payment & delivery.</p>
        <div class="order-summary">
          <h4>Order #<span id="coOrderId"></span></h4>
          <div id="coFinalSummary"></div>
          <div class="os-total">Total <span id="coFinalTotal">Rs 0</span></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-gold btn-block" id="coAgain">Continue shopping <svg class="btn-caret" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6 12.796V3.204L11.481 8zm.659.753 5.48-4.796a1 1 0 0 0 0-1.506L6.66 2.451C6.011 1.885 5 2.345 5 3.204v9.592a1 1 0 0 0 1.659.753"/></svg></button>
        </div>
      </div>
    </div>
  </div>`;

  const TOAST = '<div class="toast-wrap" id="toastWrap"></div>';

  const LIGHTBOX = `
  <div class="lightbox" id="lightbox" aria-label="Poster preview">
    <button class="lb-close" id="lbClose" aria-label="Close preview">✕</button>
    <button class="lb-nav lb-prev" id="lbPrev" aria-label="Previous"></button>
    <img id="lbImg" alt="Poster preview" />
    <button class="lb-nav lb-next" id="lbNext" aria-label="Next"></button>
    <div class="lb-cap" id="lbCap"></div>
  </div>`;

  /* ----- toast ----- */
  function toast(msg, type) {
    const wrap = $('#toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = `<span class="toast-ico">${type === 'err' ? '✕' : '✓'}</span>${msg}`;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2600);
  }

  /* ----- cart drawer ----- */
  const cartDrawer = () => $('#cartDrawer');
  function openCart() { cartDrawer() && cartDrawer().classList.add('open'); $('#overlay') && $('#overlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeCart() { cartDrawer() && cartDrawer().classList.remove('open'); $('#overlay') && $('#overlay').classList.remove('open'); document.body.style.overflow = ''; }

  function cartItemHtml(it) {
    const isBundle = it.animeId === 'bundle';
    const s = window.SIZES[it.size] || {};
    const key = `${it.animeId}::${it.bundleId || it.src}::${it.size}`;
    const note = it.note ? `<div class="ci-note">${it.note}</div>` : '';
    const pickList = isBundle
      ? `<div class="ci-picks">${(it.selections || []).slice(0, 4).map((s) => `<span>${s.sku ? s.sku + ' · ' : ''}${s.title}</span>`).join('')}${it.selections && it.selections.length > 4 ? `<span class="more">+${it.selections.length - 4} more</span>` : ''}</div>`
      : '';
    const thumb = isBundle
      ? `<div class="ci-thumb ci-bundle">${(window.bundleById && window.bundleById(it.bundleId)) ? window.bundleById(it.bundleId).emoji : '🎴'}</div>`
      : `<img src="${it.src}" alt="${it.title}" loading="lazy" />`;
    return `
    <div class="cart-item" data-key="${key}">
      ${thumb}
      <div class="ci-info">
        <div class="ci-name">${it.title}${it.sku ? ` <span class="ref">${it.sku}</span>` : ''}</div>
        <div class="ci-anime">${isBundle ? 'Shonen Scrolls Bundles' : it.anime}</div>
        ${note}
        ${pickList}
        <div><span class="ci-size">${isBundle ? it.posters + ' × A4 posters' : s.label + ' · ' + s.inches}</span></div>
        <div class="ci-price">${fmt(it.price != null ? it.price : s.price)} × ${it.qty} = ${fmt((it.price != null ? it.price : s.price) * it.qty)}</div>
        <div class="ci-qty">
          <button class="qty-min" data-dir="-1" aria-label="Decrease">−</button>
          <span>${it.qty}</span>
          <button class="qty-plus" data-dir="1" aria-label="Increase">+</button>
        </div>
      </div>
      <button class="ci-remove" aria-label="Remove">✕</button>
    </div>`;
  }

  function renderCart(items) {
    const body = $('#cartBody');
    const total = $('#cartTotal');
    const ship = $('#cartShip');
    const count = $('#cartCount');
    const checkoutBtn = $('#checkoutBtn');
    const clearBtn = $('#cartClear');
    if (!body) return;
    count.textContent = items.length ? window.ShonenCart.count : '';
    if (ship) ship.textContent = window.ShonenCart.shipping ? fmt(window.ShonenCart.shipping) : 'FREE';
    total.textContent = fmt(window.ShonenCart.grandTotal);

    if (!items.length) {
      if (clearBtn) clearBtn.style.display = 'none';
      body.innerHTML = `
        <div class="cart-empty">
          <div class="bag">🛍️</div>
          <h3>Your cart is empty</h3>
          <p>Pick a scroll, pick a size, bring it home.</p>
          <a class="btn btn-primary" style="margin-top:18px;" href="index.html#animes">Browse series</a>
        </div>`;
      checkoutBtn.disabled = true;
      return;
    }
    if (clearBtn) clearBtn.style.display = '';
    checkoutBtn.disabled = false;
    body.innerHTML = items.map(cartItemHtml).join('');

    body.querySelectorAll('.ci-remove').forEach((b) => {
      b.addEventListener('click', () => window.ShonenCart.remove(b.closest('.cart-item').dataset.key));
    });
    body.querySelectorAll('.qty-min, .qty-plus').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.closest('.cart-item').dataset.key;
        const it = items.find((i) => `${i.animeId}::${i.bundleId || i.src}::${i.size}` === key);
        if (it) window.ShonenCart.setQty(key, it.qty + Number(b.dataset.dir));
      });
    });
  }

  /* ----- lightbox ----- */
  const Lightbox = {
    items: [],
    idx: 0,
    open(items, idx) {
      this.items = items; this.idx = idx;
      $('#lightbox').classList.add('open');
      document.body.style.overflow = 'hidden';
      this.render();
    },
    render() {
      const it = this.items[this.idx];
      $('#lbImg').src = it.src;
      $('#lbCap').textContent = `${it.title} · ${this.idx + 1} / ${this.items.length}`;
      $('#lbPrev').style.visibility = this.items.length > 1 ? 'visible' : 'hidden';
      $('#lbNext').style.visibility = this.items.length > 1 ? 'visible' : 'hidden';
    },
    next() { if (this.items.length) { this.idx = (this.idx + 1) % this.items.length; this.render(); } },
    prev() { if (this.items.length) { this.idx = (this.idx - 1 + this.items.length) % this.items.length; this.render(); } },
    close() { $('#lightbox').classList.remove('open'); document.body.style.overflow = ''; },
  };

  /* ----- reveal on scroll ----- */
  function initReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
  }

  /* ----- manifest load ----- */
  window.STORE = null;

  async function boot() {
    if (window.__MANIFEST__) {
      /* embedded copy (works even when the page is opened straight from disk) */
      window.STORE = window.__MANIFEST__;
    } else {
      try {
        const res = await fetch('assets/data/manifest.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('manifest fetch failed');
        window.STORE = await res.json();
        window.SIZES = window.STORE.sizes || window.SIZES;
      } catch (e) {
        window.STORE = { sizes: window.SIZES, animes: [] };
        toast('Could not load the library. Run <b>node tools/generate-manifest.js</b> and refresh.', 'err');
      }
    }

    /* inject shared chrome */
    $('#footerMount').innerHTML = FOOTER;
    $('#cartMount').innerHTML = CART;
    $('#modalMount').innerHTML = MODAL;
    $('#toastMount').innerHTML = TOAST;
    $('#modalMount').insertAdjacentHTML('beforeend', LIGHTBOX);

    wireUI();
    initSearch();

    window.ShonenCart.on(renderCart);
    initReveal();

    document.dispatchEvent(new CustomEvent('store:ready', { detail: window.STORE }));
  }

  function wireUI() {
    /* cart toggle */
    $('#cartToggle').addEventListener('click', openCart);
    $('#cartClose').addEventListener('click', closeCart);
    $('#overlay').addEventListener('click', () => { closeCart(); closeCheckout(); });
    $('#cartClear').addEventListener('click', () => { window.ShonenCart.clear(); toast('Cart cleared'); });

    /* burger / mobile menu */
    const burger = $('#burger'), menu = $('#mobileMenu');
    burger.addEventListener('click', () => {
      const open = document.querySelector('.nav').classList.toggle('open');
      menu.classList.toggle('open', open);
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      document.querySelector('.nav').classList.remove('open'); menu.classList.remove('open');
    }));

    /* nav scroll style */
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    /* esc */
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (Lightbox.items.length && $('#lightbox').classList.contains('open')) return Lightbox.close();
      closeCheckout();
      closeCart();
    });

    /* lightbox controls */
    $('#lbClose').addEventListener('click', () => Lightbox.close());
    $('#lbPrev').addEventListener('click', () => Lightbox.prev());
    $('#lbNext').addEventListener('click', () => Lightbox.next());
    $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') Lightbox.close(); });
    document.addEventListener('keydown', (e) => {
      if (!$('#lightbox').classList.contains('open')) return;
      if (e.key === 'ArrowRight') Lightbox.next();
      if (e.key === 'ArrowLeft') Lightbox.prev();
    });
  }

  /* checkout modal (wired by checkout.js but defined here) */
  function openCheckout() {
    const modal = $('#checkoutModal');
    if (!window.ShonenCart.count) { toast('Your cart is empty', 'err'); return; }
    $('#coForm').style.display = '';
    $('#coSuccess').style.display = 'none';
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.Shop.onCheckoutOpen) window.Shop.onCheckoutOpen();
  }
  function closeCheckout() {
    const modal = $('#checkoutModal');
    if (modal) modal.classList.remove('open');
    if (document.body.style.overflow === 'hidden' && !$('#cartDrawer').classList.contains('open')) document.body.style.overflow = '';
  }

  /* public API */
  window.Shop = { openCart, closeCart, openCheckout, closeCheckout, toast, Lightbox, whatsapp: BUSINESS_WHATSAPP };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
