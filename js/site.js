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
  const BUSINESS_WHATSAPP = '919999999999';

  /* ----- shared chrome markup ----- */
  const FOOTER = `
  <footer class="footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="brand" href="index.html">
            <img src="assets/logo.svg" alt="Shonen Scrolls" />
            <span>SHONEN<br /><span class="brand-sub">SCROLLS</span></span>
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
          <div class="footer-links">
            <a href="https://wa.me/${BUSINESS_WHATSAPP}" target="_blank" rel="noopener">Order on WhatsApp</a>
            <a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Shonen Scrolls. All rights reserved.</span>
        <span class="kanji">少年巻物</span>
        <span>Fan-art prints — all series belong to their respective owners.</span>
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
      <div class="cart-total"><span class="lbl">Total</span><span class="amt" id="cartTotal">Rs 0</span></div>
      <button class="btn btn-primary btn-block" id="checkoutBtn">Checkout →</button>
      <p class="cart-note">A4 Rs 250 · A5 Rs 150 · A6 Rs 100 · Paid on WhatsApp</p>
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
          <div class="field"><label for="coPhone">Phone / WhatsApp *</label><input id="coPhone" name="phone" type="tel" autocomplete="tel" inputmode="numeric" placeholder="10-digit mobile" /></div>
          <div class="field full"><label for="coAddress">Delivery address *</label><textarea id="coAddress" name="address" autocomplete="street-address" placeholder="House / flat, street, area"></textarea></div>
          <div class="field"><label for="coCity">City *</label><input id="coCity" name="city" autocomplete="address-level2" placeholder="City" /></div>
          <div class="field"><label for="coPincode">Pincode *</label><input id="coPincode" name="pincode" type="tel" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="6-digit pincode" /></div>
          <div class="field full"><label for="coNote">Notes (optional)</label><textarea id="coNote" name="notes" placeholder="Anything we should know?"></textarea></div>
        </form>
        <div class="modal-actions">
          <button class="btn btn-primary btn-block" id="coSubmit">Place order on WhatsApp</button>
          <button class="btn btn-ghost btn-block" id="coCopy">Copy order summary</button>
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
          <button class="btn btn-gold btn-block" id="coAgain">Continue shopping</button>
        </div>
      </div>
    </div>
  </div>`;

  const TOAST = '<div class="toast-wrap" id="toastWrap"></div>';

  const LIGHTBOX = `
  <div class="lightbox" id="lightbox" aria-label="Poster preview">
    <button class="lb-close" id="lbClose" aria-label="Close preview">✕</button>
    <button class="lb-nav lb-prev" id="lbPrev" aria-label="Previous">‹</button>
    <img id="lbImg" alt="Poster preview" />
    <button class="lb-nav lb-next" id="lbNext" aria-label="Next">›</button>
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
    const s = window.SIZES[it.size];
    const key = `${it.animeId}::${it.src}::${it.size}`;
    const note = it.note ? `<div class="ci-note">${it.note}</div>` : '';
    return `
    <div class="cart-item" data-key="${key}">
      <img src="${it.src}" alt="${it.title}" loading="lazy" />
      <div class="ci-info">
        <div class="ci-name">${it.title}</div>
        <div class="ci-anime">${it.anime}</div>
        ${note}
        <div><span class="ci-size">${s.label} · ${s.inches}</span></div>
        <div class="ci-price">${fmt(s.price)} × ${it.qty} = ${fmt(s.price * it.qty)}</div>
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
    const count = $('#cartCount');
    const checkoutBtn = $('#checkoutBtn');
    const clearBtn = $('#cartClear');
    if (!body) return;
    count.textContent = items.length ? window.ShonenCart.count : '';
    total.textContent = fmt(window.ShonenCart.total);

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
        const it = items.find((i) => `${i.animeId}::${i.src}::${i.size}` === key);
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
