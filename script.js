// Nav scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileClose = document.getElementById('mobileClose');
const mobileLinks = document.querySelectorAll('.mobile-link');

hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
mobileClose.addEventListener('click', () => mobileMenu.classList.remove('open'));
mobileLinks.forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// Scroll reveal
const revealEls = document.querySelectorAll(
  '.about-image-col, .about-text-col, .service-card, .gallery-item, .testimonial-card, .contact-left, .contact-right, .stat'
);

revealEls.forEach((el, i) => {
  el.classList.add('reveal');
  const delay = (i % 4);
  if (delay > 0) el.classList.add(`reveal-delay-${delay}`);
});

const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.12 }
);

revealEls.forEach(el => observer.observe(el));

// Contact form
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

form.addEventListener('submit', e => {
  e.preventDefault();
  form.style.display = 'none';
  formSuccess.classList.add('show');
});

// Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============================================================
//  REVIEWS — Fetch from JSONbin and render on homepage
//
//  One-time setup:
//   1. Create a free account at jsonbin.io
//   2. Create a bin with content []  and set it to Public
//   3. Copy the Bin ID and replace 'YOUR_JSONBIN_BIN_ID' below
//   4. In dashboard Settings, enter your Master Key + Bin ID
// ============================================================
(async function loadReviews() {
  const JSONBIN_BIN_ID = 'YOUR_JSONBIN_BIN_ID';
  if (!JSONBIN_BIN_ID || JSONBIN_BIN_ID === 'YOUR_JSONBIN_BIN_ID') return;

  const section = document.getElementById('reviews');
  const loading = document.getElementById('reviewsLoading');
  const grid    = document.getElementById('reviewsGrid');

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const reviewList = Array.isArray(data.record) ? data.record : [];

    if (reviewList.length === 0) return;

    loading.style.display = 'none';
    grid.innerHTML = reviewList.map(r => renderReviewCard(r)).join('');

    section.style.display = 'block';

    requestAnimationFrame(() => {
      grid.querySelectorAll('.review-card-pub').forEach((card, i) => {
        card.classList.add('reveal');
        if (i % 3 > 0) card.classList.add(`reveal-delay-${i % 3}`);
        observer.observe(card);
      });
    });
  } catch {
    // Silently fail — section stays hidden
  }
})();

function renderReviewCard(r) {
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < (r.rating || 0)
      ? '<span>&#9733;</span>'
      : '<span class="empty-star">&#9733;</span>'
  ).join('');

  const name = r.anonymous ? 'Verified Customer' : (r.customerName || 'Verified Customer');

  const photoHtml = r.photoUrl
    ? `<div class="rv-pub-photo"><img src="${escHtml(r.photoUrl)}" alt="Customer arrangement photo" loading="lazy" /></div>`
    : '';

  const dateStr = r.date
    ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return `
    <article class="review-card-pub">
      <div class="rv-pub-stars">${stars}</div>
      <p class="rv-pub-text">&ldquo;${escHtml(r.text)}&rdquo;</p>
      ${photoHtml}
      <div class="rv-pub-footer">
        <div class="rv-pub-customer">
          <span class="rv-pub-name">${escHtml(name)}</span>
          <span class="rv-pub-meta">${escHtml(r.service || '')}${dateStr ? ' &middot; ' + dateStr : ''}</span>
        </div>
        <span class="rv-pub-badge">&#10003; Verified Customer</span>
      </div>
    </article>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
