// Initialize site animations and libraries: Lenis, AOS, GSAP, Typed.js, Lottie
(function () {
  // Lenis smooth scrolling
  try {
    if (typeof Lenis !== 'undefined') {
      const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1 - Math.pow(1 - t, 3)) });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      window.__lenis = lenis;
    }
  } catch (e) { console.warn('Lenis init failed', e); }

  // AOS
  try { if (typeof AOS !== 'undefined') AOS.init({ once: true, duration: 800, easing: 'ease-out-quad' }); } catch (e) { }

  // GSAP + ScrollTrigger
  try {
    if (typeof gsap !== 'undefined') {
      if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
      // simple entrance for .glass-card
      gsap.from('.glass-card', {
        opacity: 0,
        y: 18,
        stagger: 0.12,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.glass-card', start: 'top 90%', toggleActions: 'play none none none' }
      });

      // subtle page load hero reveal
      gsap.from('header.site-header', { y: -20, opacity: 0, duration: 0.7, ease: 'power3.out' });
    }
  } catch (e) { console.warn('GSAP init failed', e); }

  // Typed.js for hero headline
  try {
    const el = document.querySelector('.hero-typed');
    if (el && typeof Typed !== 'undefined') {
      const strings = (el.dataset.text || el.textContent).split(';').map(s => s.trim()).filter(Boolean);
      new Typed(el, { strings, typeSpeed: 48, backSpeed: 28, backDelay: 2200, loop: true, smartBackspace: true });
    }
  } catch (e) { }

  // Lottie loaders for data-lottie elements
  try {
    if (typeof lottie !== 'undefined') {
      document.querySelectorAll('[data-lottie]').forEach((node) => {
        const path = node.dataset.lottie;
        if (!path) return;
        lottie.loadAnimation({ container: node, renderer: 'svg', loop: node.dataset.loop !== 'false', autoplay: true, path });
      });
    }
  } catch (e) { console.warn('Lottie init failed', e); }

  // Page transitions (basic fade)
  try {
    window.addEventListener('pageshow', () => { document.documentElement.style.scrollBehavior = 'smooth'; });
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a');
      if (a && a.origin === location.origin && !a.hasAttribute('target') && !a.href.includes('#')) {
        e.preventDefault();
        gsap.to('body', { opacity: 0, duration: 0.35, onComplete: () => { location.href = a.href; } });
      }
    });
  } catch (e) { }

  // Floating particles in background
  try {
    const layer = document.createElement('div');
    layer.className = 'particle-layer';
    document.body.appendChild(layer);
    const count = window.innerWidth < 900 ? 8 : 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.opacity = (0.18 + Math.random() * 0.7).toFixed(2);
      p.style.transform = `translate3d(0,0,0) scale(${0.6 + Math.random() * 1.2})`;
      p.style.animationDuration = 10 + Math.random() * 10 + 's';
      layer.appendChild(p);
    }
  } catch (e) { }

  // Navbar blur on scroll (works with Lenis)
  try {
    const header = document.querySelector('.site-header');
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || (window.__lenis && window.__lenis.scroll) || 0;
      if (!header) return;
      if (y > 28) header.classList.add('scrolled'); else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (window.__lenis) {
      // hook into lenis RAF loop
      const orig = window.__lenis.raf;
      // already handled by RAF but keep safe
    }
  } catch (e) { }

  // Staggered GSAP timeline for service cards and features
  try {
    if (typeof gsap !== 'undefined') {
      gsap.from('.service-card', { scrollTrigger: { trigger: '.services-grid', start: 'top 90%' }, y: 28, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out' });
      gsap.from('.feature-card', { scrollTrigger: { trigger: '.features-grid', start: 'top 88%' }, y: 22, opacity: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out' });
    }
  } catch (e) { }

  // Counters using requestAnimationFrame
  try {
    document.querySelectorAll('strong[data-counter]').forEach((node) => {
      const target = parseInt(node.getAttribute('data-counter') || node.textContent || '0', 10) || 0;
      let current = 0;
      const duration = 1200 + Math.random() * 800;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        current = Math.floor(t * target);
        node.textContent = current;
        if (t < 1) requestAnimationFrame(tick); else node.textContent = target;
      }
      requestAnimationFrame(tick);
    });
  } catch (e) { }

  // Custom cursor and magnetic buttons
  try {
    const cursor = document.createElement('div'); cursor.className = 'custom-cursor';
    const trail = document.createElement('div'); trail.className = 'cursor-trail';
    document.body.appendChild(trail); document.body.appendChild(cursor);
    let mouse = { x: window.innerWidth/2, y: window.innerHeight/2 };
    let pos = { x: mouse.x, y: mouse.y };
    window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; cursor.style.left = mouse.x + 'px'; cursor.style.top = mouse.y + 'px'; });
    function trailLoop() { pos.x += (mouse.x - pos.x) * 0.28; pos.y += (mouse.y - pos.y) * 0.28; trail.style.left = pos.x + 'px'; trail.style.top = pos.y + 'px'; requestAnimationFrame(trailLoop); }
    requestAnimationFrame(trailLoop);

    // Magnetic buttons
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.style.position = 'relative';
      // inner magnet transforms for .btn-inner
      const inner = el.querySelector('.btn-inner') || el.firstElementChild;
      el.addEventListener('pointermove', (ev) => {
        const rect = el.getBoundingClientRect();
        const dx = (ev.clientX - rect.left - rect.width/2);
        const dy = (ev.clientY - rect.top - rect.height/2);
        const tx = dx * 0.06; const ty = dy * 0.04;
        const itx = dx * 0.12; const ity = dy * 0.08;
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0) translateZ(0)`;
        if (inner) inner.style.transform = `translate3d(${itx}px, ${ity}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  } catch (e) { console.warn('Cursor/magnetic init failed', e); }

  // Hero parallax (lightweight)
  try {
    const heroCard = document.querySelector('[data-parallax]');
    const inner = heroCard && heroCard.querySelector('.hero-visual-inner');
    if (heroCard && inner && window.innerWidth > 720) {
      let hx = 0, hy = 0, lx = 0, ly = 0;
      window.addEventListener('pointermove', (e) => { hx = (e.clientX - window.innerWidth/2) * 0.012; hy = (e.clientY - window.innerHeight/2) * 0.012; });
      function parLoop() { lx += (hx - lx) * 0.09; ly += (hy - ly) * 0.09; inner.style.transform = `translate3d(${lx}px, ${ly}px, 0) translateZ(0)`; requestAnimationFrame(parLoop); }
      requestAnimationFrame(parLoop);
    }
  } catch (e) { }

  // GSAP hover effects for service cards (low-cost)
  try {
    if (typeof gsap !== 'undefined') {
      document.querySelectorAll('.service-showcase').forEach((card) => {
        card.addEventListener('pointerenter', () => gsap.to(card, { scale: 1.02, boxShadow: '0 26px 60px rgba(0,0,0,0.45)', duration: 0.28 }));
        card.addEventListener('pointerleave', () => gsap.to(card, { scale: 1, boxShadow: 'none', duration: 0.28 }));
      });
      // subtle CTA hover
      document.querySelectorAll('.btn').forEach((b) => {
        b.addEventListener('pointerenter', () => gsap.to(b, { scale: 1.03, duration: 0.14 }));
        b.addEventListener('pointerleave', () => gsap.to(b, { scale: 1, duration: 0.14 }));
      });
    }
  } catch (e) { }
})();
