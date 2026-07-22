// ========== Daylign UI enhancements (additive) ==========
// Self-contained layer added during the design pass. Everything here is
// additive — it wraps existing global render fns and reads already-rendered
// DOM rather than modifying js/ modules, so it merges with zero conflicts.
// Covers: mobile "More" sheet, board single-column switch, light/dark theme,
// dashboard "Today" hero, reminders focus rail, Cmd/Ctrl-K command palette,
// and a mobile calendar agenda.
(function () {
  'use strict';
  const THEME_KEY = 'daylign_theme';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // ---------- Theme ----------
  function applyTheme(theme) {
    const light = theme === 'light';
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    $$('.theme-nav-label').forEach(el => { el.textContent = light ? 'Dark mode' : 'Light mode'; });
    const st = $('#moreThemeState'); if (st) st.textContent = light ? 'On' : 'Off';
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  }
  function initTheme() {
    let saved = 'dark';
    try { saved = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch (e) {}
    applyTheme(saved);
  }

  // ---------- More sheet ----------
  function openMore() { const m = $('#moreSheet'); if (m) m.classList.add('open'); }
  function closeMore() { const m = $('#moreSheet'); if (m) m.classList.remove('open'); }

  // ---------- Board mobile column switch ----------
  const COUNT_SRC = { todo: 'boardTodoCount', 'in-progress': 'boardProgressCount', done: 'boardDoneCount' };
  const COUNT_DST = { todo: 'bmsTodo', 'in-progress': 'bmsProgress', done: 'bmsDone' };
  function updateBoardCounts() {
    Object.keys(COUNT_SRC).forEach(k => {
      const src = document.getElementById(COUNT_SRC[k]), dst = document.getElementById(COUNT_DST[k]);
      if (src && dst) dst.textContent = src.textContent;
    });
  }
  function setBoardCol(col) {
    const board = $('.board');
    if (board) board.setAttribute('data-mobile-col', col);
    $$('.bms-btn').forEach(b => b.classList.toggle('active', b.dataset.col === col));
  }

  // ---------- Dashboard "Today" hero ----------
  // Reads the numbers the app already rendered into the health strip + weekly
  // report, so it never recomputes state and can't drift from the source.
  function tileByLabel(label) {
    return $$('#healthGrid .health-tile').find(t => {
      const l = $('.health-tile-label', t);
      return l && l.textContent.trim() === label;
    });
  }
  function tileValue(label) {
    const t = tileByLabel(label); if (!t) return null;
    const v = $('.health-tile-value', t); if (!v) return null;
    const main = (v.childNodes[0] && v.childNodes[0].textContent || '').trim();
    const small = $('small', v);
    return { main, sub: small ? small.textContent.trim() : '' };
  }
  function tilePct(label) {
    const t = tileByLabel(label); if (!t) return 0;
    const f = $('.health-bar-fill', t);
    if (!f) return 0;
    const w = parseFloat(f.style.width) || 0;
    return Math.max(0, Math.min(100, w));
  }
  function buildTodayHero() {
    const host = $('#todayHero');
    if (!host) return;
    const net = tileValue('Net Cals') || tileValue('Calories');
    const cal = tileValue('Calories');
    const protein = tileValue('Protein');
    const water = tileValue('Water');
    const pct = tilePct('Calories');
    const focusEl = $('.weekly-focus strong');
    const focus = focusEl ? focusEl.textContent.trim() : '';

    const chips = [];
    if (protein) chips.push(`<span class="th-chip th-chip-green">${protein.main}${protein.sub ? ' <em>' + protein.sub + '</em>' : ''} protein</span>`);
    if (water) chips.push(`<span class="th-chip th-chip-blue">${water.main} water</span>`);
    if (cal) chips.push(`<span class="th-chip th-chip-accent">${cal.main}${cal.sub ? ' <em>' + cal.sub + '</em>' : ''} cal</span>`);

    host.innerHTML = `
      <div class="today-hero">
        <div class="th-ring" style="background:conic-gradient(var(--accent) 0 ${pct}%, var(--border) ${pct}% 100%)">
          <div class="th-ring-inner">
            <span class="th-ring-val">${net ? net.main : '—'}</span>
            <span class="th-ring-lbl">net kcal</span>
          </div>
        </div>
        <div class="th-body">
          <div class="th-label">${focus ? "This week's focus" : 'Today'}</div>
          <div class="th-text">${focus || 'Log your day and your focus for the week shows up here.'}</div>
          ${chips.length ? `<div class="th-chips">${chips.join('')}</div>` : ''}
        </div>
      </div>`;
  }

  // ---------- Mobile calendar agenda ----------
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const PRIO_COLOR = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--blue)' };
  function buildAgenda() {
    const host = $('#calAgenda');
    if (!host || typeof calendarDate === 'undefined' || typeof state === 'undefined') return;
    const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = (typeof getTodayStr === 'function') ? getTodayStr() : '';
    const holidays = (typeof getUSHolidays === 'function') ? getUSHolidays(year) : [];
    const esc2 = (typeof esc === 'function') ? esc : (x => x);

    const groups = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const tasks = (state.tasks || []).filter(t => t.dueDate === dateStr && t.status !== 'done');
      const events = (state.events || []).filter(e => e.date === dateStr);
      const holiday = holidays.find(h => h.date === dateStr);
      if (!tasks.length && !events.length && !holiday) continue;
      groups.push({ dateStr, d, tasks, events, holiday });
    }

    if (!groups.length) {
      host.innerHTML = `<div class="agenda-empty">Nothing scheduled in ${MONTHS[month]} — double-tap a day in month view to add an event.</div>`;
      return;
    }

    host.innerHTML = groups.map(g => {
      const dObj = new Date(g.dateStr + 'T00:00:00');
      const isToday = g.dateStr === today;
      const isPast = g.dateStr < today;
      const dow = isToday ? 'Today' : dObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dateLbl = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const evRows = g.events
        .slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        .map(e => `<div class="agenda-row" data-event-id="${e.id}" style="border-left-color:${e.color || 'var(--accent)'}">
            <span class="agenda-row-name">${esc2(e.name)}</span>
            ${e.time ? `<span class="agenda-row-sub">${e.time}</span>` : ''}
          </div>`).join('');
      const taskRows = g.tasks.map(t => `<div class="agenda-row" data-id="${t.id}" style="border-left-color:${PRIO_COLOR[t.priority] || 'var(--accent)'}">
            <span class="agenda-row-name">${esc2(t.name)}</span>
            <span class="agenda-row-sub agenda-due">due</span>
          </div>`).join('');
      const holRow = g.holiday ? `<div class="agenda-row agenda-holiday" style="border-left-color:var(--purple)">
            <span class="agenda-row-name">${esc2(g.holiday.name)}</span></div>` : '';
      return `<div class="agenda-day${isToday ? ' today' : ''}${isPast ? ' past' : ''}">
          <div class="agenda-day-head"><span class="agenda-dow">${dow}</span><span class="agenda-date">${dateLbl}</span></div>
          <div class="agenda-rows">${holRow}${evRows}${taskRows}</div>
        </div>`;
    }).join('');

    $$('.agenda-row[data-id]', host).forEach(el => {
      el.addEventListener('click', () => { if (typeof openModal === 'function') openModal(el.dataset.id); });
    });
    $$('.agenda-row[data-event-id]', host).forEach(el => {
      el.addEventListener('click', () => {
        const ev = (state.events || []).find(e => e.id === el.dataset.eventId);
        if (ev && typeof openEventModal === 'function') openEventModal(ev.date, ev);
      });
    });
  }

  // ---------- Wrap globals so our extras rebuild on every render ----------
  function wrap(name, extra) {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__daylignWrapped) return;
    const wrapped = function () {
      const r = fn.apply(this, arguments);
      try { extra(); } catch (e) { /* never let an extra break the app */ }
      return r;
    };
    wrapped.__daylignWrapped = true;
    window[name] = wrapped;
  }

  function bind() {
    initTheme();

    const moreBtn = $('#moreNavBtn'); if (moreBtn) moreBtn.addEventListener('click', openMore);
    const sheet = $('#moreSheet'); if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) closeMore(); });
    $$('.more-item[data-view]').forEach(b => b.addEventListener('click', () => {
      if (typeof switchView === 'function') switchView(b.dataset.view);
      closeMore();
    }));

    const themeBtn = $('#themeToggleBtn'); if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    const moreTheme = $('#moreThemeToggle'); if (moreTheme) moreTheme.addEventListener('click', toggleTheme);

    $$('.bms-btn').forEach(b => b.addEventListener('click', () => setBoardCol(b.dataset.col)));
    setBoardCol('todo');
    updateBoardCounts();
    $$('.nav-btn, .more-item, .bottom-nav-btn').forEach(b => b.addEventListener('click', () => setTimeout(updateBoardCounts, 80)));

    // Cmd/Ctrl-K → the command palette (reuses the natural-language voice panel)
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (typeof openVoicePanel === 'function') openVoicePanel();
      }
      if (e.key === 'Escape') closeMore();
    });

    // Hook renders and paint our extras once for the initial view.
    wrap('renderDashboard', buildTodayHero);
    wrap('renderCalendar', buildAgenda);
    buildTodayHero();
    buildAgenda();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
