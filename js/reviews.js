(function(){
  const STORAGE_KEY = 'giwu_reviews_v1';
  const defaultReviews = [
    {name:'Aisha', rating:5, text:'Fast and professional service. Highly recommended!', date: '2026-06-10'},
    {name:'Darren', rating:4, text:'Great support, clear communication and quick delivery.', date: '2026-05-22'},
    {name:'Maya', rating:5, text:'Concierge-level help — solved my issue within minutes.', date: '2026-04-14'}
  ];

  function read() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultReviews.slice(); } catch(e){return defaultReviews.slice();} }
  function write(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  // Carousel render
  function renderCarousel(){
    const stage = document.getElementById('reviews-stage'); if(!stage) return;
    const reviews = read();
    stage.innerHTML = '';
    reviews.forEach((r)=>{
      const slide = document.createElement('div'); slide.className = 'carousel-slide review-card';
      const name = r.name || 'Anonymous';
      const initials = name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
      const date = r.date || new Date().toISOString().slice(0,10);
      const stars = '★'.repeat(r.rating)+'☆'.repeat(5 - (r.rating||0));
      slide.innerHTML = `
        <div class="avatar">${escapeHtml(initials)}</div>
        <div class="review-body">
          <div class="meta"><strong>${escapeHtml(name)}</strong> <span class="rating-chip">${escapeHtml(String(r.rating))}★</span> <span class="date">• ${escapeHtml(date)}</span></div>
          <div class="stars">${stars}</div>
          <div class="body">${escapeHtml(r.text)}</div>
        </div>`;
      stage.appendChild(slide);
    });
    // ensure first visible
    showSlide(0);
  }

  // simple carousel logic
  let current = 0; function showSlide(i){ const stage = document.getElementById('reviews-stage'); if(!stage) return; const slides = stage.querySelectorAll('.carousel-slide'); if(!slides.length) return; current = (i + slides.length) % slides.length; slides.forEach((s,idx)=> s.style.transform = `translateX(${(idx-current)*100}%)`); }
  function next(){ showSlide(current+1); }
  function prev(){ showSlide(current-1); }

  // form handling
  function setupForm(){ const form = document.getElementById('review-form'); if(!form) return; form.addEventListener('submit', (ev)=>{ ev.preventDefault(); const fd = new FormData(form); const newR = { name: fd.get('name')||'Anonymous', rating: Number(fd.get('rating')||5), text: fd.get('text')||'', date: new Date().toISOString().slice(0,10)}; const list = read(); list.unshift(newR); if(list.length>30) list.splice(30); write(list); renderCarousel(); form.reset(); showToast('Thanks for your review!'); }); }

  // faq toggles
  function setupFaq(){ document.querySelectorAll('.faq-item').forEach((fi)=>{ const btn = fi.querySelector('.faq-q'); btn.addEventListener('click', ()=>{ const open = fi.classList.toggle('open'); if(open) fi.querySelector('.faq-a').style.display='block'; else fi.querySelector('.faq-a').style.display='none'; }); }); }

  // small helpers
  function escapeHtml(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  function showToast(msg){ const t = document.getElementById('toast'); if(!t) return; t.textContent = msg; t.classList.add('visible'); setTimeout(()=> t.classList.remove('visible'), 3000); }

  // init controls
  function initControls(){ document.getElementById('rev-next')?.addEventListener('click', next); document.getElementById('rev-prev')?.addEventListener('click', prev);
    // autoplay
    setInterval(next, 7000);
  }

  // expose for debug
  window.GiwuReviews = { renderCarousel, read };

  // DOMReady
  document.addEventListener('DOMContentLoaded', ()=>{ renderCarousel(); setupForm(); setupFaq(); initControls(); });
})();
