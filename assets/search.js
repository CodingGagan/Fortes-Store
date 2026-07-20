/**
 * Header search drawer with predictive suggestions.
 *
 * Opened by the header search button ([data-search-open]); closed by the ✕, the
 * overlay ([data-search-close]) or Escape. Typing fetches suggestions from the
 * Section Rendering API (/search/suggest?...&section_id=predictive-search) so
 * the markup — and money formatting — comes from Liquid.
 *
 * Uses event delegation so it keeps working after the header section is
 * re-rendered by the theme editor.
 */
(function () {
  var MIN_CHARS = 2;
  var DEBOUNCE_MS = 250;

  var timer = null;
  var controller = null;

  function routes() { return (window.Fortes && window.Fortes.routes) || {}; }
  function drawer() { return document.querySelector('[data-search]'); }
  function input() { return document.querySelector('[data-search-input]'); }
  function results() { return document.querySelector('[data-search-results]'); }

  function openSearch() {
    var d = drawer();
    if (!d) return;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    var t = document.querySelector('[data-search-open]');
    if (t) t.setAttribute('aria-expanded', 'true');
    // Focus after the panel has begun animating, else iOS skips it.
    var i = input();
    if (i) setTimeout(function () { i.focus(); }, 60);
  }

  function closeSearch() {
    var d = drawer();
    if (!d) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    var t = document.querySelector('[data-search-open]');
    if (t) t.setAttribute('aria-expanded', 'false');
    abort();
    setLoading(false);
  }

  function abort() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (controller) { controller.abort(); controller = null; }
  }

  function setLoading(on) {
    var d = drawer();
    if (d) d.classList.toggle('is-loading', !!on);
  }

  function clearResults() {
    var r = results();
    if (r) r.innerHTML = '';
  }

  function fetchSuggestions(term) {
    var url = routes().predictive_search;
    if (!url) return;

    // Cancel any request still in flight so a slow early response can't
    // overwrite the results for a newer search term.
    if (controller) controller.abort();
    controller = new AbortController();

    var endpoint =
      url +
      '?q=' + encodeURIComponent(term) +
      '&resources[type]=product,collection,page,article' +
      '&resources[limit]=6' +
      '&section_id=predictive-search';

    setLoading(true);

    fetch(endpoint, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('Search failed');
        return res.text();
      })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, 'text/html');
        var section = doc.querySelector('#shopify-section-predictive-search');
        var r = results();
        if (r) r.innerHTML = section ? section.innerHTML : '';
        setLoading(false);
      })
      .catch(function (err) {
        if (err.name === 'AbortError') return; // superseded by a newer keystroke
        clearResults();
        setLoading(false);
      });
  }

  function onType(value) {
    var term = (value || '').trim();
    if (timer) clearTimeout(timer);

    if (term.length < MIN_CHARS) {
      abort();
      clearResults();
      setLoading(false);
      return;
    }

    timer = setTimeout(function () { fetchSuggestions(term); }, DEBOUNCE_MS);
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-search-open]')) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.target.closest('[data-search-close]')) {
      e.preventDefault();
      closeSearch();
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-search-input]')) onType(e.target.value);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var d = drawer();
    if (d && d.classList.contains('is-open')) closeSearch();
  });

  // Don't submit an empty query — let the shopper keep typing instead.
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-search-form]');
    if (!form) return;
    var i = input();
    if (!i || !i.value.trim()) e.preventDefault();
  });
})();
