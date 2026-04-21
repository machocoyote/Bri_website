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
  '.about-image-col, .about-text-col, .service-card, .gallery-item, .contact-left, .contact-right'
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

// Contact form — Formspree
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const formId = form.dataset.formspreeId;
  if (!formId || formId === 'YOUR_FORM_ID') {
    formError.textContent = 'Form not configured yet. Please contact us directly by email or phone.';
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  formError.textContent = '';
  try {
    const res = await fetch(`https://formspree.io/f/${formId}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form),
    });
    if (res.ok) {
      form.style.display = 'none';
      formSuccess.classList.add('show');
    } else {
      throw new Error();
    }
  } catch {
    formError.textContent = 'Something went wrong. Please try emailing us directly at beflourishedflorals@gmail.com.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Message';
  }
});

// ── Seasonal Holiday Banner ──
const HOLIDAYS = [
  {
    name:       "Mother's Day",
    tagline:    "Surprise Mom with a beautiful arrangement",
    cta:        "Order for Mom",
    windowDays: 45,
    getDate(year) {
      // 2nd Sunday in May
      const d = new Date(year, 4, 1);
      const firstSun = d.getDay() === 0 ? 1 : 8 - d.getDay();
      return new Date(year, 4, firstSun + 7);
    },
  },
  // Add future holidays here — same shape as above
];

(function initBanner() {
  if (sessionStorage.getItem('bf_banner_dismissed')) return;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const year  = today.getFullYear();

  for (const h of HOLIDAYS) {
    let date = h.getDate(year);
    if (date < today) date = h.getDate(year + 1);

    const days = Math.round((date - today) / 86400000);
    if (days < 0 || days > h.windowDays) continue;

    const countdownText = days === 0 ? 'Today!'
                        : days === 1 ? 'Tomorrow'
                        : `${days} days away`;

    document.getElementById('bannerOccasion').textContent  = h.name;
    document.getElementById('bannerTagline').textContent   = h.tagline;
    document.getElementById('bannerCountdown').textContent = countdownText;
    document.getElementById('bannerCta').textContent       = h.cta;

    document.body.classList.add('has-banner');
    setTimeout(() => document.getElementById('seasonalBanner').classList.add('show'), 800);
    break;
  }

  document.getElementById('bannerDismiss').addEventListener('click', () => {
    const banner = document.getElementById('seasonalBanner');
    banner.classList.remove('show');
    document.body.classList.remove('has-banner');
    sessionStorage.setItem('bf_banner_dismissed', '1');
  });
})();

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
