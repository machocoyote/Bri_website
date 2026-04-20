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
