/* ============================================================
   SHONEN SCROLLS — checkout
   Wires the checkout modal: summary, validation and a
   WhatsApp order message (edit the number in js/site.js).
   ============================================================ */
(function () {
  'use strict';

  let orderId = '';

  function summaryLines(items) {
    return items.map((it, i) => {
      const isB = it.animeId === 'bundle';
      const s = window.SIZES[it.size] || {};
      const ref = it.sku ? ` [${it.sku}]` : '';
      const price = isB ? it.price : s.price;
      let line = `${i + 1}) ${it.title}${ref} — ${it.anime}\n   ${isB ? it.posters + ' × A4 posters' : s.label + ' (' + s.inches + ')'} × ${it.qty} = ${window.fmt(price * it.qty)}`;
      if (it.note) line += `\n   Brief: ${it.note}`;
      if (it.animeId === 'custom') line += `\n   (please send the reference image in this chat)`;
      if (isB && it.selections && it.selections.length) {
        line += `\n   Posters: ${it.selections.map((x, j) => `${j + 1}) ${x.title}${x.sku ? ' [' + x.sku + ']' : ''}`).join(' · ')}`;
        if (it.freeDelivery) line += '\n   (FREE delivery included)';
      }
      return line;
    }).join('\n');
  }

  function summaryHtml(items) {
    if (!items.length) return '<div class="os-line" style="color:var(--muted)">Your cart is empty.</div>';
    return items.map((it) => {
      const isB = it.animeId === 'bundle';
      const s = window.SIZES[it.size] || {};
      const ref = it.sku ? ` <span class="ref">${it.sku}</span>` : '';
      const price = isB ? it.price : s.price;
      return `
      <div class="os-line">
        <span>${it.title}${ref} · ${isB ? it.posters + ' × A4' : s.label}</span>
        <b>${window.fmt(price * it.qty)}</b>
      </div>`;
    }).join('');
  }

  function buildMessage(items, form) {
    const lines = [
      '🎌 SHONEN SCROLLS — NEW ORDER',
      `Order #${orderId}`,
      '',
      '— ITEMS —',
      summaryLines(items),
      '',
      `SUBTOTAL: ${window.fmt(window.ShonenCart.total)}`,
      `SHIPPING: ${window.fmt(window.ShonenCart.shipping)}`,
      `TOTAL: ${window.fmt(window.ShonenCart.grandTotal)}`,
      '',
      '— DELIVERY —',
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Address: ${form.address}`,
      `${form.city}${form.pincode ? ', ' + form.pincode : ''}`,
    ];
    if (form.notes) lines.push(`Notes: ${form.notes}`);
    return lines.join('\n');
  }

  function validate() {
    const g = (id) => document.getElementById(id).value.trim();
    const name = g('coName'), phone = g('coPhone'), address = g('coAddress'), city = g('coCity'), pincode = g('coPincode');
    const phoneDigits = phone.replace(/\D/g, '');
    const pincodeDigits = pincode.replace(/\D/g, '');
    let ok = true;
    const setErr = (id, bad) => { document.getElementById(id).classList.toggle('invalid', bad); if (bad) ok = false; };
    setErr('coName', name.length < 2);
    setErr('coPhone', phoneDigits.length < 10 || phoneDigits.length > 13);
    setErr('coAddress', address.length < 8);
    setErr('coCity', city.length < 2);
    setErr('coPincode', pincode !== '' && (pincodeDigits.length < 4 || pincodeDigits.length > 6));
    return ok;
  }

  function shipLine() {
    const sh = window.ShonenCart.shipping;
    return `<div class="os-line os-ship"><span>Shipping</span><b>${sh ? window.fmt(sh) : 'FREE'}</b></div>`;
  }

  function renderOrderSummary() {
    const items = window.ShonenCart.items;
    document.getElementById('coSummary').innerHTML = summaryHtml(items) + shipLine();
    document.getElementById('coTotal').textContent = window.fmt(window.ShonenCart.grandTotal);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => window.Shop.toast('Order summary copied ✓'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); window.Shop.toast('Order summary copied ✓'); } catch (e) { window.Shop.toast('Could not copy', 'err'); }
      ta.remove();
    }
  }

  function submitOrder(e) {
    if (e) e.preventDefault();
    if (!validate()) { window.Shop.toast('Please check the highlighted fields', 'err'); return; }
    const form = {
      name: document.getElementById('coName').value.trim(),
      phone: document.getElementById('coPhone').value.trim(),
      address: document.getElementById('coAddress').value.trim(),
      city: document.getElementById('coCity').value.trim(),
      pincode: document.getElementById('coPincode').value.trim(),
      notes: document.getElementById('coNote').value.trim(),
    };
    orderId = 'SS-' + (Date.now().toString(36) + Math.random().toString(36).slice(2, 5)).toUpperCase();

    const message = buildMessage(window.ShonenCart.items, form);
    document.getElementById('coOrderId').textContent = orderId;
    document.getElementById('coFinalSummary').innerHTML = summaryHtml(window.ShonenCart.items) + shipLine();
    document.getElementById('coFinalTotal').textContent = window.fmt(window.ShonenCart.grandTotal);

    /* show success, open WhatsApp, clear cart */
    const orderItems = window.ShonenCart.items;
    const orderTotal = window.ShonenCart.grandTotal;
    const orderShip = window.ShonenCart.shipping;
    document.getElementById('coForm').style.display = 'none';
    document.getElementById('coSuccess').style.display = '';
    window.open(`https://wa.me/${window.Shop.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    window.ShonenCart.clear();
    window.Shop.toast('Order placed — send it on WhatsApp!');

    /* email the seller the full order with poster attachments */
    const payload = {
      orderId,
      total: window.fmt(orderTotal),
      shipping: orderShip ? window.fmt(orderShip) : '',
      name: form.name, phone: form.phone, address: form.address,
      city: form.city, pincode: form.pincode, notes: form.notes,
      items: orderItems.map((it) => {
        const isB = it.animeId === 'bundle';
        const s = window.SIZES[it.size] || {};
        return {
          title: it.title, anime: it.anime, sku: it.sku || '', src: it.src || '',
          size: it.size, sizeLabel: isB ? it.posters + ' posters · A4' : s.label,
          qty: it.qty, price: it.price != null ? it.price : s.price,
          detail: it.selections && it.selections.length
            ? it.selections.map((x) => `${x.title}${x.sku ? ' [' + x.sku + ']' : ''}`).join(', ')
            : '',
        };
      }),
    };
    fetch('/api/order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((d) => window.Shop.toast(d.ok ? 'Email sent to seller ✓' : `Email failed: ${d.error || 'unknown'}`, d.ok ? '' : 'err'))
      .catch(() => window.Shop.toast('Email failed — not configured on this deploy', 'err'));
  }

  function init() {
    const submit = document.getElementById('coSubmit');
    if (!submit) return;

    document.getElementById('checkoutBtn').addEventListener('click', () => window.Shop.openCheckout());
    document.getElementById('checkoutClose').addEventListener('click', () => window.Shop.closeCheckout());
    document.getElementById('checkoutModal').addEventListener('click', (e) => { if (e.target.id === 'checkoutModal') window.Shop.closeCheckout(); });
    document.getElementById('coAgain').addEventListener('click', () => { window.Shop.closeCheckout(); window.Shop.openCart(); });
    submit.addEventListener('click', submitOrder);
    document.getElementById('coFormEl').addEventListener('submit', submitOrder);

    /* live validation cleanup */
    ['coName', 'coPhone', 'coAddress', 'coCity', 'coPincode'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => document.getElementById(id).classList.remove('invalid'));
    });

    document.getElementById('coCopy').addEventListener('click', () => {
      const form = {
        name: document.getElementById('coName').value.trim() || '—',
        phone: document.getElementById('coPhone').value.trim() || '—',
        address: document.getElementById('coAddress').value.trim() || '—',
        city: document.getElementById('coCity').value.trim() || '—',
        pincode: document.getElementById('coPincode').value.trim() || '—',
        notes: document.getElementById('coNote').value.trim(),
      };
      orderId = 'SS-' + (Date.now().toString(36) + Math.random().toString(36).slice(2, 5)).toUpperCase();
      copyText(buildMessage(window.ShonenCart.items, form));
    });

    window.Shop.onCheckoutOpen = renderOrderSummary;
  }

  document.addEventListener('store:ready', init);
})();
