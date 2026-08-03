/* ============================================================
   SHONEN SCROLLS — custom design page
   Collects a design brief (+ optional reference image) and
   drops a "Custom design" line into the cart for checkout.
   ============================================================ */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);

  function sizePrice() {
    const sel = document.querySelector('input[name="cd-size"]:checked');
    const k = sel ? sel.value : 'A5';
    return { key: k, size: window.SIZES[k] };
  }

  function updateTotal() {
    const { size } = sizePrice();
    const qty = Math.max(1, Number($('#cdQtyVal').textContent) || 1);
    $('#cdTotal').textContent = window.fmt(size.price * qty);
  }

  function setQty(n) {
    n = Math.min(99, Math.max(1, n));
    $('#cdQtyVal').textContent = n;
    updateTotal();
  }

  function init() {
    /* poster size icons (shared with the gallery size pickers) */
    document.querySelectorAll('#cdSizes .size-opt').forEach((label) => {
      const inp = label.querySelector('input');
      const icon = label.querySelector('.opt-icon');
      if (inp && icon && window.SIZE_ICONS && window.SIZE_ICONS[inp.value]) icon.innerHTML = window.SIZE_ICONS[inp.value];
    });

    const brief = $('#cdBrief');
    const file = $('#cdFile');
    const preview = $('#cdPreview');
    const previewImg = $('#cdPreviewImg');
    let refName = '';
    let refData = '';

    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      refName = f.name;
      const reader = new FileReader();
      reader.onload = () => {
        refData = String(reader.result);
        previewImg.src = refData;
        preview.classList.add('has-img');
        window.Shop.toast('Reference image added');
      };
      reader.readAsDataURL(f);
    });

    $('#cdPreviewClear').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      refName = ''; refData = '';
      file.value = '';
      previewImg.removeAttribute('src');
      preview.classList.remove('has-img');
    });

    $('#cdSizes').addEventListener('change', updateTotal);
    $('#cdQtyMin').addEventListener('click', () => setQty(Number($('#cdQtyVal').textContent) - 1));
    $('#cdQtyPlus').addEventListener('click', () => setQty(Number($('#cdQtyVal').textContent) + 1));

    $('#cdAdd').addEventListener('click', () => {
      const text = brief.value.trim();
      if (text.length < 8) {
        brief.focus();
        window.Shop.toast('Tell us a little more about your idea', 'err');
        return;
      }
      const { key, size } = sizePrice();
      const qty = Number($('#cdQtyVal').textContent) || 1;
      const note = refName ? `${text} — ref: ${refName}` : text;
      const keyId = ('custom::' + note).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'custom';

      window.ShonenCart.add({
        animeId: 'custom',
        anime: 'Custom Design',
        title: 'Custom design',
        src: `assets/custom.svg#${keyId}`,
        note,
      }, key, qty);

      window.Shop.toast(`${size.label} custom design added to cart`);
      window.Shop.openCart();
    });
  }

  document.addEventListener('store:ready', init);
})();
