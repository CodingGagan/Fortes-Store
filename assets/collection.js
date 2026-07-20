/**
 * In-place collection filtering, sorting and pagination.
 *
 * Intercepts the filter form, sort dropdown and pagination links, fetches the
 * target URL through the Section Rendering API (`?section_id=`), swaps just this
 * section's HTML, and syncs the address bar with History API — so browsing a
 * collection never triggers a full page reload. Back/forward and shareable
 * URLs keep working.
 */
(function () {
  function container() { return document.querySelector('[data-collection-section]'); }

  function buildUrl(action, params) {
    var url = new URL(action, window.location.origin);
    url.search = '';
    params.forEach(function (value, key) {
      if (value !== '' && value != null) url.searchParams.append(key, value);
    });
    return url;
  }

  function render(targetUrl, opts) {
    opts = opts || {};
    var c = container();
    if (!c) return;
    var id = c.getAttribute('data-section-id');
    var wrapper = document.getElementById('shopify-section-' + id) || c.closest('.shopify-section');
    if (!wrapper) return;

    // Preserve whether the filter drawer is open across the swap.
    var toggle = wrapper.querySelector('.ftoggle');
    var wasOpen = toggle && toggle.checked;

    wrapper.classList.add('is-loading');

    var fetchUrl = new URL(targetUrl.toString(), window.location.origin);
    fetchUrl.searchParams.set('section_id', id);

    fetch(fetchUrl.toString(), { headers: { 'X-Requested-With': 'fetch' } })
      .then(function (r) {
        if (!r.ok) throw new Error('Request failed');
        return r.text();
      })
      .then(function (html) {
        wrapper.innerHTML = html;

        var newToggle = wrapper.querySelector('.ftoggle');
        if (newToggle && wasOpen) newToggle.checked = true;

        var clean = new URL(targetUrl.toString(), window.location.origin);
        clean.searchParams.delete('section_id');
        if (!opts.replace) {
          window.history.pushState({ collection: true }, '', clean.toString());
        }

        if (!opts.noScroll) {
          var anchor = wrapper.querySelector('.toolbar') || wrapper;
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function () {
        // Graceful fallback: hard navigation.
        window.location.href = targetUrl.toString();
      })
      .finally(function () {
        wrapper.classList.remove('is-loading');
      });
  }

  function fromForm(form, opts) {
    var url = buildUrl(form.getAttribute('action') || window.location.pathname, new FormData(form));
    render(url, opts);
  }

  /* Apply button (filter form submit). */
  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('.filters__form');
    if (!form) return;
    e.preventDefault();
    fromForm(form);
  });

  /* Auto-apply on facet toggle + sort change. */
  document.addEventListener('change', function (e) {
    if (!e.target.closest) return;
    var filterForm = e.target.closest('.filters__form');
    if (filterForm) { fromForm(filterForm, { noScroll: true }); return; }

    var sortForm = e.target.closest('form.sort');
    if (sortForm) { fromForm(sortForm); return; }
  });

  /* Pagination + Clear links. */
  document.addEventListener('click', function (e) {
    var c = container();
    if (!c) return;

    var pager = e.target.closest('.pager a[href]');
    if (pager && c.contains(pager) && !pager.classList.contains('is-on') && !pager.classList.contains('is-gap')) {
      e.preventDefault();
      render(new URL(pager.href, window.location.origin));
      return;
    }

    var clear = e.target.closest('.filters__foot .clear[href]');
    if (clear && c.contains(clear)) {
      e.preventDefault();
      render(new URL(clear.href, window.location.origin), { noScroll: true });
    }
  });

  window.addEventListener('popstate', function () {
    if (container()) render(new URL(window.location.href), { replace: true, noScroll: true });
  });
})();
