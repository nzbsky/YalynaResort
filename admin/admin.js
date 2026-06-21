/* ============================================
   YALYNA RESORT — Admin Panel JS
   ============================================ */

'use strict';

/* ─── Config ─────────────────────────────────────────────────────────────── */
const ADMIN_PASSWORD = 'yalyna2024'; // Change this!
const STORAGE_KEY    = 'yalyna_booked_dates';
const BOOKINGS_KEY   = 'yalyna_bookings';

const COTTAGE_LABELS = {
  smereka:    'Котедж «Смерека»',
  yavoryna:   'Котедж «Яворина»',
  verkhovyna: 'Котедж «Верховина»',
};

const STATUS_LABELS = {
  new:       'Нова',
  confirmed: 'Підтверджена',
  deposit:   'Депозит',
  done:      'Завершено',
  cancelled: 'Скасовано',
};

/* ─── State ──────────────────────────────────────────────────────────────── */
let activeCottage = 'smereka';
let adminCalYear, adminCalMonth;
let actionLog = [];
let editingBookingId = null;

/* ─── localStorage helpers ────────────────────────────────────────────────── */
function getDefaultDates() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const p = n => String(n).padStart(2, '0');
  const d = (day, mo = m) => `${y}-${p(mo)}-${p(day)}`;
  const nextMo = m === 12 ? 1 : m + 1;
  const nextYr = m === 12 ? y + 1 : y;
  const nd = day => `${nextYr}-${p(nextMo)}-${p(day)}`;
  return {
    smereka:    [d(5),d(6),d(7),d(13),d(14),d(20),d(21),nd(3),nd(4),nd(10),nd(11)],
    yavoryna:   [d(6),d(7),d(8),d(12),d(13),d(19),d(20),nd(1),nd(2),nd(7),nd(8)],
    verkhovyna: [d(4),d(5),d(11),d(12),d(18),d(19),d(25),d(26),nd(2),nd(3),nd(9)],
  };
}

function loadDates() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || getDefaultDates(); }
  catch { return getDefaultDates(); }
}
function saveDates(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function loadBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || []; }
  catch { return []; }
}
function saveBookings(b) { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(b)); }

/* ─── Utility ──────────────────────────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().slice(0, 10); }
function isPast(dateStr) { return dateStr < todayStr(); }
function fmtDate(s) {
  if (!s) return '—';
  const [y,m,d] = s.split('-');
  return `${d}.${m}.${y}`;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function addLog(msg) {
  const now = new Date().toLocaleTimeString('uk', { hour:'2-digit', minute:'2-digit' });
  actionLog.unshift({ time: now, msg });
  if (actionLog.length > 30) actionLog.pop();
  renderLog();
}

/* ─── Login ──────────────────────────────────────────────────────────────── */
function initLogin() {
  const form    = document.getElementById('loginForm');
  const pw      = document.getElementById('loginPw');
  const err     = document.getElementById('loginError');
  const toggle  = document.getElementById('pwToggle');

  toggle.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    toggle.innerHTML = `<i class="fas fa-eye${show ? '-slash' : ''}"></i>`;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pw.value === ADMIN_PASSWORD) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminApp').style.display   = 'flex';
      initApp();
    } else {
      err.textContent = 'Неправильний пароль';
      pw.value = '';
      pw.focus();
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('adminApp').style.display   = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginPw').value = '';
  });
}

/* ─── Navigation ─────────────────────────────────────────────────────────── */
function initPageNav() {
  const links = document.querySelectorAll('.snav-link[data-page]');
  const pages = document.querySelectorAll('.page');
  const titles = { dashboard: 'Dashboard', calendar: 'Управління Calendar', bookings: 'Заявки', export: 'Експорт / Імпорт' };
  const subs   = { dashboard: 'Огляд стану комплексу', calendar: 'Позначайте зайняті та вільні дати', bookings: 'Управління бронюваннями', export: 'Резервне копіювання даних' };

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      pages.forEach(p => p.style.display = p.id === `page-${page}` ? 'block' : 'none');
      document.getElementById('pageTitle').textContent   = titles[page] || page;
      document.getElementById('pageSubtitle').textContent = subs[page]   || '';
    });
  });
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
function renderDashboard() {
  const dates    = loadDates();
  const bookings = loadBookings();

  /* Stats */
  const totalBooked = Object.values(dates).reduce((s, arr) => s + arr.filter(d => !isPast(d)).length, 0);
  document.getElementById('stat-booked').textContent = totalBooked;
  document.getElementById('stat-forms').textContent  = bookings.length;

  /* Overview */
  const overview = document.getElementById('dash-overview');
  overview.innerHTML = Object.entries(COTTAGE_LABELS).map(([key, label]) => {
    const arr = dates[key] || [];
    const future = arr.filter(d => !isPast(d));
    return `<div class="dash-overview-item">
      <strong>${label}</strong>
      <span class="dash-busy">${future.length} зайнятих дат</span>
    </div>`;
  }).join('');
}

function renderLog() {
  const el = document.getElementById('dash-log');
  if (!actionLog.length) { el.innerHTML = '<p class="empty-state">Ще немає дій у цій сесії</p>'; return; }
  el.innerHTML = actionLog.slice(0, 10).map(l =>
    `<div class="log-item"><strong>${l.time}</strong> ${l.msg}</div>`
  ).join('');
}

/* ─── Admin Calendar ─────────────────────────────────────────────────────── */
function initAdminCal() {
  const now = new Date();
  adminCalYear  = now.getFullYear();
  adminCalMonth = now.getMonth();

  /* Tabs */
  document.querySelectorAll('.ctab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCottage = btn.dataset.key;
      renderAdminCal();
    });
  });

  document.getElementById('saveCalBtn').addEventListener('click', saveAdminCal);
  document.getElementById('clearMonthBtn').addEventListener('click', clearMonth);

  renderAdminCal();
}

function renderAdminCal() {
  const el   = document.getElementById('admin-cal');
  const data = loadDates();
  const booked = (data[activeCottage] || []).map(d => d);
  const year  = adminCalYear;
  const month = adminCalMonth;

  const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  const DAYS   = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today     = todayStr();

  let html = `<div class="cal-nav">
    <button id="acalPrev" aria-label="Попередній місяць"><i class="fas fa-chevron-left"></i></button>
    <span class="cal-nav__month">${MONTHS[month]} ${year}</span>
    <button id="acalNext" aria-label="Наступний місяць"><i class="fas fa-chevron-right"></i></button>
  </div><div class="cal-grid">`;

  DAYS.forEach(d => { html += `<div class="cal-day-label">${d}</div>`; });
  for (let i = 0; i < firstDow; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= totalDays; d++) {
    const m2 = String(month + 1).padStart(2, '0');
    const d2 = String(d).padStart(2, '0');
    const ds = `${year}-${m2}-${d2}`;
    let cls = 'cal-day';
    if (ds === today) cls += ' today';
    if (isPast(ds))   cls += ' past';
    else if (booked.includes(ds)) cls += ' adm-booked';
    else cls += ' adm-free';
    html += `<div class="${cls}" data-date="${ds}">${d}</div>`;
  }
  html += '</div>';
  el.innerHTML = html;

  el.querySelector('#acalPrev').addEventListener('click', () => {
    if (adminCalMonth === 0) { adminCalMonth = 11; adminCalYear--; }
    else adminCalMonth--;
    renderAdminCal();
  });
  el.querySelector('#acalNext').addEventListener('click', () => {
    if (adminCalMonth === 11) { adminCalMonth = 0; adminCalYear++; }
    else adminCalMonth++;
    renderAdminCal();
  });

  el.querySelectorAll('.cal-day:not(.past):not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => toggleDate(cell.dataset.date, cell));
  });

  updateActiveCottageLabel();
  renderBookedTags();
}

function toggleDate(dateStr, cell) {
  const data = loadDates();
  const arr  = data[activeCottage] || [];
  const idx  = arr.indexOf(dateStr);
  if (idx >= 0) {
    arr.splice(idx, 1);
    cell.className = cell.className.replace('adm-booked', 'adm-free');
    addLog(`${COTTAGE_LABELS[activeCottage]}: <strong>${fmtDate(dateStr)}</strong> позначено як вільна`);
  } else {
    arr.push(dateStr);
    cell.className = cell.className.replace('adm-free', 'adm-booked');
    addLog(`${COTTAGE_LABELS[activeCottage]}: <strong>${fmtDate(dateStr)}</strong> позначено як зайнята`);
  }
  data[activeCottage] = arr;
  saveDates(data);
  renderBookedTags();
  renderDashboard();
}

function saveAdminCal() {
  const data = loadDates();
  saveDates(data);
  addLog('Дані збережено');
  const btn = document.getElementById('saveCalBtn');
  btn.innerHTML = '<i class="fas fa-check"></i> Збережено!';
  setTimeout(() => { btn.innerHTML = '<i class="fas fa-save"></i> Зберегти'; }, 2000);
}

function clearMonth() {
  if (!confirm(`Очистити всі зайняті дати у ${COTTAGE_LABELS[activeCottage]} за поточний місяць?`)) return;
  const data  = loadDates();
  const year  = adminCalYear;
  const month = String(adminCalMonth + 1).padStart(2, '0');
  data[activeCottage] = (data[activeCottage] || []).filter(d => !d.startsWith(`${year}-${month}`));
  saveDates(data);
  addLog(`${COTTAGE_LABELS[activeCottage]}: очищено місяць ${month}/${year}`);
  renderAdminCal();
  renderDashboard();
}

function updateActiveCottageLabel() {
  const el = document.getElementById('activeCottageLabel');
  if (el) el.textContent = COTTAGE_LABELS[activeCottage];
}

function renderBookedTags() {
  const data = loadDates();
  const arr  = (data[activeCottage] || []).filter(d => !isPast(d)).sort();
  const el   = document.getElementById('bookedList');
  if (!arr.length) { el.innerHTML = '<span style="color:#999;font-size:0.8rem">Немає зайнятих дат</span>'; return; }
  el.innerHTML = arr.map(d => `
    <span class="booked-tag">
      ${fmtDate(d)}
      <button onclick="removeBookedDate('${d}')" title="Видалити"><i class="fas fa-times"></i></button>
    </span>
  `).join('');
}

window.removeBookedDate = function(dateStr) {
  const data = loadDates();
  data[activeCottage] = (data[activeCottage] || []).filter(d => d !== dateStr);
  saveDates(data);
  addLog(`${COTTAGE_LABELS[activeCottage]}: видалено дату ${fmtDate(dateStr)}`);
  renderAdminCal();
  renderDashboard();
};

/* ─── Bookings ───────────────────────────────────────────────────────────── */
function initBookings() {
  document.getElementById('addBookingBtn').addEventListener('click', () => openModal());
}

function renderBookings() {
  const bookings = loadBookings();
  const tbody    = document.getElementById('bookingsTbody');
  const empty    = document.getElementById('bookingsEmpty');
  if (!bookings.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = bookings.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${b.name || '—'}</strong></td>
      <td><a href="tel:${b.phone}">${b.phone || '—'}</a></td>
      <td>${b.cottage || '—'}</td>
      <td>${fmtDate(b.checkin)}</td>
      <td>${fmtDate(b.checkout)}</td>
      <td>${b.adults || '—'}</td>
      <td><span class="status-badge status-${b.status || 'new'}">${STATUS_LABELS[b.status] || 'Нова'}</span></td>
      <td>
        <div class="tbl-actions">
          <button class="tbl-btn tbl-btn--edit" onclick="editBooking('${b.id}')" title="Редагувати"><i class="fas fa-pen"></i></button>
          <button class="tbl-btn tbl-btn--del"  onclick="deleteBooking('${b.id}')" title="Видалити"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openModal(booking = null) {
  editingBookingId = booking ? booking.id : null;
  const form = document.getElementById('bookingModalForm');
  form.reset();
  if (booking) {
    document.getElementById('mb-name').value    = booking.name || '';
    document.getElementById('mb-phone').value   = booking.phone || '';
    document.getElementById('mb-email').value   = booking.email || '';
    document.getElementById('mb-cottage').value = booking.cottage || '';
    document.getElementById('mb-checkin').value = booking.checkin || '';
    document.getElementById('mb-checkout').value= booking.checkout || '';
    document.getElementById('mb-adults').value  = booking.adults || '2';
    document.getElementById('mb-status').value  = booking.status || 'new';
    document.getElementById('mb-comment').value = booking.comment || '';
  }
  document.getElementById('bookingModal').style.display = 'flex';
}

window.editBooking = function(id) {
  const bookings = loadBookings();
  const b = bookings.find(b => b.id === id);
  if (b) openModal(b);
};

window.deleteBooking = function(id) {
  if (!confirm('Видалити цю заявку?')) return;
  const bookings = loadBookings().filter(b => b.id !== id);
  saveBookings(bookings);
  addLog('Заявку видалено');
  renderBookings();
  renderDashboard();
};

function initModal() {
  const modal  = document.getElementById('bookingModal');
  const form   = document.getElementById('bookingModalForm');
  const close  = () => { modal.style.display = 'none'; editingBookingId = null; };

  document.getElementById('modalClose').addEventListener('click', close);
  document.getElementById('modalCancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bookings = loadBookings();
    const entry = {
      id:       editingBookingId || uid(),
      name:     document.getElementById('mb-name').value.trim(),
      phone:    document.getElementById('mb-phone').value.trim(),
      email:    document.getElementById('mb-email').value.trim(),
      cottage:  document.getElementById('mb-cottage').value,
      checkin:  document.getElementById('mb-checkin').value,
      checkout: document.getElementById('mb-checkout').value,
      adults:   document.getElementById('mb-adults').value,
      status:   document.getElementById('mb-status').value,
      comment:  document.getElementById('mb-comment').value.trim(),
      created:  editingBookingId ? bookings.find(b => b.id === editingBookingId)?.created : new Date().toISOString(),
    };
    if (editingBookingId) {
      const idx = bookings.findIndex(b => b.id === editingBookingId);
      if (idx >= 0) bookings[idx] = entry;
    } else {
      bookings.unshift(entry);
    }
    saveBookings(bookings);
    addLog(`${editingBookingId ? 'Оновлено' : 'Додано'} заявку: <strong>${entry.name}</strong>`);
    close();
    renderBookings();
    renderDashboard();
  });
}

/* ─── Export / Import ──────────────────────────────────────────────────────── */
function initExport() {
  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    const data = { dates: loadDates(), bookings: loadBookings(), exported: new Date().toISOString() };
    downloadFile('yalyna-resort-data.json', JSON.stringify(data, null, 2), 'application/json');
    addLog('Експортовано JSON');
  });

  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    const bookings = loadBookings();
    const header   = ['#','Ім\'я','Телефон','Email','Котедж','Заїзд','Виїзд','Дорослих','Статус','Коментар'];
    const rows     = bookings.map((b, i) => [i+1, b.name, b.phone, b.email, b.cottage, b.checkin, b.checkout, b.adults, STATUS_LABELS[b.status]||'', b.comment]);
    const csv      = [header, ...rows].map(r => r.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadFile('yalyna-bookings.csv', '﻿' + csv, 'text/csv;charset=utf-8');
    addLog('Експортовано CSV');
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.dates)    saveDates(data.dates);
        if (data.bookings) saveBookings(data.bookings);
        alert('Дані успішно імпортовано!');
        addLog('Імпортовано дані з файлу');
        renderDashboard();
        renderBookings();
      } catch {
        alert('Помилка: невірний формат файлу');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Init ───────────────────────────────────────────────────────────────── */
function initApp() {
  initPageNav();
  renderDashboard();
  initAdminCal();
  initBookings();
  renderBookings();
  initModal();
  initExport();
}

document.addEventListener('DOMContentLoaded', initLogin);
