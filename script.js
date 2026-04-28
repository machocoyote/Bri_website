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
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  formError.textContent = '';
  try {
    const res = await fetch(form.action, {
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
    name:       "New Year's",
    tagline:    "Start the new year with fresh blooms",
    cta:        "Order New Year's Flowers",
    windowDays: 21,
    getDate:    (y) => new Date(y, 0, 1),
  },
  {
    name:       "Valentine's Day",
    tagline:    "Say it with flowers this February 14th",
    cta:        "Order for Valentine's",
    windowDays: 35,
    getDate:    (y) => new Date(y, 1, 14),
  },
  {
    name:       "Easter",
    tagline:    "Celebrate spring with beautiful florals",
    cta:        "Order Easter Arrangements",
    windowDays: 28,
    getDate:    (y) => {
      const a = y%19, b = Math.floor(y/100), c = y%100;
      const d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25);
      const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15)%30;
      const i = Math.floor(c/4), k = c%4, l = (32+2*e+2*i-h-k)%7;
      const m = Math.floor((a+11*h+22*l)/451);
      return new Date(y, Math.floor((h+l-7*m+114)/31)-1, ((h+l-7*m+114)%31)+1);
    },
  },
  {
    name:       "Administrative Professionals Day",
    tagline:    "Appreciate the heart of every office",
    cta:        "Order a Thank-You Bouquet",
    windowDays: 14,
    getDate:    (y) => {
      for (let d = 30; d >= 1; d--)
        if (new Date(y, 3, d).getDay() === 3) return new Date(y, 3, d);
    },
  },
  {
    name:       "Mother's Day",
    tagline:    "Pre-orders now open — secure Mom's arrangement before we fill up!",
    cta:        "Pre-Order Now",
    windowDays: 45,
    pinned:     true,
    getDate:    (y) => {
      const d = new Date(y, 4, 1);
      const firstSun = d.getDay() === 0 ? 1 : 8 - d.getDay();
      return new Date(y, 4, firstSun + 7);
    },
  },
  {
    name:       "Graduation Season",
    tagline:    "Celebrate their big achievement with florals",
    cta:        "Order Grad Flowers",
    windowDays: 21,
    getDate:    (y) => new Date(y, 4, 20),
  },
  {
    name:       "Father's Day",
    tagline:    "Show Dad some love with a unique arrangement",
    cta:        "Order for Dad",
    windowDays: 28,
    getDate:    (y) => {
      const d = new Date(y, 5, 1);
      const firstSun = d.getDay() === 0 ? 1 : 8 - d.getDay();
      return new Date(y, 5, firstSun + 14);
    },
  },
  {
    name:       "Grandparents Day",
    tagline:    "Let Grandma & Grandpa know they're loved",
    cta:        "Order a Tribute Bouquet",
    windowDays: 14,
    getDate:    (y) => {
      let lDay = 1;
      while (new Date(y, 8, lDay).getDay() !== 1) lDay++;
      let sun = lDay + 1;
      while (new Date(y, 8, sun).getDay() !== 0) sun++;
      return new Date(y, 8, sun);
    },
  },
  {
    name:       "Sweetest Day",
    tagline:    "A Cleveland tradition — surprise someone special",
    cta:        "Order Sweetest Day Flowers",
    windowDays: 21,
    getDate:    (y) => {
      let count = 0;
      for (let d = 1; d <= 31; d++)
        if (new Date(y, 9, d).getDay() === 6 && ++count === 3) return new Date(y, 9, d);
    },
  },
  {
    name:       "Thanksgiving",
    tagline:    "Add warmth and beauty to your holiday table",
    cta:        "Order a Centerpiece",
    windowDays: 21,
    getDate:    (y) => {
      let count = 0;
      for (let d = 1; d <= 30; d++)
        if (new Date(y, 10, d).getDay() === 4 && ++count === 4) return new Date(y, 10, d);
    },
  },
  {
    name:       "Christmas",
    tagline:    "Deck the halls with beautiful holiday florals",
    cta:        "Order Holiday Arrangements",
    windowDays: 35,
    getDate:    (y) => new Date(y, 11, 25),
  },
];

(function initBanner() {
  if (sessionStorage.getItem('bf_banner_dismissed')) return;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const year  = today.getFullYear();

  // Collect all holidays currently within their display window
  const candidates = [];
  for (const h of HOLIDAYS) {
    let date = h.getDate(year);
    if (!date) continue;
    if (date < today) date = h.getDate(year + 1);
    if (!date) continue;
    const days = Math.round((date - today) / 86400000);
    if (days >= 0 && days <= h.windowDays) candidates.push({ h, days });
  }

  if (candidates.length === 0) return;

  // Pinned holidays take priority, then sort by nearest date
  candidates.sort((a, b) => (b.h.pinned ? 1 : 0) - (a.h.pinned ? 1 : 0) || a.days - b.days);
  const { h, days } = candidates[0];

  const countdownText = days === 0 ? 'Today!'
                      : days === 1 ? 'Tomorrow'
                      : `${days} days away`;

  document.getElementById('bannerOccasion').textContent  = h.name;
  document.getElementById('bannerTagline').textContent   = h.tagline;
  document.getElementById('bannerCountdown').textContent = countdownText;
  document.getElementById('bannerCta').textContent       = h.cta;

  document.body.classList.add('has-banner');
  setTimeout(() => document.getElementById('seasonalBanner').classList.add('show'), 800);

  document.getElementById('bannerDismiss').addEventListener('click', () => {
    document.getElementById('seasonalBanner').classList.remove('show');
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
