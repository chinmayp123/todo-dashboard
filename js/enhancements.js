// ========== Daylign UI enhancements (additive) ==========
// Self-contained layer added during the design pass. Wires: mobile "More"
// sheet (all 7 views reachable), board single-column switch on phones, and
// light/dark theme toggle. Deliberately does NOT touch the existing modules —
// it only reads globals (switchView) defensively and binds its own hooks.
(function () {
  'use strict';
  const THEME_KEY = 'daylign_theme';

  // ---- Theme ----
  function applyTheme(theme) {
    const light = theme === 'light';
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    document.querySelectorAll('.theme-nav-label').forEach(el => {
      el.textContent = light ? 'Dark mode' : 'Light mode';
    });
    const state = document.getElementById('moreThemeState');
    if (state) state.textContent = light ? 'On' : 'Off';
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

  // ---- More sheet ----
  function openMore() { const m = document.getElementById('moreSheet'); if (m) m.classList.add('open'); }
  function closeMore() { const m = document.getElementById('moreSheet'); if (m) m.classList.remove('open'); }

  // ---- Board mobile column switch ----
  const COUNT_SRC = { todo: 'boardTodoCount', 'in-progress': 'boardProgressCount', done: 'boardDoneCount' };
  const COUNT_DST = { todo: 'bmsTodo', 'in-progress': 'bmsProgress', done: 'bmsDone' };
  function updateBoardCounts() {
    Object.keys(COUNT_SRC).forEach(k => {
      const src = document.getElementById(COUNT_SRC[k]);
      const dst = document.getElementById(COUNT_DST[k]);
      if (src && dst) dst.textContent = src.textContent;
    });
  }
  function setBoardCol(col) {
    const board = document.querySelector('.board');
    if (board) board.setAttribute('data-mobile-col', col);
    document.querySelectorAll('.bms-btn').forEach(b => b.classList.toggle('active', b.dataset.col === col));
  }

  function bind() {
    initTheme();

    const moreBtn = document.getElementById('moreNavBtn');
    if (moreBtn) moreBtn.addEventListener('click', openMore);
    const sheet = document.getElementById('moreSheet');
    if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) closeMore(); });
    document.querySelectorAll('.more-item[data-view]').forEach(b => {
      b.addEventListener('click', () => {
        if (typeof switchView === 'function') switchView(b.dataset.view);
        closeMore();
      });
    });

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    const moreTheme = document.getElementById('moreThemeToggle');
    if (moreTheme) moreTheme.addEventListener('click', toggleTheme);

    document.querySelectorAll('.bms-btn').forEach(b =>
      b.addEventListener('click', () => setBoardCol(b.dataset.col)));
    setBoardCol('todo');
    updateBoardCounts();

    // Board counts are rendered by board.js; refresh our mirror after any nav tap.
    document.querySelectorAll('.nav-btn, .more-item, .bottom-nav-btn').forEach(b =>
      b.addEventListener('click', () => setTimeout(updateBoardCounts, 80)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMore(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
