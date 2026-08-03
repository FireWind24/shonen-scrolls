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
      const s = window.SIZES[it.size];
      let line = `${i + 1}) ${it.title} — ${it.anime}\n   ${s.label} (${s.inches}) × ${it.qty} = ${window.fmt(s.price * it.qty)}`;
      if (it.note) line += `\n   Brief: ${it.note}`;
      if (it.animeId === 'custom') line += `\n   (please send the reference image in this chat)`;
      return line;
    }).join('\n');
  }

  function summaryHtml(items) {
    if (!items.length) return '<div class="os-line" style="color:var(--muted)">Your cart is empty.</div>';
    return items.map((it) => {
      const s = window.SIZES[it.size];
      return `
      <div class="os-line">
        <span>${it.title} · ${s.label}</span>
        <b>${window.fmt(s.price * it.qty)}</b>
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
      `TOTAL: ${window.fmt(window.ShonenCart.total)}`,
      '',
      '— DELIVERY —',
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Address: ${form.address}`,
      `${form.city}, ${form.pincode}`,
    ];
    if (form.notes) lines.push(`Notes: ${form.notes}`);
    return lines.join('\n');
  }

  function validate() {
    const g = (id) => document.getElementById(id).value.trim();
    const name = g('coName'), phone = g('coPhone'), address = g('coAddress'), city = g('coCity'), pincode = g('coPincode');
    let ok = true;
    const setErr = (id, bad) => { document.getElementById(id).classList.toggle('invalid', bad); if (bad) ok = false; };
    setErr('coName', name.length < 2);
    setErr('coPhone', !/^\d{10}$/.test(phone));
    setErr('coAddress', address.length < 8);
    setErr('coCity', city.length < 2);
    setErr('coPincode', !/^\d{6}$/.test(pincode));
    return ok;
  }

  function renderOrderSummary() {
    const items = window.ShonenCart.items;
    document.getElementById('coSummary').innerHTML = summaryHtml(items);
    document.getElementById('coTotal').textContent = window.fmt(window.ShonenCart.total);
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
    if (!validate()) { window.Shop.toast('Please fill the required fields', 'err'); return; }
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
    document.getElementById('coFinalSummary').innerHTML = summaryHtml(window.ShonenCart.items);
    document.getElementById('coFinalTotal').textContent = window.fmt(window.ShonenCart.total);

    /* show success, open WhatsApp, clear cart */
    document.getElementById('coForm').style.display = 'none';
    document.getElementById('coSuccess').style.display = '';
    window.open(`https://wa.me/${window.Shop.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    window.ShonenCart.clear();
    window.Shop.toast('Order placed — send it on WhatsApp!');
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
