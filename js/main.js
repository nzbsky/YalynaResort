/* ============================================
   YALYNA RESORT — Main JS
   ============================================ */

'use strict';

/* ─── Mock availability data ──────────────────────────────────────────────────
   Replace this with real API calls to Airtable / Google Sheets / Firebase.
   Data source should also be used by the admin panel.
   Format: 'YYYY-MM-DD' strings in the bookedDates arrays.
───────────────────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'yalyna_booked_dates';

function getDefaultBookedDates() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const pad = n => String(n).padStart(2, '0');
  const d = (day, mo = m) => `${y}-${pad(mo)}-${pad(day)}`;
  const next = (day) => {
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    return `${ny}-${pad(nm)}-${pad(day)}`;
  };
  return {
    smereka:    [d(5), d(6), d(7), d(13), d(14), d(20), d(21), next(3), next(4), next(10), next(11)],
    yavoryna:   [d(6), d(7), d(8), d(12), d(13), d(19), d(20), next(1), next(2), next(7), next(8)],
    verkhovyna: [d(4), d(5), d(11), d(12), d(18), d(19), d(25), d(26), next(2), next(3), next(9)],
  };
}

function loadBookedDates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultBookedDates();
  } catch {
    return getDefaultBookedDates();
  }
}

/* ─── Calendar Component ────────────────────────────────────────────────────── */
class AvailabilityCalendar {
  constructor(containerId, cottageKey, onDateSelect) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;

    this.cottageKey = cottageKey;
    this.onDateSelect = onDateSelect || function() {};
    this.bookedDates = (loadBookedDates()[cottageKey] || []).map(d => this._norm(d));

    const today = new Date();
    this.today = this._norm(today);
    this.viewYear  = today.getFullYear();
    this.viewMonth = today.getMonth();

    this.selectedIn  = null;
    this.selectedOut = null;
    this.pickingOut  = false;

    this.MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                   'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
    this.DAYS   = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

    this.render();
  }

  /* Normalise date to YYYY-MM-DD string */
  _norm(d) {
    if (typeof d === 'string') return d;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  _isBooked(dateStr) { return this.bookedDates.includes(dateStr); }

  _isPast(dateStr) { return dateStr < this.today; }

  _inRange(dateStr) {
    if (!this.selectedIn || !this.selectedOut) return false;
    return dateStr > this.selectedIn && dateStr < this.selectedOut;
  }

  render() {
    const year = this.viewYear;
    const month = this.viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
    const totalDays = lastDay.getDate();

    const html = [];

    /* Navigation */
    html.push(`<div class="cal-nav">
      <button class="cal-prev" aria-label="Попередній місяць"><i class="fas fa-chevron-left"></i></button>
      <span class="cal-nav__month">${this.MONTHS[month]} ${year}</span>
      <button class="cal-next" aria-label="Наступний місяць"><i class="fas fa-chevron-right"></i></button>
    </div>`);

    /* Grid */
    html.push('<div class="cal-grid">');

    /* Day labels */
    this.DAYS.forEach(d => {
      html.push(`<div class="cal-day-label">${d}</div>`);
    });

    /* Empty cells before first day */
    for (let i = 0; i < startDow; i++) {
      html.push('<div class="cal-day empty"></div>');
    }

    /* Day cells */
    for (let d = 1; d <= totalDays; d++) {
      const m2 = String(month + 1).padStart(2, '0');
      const d2 = String(d).padStart(2, '0');
      const dateStr = `${year}-${m2}-${d2}`;

      let cls = 'cal-day';
      if (dateStr === this.today)       cls += ' today';
      if (this._isPast(dateStr))        cls += ' past';
      else if (this._isBooked(dateStr)) cls += ' booked';
      else                              cls += ' free';
      if (dateStr === this.selectedIn)  cls += ' selected';
      if (dateStr === this.selectedOut) cls += ' selected';
      if (this._inRange(dateStr))       cls += ' in-range';

      html.push(`<div class="${cls}" data-date="${dateStr}">${d}</div>`);
    }

    html.push('</div>'); // cal-grid
    this.el.innerHTML = html.join('');

    /* Events */
    this.el.querySelector('.cal-prev').addEventListener('click', () => this._prevMonth());
    this.el.querySelector('.cal-next').addEventListener('click', () => this._nextMonth());

    this.el.querySelectorAll('.cal-day.free').forEach(cell => {
      cell.addEventListener('click', () => this._selectDate(cell.dataset.date));
    });
  }

  _prevMonth() {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
    this.render();
  }

  _nextMonth() {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
    this.render();
  }

  _selectDate(dateStr) {
    if (!this.pickingOut || !this.selectedIn || dateStr <= this.selectedIn) {
      /* Start picking check-in */
      this.selectedIn  = dateStr;
      this.selectedOut = null;
      this.pickingOut  = true;
    } else {
      /* Pick check-out */
      this.selectedOut = dateStr;
      this.pickingOut  = false;
      this.onDateSelect(this.selectedIn, this.selectedOut, this.cottageKey);
    }
    this.render();
  }
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */
function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const links  = document.getElementById('navLinks');

  /* Scroll effect */
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    document.getElementById('backTop').classList.toggle('visible', window.scrollY > 400);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Burger */
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  /* Close on link click */
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      burger.classList.remove('active');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* Close on outside click */
  document.addEventListener('click', e => {
    if (!nav.contains(e.target)) {
      links.classList.remove('open');
      burger.classList.remove('active');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  /* Back to top */
  document.getElementById('backTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Smooth anchor scroll */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    });
  });
}

/* ─── Scroll Reveal ──────────────────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  els.forEach(el => obs.observe(el));
}

/* ─── Hero reveal ────────────────────────────────────────────────────────── */
function initHeroReveal() {
  const items = document.querySelectorAll('.hero__content .reveal-up');
  items.forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), 200 + i * 140);
  });
  const logoWrap = document.querySelector('.hero__logo-wrap');
  if (logoWrap) setTimeout(() => logoWrap.classList.add('revealed'), 100);
}

/* ─── Calendars ──────────────────────────────────────────────────────────── */
function initCalendars() {
  const handleDateSelect = (checkIn, checkOut, cottageKey) => {
    /* Fill booking form */
    const cottageNames = {
      smereka:    'Котедж «Смерека»',
      yavoryna:   'Котедж «Яворина»',
      verkhovyna: 'Котедж «Верховина»',
    };
    const selectEl  = document.getElementById('f-cottage');
    const checkinEl = document.getElementById('f-checkin');
    const checkoutEl= document.getElementById('f-checkout');

    if (selectEl)   selectEl.value   = cottageNames[cottageKey] || '';
    if (checkinEl)  checkinEl.value  = checkIn;
    if (checkoutEl) checkoutEl.value = checkOut;

    /* Update cost summary */
    updateSummary();

    /* Smooth scroll to form */
    const form = document.getElementById('booking');
    if (form) {
      setTimeout(() => {
        const offset = form.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }, 300);
    }
  };

  new AvailabilityCalendar('cal-smereka',    'smereka',    handleDateSelect);
  new AvailabilityCalendar('cal-yavoryna',   'yavoryna',   handleDateSelect);
  new AvailabilityCalendar('cal-verkhovyna', 'verkhovyna', handleDateSelect);
}

/* ─── Cottage book buttons ────────────────────────────────────────────────── */
function initCottageButtons() {
  document.querySelectorAll('.cottage-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cottage = btn.dataset.cottage;
      const selectEl = document.getElementById('f-cottage');
      if (selectEl && cottage) selectEl.value = cottage;

      const form = document.getElementById('booking');
      if (form) {
        const offset = form.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: offset, behavior: 'smooth' });
        setTimeout(() => document.getElementById('f-name')?.focus(), 500);
      }
    });
  });
}

/* ─── Form price summary ─────────────────────────────────────────────────── */
const PRICES = {
  'Котедж «Смерека»':    { weekday: 3500, weekend: 4500, holiday: 5000 },
  'Котедж «Яворина»':   { weekday: 4000, weekend: 5000, holiday: 5500 },
  'Котедж «Верховина»': { weekday: 5500, weekend: 7000, holiday: 8000 },
};

function isWeekend(date) {
  const d = new Date(date);
  return d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6; // Fri Sat Sun
}

function calcNights(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.round((b - a) / 86400000);
}

function updateSummary() {
  const cottage  = document.getElementById('f-cottage')?.value;
  const checkIn  = document.getElementById('f-checkin')?.value;
  const checkOut = document.getElementById('f-checkout')?.value;
  const summaryEl = document.getElementById('formSummary');
  if (!summaryEl) return;

  if (!cottage || !checkIn || !checkOut || checkOut <= checkIn) {
    summaryEl.classList.remove('visible');
    return;
  }

  const prices = PRICES[cottage];
  if (!prices) { summaryEl.classList.remove('visible'); return; }

  const nights = calcNights(checkIn, checkOut);
  if (nights < 1) { summaryEl.classList.remove('visible'); return; }

  let total = 0;
  let weekdayNights = 0, weekendNights = 0;

  for (let i = 0; i < nights; i++) {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (isWeekend(dateStr)) {
      total += prices.weekend;
      weekendNights++;
    } else {
      total += prices.weekday;
      weekdayNights++;
    }
  }

  const pet = document.getElementById('f-pet')?.value;
  const petExtra = (pet && pet !== 'Без тварин') ? nights * 300 : 0;
  const deposit  = Math.ceil((total + petExtra) * 0.5);

  let html = `<strong>Орієнтована вартість:</strong> `;
  if (weekdayNights > 0) html += `${weekdayNights} будні × ${prices.weekday.toLocaleString('uk')} ₴`;
  if (weekdayNights > 0 && weekendNights > 0) html += ' + ';
  if (weekendNights > 0) html += `${weekendNights} вихідні × ${prices.weekend.toLocaleString('uk')} ₴`;
  if (petExtra > 0) html += ` + домашня тварина ${petExtra.toLocaleString('uk')} ₴`;
  html += `<br><strong>Разом: ${(total + petExtra).toLocaleString('uk')} ₴</strong> (${nights} ${nightWord(nights)})`;
  html += `<br>Депозит 50%: <strong>${deposit.toLocaleString('uk')} ₴</strong>`;

  summaryEl.innerHTML = html;
  summaryEl.classList.add('visible');
}

function nightWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ніч';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'ночі';
  return 'ночей';
}

/* ─── Form validation & submission ──────────────────────────────────────── */
function initForm() {
  const form      = document.getElementById('bookingForm');
  const success   = document.getElementById('bookingSuccess');
  const submitBtn = document.getElementById('submitBtn');
  if (!form) return;

  /* Set min date for date inputs */
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('f-checkin').min  = today;
  document.getElementById('f-checkout').min = today;

  /* Live summary on change */
  ['f-cottage', 'f-checkin', 'f-checkout', 'f-pet'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateSummary);
  });

  /* Checkin change → update checkout min */
  document.getElementById('f-checkin')?.addEventListener('change', function() {
    const out = document.getElementById('f-checkout');
    if (out) out.min = this.value;
    if (out && out.value && out.value <= this.value) out.value = '';
    updateSummary();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    submitBtn.classList.add('btn--loading');
    submitBtn.querySelector('span').textContent = 'Відправляємо…';

    try {
      const data = new FormData(form);
      const res  = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        form.style.display = 'none';
        success.classList.add('visible');
        window.scrollTo({ top: success.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
      } else {
        const json = await res.json().catch(() => ({}));
        if (json.errors) {
          alert('Помилка: ' + json.errors.map(e => e.message).join(', '));
        } else {
          alert('Не вдалось надіслати форму. Будь ласка, напишіть нам в Instagram або зателефонуйте.');
        }
        submitBtn.classList.remove('btn--loading');
        submitBtn.querySelector('span').textContent = 'Надіслати заявку';
      }
    } catch {
      alert('Помилка мережі. Будь ласка, перевірте з\'єднання або зв\'яжіться з нами напряму.');
      submitBtn.classList.remove('btn--loading');
      submitBtn.querySelector('span').textContent = 'Надіслати заявку';
    }
  });
}

function validateForm() {
  let valid = true;

  const rules = [
    { id: 'f-name',    errId: 'err-name',    test: v => v.trim().length >= 2,                   msg: 'Введіть ім\'я та прізвище' },
    { id: 'f-phone',   errId: 'err-phone',   test: v => /^[\d\s\+\-\(\)]{9,18}$/.test(v.trim()),msg: 'Введіть коректний номер телефону' },
    { id: 'f-email',   errId: 'err-email',   test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),  msg: 'Введіть коректний email' },
    { id: 'f-cottage', errId: 'err-cottage', test: v => v !== '',                                msg: 'Оберіть котедж' },
    { id: 'f-checkin', errId: 'err-checkin', test: v => v !== '',                                msg: 'Вкажіть дату заїзду' },
    { id: 'f-checkout',errId: 'err-checkout',test: () => true,                                   msg: '' },
  ];

  rules.forEach(({ id, errId, test, msg }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(errId);
    if (!el) return;
    const ok = test(el.value);
    if (!ok) {
      el.classList.add('invalid');
      if (err) err.textContent = msg;
      valid = false;
    } else {
      el.classList.remove('invalid');
      if (err) err.textContent = '';
    }
  });

  /* Cross-field: checkout > checkin */
  const ci = document.getElementById('f-checkin');
  const co = document.getElementById('f-checkout');
  const errCo = document.getElementById('err-checkout');
  if (ci && co && co.value) {
    if (co.value <= ci.value) {
      co.classList.add('invalid');
      if (errCo) errCo.textContent = 'Дата виїзду має бути після дати заїзду';
      valid = false;
    } else {
      co.classList.remove('invalid');
      if (errCo) errCo.textContent = '';
    }
  } else if (co && !co.value) {
    co.classList.add('invalid');
    if (errCo) errCo.textContent = 'Вкажіть дату виїзду';
    valid = false;
  }

  /* Clear invalid on change */
  if (!valid) {
    document.querySelectorAll('.invalid').forEach(el => {
      el.addEventListener('input', function clear() {
        this.classList.remove('invalid');
        const errEl = document.getElementById('err-' + this.id.replace('f-', ''));
        if (errEl) errEl.textContent = '';
        this.removeEventListener('input', clear);
      }, { once: true });
    });
  }

  return valid;
}

/* ─── Init ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initHeroReveal();
  initCalendars();
  initCottageButtons();
  initForm();
});
