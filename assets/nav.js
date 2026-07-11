/**
 * Slide-out catalog navigation (left sidebar).
 *
 * Opened by the header "Shop" button ([data-nav-open]); closed by the ✕ button,
 * the overlay ([data-nav-close]) or the Escape key. Uses event delegation so it
 * keeps working after the header section is re-rendered.
 */
(function () {
  function nav() { return document.querySelector('[data-nav]'); }
  function trigger() { return document.querySelector('[data-nav-open]'); }

  function openNav() {
    var n = nav();
    if (!n) return;
    n.classList.add('is-open');
    n.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    var t = trigger();
    if (t) t.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    var n = nav();
    if (!n) return;
    n.classList.remove('is-open');
    n.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    var t = trigger();
    if (t) t.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-nav-open]')) { e.preventDefault(); openNav(); return; }
    if (e.target.closest('[data-nav-close]')) { closeNav(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
})();
