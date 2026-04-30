// Extract URL params
const params = new URLSearchParams(location.search);
document.getElementById('orderRef').value = params.get('ref') || '';

// Pre-select service if passed via ?service=
const svcParam = params.get('service');
if (svcParam) {
  const sel = document.getElementById('reviewService');
  for (const opt of sel.options) {
    if (opt.value === svcParam) { sel.value = svcParam; break; }
  }
}

// Anonymous checkbox — toggle name field
document.getElementById('keepAnonymous').addEventListener('change', function () {
  const nameGroup = document.getElementById('nameGroup');
  nameGroup.style.display = this.checked ? 'none' : 'block';
  if (this.checked) document.getElementById('reviewerName').value = '';
});

// Star hint text
const STAR_LABELS = { '1': 'Poor', '2': 'Fair', '3': 'Good', '4': 'Great', '5': 'Excellent!' };
document.querySelectorAll('.star-rating input[type="radio"]').forEach(input => {
  input.addEventListener('change', () => {
    document.getElementById('starHint').textContent = STAR_LABELS[input.value] || '';
  });
});

// Form submit via fetch (AJAX for inline success message)
const form      = document.getElementById('feedbackForm');
const submitBtn = document.getElementById('fbSubmitBtn');
const fbError   = document.getElementById('fbError');

form.addEventListener('submit', async e => {
  e.preventDefault();

  if (!form.querySelector('input[name="rating"]:checked')) {
    fbError.textContent = 'Please select a star rating before submitting.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  fbError.textContent = '';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form),
    });

    if (res.ok) {
      form.style.display = 'none';
      document.getElementById('fbSuccess').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const data = await res.json().catch(() => ({}));
      fbError.textContent = data.error || 'Something went wrong. Please email us at beflourishedflorals@gmail.com.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  } catch {
    fbError.textContent = 'Network error. Please try again or email us directly.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Review';
  }
});
