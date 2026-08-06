/* ============================================================
   SHONEN SCROLLS — cart module
   Persists to localStorage. Pure data; UI lives in site.js.
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'shonen_cart_v1';
  const SIZES = { A4: { label: 'A4', inches: '8" × 12"', price: 250 }, A5: { label: 'A5', inches: '6" × 8"', price: 150 }, A6: { label: 'A6', inches: '4" × 6"', price: 100 } };
  const SHIPPING = 200;

  let items = [];
  const listeners = [];

  function load() {
    try { items = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { items = []; }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(items));
    listeners.forEach((fn) => fn(items));
  }

  function keyOf(it) { return `${it.animeId}::${it.src}::${it.size}`; }

  const Cart = {
    init() { load(); },
    on(fn) { listeners.push(fn); fn(items); },

    add(posters, size, qty) {
      qty = Math.max(1, qty | 0 || 1);
      const p = posters;
      const existing = items.find((i) => i.animeId === p.animeId && i.src === p.src && i.size === size);
      if (existing) existing.qty += qty;
      else items.push({
        animeId: p.animeId,
        anime: p.anime,
        title: p.title,
        src: p.src,
        sku: p.sku,
        size,
        qty,
        note: p.note,
      });
      save();
    },

    setQty(key, qty) {
      const it = items.find((i) => keyOf(i) === key);
      if (!it) return;
      qty = Math.max(1, qty | 0 || 1);
      it.qty = qty;
      save();
    },

    remove(key) {
      items = items.filter((i) => keyOf(i) !== key);
      save();
    },

    clear() { items = []; save(); },

    get items() { return items.slice(); },
    get count() { return items.reduce((n, i) => n + i.qty, 0); },
    get total() { return items.reduce((n, i) => n + i.qty * (SIZES[i.size] ? SIZES[i.size].price : 0), 0); },
    get shipping() { return items.length ? SHIPPING : 0; },
    get grandTotal() { return this.total + this.shipping; },
    priceOf(size) { return (SIZES[size] || {}).price || 0; },
  };

  window.ShonenCart = Cart;
  window.SIZES = SIZES;
  window.SHIPPING = SHIPPING;
  Cart.init();
})();
