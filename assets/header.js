/**
 * Fixed header surface toggle.
 *
 * On pages that open with a full-bleed hero the header renders transparent over
 * the artwork. Once the page has scrolled past a short threshold we add
 * `.is-scrolled`, which restores the solid bar (see sections/header.liquid).
 * Harmless on every other page, where the header is already solid.
 */
(function () {
  var THRESHOLD = 24;
  var header = null;
  var queued = false;

  function apply() {
    queued = false;
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > THRESHOLD);
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  function init() {
    header = document.querySelector('[data-header]');
    apply();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* Re-grab the element after the theme editor re-renders the header. */
  document.addEventListener('shopify:section:load', init);

  init();
})();
