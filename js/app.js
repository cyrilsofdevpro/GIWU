document.addEventListener('DOMContentLoaded', () => {
  const loader = document.querySelector('.loader');
  const progressBar = document.querySelector('.progress-bar');
  const backToTop = document.getElementById('backToTop');
  const navLinks = document.querySelector('.nav-links');
  const menuToggle = document.querySelector('.menu-toggle');
  const modal = document.getElementById('chat-modal');
  const openModalButton = document.getElementById('open-chat-modal');
  const closeModalButton = document.getElementById('close-chat-modal');
  const reviewForm = document.getElementById('review-form');
  const reviewList = document.getElementById('reviews-list');
  const contactForm = document.getElementById('contact-form');
  const chatForm = document.getElementById('chat-form');
  const particleLayer = document.querySelector('.particle-layer');
  const counterElements = document.querySelectorAll('[data-counter]');
  const reveals = document.querySelectorAll('.reveal');
  const typedText = document.querySelector('.typed-text');

  const STORAGE_KEYS = {
    reviews: 'qiwu-reviews',
    contact: 'qiwu-contact-messages',
    chat: 'qiwu-chat-messages'
  };

  const createParticles = () => {
    const count = 45;
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 8}s`;
      particle.style.opacity = `${0.3 + Math.random() * 0.7}`;
      particleLayer.appendChild(particle);
    }
  };

  const handleLoader = () => {
    window.setTimeout(() => {
      loader.classList.add('is-hidden');
    }, 900);
  };

  const updateProgressBar = () => {
    const scrollTop = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const progress = height > 0 ? (scrollTop / height) * 100 : 0;
    progressBar.style.width = `${progress}%`;
    backToTop.classList.toggle('is-visible', scrollTop > 700);
  };

  const revealOnScroll = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    reveals.forEach((element) => observer.observe(element));
  };

  const animateCounters = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.counter || '0');
        let current = 0;
        const step = Math.max(1, Math.floor(target / 35));
        const timer = window.setInterval(() => {
          current += step;
          if (current >= target) {
            el.textContent = `${target}+`;
            clearInterval(timer);
            return;
          }
          el.textContent = `${current}`;
        }, 30);
        observer.unobserve(el);
      });
    }, { threshold: 0.65 });

    counterElements.forEach((counter) => observer.observe(counter));
  };

  const typeText = () => {
    const words = typedText.dataset.words.split(',');
    let wordIndex = 0;
    let charIndex = 0;
    const type = () => {
      typedText.textContent = words[wordIndex].slice(0, charIndex);
      charIndex += 1;
      if (charIndex <= words[wordIndex].length) {
        window.setTimeout(type, 70);
      } else {
        window.setTimeout(() => {
          erase();
        }, 1200);
      }
    };
    const erase = () => {
      typedText.textContent = words[wordIndex].slice(0, charIndex);
      charIndex -= 1;
      if (charIndex >= 0) {
        window.setTimeout(erase, 35);
      } else {
        wordIndex = (wordIndex + 1) % words.length;
        window.setTimeout(type, 350);
      }
    };
    type();
  };

  const renderReviews = () => {
    const reviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.reviews) || '[]');
    reviewList.innerHTML = '';
    if (!reviews.length) {
      reviewList.innerHTML = '<div class="review-card"><p>No reviews yet. Be the first to share your experience.</p></div>';
      return;
    }

    reviews.slice().reverse().forEach((review) => {
      const card = document.createElement('article');
      card.className = 'review-card';
      const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      card.innerHTML = `
        <div class="stars">${stars}</div>
        <div class="meta">${review.name} • ${new Date(review.createdAt).toLocaleDateString()}</div>
        <p>${review.text}</p>
      `;
      reviewList.appendChild(card);
    });
  };

  const attachRipple = (event) => {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const rect = button.getBoundingClientRect();
    circle.className = 'ripple-effect';
    circle.style.width = circle.style.height = `${Math.max(rect.width, rect.height)}px`;
    circle.style.left = `${event.clientX - rect.left}px`;
    circle.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(circle);
    window.setTimeout(() => circle.remove(), 650);
  };

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    const name = document.getElementById('review-name').value.trim();
    const rating = Number(document.getElementById('review-rating').value);
    const text = document.getElementById('review-text').value.trim();
    const reviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.reviews) || '[]');
    reviews.push({ name, rating, text, createdAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(reviews));
    reviewForm.reset();
    renderReviews();
  };

  const handleContactSubmit = (event) => {
    event.preventDefault();
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.contact) || '[]');
    entries.push({ name, email, message, createdAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.contact, JSON.stringify(entries));
    contactForm.reset();
    alert('Your message has been saved locally and is ready for backend integration.');
  };

  const handleChatSubmit = (event) => {
    event.preventDefault();
    const name = document.getElementById('chat-name').value.trim();
    const email = document.getElementById('chat-email').value.trim();
    const message = document.getElementById('chat-message').value.trim();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.chat) || '[]');
    entries.push({ name, email, message, createdAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.chat, JSON.stringify(entries));
    chatForm.reset();
    modal.classList.remove('is-visible');
    alert('Your chat request has been stored temporarily in your browser.');
  };

  const toggleMenu = () => {
    navLinks.classList.toggle('is-open');
    menuToggle.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', navLinks.classList.contains('is-open'));
  };

  const openModal = () => {
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
  };

  document.querySelectorAll('.btn, .floating-icon, .modal-close').forEach((element) => {
    element.addEventListener('click', attachRipple);
  });

  menuToggle.addEventListener('click', toggleMenu);
  document.querySelectorAll('.nav-links a').forEach((link) => link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    menuToggle.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));

  openModalButton.addEventListener('click', openModal);
  closeModalButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  reviewForm.addEventListener('submit', handleReviewSubmit);
  contactForm.addEventListener('submit', handleContactSubmit);
  chatForm.addEventListener('submit', handleChatSubmit);

  createParticles();
  handleLoader();
  revealOnScroll();
  animateCounters();
  renderReviews();
  typeText();
  updateProgressBar();
  window.addEventListener('scroll', updateProgressBar, { passive: true });
  window.addEventListener('resize', updateProgressBar);
});
