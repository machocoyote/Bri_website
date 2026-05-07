// ============================================================
//  BE FLOURISHED — Order Management Dashboard
// ============================================================

const DEFAULT_PASSWORD      = 'flourish2026';
const STORAGE_KEY           = 'bf_orders';
const PW_KEY                = 'bf_pw';
const REVIEWS_KEY           = 'bf_reviews';
const JSONBIN_KEY_STORAGE   = 'bf_jsonbin_key';
const JSONBIN_BIN_STORAGE   = 'bf_jsonbin_bin';
const INQUIRIES_KEY         = 'bf_inquiries';
const PAYMENT_SETTINGS_KEY  = 'bf_payment_settings';

let orders          = [];
let reviews         = [];
let inquiries       = [];
let paymentSettings = {};
let calYear         = new Date().getFullYear();
let calMonth        = new Date().getMonth();
let activeView      = 'overview';
let filterStatus    = 'all';
let inqFilterStatus = 'all';
let searchQuery     = '';
let editingId       = null;
let editingInquiryId = null;

// ── Init ──
function init() {
  orders          = JSON.parse(localStorage.getItem(STORAGE_KEY)          || '[]');
  reviews         = JSON.parse(localStorage.getItem(REVIEWS_KEY)          || '[]');
  inquiries       = JSON.parse(localStorage.getItem(INQUIRIES_KEY)        || '[]');
  paymentSettings = JSON.parse(localStorage.getItem(PAYMENT_SETTINGS_KEY) || '{}');
  if (!localStorage.getItem(PW_KEY)) localStorage.setItem(PW_KEY, DEFAULT_PASSWORD);
  initJsonbinSettings();
  initPaymentSettings();
  if (sessionStorage.getItem('bf_auth') === '1') showApp();
}

// ============================================================
//  TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '✓'}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ============================================================
//  CONFIRM DIALOG
// ============================================================
function showConfirm(message, confirmText = 'Delete') {
  return new Promise(resolve => {
    const backdrop  = document.getElementById('confirmBackdrop');
    const msgEl     = document.getElementById('confirmMessage');
    const yesBtn    = document.getElementById('confirmYes');
    const noBtn     = document.getElementById('confirmNo');
    msgEl.textContent = message;
    yesBtn.textContent = confirmText;
    backdrop.classList.add('open');

    function cleanup(val) {
      backdrop.classList.remove('open');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(val);
    }
    function onYes() { cleanup(true);  }
    function onNo()  { cleanup(false); }
    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}

// ============================================================
//  AUTH
// ============================================================
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const pw  = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  if (pw === localStorage.getItem(PW_KEY)) {
    sessionStorage.setItem('bf_auth', '1');
    err.textContent = '';
    showApp();
  } else {
    err.textContent = 'Incorrect password. Try again.';
    document.getElementById('loginPassword').select();
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('bf_auth');
  location.reload();
});

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  switchView('overview');
}

// ============================================================
//  NAVIGATION
// ============================================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchView(item.dataset.view);
    closeSidebar();
  });
});

document.querySelectorAll('.view-all').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); switchView(el.dataset.view); });
});

function switchView(view) {
  activeView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  const titles = { overview: 'Overview', inquiries: 'Inquiries', orders: 'Orders', calendar: 'Calendar', reviews: 'Reviews', settings: 'Settings' };
  document.getElementById('topbarTitle').textContent = titles[view] || '';
  document.getElementById('topbarAddBtn').textContent = view === 'inquiries' ? '+ New Inquiry' : '+ New Order';
  if (view === 'overview')   renderOverview();
  if (view === 'inquiries')  { updateInqTabCounts(); renderInquiries(); }
  if (view === 'orders')     { updateTabCounts(); renderOrders(); }
  if (view === 'calendar')   renderCalendar();
  if (view === 'reviews')    renderReviews();
}

// Mobile sidebar
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

document.getElementById('menuBtn').addEventListener('click', openSidebar);
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function openSidebar()  { sidebar.classList.add('open'); sidebarOverlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); }

// Escape key closes any open panel/modal
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('confirmBackdrop').classList.contains('open')) {
    document.getElementById('confirmBackdrop').classList.remove('open'); return;
  }
  if (document.getElementById('emailModalBackdrop').classList.contains('open')) { closeEmailModal(); return; }
  if (document.getElementById('modalBackdrop').classList.contains('open')) { closeModal(); return; }
  if (document.getElementById('reviewModalBackdrop').classList.contains('open')) { closeReviewModal(); return; }
  if (document.getElementById('inquiryModalBackdrop').classList.contains('open')) { closeInquiryModal(); return; }
  if (document.getElementById('paymentModalBackdrop').classList.contains('open')) { closePaymentModal(); return; }
  if (document.getElementById('detailBackdrop').classList.contains('open')) { closeDetail(); return; }
  closeSidebar();
});

// ============================================================
//  DATA HELPERS
// ============================================================
function saveOrders() { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeClass(status) { return 'badge badge-' + status.replace(/\s+/g, '-'); }

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86400000);
}

// ============================================================
//  OVERVIEW
// ============================================================
function renderOverview() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  document.getElementById('stat-total').textContent = orders.length;

  const pending = orders.filter(o => o.status === 'New' || o.status === 'Confirmed').length;
  document.getElementById('stat-pending').textContent = pending;

  const revenue = orders
    .filter(o => {
      if (!o.eventDate) return false;
      const d = new Date(o.eventDate + 'T00:00:00');
      return d >= startOfMonth && d <= endOfMonth && o.status !== 'Cancelled';
    })
    .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);
  document.getElementById('stat-revenue').textContent = fmtMoney(revenue);

  const upcoming = orders.filter(o => {
    const d = daysUntil(o.eventDate);
    return d !== null && d >= 0 && d <= 7 && o.status !== 'Delivered' && o.status !== 'Cancelled';
  }).length;
  document.getElementById('stat-upcoming').textContent = upcoming;

  // Outstanding balance (unpaid balances on active orders)
  const outstanding = orders
    .filter(o => !o.balancePaid && o.status !== 'Cancelled' && o.status !== 'Delivered')
    .reduce((sum, o) => {
      const bal = (parseFloat(o.totalPrice) || 0) - (o.depositPaid ? (parseFloat(o.depositAmount) || 0) : 0);
      return sum + Math.max(0, bal);
    }, 0);
  document.getElementById('stat-outstanding').textContent = fmtMoney(outstanding);

  const openInqs = inquiries.filter(i => i.status === 'New' || i.status === 'Contacted').length;
  document.getElementById('stat-inquiries').textContent = openInqs;

  // Recent orders (last 5)
  const recent = [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const recentEl = document.getElementById('recentOrdersList');
  if (recent.length === 0) {
    recentEl.innerHTML = `
      <div style="text-align:center;padding:2rem 0">
        <div style="font-size:2rem;color:var(--gold-dk);opacity:0.4;margin-bottom:0.5rem">&#10047;</div>
        <p style="font-size:0.82rem;color:var(--cream-dk);opacity:0.6">No orders yet.<br>Tap <strong>+ New Order</strong> to add your first one.</p>
      </div>`;
  } else {
    recentEl.innerHTML = recent.map(o => `
      <div class="recent-item" data-id="${o.id}">
        <div>
          <div class="recent-name">${o.customerName}</div>
          <div class="recent-service">${o.service || '—'}</div>
        </div>
        <span class="${badgeClass(o.status)}">${o.status}</span>
      </div>`).join('');
    recentEl.querySelectorAll('.recent-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.id));
    });
  }

  // Upcoming events (next 30 days)
  const soon = orders
    .filter(o => { const d = daysUntil(o.eventDate); return d !== null && d >= 0 && d <= 30 && o.status !== 'Cancelled'; })
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
    .slice(0, 6);

  const upcomingEl = document.getElementById('upcomingList');
  if (soon.length === 0) {
    upcomingEl.innerHTML = '<p style="font-size:0.82rem;color:var(--cream-dk);opacity:0.6;text-align:center;padding:1.5rem 0">No upcoming events in the next 30 days.</p>';
  } else {
    upcomingEl.innerHTML = soon.map(o => {
      const d = daysUntil(o.eventDate);
      const urgency = d === 0 ? '<span class="urgency-pill urgency-today">Today!</span>'
                    : d === 1 ? '<span class="urgency-pill urgency-tomorrow">Tomorrow</span>'
                    : d <= 5  ? `<span class="urgency-pill urgency-soon">In ${d} days</span>` : '';
      return `
        <div class="upcoming-item" data-id="${o.id}">
          <div>
            <div class="recent-name">${o.customerName}${urgency}</div>
            <div class="recent-service">${o.service || '—'}</div>
          </div>
          <div class="upcoming-date">${fmtShort(o.eventDate)}</div>
        </div>`;
    }).join('');
    upcomingEl.querySelectorAll('.upcoming-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.id));
    });
  }
}

// ============================================================
//  ORDERS TABLE
// ============================================================
function updateTabCounts() {
  const counts = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  document.querySelectorAll('.filter-tab').forEach(tab => {
    const s = tab.dataset.status;
    const n = s === 'all' ? orders.length : (counts[s] || 0);
    tab.textContent = `${s === 'all' ? 'All' : s} (${n})`;
  });
}

const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');

searchInput.addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase();
  searchClear.classList.toggle('show', searchQuery.length > 0);
  renderOrders();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('show');
  searchInput.focus();
  renderOrders();
});

document.getElementById('filterTabs').addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  filterStatus = tab.dataset.status;
  renderOrders();
});

function renderOrders() {
  let list = [...orders];
  if (filterStatus !== 'all') list = list.filter(o => o.status === filterStatus);
  if (searchQuery) {
    list = list.filter(o =>
      (o.customerName  || '').toLowerCase().includes(searchQuery) ||
      (o.customerEmail || '').toLowerCase().includes(searchQuery) ||
      (o.customerPhone || '').toLowerCase().includes(searchQuery) ||
      (o.service       || '').toLowerCase().includes(searchQuery)
    );
  }
  list.sort((a, b) => b.createdAt - a.createdAt);

  const tbody = document.getElementById('ordersBody');
  const empty = document.getElementById('ordersEmpty');

  if (list.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = list.map(o => {
    const balance = (parseFloat(o.totalPrice) || 0) - (parseFloat(o.depositAmount) || 0);
    const days    = daysUntil(o.eventDate);
    const active  = o.status !== 'Delivered' && o.status !== 'Cancelled';
    const rowClass = active && days !== null && days >= 0 && days <= 1 ? 'row-urgent'
                   : active && days !== null && days >= 0 && days <= 6 ? 'row-warning' : '';
    const urgencyPill = active && days !== null && days >= 0
      ? days === 0 ? '<span class="urgency-pill urgency-today">Today</span>'
      : days === 1 ? '<span class="urgency-pill urgency-tomorrow">Tomorrow</span>'
      : days <= 6  ? `<span class="urgency-pill urgency-soon">${days}d</span>` : ''
      : '';

    return `
      <tr data-id="${o.id}" class="${rowClass}">
        <td>
          <div class="td-name">${o.customerName}</div>
          <div class="td-phone">${o.customerPhone || ''}</div>
        </td>
        <td class="td-service">${o.service || '—'}</td>
        <td class="td-date">${fmt(o.eventDate)}${urgencyPill}</td>
        <td>${o.source || '—'}</td>
        <td class="td-price">${fmtMoney(o.totalPrice)}</td>
        <td class="td-deposit">
          <span class="paid-pill ${o.depositPaid ? 'yes' : 'no'}">
            ${o.depositPaid ? '&#10003; Paid' : 'Pending'}
          </span>
        </td>
        <td class="td-balance">
          <span class="paid-pill ${o.balancePaid ? 'yes' : 'no'}">
            ${o.balancePaid ? '&#10003; Paid' : fmtMoney(balance)}
          </span>
        </td>
        <td><span class="${badgeClass(o.status)}">${o.status}</span></td>
        <td><button class="action-btn" data-id="${o.id}">View</button></td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.classList.contains('action-btn')) return;
      openDetail(row.dataset.id);
    });
  });
  tbody.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openDetail(btn.dataset.id); });
  });
}

// ============================================================
//  CALENDAR
// ============================================================
document.getElementById('calPrev').addEventListener('click', () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

function renderCalendar() {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonth').textContent = `${monthNames[calMonth]} ${calYear}`;

  const grid    = document.getElementById('calendarGrid');
  const days    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today   = new Date(); today.setHours(0,0,0,0);
  const first   = new Date(calYear, calMonth, 1).getDay();
  const total   = new Date(calYear, calMonth + 1, 0).getDate();
  const prevEnd = new Date(calYear, calMonth, 0).getDate();

  let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  for (let i = first - 1; i >= 0; i--)
    html += `<div class="cal-day other-month"><div class="cal-day-num">${prevEnd - i}</div></div>`;

  for (let d = 1; d <= total; d++) {
    const dateStr  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday  = new Date(calYear, calMonth, d).getTime() === today.getTime();
    const dayOrders = orders.filter(o => o.eventDate === dateStr && o.status !== 'Cancelled');
    const events   = dayOrders.map(o =>
      `<span class="cal-event ${o.status.replace(/\s+/g,'-')}" data-id="${o.id}">${o.customerName}</span>`
    ).join('');
    html += `<div class="cal-day${isToday?' today':''}"><div class="cal-day-num">${d}</div>${events}</div>`;
  }

  const remainder = (first + total) % 7;
  if (remainder) for (let i = 1; i <= 7 - remainder; i++)
    html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;

  grid.innerHTML = html;
  grid.querySelectorAll('.cal-event').forEach(el => {
    el.addEventListener('click', e => { e.stopPropagation(); openDetail(el.dataset.id); });
  });
}

// ============================================================
//  ADD / EDIT ORDER MODAL
// ============================================================
const modalBackdrop = document.getElementById('modalBackdrop');
const orderForm     = document.getElementById('orderForm');

document.getElementById('topbarAddBtn').addEventListener('click', () => {
  if (activeView === 'inquiries') openInquiryModal(null);
  else openModal(null);
});
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

function openModal(id) {
  editingId = id || null;
  document.getElementById('modalTitle').textContent = id ? 'Edit Order' : 'New Order';
  document.getElementById('deleteOrderBtn').style.display = id ? 'inline-block' : 'none';

  if (id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    document.getElementById('orderId').value         = o.id;
    document.getElementById('customerName').value    = o.customerName || '';
    document.getElementById('customerPhone').value   = o.customerPhone || '';
    document.getElementById('customerEmail').value   = o.customerEmail || '';
    document.getElementById('orderSource').value     = o.source || '';
    document.getElementById('orderService').value    = o.service || '';
    document.getElementById('eventDate').value       = o.eventDate || '';
    document.getElementById('colorPalette').value    = o.colorPalette || '';
    document.getElementById('flowerPrefs').value     = o.flowerPrefs || '';
    document.getElementById('deliveryAddress').value = o.deliveryAddress || '';
    document.getElementById('totalPrice').value      = o.totalPrice || '';
    document.getElementById('depositAmount').value   = o.depositAmount || '';
    document.getElementById('depositPaid').checked   = !!o.depositPaid;
    document.getElementById('balancePaid').checked   = !!o.balancePaid;
    document.getElementById('orderStatus').value     = o.status || 'New';
    document.getElementById('orderNotes').value      = o.notes || '';
  } else {
    orderForm.reset();
    document.getElementById('orderId').value = '';
  }

  modalBackdrop.classList.add('open');
  setTimeout(() => document.getElementById('customerName').focus(), 100);
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  editingId = null;
}

orderForm.addEventListener('submit', e => {
  e.preventDefault();
  const isNew = !editingId;
  const id    = document.getElementById('orderId').value || genId();
  const order = {
    id,
    createdAt:       isNew ? Date.now() : (orders.find(x => x.id === editingId)?.createdAt || Date.now()),
    customerName:    document.getElementById('customerName').value.trim(),
    customerPhone:   document.getElementById('customerPhone').value.trim(),
    customerEmail:   document.getElementById('customerEmail').value.trim(),
    source:          document.getElementById('orderSource').value,
    service:         document.getElementById('orderService').value,
    eventDate:       document.getElementById('eventDate').value,
    colorPalette:    document.getElementById('colorPalette').value.trim(),
    flowerPrefs:     document.getElementById('flowerPrefs').value.trim(),
    deliveryAddress: document.getElementById('deliveryAddress').value.trim(),
    totalPrice:      document.getElementById('totalPrice').value,
    depositAmount:   document.getElementById('depositAmount').value,
    depositPaid:     document.getElementById('depositPaid').checked,
    balancePaid:     document.getElementById('balancePaid').checked,
    status:          document.getElementById('orderStatus').value,
    notes:           document.getElementById('orderNotes').value.trim(),
  };

  if (editingId) {
    const idx = orders.findIndex(x => x.id === editingId);
    if (idx > -1) orders[idx] = order;
    showToast('Order updated successfully.');
  } else {
    orders.unshift(order);
    showToast('New order added!');
  }

  saveOrders();
  closeModal();
  refreshCurrentView();
});

document.getElementById('deleteOrderBtn').addEventListener('click', async () => {
  if (!editingId) return;
  const o    = orders.find(x => x.id === editingId);
  const name = o ? o.customerName : 'this order';
  const confirmed = await showConfirm(`Delete order for ${name}? This cannot be undone.`, 'Delete');
  if (!confirmed) return;
  orders = orders.filter(x => x.id !== editingId);
  saveOrders();
  closeModal();
  closeDetail();
  showToast('Order deleted.', 'info');
  refreshCurrentView();
});

function refreshCurrentView() {
  if (activeView === 'overview')  renderOverview();
  if (activeView === 'inquiries') { updateInqTabCounts(); renderInquiries(); }
  if (activeView === 'orders')    { updateTabCounts(); renderOrders(); }
  if (activeView === 'calendar')  renderCalendar();
}

// ============================================================
//  DETAIL PANEL
// ============================================================
const detailBackdrop = document.getElementById('detailBackdrop');

document.getElementById('detailClose').addEventListener('click', closeDetail);
detailBackdrop.addEventListener('click', e => { if (e.target === detailBackdrop) closeDetail(); });
document.getElementById('detailEditBtn').addEventListener('click', () => {
  const id = detailBackdrop.dataset.orderId;
  closeDetail();
  openModal(id);
});

function openDetail(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  detailBackdrop.dataset.orderId = id;
  document.getElementById('detailName').textContent = o.customerName;

  const days    = daysUntil(o.eventDate);
  const balance = (parseFloat(o.totalPrice) || 0) - (parseFloat(o.depositAmount) || 0);
  const urgencyBanner = days !== null && days >= 0 && days <= 3 && o.status !== 'Delivered' && o.status !== 'Cancelled'
    ? `<div style="background:rgba(192,80,80,0.15);border:1px solid rgba(192,80,80,0.3);padding:0.65rem 0.85rem;margin-bottom:1rem;font-size:0.8rem;color:#e08080;border-radius:2px">
        &#9888; Event is ${days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `in ${days} days`}
       </div>` : '';

  document.getElementById('detailBody').innerHTML = `
    ${urgencyBanner}
    <div class="detail-row">
      <div class="detail-label">Status — update instantly</div>
      <div class="detail-value">
        <select class="status-select" id="detailStatusSelect">
          ${['New','Confirmed','In Progress','Ready','Delivered','Cancelled']
            .map(s => `<option ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <hr class="detail-divider" />
    <div class="detail-row">
      <div class="detail-label">Phone</div>
      <div class="detail-value"><a href="tel:${o.customerPhone}" style="color:var(--gold-lt)">${o.customerPhone || '—'}</a></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Email</div>
      <div class="detail-value"><a href="mailto:${o.customerEmail}" style="color:var(--gold-lt)">${o.customerEmail || '—'}</a></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Source</div>
      <div class="detail-value">${o.source || '—'}</div>
    </div>
    <hr class="detail-divider" />
    <div class="detail-row">
      <div class="detail-label">Service</div>
      <div class="detail-value">${o.service || '—'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Event Date</div>
      <div class="detail-value">${fmt(o.eventDate)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Color Palette</div>
      <div class="detail-value">${o.colorPalette || '—'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Flower Preferences</div>
      <div class="detail-value">${o.flowerPrefs || '—'}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Delivery Address</div>
      <div class="detail-value">${o.deliveryAddress || '—'}</div>
    </div>
    <hr class="detail-divider" />
    <div class="detail-row">
      <div class="detail-label">Total Price</div>
      <div class="detail-value" style="font-size:1.1rem;font-weight:700;color:var(--gold-lt)">${fmtMoney(o.totalPrice)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Deposit</div>
      <div class="detail-value">${fmtMoney(o.depositAmount)} &nbsp;<span class="paid-pill ${o.depositPaid?'yes':'no'}">${o.depositPaid?'&#10003; Received':'Pending'}</span></div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Balance Due</div>
      <div class="detail-value">${fmtMoney(balance)} &nbsp;<span class="paid-pill ${o.balancePaid?'yes':'no'}">${o.balancePaid?'&#10003; Paid':'Outstanding'}</span></div>
    </div>
    ${o.notes ? `
    <hr class="detail-divider" />
    <div class="detail-row">
      <div class="detail-label">Notes</div>
      <div class="detail-value" style="white-space:pre-line">${o.notes}</div>
    </div>` : ''}
    <hr class="detail-divider" />
    <div class="detail-row">
      <div class="detail-label">Order Created</div>
      <div class="detail-value">${new Date(o.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
    </div>
    <hr class="detail-divider" />
    <div class="payment-section">
      <div class="payment-status-row">
        <div>
          <span class="payment-status-pill pmt-${o.paymentStatus || 'unpaid'}">
            ${o.paymentStatus === 'Paid' ? '&#10003; Paid' : o.paymentStatus === 'Requested' ? '&#8987; Requested' : '&#9675; Unpaid'}
          </span>
        </div>
        <div class="payment-section-actions">
          ${o.paymentStatus !== 'Paid' ? `<button class="btn-primary" id="requestPaymentBtn">Request Payment</button>` : ''}
          ${o.paymentStatus === 'Requested' ? `<button class="btn-outline mark-paid-inline" id="markPaidInlineBtn">&#10003; Mark Paid</button>` : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('detailStatusSelect').addEventListener('change', async e => {
    const newStatus = e.target.value;
    const idx = orders.findIndex(x => x.id === id);
    if (idx === -1) return;
    orders[idx].status = newStatus;
    saveOrders();
    showToast(`Status updated to "${newStatus}".`);
    refreshCurrentView();
    if (CUSTOMER_FACING_STATUSES[newStatus]) {
      if (orders[idx].customerEmail) {
        await showEmailModal(orders[idx], newStatus);
      } else {
        showToast('No customer email on file — skipping email prompt.', 'info');
      }
    }
  });

  document.getElementById('requestPaymentBtn')?.addEventListener('click', () => openPaymentModal(id));
  document.getElementById('markPaidInlineBtn')?.addEventListener('click', async () => {
    const confirmed = await showConfirm('Mark this payment as received in full?', 'Mark Paid');
    if (!confirmed) return;
    markOrderPaid(id);
    closeDetail();
  });

  detailBackdrop.classList.add('open');
}

function closeDetail() { detailBackdrop.classList.remove('open'); }

// ============================================================
//  SETTINGS
// ============================================================
document.getElementById('passwordForm').addEventListener('submit', e => {
  e.preventDefault();
  const msg = document.getElementById('pwMsg');
  const cur = document.getElementById('currentPw').value;
  const nw  = document.getElementById('newPw').value;
  const cnf = document.getElementById('confirmPw').value;

  if (cur !== localStorage.getItem(PW_KEY)) {
    msg.textContent = 'Current password is incorrect.'; msg.className = 'pw-msg error'; return;
  }
  if (nw !== cnf) {
    msg.textContent = 'New passwords do not match.'; msg.className = 'pw-msg error'; return;
  }
  localStorage.setItem(PW_KEY, nw);
  msg.textContent = 'Password updated!'; msg.className = 'pw-msg success';
  showToast('Password updated successfully.');
  document.getElementById('passwordForm').reset();
});

// Export CSV
document.getElementById('exportBtn').addEventListener('click', () => {
  if (orders.length === 0) { showToast('No orders to export.', 'info'); return; }
  const headers = ['Name','Phone','Email','Source','Service','Event Date','Colors','Flowers','Delivery Address','Total','Deposit','Deposit Paid','Balance Paid','Status','Notes','Created'];
  const rows = orders.map(o => [
    o.customerName, o.customerPhone, o.customerEmail, o.source, o.service,
    o.eventDate, o.colorPalette, o.flowerPrefs, o.deliveryAddress,
    o.totalPrice, o.depositAmount,
    o.depositPaid ? 'Yes' : 'No',
    o.balancePaid ? 'Yes' : 'No',
    o.status, o.notes,
    new Date(o.createdAt).toLocaleDateString()
  ].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`));

  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `be-flourished-orders-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${orders.length} orders.`);
});

// Import JSON
document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      const ok = await showConfirm(`Import ${data.length} orders? This will replace all current orders.`, 'Import');
      if (!ok) return;
      orders = data;
      saveOrders();
      showToast(`Imported ${data.length} orders.`);
      refreshCurrentView();
    } catch { showToast('Invalid backup file.', 'error'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ============================================================
//  JSONBIN SETTINGS
// ============================================================
function initJsonbinSettings() {
  const keyInput = document.getElementById('jsonbinKey');
  const binInput = document.getElementById('jsonbinBinId');
  if (!keyInput || !binInput) return;
  keyInput.value = localStorage.getItem(JSONBIN_KEY_STORAGE) || '';
  binInput.value = localStorage.getItem(JSONBIN_BIN_STORAGE) || '';
}

document.getElementById('saveJsonbinBtn').addEventListener('click', () => {
  const key = document.getElementById('jsonbinKey').value.trim();
  const bin = document.getElementById('jsonbinBinId').value.trim();
  localStorage.setItem(JSONBIN_KEY_STORAGE, key);
  localStorage.setItem(JSONBIN_BIN_STORAGE, bin);
  const msg = document.getElementById('jsonbinMsg');
  msg.textContent = 'Settings saved.';
  msg.className = 'pw-msg success';
  showToast('JSONbin settings saved.');
});

document.getElementById('testJsonbinBtn').addEventListener('click', async () => {
  const key = localStorage.getItem(JSONBIN_KEY_STORAGE);
  const bin = localStorage.getItem(JSONBIN_BIN_STORAGE);
  const msg = document.getElementById('jsonbinMsg');
  if (!key || !bin) {
    msg.textContent = 'Enter and save the key and bin ID first.';
    msg.className = 'pw-msg error';
    return;
  }
  msg.textContent = 'Testing...';
  msg.className = 'pw-msg';
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${bin}/latest`, {
      headers: { 'X-Master-Key': key }
    });
    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data.record) ? data.record.length : '?';
      msg.textContent = `Connected! ${count} approved review(s) in bin.`;
      msg.className = 'pw-msg success';
    } else {
      msg.textContent = `Error ${res.status} — check your key and bin ID.`;
      msg.className = 'pw-msg error';
    }
  } catch {
    msg.textContent = 'Network error. Check your connection.';
    msg.className = 'pw-msg error';
  }
});

// ============================================================
//  REVIEWS MANAGEMENT
// ============================================================
function saveReviews() { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); }

function renderReviews() {
  const list  = document.getElementById('reviewsList');
  const empty = document.getElementById('reviewsEmpty');
  const note  = document.getElementById('reviewsSyncNote');

  if (reviews.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    note.textContent = '';
    return;
  }
  empty.style.display = 'none';
  const approved = reviews.filter(r => r.approved).length;
  note.textContent = `${reviews.length} review(s) total · ${approved} published to website`;

  list.innerHTML = [...reviews]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .map(r => `
      <div class="review-card ${r.approved ? 'approved' : 'pending'}" data-id="${r.id}">
        <div class="rv-card-header">
          <span class="rv-card-name">${r.anonymous ? 'Anonymous' : (r.customerName || 'Unknown')}</span>
          <span class="rv-card-stars">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
        </div>
        <div class="rv-card-meta">${r.service || 'General'} · ${r.date || '—'}</div>
        <div class="rv-card-text">${r.text || ''}</div>
        <div class="rv-card-status">
          ${r.approved
            ? '<span class="rv-verified-badge">&#10003; Published</span>'
            : '<span class="rv-pending-badge">Pending Approval</span>'}
        </div>
        <div class="rv-card-actions">
          <button class="rv-publish-btn ${r.approved ? 'unpublish' : ''}" data-id="${r.id}">
            ${r.approved ? 'Unpublish' : 'Approve &amp; Publish'}
          </button>
          <button class="rv-edit-btn" data-id="${r.id}">Edit</button>
        </div>
      </div>`).join('');

  list.querySelectorAll('.rv-publish-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleApproveReview(btn.dataset.id); });
  });
  list.querySelectorAll('.rv-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openReviewModal(btn.dataset.id); });
  });
}

async function toggleApproveReview(id) {
  const idx = reviews.findIndex(r => r.id === id);
  if (idx === -1) return;
  reviews[idx].approved = !reviews[idx].approved;
  saveReviews();
  renderReviews();
  const action = reviews[idx].approved ? 'published' : 'unpublished';
  showToast(`Review ${action}.`, 'success');
  await pushReviewsToJsonbin();
}

async function pushReviewsToJsonbin() {
  const key = localStorage.getItem(JSONBIN_KEY_STORAGE);
  const bin = localStorage.getItem(JSONBIN_BIN_STORAGE);
  if (!key || !bin) {
    showToast('JSONbin not configured. Review saved locally only.', 'info');
    return;
  }
  const approved = reviews
    .filter(r => r.approved)
    .map(({ id, customerName, anonymous, rating, text, service, date, photoUrl }) => ({
      id, customerName, anonymous, rating, text, service, date,
      photoUrl: photoUrl || null,
      verified: true
    }));
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${bin}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': key },
      body: JSON.stringify(approved)
    });
    if (res.ok) {
      showToast(`${approved.length} review(s) synced to website.`, 'success');
    } else {
      showToast(`JSONbin sync failed (${res.status}). Saved locally.`, 'error');
    }
  } catch {
    showToast('Network error. Review saved locally only.', 'error');
  }
}

async function fetchReviewsFromJsonbin() {
  const key = localStorage.getItem(JSONBIN_KEY_STORAGE);
  const bin = localStorage.getItem(JSONBIN_BIN_STORAGE);
  if (!key || !bin) { showToast('Configure JSONbin settings first.', 'info'); return; }
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${bin}/latest`, {
      headers: { 'X-Master-Key': key }
    });
    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data.record) ? data.record.length : 0;
      showToast(`JSONbin has ${count} approved review(s) live on site.`, 'info');
    } else {
      showToast(`JSONbin fetch failed (${res.status}).`, 'error');
    }
  } catch {
    showToast('Network error during sync.', 'error');
  }
}

// ── Review Modal ──
const reviewModalBackdrop = document.getElementById('reviewModalBackdrop');
const reviewForm = document.getElementById('reviewForm');

document.getElementById('addReviewBtn').addEventListener('click', () => openReviewModal(null));
document.getElementById('fetchReviewsBtn').addEventListener('click', fetchReviewsFromJsonbin);
document.getElementById('reviewModalClose').addEventListener('click', closeReviewModal);
document.getElementById('cancelReviewBtn').addEventListener('click', closeReviewModal);
reviewModalBackdrop.addEventListener('click', e => { if (e.target === reviewModalBackdrop) closeReviewModal(); });

function openReviewModal(id) {
  document.getElementById('reviewModalTitle').textContent = id ? 'Edit Review' : 'Add Review';
  document.getElementById('deleteReviewBtn').style.display = id ? 'inline-block' : 'none';

  if (id) {
    const r = reviews.find(x => x.id === id);
    if (!r) return;
    document.getElementById('reviewId').value       = r.id;
    document.getElementById('rvCustomerName').value = r.customerName || '';
    document.getElementById('rvRating').value       = r.rating || '';
    document.getElementById('rvService').value      = r.service || '';
    document.getElementById('rvDate').value         = r.date || '';
    document.getElementById('rvText').value         = r.text || '';
    document.getElementById('rvPhotoUrl').value     = r.photoUrl || '';
    document.getElementById('rvAnonymous').checked  = !!r.anonymous;
    document.getElementById('rvApproved').checked   = !!r.approved;
  } else {
    reviewForm.reset();
    document.getElementById('reviewId').value = '';
    document.getElementById('rvDate').value   = new Date().toISOString().slice(0, 10);
  }

  reviewModalBackdrop.classList.add('open');
  setTimeout(() => document.getElementById('rvCustomerName').focus(), 100);
}

function closeReviewModal() { reviewModalBackdrop.classList.remove('open'); }

reviewForm.addEventListener('submit', async e => {
  e.preventDefault();
  const existingId   = document.getElementById('reviewId').value;
  const isNew        = !existingId;
  const id           = existingId || genId();
  const wasApproved  = !isNew && (reviews.find(x => x.id === id)?.approved || false);
  const nowApproved  = document.getElementById('rvApproved').checked;

  const review = {
    id,
    customerName: document.getElementById('rvCustomerName').value.trim(),
    anonymous:    document.getElementById('rvAnonymous').checked,
    rating:       parseInt(document.getElementById('rvRating').value, 10) || 0,
    service:      document.getElementById('rvService').value,
    date:         document.getElementById('rvDate').value,
    text:         document.getElementById('rvText').value.trim(),
    photoUrl:     document.getElementById('rvPhotoUrl').value.trim() || null,
    approved:     nowApproved,
  };

  if (isNew) {
    reviews.unshift(review);
    showToast('Review added.');
  } else {
    const idx = reviews.findIndex(x => x.id === id);
    if (idx > -1) reviews[idx] = review;
    showToast('Review updated.');
  }

  saveReviews();
  closeReviewModal();
  renderReviews();

  if (wasApproved !== nowApproved || (isNew && nowApproved)) {
    await pushReviewsToJsonbin();
  }
});

document.getElementById('deleteReviewBtn').addEventListener('click', async () => {
  const id = document.getElementById('reviewId').value;
  if (!id) return;
  const r = reviews.find(x => x.id === id);
  const confirmed = await showConfirm(
    `Delete review from ${r?.customerName || 'this customer'}?`, 'Delete'
  );
  if (!confirmed) return;
  const wasApproved = r?.approved;
  reviews = reviews.filter(x => x.id !== id);
  saveReviews();
  closeReviewModal();
  renderReviews();
  showToast('Review deleted.', 'info');
  if (wasApproved) await pushReviewsToJsonbin();
});

// ============================================================
//  EMAIL DRAFT MODAL
// ============================================================
const CUSTOMER_FACING_STATUSES = {
  'Confirmed': {
    subject: name => `Your order has been confirmed! — Be Flourished`,
    body: o =>
`Hi ${o.customerName},

Great news — your order has been confirmed! We're so excited to create something beautiful for you.

Order Details:
  Service: ${o.service || '—'}
  Event Date: ${o.eventDate ? fmt(o.eventDate) : '—'}

If you have any questions or need to make changes, please don't hesitate to reach out.

With love,
Be Flourished Florist
beflourishedflorals@gmail.com | 216-356-9761`
  },
  'Ready': {
    subject: name => `Your order is ready! — Be Flourished`,
    body: o =>
`Hi ${o.customerName},

Your order is ready! 🌸${o.deliveryAddress
  ? `\n\nWe'll be delivering to: ${o.deliveryAddress}`
  : '\n\nPlease coordinate pickup at your convenience.'}

If you have any questions, reply to this email or call/text us at 216-356-9761.

With love,
Be Flourished Florist`
  },
  'Delivered': {
    subject: name => `Your order has been delivered — Be Flourished`,
    body: o =>
`Hi ${o.customerName},

Your order has been delivered — we hope you love it! It was such a joy creating something special for you.

Thank you for choosing Be Flourished. We'd love to work with you again.

With love,
Be Flourished Florist
beflourishedflorals@gmail.com | 216-356-9761`
  }
};

function buildFeedbackLink(o) {
  const base = 'https://beflourishedflorals.com/feedback.html';
  const p = new URLSearchParams({ ref: o.id });
  if (o.service) p.set('service', o.service);
  return `${base}?${p.toString()}`;
}

function buildThankYouBody(o) {
  return `Hi ${o.customerName},

Thank you so much for choosing Be Flourished! We're truly grateful for the opportunity to be part of your special moments.

If you have a moment, we'd love to hear about your experience. Your feedback means the world to us:

${buildFeedbackLink(o)}

With gratitude,
Be Flourished Florist 🌸
beflourishedflorals@gmail.com | 216-356-9761`;
}

function buildMailto(to, subject, body) {
  const MAX = 1800;
  const safe = body.length > MAX ? body.slice(0, MAX) + '...' : body;
  return `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(safe)}`;
}

const emailModalBackdrop = document.getElementById('emailModalBackdrop');
let _emailResolve = null;

document.getElementById('emailModalClose').addEventListener('click', closeEmailModal);
document.getElementById('emailSkipBtn').addEventListener('click', closeEmailModal);
emailModalBackdrop.addEventListener('click', e => { if (e.target === emailModalBackdrop) closeEmailModal(); });

function closeEmailModal() {
  emailModalBackdrop.classList.remove('open');
  if (_emailResolve) { _emailResolve(); _emailResolve = null; }
}

function showEmailModal(order, newStatus) {
  return new Promise(resolve => {
    _emailResolve = resolve;

    const tpl     = CUSTOMER_FACING_STATUSES[newStatus];
    const subject = tpl.subject(order.customerName);
    const body    = tpl.body(order);

    document.getElementById('emailModalTitle').textContent  = `Notify Customer — ${newStatus}`;
    document.getElementById('emailModalIntro').textContent  =
      `Status changed to "${newStatus}". Click below to open a pre-filled email to ${order.customerName}.`;
    document.getElementById('emailTo').textContent      = order.customerEmail || '(no email on file)';
    document.getElementById('emailSubject').textContent = subject;
    document.getElementById('emailBody').textContent    = body;

    document.getElementById('emailOpenBtn').onclick = () => {
      if (!order.customerEmail) { showToast('No customer email on file.', 'error'); return; }
      window.location.href = buildMailto(order.customerEmail, subject, body);
    };

    const tySection = document.getElementById('emailThankYouSection');
    const tyBtn     = document.getElementById('emailThankYouBtn');

    if (newStatus === 'Delivered') {
      const tyBody    = buildThankYouBody(order);
      const tySubject = `Thank You from Be Flourished Florist 🌸`;
      document.getElementById('emailThankYouBody').textContent = tyBody;
      tySection.style.display = 'block';
      tyBtn.style.display = 'inline-block';
      tyBtn.onclick = () => {
        if (!order.customerEmail) { showToast('No email on file.', 'error'); return; }
        window.location.href = buildMailto(order.customerEmail, tySubject, tyBody);
      };
    } else {
      tySection.style.display = 'none';
      tyBtn.style.display = 'none';
    }

    emailModalBackdrop.classList.add('open');
  });
}

// ============================================================
//  INQUIRIES
// ============================================================
function saveInquiries() { localStorage.setItem(INQUIRIES_KEY, JSON.stringify(inquiries)); }

function updateInqTabCounts() {
  const counts = {};
  inquiries.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
  document.querySelectorAll('#inqFilterTabs .filter-tab').forEach(tab => {
    const s = tab.dataset.status;
    const n = s === 'all' ? inquiries.length : (counts[s] || 0);
    tab.textContent = `${s === 'all' ? 'All' : s} (${n})`;
  });
}

document.getElementById('inqFilterTabs').addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('#inqFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  inqFilterStatus = tab.dataset.status;
  renderInquiries();
});

function renderInquiries() {
  let list = [...inquiries];
  if (inqFilterStatus !== 'all') list = list.filter(i => i.status === inqFilterStatus);
  list.sort((a, b) => b.createdAt - a.createdAt);

  const container = document.getElementById('inquiriesList');
  const empty     = document.getElementById('inquiriesEmpty');

  if (list.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = list.map(i => `
    <div class="inquiry-card status-${i.status}" data-id="${i.id}">
      <div class="inq-card-header">
        <span class="inq-card-name">${i.name}</span>
        <span class="inq-status-badge inq-status-${i.status}">${i.status}</span>
      </div>
      <div class="inq-card-service">${i.service || 'General inquiry'}${i.eventDate ? ' &middot; ' + fmt(i.eventDate) : ''}${i.budget ? ' &middot; ' + i.budget : ''}</div>
      ${i.message ? `<div class="inq-card-meta">${i.message.length > 100 ? i.message.slice(0, 100) + '…' : i.message}</div>` : ''}
      <div class="inq-card-contact">
        ${i.phone ? `<a href="tel:${i.phone}" onclick="event.stopPropagation()">${i.phone}</a>` : ''}
        ${i.phone && i.email ? ' &middot; ' : ''}
        ${i.email ? `<a href="mailto:${i.email}" onclick="event.stopPropagation()">${i.email}</a>` : ''}
      </div>
    </div>`).join('');

  container.querySelectorAll('.inquiry-card').forEach(el => {
    el.addEventListener('click', () => openInquiryModal(el.dataset.id));
  });
}

// ── Inquiry Modal ──
const inquiryModalBackdrop = document.getElementById('inquiryModalBackdrop');
const inquiryForm          = document.getElementById('inquiryForm');

document.getElementById('inquiryModalClose').addEventListener('click', closeInquiryModal);
document.getElementById('cancelInquiryBtn').addEventListener('click', closeInquiryModal);
inquiryModalBackdrop.addEventListener('click', e => { if (e.target === inquiryModalBackdrop) closeInquiryModal(); });

function openInquiryModal(id) {
  editingInquiryId = id || null;
  document.getElementById('inquiryModalTitle').textContent       = id ? 'Edit Inquiry' : 'New Inquiry';
  document.getElementById('deleteInquiryBtn').style.display      = id ? 'inline-block' : 'none';
  document.getElementById('convertToOrderBtn').style.display     = id ? 'inline-block' : 'none';

  if (id) {
    const i = inquiries.find(x => x.id === id);
    if (!i) return;
    document.getElementById('inquiryId').value    = i.id;
    document.getElementById('inqName').value      = i.name      || '';
    document.getElementById('inqPhone').value     = i.phone     || '';
    document.getElementById('inqEmail').value     = i.email     || '';
    document.getElementById('inqService').value   = i.service   || '';
    document.getElementById('inqEventDate').value = i.eventDate || '';
    document.getElementById('inqBudget').value    = i.budget    || '';
    document.getElementById('inqMessage').value   = i.message   || '';
    document.getElementById('inqStatus').value    = i.status    || 'New';
    document.getElementById('inqNotes').value     = i.notes     || '';
  } else {
    inquiryForm.reset();
    document.getElementById('inquiryId').value = '';
  }

  inquiryModalBackdrop.classList.add('open');
  setTimeout(() => document.getElementById('inqName').focus(), 100);
}

function closeInquiryModal() {
  inquiryModalBackdrop.classList.remove('open');
  editingInquiryId = null;
}

inquiryForm.addEventListener('submit', e => {
  e.preventDefault();
  const isNew = !editingInquiryId;
  const id    = document.getElementById('inquiryId').value || genId();
  const inq   = {
    id,
    createdAt:  isNew ? Date.now() : (inquiries.find(x => x.id === editingInquiryId)?.createdAt || Date.now()),
    name:       document.getElementById('inqName').value.trim(),
    phone:      document.getElementById('inqPhone').value.trim(),
    email:      document.getElementById('inqEmail').value.trim(),
    service:    document.getElementById('inqService').value,
    eventDate:  document.getElementById('inqEventDate').value,
    budget:     document.getElementById('inqBudget').value.trim(),
    message:    document.getElementById('inqMessage').value.trim(),
    status:     document.getElementById('inqStatus').value,
    notes:      document.getElementById('inqNotes').value.trim(),
  };

  if (editingInquiryId) {
    const idx = inquiries.findIndex(x => x.id === editingInquiryId);
    if (idx > -1) inquiries[idx] = inq;
    showToast('Inquiry updated.');
  } else {
    inquiries.unshift(inq);
    showToast('New inquiry added!');
  }

  saveInquiries();
  closeInquiryModal();
  refreshCurrentView();
});

document.getElementById('deleteInquiryBtn').addEventListener('click', async () => {
  if (!editingInquiryId) return;
  const i         = inquiries.find(x => x.id === editingInquiryId);
  const confirmed = await showConfirm(`Delete inquiry from ${i?.name || 'this person'}? This cannot be undone.`, 'Delete');
  if (!confirmed) return;
  inquiries = inquiries.filter(x => x.id !== editingInquiryId);
  saveInquiries();
  closeInquiryModal();
  showToast('Inquiry deleted.', 'info');
  refreshCurrentView();
});

document.getElementById('sendDetailsRequestBtn').addEventListener('click', () => {
  const name    = document.getElementById('inqName').value.trim();
  const email   = document.getElementById('inqEmail').value.trim();
  const service = document.getElementById('inqService').value;
  if (!email) { showToast('No email on file — enter customer email first.', 'error'); return; }
  if (!name)  { showToast('Please enter the customer name first.', 'error'); return; }
  const subject = "Let's plan your floral order — Be Flourished";
  const body    = buildDetailsRequestBody({ name, service });
  window.location.href = buildMailto(email, subject, body);
});

function buildDetailsRequestBody(inq) {
  return `Hi ${inq.name},

Thank you for your interest in Be Flourished Florist! We'd love to help make your event special.

To get started, could you share a few details?

  - Event type and date
  - Number of arrangements needed
  - Color palette or style preferences
  - Flower preferences (or flowers to avoid)
  - Delivery address (if applicable)
  - Budget range

Feel free to reply to this email or call/text us at 216-356-9761.

Looking forward to creating something beautiful for you!

With love,
Be Flourished Florist
beflourishedflorals@gmail.com | 216-356-9761`;
}

document.getElementById('convertToOrderBtn').addEventListener('click', () => {
  const id = editingInquiryId || document.getElementById('inquiryId').value;
  if (!id) return;
  const idx = inquiries.findIndex(x => x.id === id);
  if (idx > -1 && inquiries[idx].status !== 'Converted') {
    inquiries[idx].status = 'Converted';
    saveInquiries();
  }
  closeInquiryModal();
  convertInquiryToOrder(id);
});

function convertInquiryToOrder(inquiryId) {
  const inq = inquiries.find(x => x.id === inquiryId);
  if (!inq) return;
  switchView('orders');
  openModal(null);
  document.getElementById('customerName').value  = inq.name      || '';
  document.getElementById('customerPhone').value = inq.phone     || '';
  document.getElementById('customerEmail').value = inq.email     || '';
  document.getElementById('orderService').value  = inq.service   || '';
  document.getElementById('eventDate').value     = inq.eventDate || '';
  document.getElementById('orderNotes').value    = [
    inq.message ? `Request: ${inq.message}` : '',
    inq.budget  ? `Budget: ${inq.budget}`   : '',
    inq.notes   ? `Notes: ${inq.notes}`     : '',
  ].filter(Boolean).join('\n');
  showToast('Inquiry converted — review and save the order.', 'info');
}

// ============================================================
//  PAYMENT SETTINGS
// ============================================================
function initPaymentSettings() {
  const ps  = paymentSettings;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('paypalLink',   ps.paypalLink);
  set('venmoHandle',  ps.venmoHandle);
  set('cashappTag',   ps.cashappTag);
  set('zelleInfo',    ps.zelleInfo);
  set('applePayLink', ps.applePayLink);
}

document.getElementById('savePaymentSettingsBtn').addEventListener('click', () => {
  paymentSettings = {
    paypalLink:   document.getElementById('paypalLink').value.trim(),
    venmoHandle:  document.getElementById('venmoHandle').value.trim(),
    cashappTag:   document.getElementById('cashappTag').value.trim(),
    zelleInfo:    document.getElementById('zelleInfo').value.trim(),
    applePayLink: document.getElementById('applePayLink').value.trim(),
  };
  localStorage.setItem(PAYMENT_SETTINGS_KEY, JSON.stringify(paymentSettings));
  const msg = document.getElementById('paymentSettingsMsg');
  msg.textContent = 'Payment settings saved.';
  msg.className = 'pw-msg success';
  showToast('Payment settings saved.');
});

// ============================================================
//  PAYMENT MODAL
// ============================================================
const paymentModalBackdrop = document.getElementById('paymentModalBackdrop');

document.getElementById('paymentModalClose').addEventListener('click', closePaymentModal);
document.getElementById('cancelPaymentBtn').addEventListener('click', closePaymentModal);
paymentModalBackdrop.addEventListener('click', e => { if (e.target === paymentModalBackdrop) closePaymentModal(); });

function openPaymentModal(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  const balance = (parseFloat(o.totalPrice) || 0) - (parseFloat(o.depositAmount) || 0);
  document.getElementById('paymentOrderId').value = orderId;
  document.getElementById('paymentOrderSummary').textContent =
    `${o.customerName} · ${o.service || 'Order'} · Balance due: ${fmtMoney(balance)}`;
  document.getElementById('paymentAmount').value = Math.max(0, balance).toFixed(2);
  document.getElementById('paymentMethod').value = '';
  document.getElementById('paymentNote').value   = '';
  document.getElementById('paymentLinkPreview').style.display = 'none';
  paymentModalBackdrop.classList.add('open');
}

function closePaymentModal() { paymentModalBackdrop.classList.remove('open'); }

document.getElementById('paymentMethod').addEventListener('change', e => {
  const method = e.target.value;
  const ps     = paymentSettings;
  let link = '';
  if (method === 'PayPal'    && ps.paypalLink)   link = ps.paypalLink;
  if (method === 'Venmo'     && ps.venmoHandle)   link = `https://venmo.com/${ps.venmoHandle.replace('@', '')}`;
  if (method === 'CashApp'   && ps.cashappTag)    link = `https://cash.app/${ps.cashappTag}`;
  if (method === 'Zelle'     && ps.zelleInfo)     link = ps.zelleInfo;
  if (method === 'Apple Pay' && ps.applePayLink)  link = ps.applePayLink;

  const preview = document.getElementById('paymentLinkPreview');
  if (link) {
    document.getElementById('paymentLinkCode').textContent = link;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
});

document.getElementById('paymentForm').addEventListener('submit', e => {
  e.preventDefault();
  const orderId = document.getElementById('paymentOrderId').value;
  const amount  = document.getElementById('paymentAmount').value;
  const method  = document.getElementById('paymentMethod').value;
  const note    = document.getElementById('paymentNote').value.trim();
  const o       = orders.find(x => x.id === orderId);
  if (!o) return;
  if (!o.customerEmail) { showToast('No customer email on file.', 'error'); return; }

  const idx = orders.findIndex(x => x.id === orderId);
  if (idx > -1) { orders[idx].paymentStatus = 'Requested'; saveOrders(); }

  const subject = 'Payment Request — Be Flourished Florist';
  const body    = buildPaymentRequestBody(o, amount, method, note);
  closePaymentModal();
  refreshCurrentView();
  showToast('Opening email with payment request…', 'info');
  window.location.href = buildMailto(o.customerEmail, subject, body);
});

function buildPaymentRequestBody(o, amount, method, note) {
  const ps = paymentSettings;
  let payLine = '';
  if (method === 'PayPal'    && ps.paypalLink)   payLine = `PayPal: ${ps.paypalLink}`;
  if (method === 'Venmo'     && ps.venmoHandle)   payLine = `Venmo: ${ps.venmoHandle}`;
  if (method === 'CashApp'   && ps.cashappTag)    payLine = `Cash App: ${ps.cashappTag}`;
  if (method === 'Zelle'     && ps.zelleInfo)     payLine = `Zelle: ${ps.zelleInfo}`;
  if (method === 'Apple Pay' && ps.applePayLink)  payLine = `Apple Pay / Card: ${ps.applePayLink}`;
  if (method === 'Cash')   payLine = 'Cash — please coordinate payment with us directly.';
  if (method === 'Check')  payLine = 'Check — please make payable to Be Flourished Florist.';

  return `Hi ${o.customerName},

A payment is ready for your order with Be Flourished Florist.

  Service: ${o.service || '—'}
  Event Date: ${o.eventDate ? fmt(o.eventDate) : '—'}
  Amount Due: $${parseFloat(amount).toFixed(2)}${note ? `\n  Note: ${note}` : ''}

${payLine ? `To pay:\n  ${payLine}\n` : ''}If you have any questions, please don't hesitate to reach out.

With love,
Be Flourished Florist
beflourishedflorals@gmail.com | 216-356-9761`;
}

document.getElementById('markAsPaidBtn').addEventListener('click', async () => {
  const orderId   = document.getElementById('paymentOrderId').value;
  const confirmed = await showConfirm('Mark this payment as received in full?', 'Mark Paid');
  if (!confirmed) return;
  markOrderPaid(orderId);
  closePaymentModal();
});

function markOrderPaid(orderId) {
  const idx = orders.findIndex(x => x.id === orderId);
  if (idx === -1) return;
  orders[idx].balancePaid   = true;
  orders[idx].paymentStatus = 'Paid';
  saveOrders();
  showToast('Payment marked as received!', 'success');
  refreshCurrentView();
}

// ── Start ──
init();
