(() => {
  const footer = document.querySelector('[data-eo-footer-partners="v2"]')?.closest('#colophon');

  if (!footer || footer.dataset.eoFooterReady) return;
  footer.dataset.eoFooterReady = 'true';
  const chrome = [...document.querySelectorAll('.elements-bar .social-bar, .elements-bar .color-switcher')];
  const originalInert = chrome.map(element => element.inert);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;

      document.body.classList.toggle('eo-footer-in-view', visible);
      chrome.forEach((element, index) => { element.inert = visible || originalInert[index]; });
    }).observe(footer);
  }

  footer.querySelector('.eo-footer-top')?.addEventListener('click', event => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  footer.querySelectorAll('.social-networks a.network').forEach(link => {
    const icon = link.querySelector('i');
    const names = { 'fa-facebook-f': 'Facebook', 'fa-instagram': 'Instagram', 'fa-linkedin': 'LinkedIn', 'fa-youtube': 'YouTube' };
    const name = Object.keys(names).find(key => icon?.classList.contains(key));

    if (name) link.setAttribute('aria-label', names[name]);
    if (link.target === '_blank') link.rel = 'noopener noreferrer';
  });
})();
