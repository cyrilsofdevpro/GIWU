// Accessible menu toggle. Safe to include on all pages.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-links');
  if (!toggle || !nav) return;
  if (toggle.dataset.menuBound === 'true') return;
  toggle.dataset.menuBound = 'true';

  const openMenu = () => {
    nav.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', outsideClick);
    document.addEventListener('keydown', onKeydown);
  };

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', onKeydown);
  };

  const outsideClick = (e) => {
    if (!nav.contains(e.target) && e.target !== toggle) closeMenu();
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') closeMenu();
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (nav.classList.contains('is-open')) closeMenu(); else openMenu();
  });

  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => closeMenu()));
});
