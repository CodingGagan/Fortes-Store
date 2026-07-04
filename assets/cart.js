/**
 * Global AJAX cart + slide-out drawer.
 *
 * - Intercepts every product add-to-cart form (action contains /cart/add).
 * - Uses the Cart AJAX API with the Section Rendering API (`sections`) so the
 *   drawer re-renders server-side after each add / change / remove — no reload.
 * - Handles open/close, quantity steppers and remove via event delegation, so
 *   it keeps working after the drawer's markup is swapped.
 */
(function () {
  var routes = (window.Fortes && window.Fortes.routes) || {
    cart_add: '/cart/add',
    cart_change: '/cart/change',
    cart: '/cart',
  };
  var SECTION = 'cart-drawer';

  function drawer() { return document.querySelector('[data-cart-drawer]'); }

  /* All cart section ids to re-render: the drawer plus the /cart page if present. */
  function cartSectionIds() {
    var ids = [SECTION];
    var page = document.querySelector('[data-cart-page]');
    if (page) {
      var wrap = page.closest('.shopify-section');
      if (wrap && wrap.id) ids.push(wrap.id.replace('shopify-section-', ''));
    }
    return ids;
  }

  function openCart() {
    var d = drawer();
    if (!d) return;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function closeCart() {
    var d = drawer();
    if (!d) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function setBusy(state) {
    var d = drawer();
    if (d) d.classList.toggle('is-busy', !!state);
    var page = document.querySelector('[data-cart-page]');
    if (page) page.classList.toggle('is-busy', !!state);
  }

  function updateCount() {
    var d = drawer();
    if (!d) return;
    var count = parseInt(d.getAttribute('data-cart-count') || '0', 10);
    document.querySelectorAll('.header__cart').forEach(function (link) {
      var sup = link.querySelector('sup');
      if (count > 0) {
        if (!sup) { sup = document.createElement('sup'); link.insertBefore(sup, link.firstChild); }
        sup.textContent = count;
      } else if (sup) {
        sup.remove();
      }
    });
  }

  function renderSections(sections) {
    if (!sections) return;
    Object.keys(sections).forEach(function (id) {
      var el = document.getElementById('shopify-section-' + id);
      if (el) el.innerHTML = sections[id];
    });
    updateCount();
  }

  function request(url, body) {
    return fetch(url + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({ sections: cartSectionIds().join(','), sections_url: window.location.pathname }, body)),
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    });
  }

  function flashError(message) {
    var d = drawer();
    var head = d && d.querySelector('.cart-drawer__head');
    if (!head) { window.alert(message); return; }
    var existing = head.parentNode.querySelector('.cart-drawer__error');
    if (existing) existing.remove();
    var el = document.createElement('p');
    el.className = 'cart-drawer__error';
    el.setAttribute('role', 'alert');
    el.style.cssText = 'margin:0;padding:.8rem 1.5rem;background:#6e2b2b;color:#fff;font-size:.85rem;';
    el.textContent = message;
    head.insertAdjacentElement('afterend', el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  /* ---- Add to cart (any product / quick-add form) ---- */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('form');
    if (!form) return;
    var action = form.getAttribute('action') || '';
    if (action.indexOf('/cart/add') === -1) return;

    e.preventDefault();
    var id = form.querySelector('[name="id"]');
    if (!id || !id.value) return;
    var qtyField = form.querySelector('[name="quantity"]');
    var quantity = qtyField ? parseInt(qtyField.value, 10) || 1 : 1;

    var btn = form.querySelector('[type="submit"]');
    var restore = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }

    request(routes.cart_add, { items: [{ id: parseInt(id.value, 10), quantity: quantity }] })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.description || res.data.message || 'Could not add to cart');
        renderSections(res.data.sections);
        openCart();
      })
      .catch(function (err) { flashError(err.message); openCart(); })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = restore; }
      });
  });

  function changeLine(line, quantity) {
    setBusy(true);
    request(routes.cart_change, { line: parseInt(line, 10), quantity: quantity })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.message || 'Could not update cart');
        renderSections(res.data.sections);
      })
      .catch(function (err) { flashError(err.message); })
      .finally(function () { setBusy(false); });
  }

  /* ---- Delegated clicks: open / close / qty / remove ---- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-close]')) { closeCart(); return; }

    var trigger = e.target.closest('.header__cart');
    if (trigger) { e.preventDefault(); openCart(); return; }

    var item = e.target.closest('[data-cart-item]');
    if (!item) return;
    var input = item.querySelector('[data-cart-qty]');
    var qty = input ? parseInt(input.value, 10) || 1 : 1;

    if (e.target.closest('[data-cart-plus]')) changeLine(item.dataset.line, qty + 1);
    else if (e.target.closest('[data-cart-minus]')) changeLine(item.dataset.line, Math.max(0, qty - 1));
    else if (e.target.closest('[data-cart-remove]')) changeLine(item.dataset.line, 0);
  });

  /* ---- Delegated typing into a quantity field ---- */
  document.addEventListener('change', function (e) {
    var input = e.target.closest && e.target.closest('[data-cart-qty]');
    if (!input) return;
    var item = input.closest('[data-cart-item]');
    if (item) changeLine(item.dataset.line, Math.max(0, parseInt(input.value, 10) || 0));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCart();
  });

  updateCount();
})();
