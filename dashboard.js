// ============================================================
//  BE FLOURISHED — Order Management Dashboard
// ============================================================

const DEFAULT_PASSWORD = 'flourish2026';
const STORAGE_KEY  = 'bf_orders';
const PW_KEY       = 'bf_pw';

// ── State ──
let orders   = [];
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let activeView    = 'overview';
let filterStatus  = 'all';
let searchQuery   = '';
let editingId     = null;

// ── Init ──
function init() {
  orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!localStorage.getItem(PW_KEY)) {
    localStorage.setItem(PW_KEY, DEFAULT_PASSWORD);
  }
  if (sessionStorage.getItem('bf_auth') === '1') {
    showApp();
  }
}

// ============================================================
//  AUTH
// ============================================================
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const pw = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  if (pw === localStorage.getItem(PW_KEY)) {
    sessionStorage.setItem('bf_auth', '1');
    err.textContent = '';
    showApp();
  } else {
    err.textContent = 'Incorrect password. Try again.';
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
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  const titles = { overview: 'Overview', orders: 'Orders', calendar: 'Calendar', settings: 'Settings' };
  document.getElementById('topbarTitle').textContent = titles[view] || '';
  if (view === 'overview') renderOverview();
  if (view === 'orders')   renderOrders();
  if (view === 'calendar') renderCalendar();
}

// Mobile sidebar
const sidebar  = document.getElementById('sidebar');
document.getElementById('menuBtn').addEventListener('click', () => sidebar.classList.toggle('open'));
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
function closeSidebar() { sidebar.classList.remove('open'); }

// ============================================================
//  DATA HELPERS
// ============================================================
function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeClass(status) {
  return 'badge badge-' + status.replace(/\s+/g, '-');
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - today) / 86400000);
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

  // Recent orders (last 5)
  const recent = [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const recentEl = document.getElementById('recentOrdersList');
  if (recent.length === 0) {
    recentEl.innerHTML = '<p class="empty-msg">No orders yet. Add your first one!</p>';
  } else {
    recentEl.innerHTML = recent.map(o => `
      <div class="recent-item" data-id="${o.id}">
        <div>
          <div class="recent-name">${o.customerName}</div>
          <div class="recent-service">${o.service}</div>
        </div>
        <span class="${badgeClass(o.status)}">${o.status}</span>
      </div>
    `).join('');
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
    upcomingEl.innerHTML = '<p class="empty-msg">No upcoming events in the next 30 days.</p>';
  } else {
    upcomingEl.innerHTML = soon.map(o => {
      const d = daysUntil(o.eventDate);
      const label = d === 0 ? 'Today!' : d === 1 ? 'Tomorrow' : `In ${d} days`;
      return `
        <div class="upcoming-item" data-id="${o.id}">
          <div>
            <div class="recent-name">${o.customerName}</div>
            <div class="recent-service">${o.service}</div>
          </div>
          <div class="upcoming-date">${fmtShort(o.eventDate)}<br><small style="color:var(--gold-dk)">${label}</small></div>
        </div>
      `;
    }).join('');
    upcomingEl.querySelectorAll('.upcoming-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.dataset.id));
    });
  }
}

// ============================================================
//  ORDERS TABLE
// ============================================================
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase();
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

  const tbody  = document.getElementById('ordersBody');
  const empty  = document.getElementById('ordersEmpty');

  if (list.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = list.map(o => {
    const balance = (parseFloat(o.totalPrice) || 0) - (parseFloat(o.depositAmount) || 0);
    return `
      <tr data-id="${o.id}">
        <td>
          <div class="td-name">${o.customerName}</div>
          <div class="td-phone">${o.customerPhone || ''}</div>
        </td>
        <td class="td-service">${o.service || '—'}</td>
        <td class="td-date">${fmt(o.eventDate)}</td>
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
      </tr>
    `;
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

  const grid = document.getElementById('calendarGrid');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date(); today.setHours(0,0,0,0);

  let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const first = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();

  // Prev month padding
  for (let i = first - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${prevDays - i}</div></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const thisDate = new Date(calYear, calMonth, d);
    const isToday = thisDate.getTime() === today.getTime();
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const dayOrders = orders.filter(o => o.eventDate === dateStr && o.status !== 'Cancelled');
    const events = dayOrders.map(o => {
      const cls = o.status.replace(/\s+/g, '-');
      return `<span class="cal-event ${cls}" data-id="${o.id}">${o.customerName}</span>`;
    }).join('');

    html += `
      <div class="cal-day${isToday ? ' today' : ''}">
        <div class="cal-day-num">${d}</div>
        ${events}
      </div>`;
  }

  // Next month padding
  const totalCells = first + daysInMonth;
  const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainder; i++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  }

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

document.getElementById('topbarAddBtn').addEventListener('click', () => openModal(null));
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
    document.getElementById('orderId').value        = o.id;
    document.getElementById('customerName').value   = o.customerName || '';
    document.getElementById('customerPhone').value  = o.customerPhone || '';
    document.getElementById('customerEmail').value  = o.customerEmail || '';
    document.getElementById('orderSource').value    = o.source || '';
    document.getElementById('orderService').value   = o.service || '';
    document.getElementById('eventDate').value      = o.eventDate || '';
    document.getElementById('colorPalette').value   = o.colorPalette || '';
    document.getElementById('flowerPrefs').value    = o.flowerPrefs || '';
    document.getElementById('deliveryAddress').value= o.deliveryAddress || '';
    document.getElementById('totalPrice').value     = o.totalPrice || '';
    document.getElementById('depositAmount').value  = o.depositAmount || '';
    document.getElementById('depositPaid').checked  = !!o.depositPaid;
    document.getElementById('balancePaid').checked  = !!o.balancePaid;
    document.getElementById('orderStatus').value    = o.status || 'New';
    document.getElementById('orderNotes').value     = o.notes || '';
  } else {
    orderForm.reset();
    document.getElementById('orderId').value = '';
  }

  modalBackdrop.classList.add('open');
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  editingId = null;
}

orderForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('orderId').value || genId();
  const order = {
    id,
    createdAt:       editingId ? (orders.find(x => x.id === editingId)?.createdAt || Date.now()) : Date.now(),
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
  } else {
    orders.unshift(order);
  }

  saveOrders();
  closeModal();
  refreshCurrentView();
});

document.getElementById('deleteOrderBtn').addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('Delete this order? This cannot be undone.')) return;
  orders = orders.filter(o => o.id !== editingId);
  saveOrders();
  closeModal();
  closeDetail();
  refreshCurrentView();
});

function refreshCurrentView() {
  if (activeView === 'overview') renderOverview();
  if (activeView === 'orders')   renderOrders();
  if (activeView === 'calendar') renderCalendar();
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

  const balance = (parseFloat(o.totalPrice) || 0) - (parseFloat(o.depositAmount) || 0);

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row">
      <div class="detail-label">Status</div>
      <div class="detail-value">
        <select class="status-select" id="detailStatusSelect">
          ${['New','Confirmed','In Progress','Ready','Delivered','Cancelled']
            .map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
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
  `;

  // Quick status update
  document.getElementById('detailStatusSelect').addEventListener('change', e => {
    const idx = orders.findIndex(x => x.id === id);
    if (idx > -1) { orders[idx].status = e.target.value; saveOrders(); refreshCurrentView(); }
  });

  detailBackdrop.classList.add('open');
}

function closeDetail() {
  detailBackdrop.classList.remove('open');
}

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
  msg.textContent = 'Password updated successfully!'; msg.className = 'pw-msg success';
  document.getElementById('passwordForm').reset();
});

// Export CSV
document.getElementById('exportBtn').addEventListener('click', () => {
  if (orders.length === 0) { alert('No orders to export.'); return; }
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

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `be-flourished-orders-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// Import JSON
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      if (!confirm(`Import ${data.length} orders? This will replace all current orders.`)) return;
      orders = data;
      saveOrders();
      alert('Import successful!');
      refreshCurrentView();
    } catch { alert('Invalid backup file. Please use a valid JSON export.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── Start ──
init();
