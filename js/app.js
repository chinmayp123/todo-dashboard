// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
  // Offline support: network-first SW, so code is always fresh when online
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  setHeaderDate();
  bindEvents();
  if (currentView !== 'dashboard') {
    switchView(currentView);
  } else {
    render();
  }

  // Scroll to top on load
  window.scrollTo(0, 0);

  // Ask who is using the app before touching the cloud. Until a profile is
  // picked there is no DATA_REF, so no one can read or overwrite anyone else's
  // node. Once picked, the initial reconciliation inside initFirebaseSync
  // decides whether to pull cloud data or push local up — we no longer blindly
  // push local state after a timeout, which could clobber newer cloud data
  // before it had a chance to load.
  updateProfileSettingsCard();
  requireProfile(() => initFirebaseSync(applyFirebaseData));
});

function setHeaderDate() {
  const d = new Date();
  $('#headerDate').textContent = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ========== Events ==========
function bindEvents() {
  // Mobile sidebar toggle
  const sidebar = document.querySelector('.sidebar');
  const overlay = $('#sidebarOverlay');
  const menuBtn = $('#mobileMenuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Navigation
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
      // Close mobile sidebar after navigation
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    });
  });

  // Header primary-action button — context-aware (see switchView for labels)
  $('#addTaskBtn').addEventListener('click', headerPrimaryAction);
  $('#modalClose').addEventListener('click', closeModal);
  $('#cancelBtn').addEventListener('click', closeModal);
  $('#taskModal').addEventListener('click', (e) => {
    if (e.target === $('#taskModal')) closeModal();
  });

  // Form
  $('#taskForm').addEventListener('submit', handleSaveTask);
  $('#deleteBtn').addEventListener('click', handleDeleteTask);

  // Category → show/hide project dropdown
  $('#taskCategory').addEventListener('change', toggleProjectRow);

  // Subtasks
  $('#addSubtaskBtn').addEventListener('click', addSubtask);
  $('#subtaskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
  });

  // Filters
  $('#filterStatus').addEventListener('change', renderTasksView);
  $('#filterCategory').addEventListener('change', renderTasksView);
  $('#sortBy').addEventListener('change', renderTasksView);

  // Search
  $('#searchInput').addEventListener('input', renderTasksView);

  // Calendar nav
  $('#calPrev').addEventListener('click', () => {
    if (calViewMode === 'month') {
      calendarDate.setMonth(calendarDate.getMonth() - 1);
    } else {
      calendarDate.setDate(calendarDate.getDate() - 7);
    }
    renderCalendar();
  });
  $('#calNext').addEventListener('click', () => {
    if (calViewMode === 'month') {
      calendarDate.setMonth(calendarDate.getMonth() + 1);
    } else {
      calendarDate.setDate(calendarDate.getDate() + 7);
    }
    renderCalendar();
  });

  // Calendar view toggle
  $('#calMonthBtn').addEventListener('click', () => {
    calViewMode = 'month';
    $('#calMonthBtn').classList.add('active');
    $('#calWeekBtn').classList.remove('active');
    renderCalendar();
  });
  $('#calWeekBtn').addEventListener('click', () => {
    calViewMode = 'week';
    $('#calWeekBtn').classList.add('active');
    $('#calMonthBtn').classList.remove('active');
    renderCalendar();
  });

  // Mini calendar nav (if present)
  if ($('#miniCalPrev')) {
    $('#miniCalPrev').addEventListener('click', () => { miniCalDate.setMonth(miniCalDate.getMonth() - 1); renderMiniCalendar(); });
    $('#miniCalNext').addEventListener('click', () => { miniCalDate.setMonth(miniCalDate.getMonth() + 1); renderMiniCalendar(); });
  }

  // Schedule day nav
  $('#schedulePrev').addEventListener('click', () => {
    scheduleDate.setDate(scheduleDate.getDate() - 1);
    renderSchedule();
  });
  $('#scheduleNext').addEventListener('click', () => {
    scheduleDate.setDate(scheduleDate.getDate() + 1);
    renderSchedule();
  });
  $('#scheduleToday').addEventListener('click', () => {
    scheduleDate = new Date();
    renderSchedule();
  });

  // Gym & Diet
  bindGymEvents();
  if (typeof bindCardioEvents === 'function') bindCardioEvents();
  bindDietEvents();
  bindGoalsEvents();
  if (typeof bindPhotoEvents === 'function') bindPhotoEvents();
  if (typeof bindVoiceEvents === 'function') bindVoiceEvents();

  // Add category / project
  $('#addCategoryBtn').addEventListener('click', handleAddCategory);
  $('#addProjectBtn').addEventListener('click', handleAddProject);

  // Profile
  const switchProfileBtn = $('#switchProfileBtn');
  if (switchProfileBtn) switchProfileBtn.addEventListener('click', switchProfile);

  // Backup / Restore
  $('#exportBtn').addEventListener('click', () => exportBackup());
  $('#importBtn').addEventListener('click', () => {
    // Deliberate first step so a stray tap can't even open the file picker.
    // Names the common mix-up: people mean "Backup" (download) and hit "Restore".
    if (!confirm('Restore from a backup file?\n\nThis is only for recovering lost data — it will REPLACE everything on this device and in the cloud.\n\nDid you mean "Backup" instead? Tap Cancel if so.')) return;
    $('#importFile').click();
  });
  $('#importFile').addEventListener('change', importBackup);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ========== Views ==========
// The header's top-right button adapts to the current view: it logs weight in
// the Gym, logs food in Diet, and creates a task everywhere else.
const HEADER_ACTION_LABELS = { gym: 'Log Weight', cardio: 'Log Session', diet: 'Log Food' };

function headerPrimaryAction() {
  if (currentView === 'gym') {
    const el = $('#weightInput');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  } else if (currentView === 'cardio') {
    const el = $('#cardioDistance');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  } else if (currentView === 'diet') {
    const el = $('#dietFoodName');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  } else {
    openModal();
  }
}

function updateHeaderActionBtn(view) {
  const btn = $('#addTaskBtn');
  if (!btn) return;
  if (view === 'settings') { btn.style.display = 'none'; return; }
  btn.style.display = '';
  btn.textContent = HEADER_ACTION_LABELS[view] || '+ New Task';
}

function switchView(view) {
  currentView = view;
  localStorage.setItem('tf_view', view);
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.remove('active'));

  const titles = { dashboard: 'Dashboard', tasks: 'All Tasks', board: 'Board', calendar: 'Calendar', gym: 'Gym', cardio: 'Cardio', diet: 'Diet', settings: 'Settings' };
  $('#viewTitle').textContent = titles[view];
  $(`#${view}View`).classList.add('active');
  updateHeaderActionBtn(view);
  render();
}

// ========== Render ==========
function render() {
  renderSidebarCategories();
  renderSidebarProjects();
  renderDashboard();
  renderMiniCalendar();
  renderSchedule();
  renderTasksView();
  renderBoard();
  renderCalendar();
  renderGym();
  if (typeof renderCardio === 'function') renderCardio();
  renderDiet();
  populateCategoryDropdowns();
}

function renderSidebarCategories() {
  const list = $('#categoryList');
  list.innerHTML = state.categories.map(cat => {
    const count = state.tasks.filter(t => t.category === cat.id).length;
    return `
      <div class="category-item" data-cat="${cat.id}">
        <span class="category-dot" style="background:${cat.color}"></span>
        ${cat.name}
        <span class="category-count">${count}</span>
        <button class="sidebar-del-btn" data-del-cat="${cat.id}">&times;</button>
      </div>`;
  }).join('');

  $$('.sidebar-del-btn[data-del-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delCat;
      const cat = state.categories.find(c => c.id === id);
      const count = state.tasks.filter(t => t.category === id).length;
      const msg = count ? `Delete "${cat.name}"? ${count} task(s) will become uncategorized.` : `Delete "${cat.name}"?`;
      if (!confirm(msg)) return;
      state.categories = state.categories.filter(c => c.id !== id);
      state.tasks.forEach(t => { if (t.category === id) t.category = ''; });
      saveData(state);
      render();
    });
  });
}

function renderSidebarProjects() {
  const list = $('#projectList');
  list.innerHTML = state.projects.map(proj => {
    const count = state.tasks.filter(t => t.project === proj.id && t.status !== 'done').length;
    const active = activeProject === proj.id;
    return `
      <div class="project-item ${active ? 'active' : ''}" data-proj="${proj.id}">
        <span class="category-dot" style="background:${proj.color}"></span>
        ${proj.name}
        <span class="category-count">${count}</span>
        <button class="sidebar-del-btn" data-del-proj="${proj.id}">&times;</button>
      </div>`;
  }).join('');

  $$('.project-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.sidebar-del-btn')) return;
      const id = el.dataset.proj;
      activeProject = activeProject === id ? null : id;
      render();
    });
  });

  $$('.sidebar-del-btn[data-del-proj]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delProj;
      const proj = state.projects.find(p => p.id === id);
      const count = state.tasks.filter(t => t.project === id).length;
      const msg = count ? `Delete "${proj.name}"? ${count} task(s) will be unassigned.` : `Delete "${proj.name}"?`;
      if (!confirm(msg)) return;
      state.projects = state.projects.filter(p => p.id !== id);
      state.tasks.forEach(t => { if (t.project === id) t.project = null; });
      if (activeProject === id) activeProject = null;
      saveData(state);
      render();
    });
  });
}

function handleAddProject() {
  const name = prompt('Project name:');
  if (!name || !name.trim()) return;
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#22c55e', '#ef4444', '#eab308'];
  const color = colors[state.projects.length % colors.length];
  state.projects.push({ id: 'proj-' + Date.now(), name: name.trim(), color });
  saveData(state);
  render();
}

// ========== Backup / Restore ==========
// Optional `prefix` names the file (used for the automatic pre-restore safety copy).
function exportBackup(prefix) {
  const namePrefix = (typeof prefix === 'string' && prefix) ? prefix : 'daylign-backup';
  const payload = {
    tasks: state.tasks,
    categories: state.categories,
    projects: state.projects,
    gym: state.gym,
    diet: state.diet,
    customFoods: state.customFoods,
    water: state.water,
    events: state.events,
    removedFoods: state.removedFoods,
    weight: state.weight,
    goals: state.goals,
    exportedAt: new Date().toISOString(),
    version: 2,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${namePrefix}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importBackup(e) {
  const input = e.target;
  const file = input.files && input.files[0];
  input.value = ''; // reset now so the same file can be re-selected later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      alert('Could not read that backup file: ' + err.message);
      return;
    }
    if (typeof data !== 'object' || data === null) {
      alert('That does not look like a valid backup file.');
      return;
    }

    // Summarize what this restore would replace, so it's an informed choice.
    const dietOf = arr => (Array.isArray(arr) ? arr : []);
    const curDiet = dietOf(state.diet).length;
    const newDiet = dietOf(data.diet).length;
    const curDays = new Set(dietOf(state.diet).map(x => x && x.date)).size;
    const newDays = new Set(dietOf(data.diet).map(x => x && x.date)).size;
    const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString() : 'an unknown date';

    // Always download the CURRENT data first, so any restore is undoable.
    exportBackup('daylign-autosave-before-restore');

    let msg =
      `Restore this backup?\n\n` +
      `• Backup created: ${when}\n` +
      `• Backup has ${newDiet} diet entries across ${newDays} day(s)\n` +
      `• You currently have ${curDiet} entries across ${curDays} day(s)\n\n` +
      `This REPLACES everything on this device AND in the cloud (all your devices).\n` +
      `A safety copy of your current data was just downloaded so you can undo this.`;

    if (newDiet < curDiet || newDays < curDays) {
      msg = `⚠️ This looks like an OLDER / smaller backup — you would LOSE ` +
        `${Math.max(0, curDiet - newDiet)} diet entries and ` +
        `${Math.max(0, curDays - newDays)} day(s) of history.\n\n` + msg;
    }

    // Require typing the word — a stray tap or reflexive "OK" can't get through.
    const answer = prompt(msg + `\n\nType RESTORE (all caps) to confirm:`);
    if (!answer || answer.trim().toUpperCase() !== 'RESTORE') {
      alert('Restore cancelled — your data is unchanged.');
      return;
    }

    state.tasks = data.tasks || [];
    state.categories = data.categories || [];
    state.projects = data.projects || [];
    state.gym = data.gym || [];
    state.diet = data.diet || [];
    state.customFoods = data.customFoods || {};
    state.water = data.water || {};
    state.events = data.events || [];
    // Only overwrite these when the backup actually contains them, so restoring
    // an older backup (made before these were exported) can't wipe them.
    if ('removedFoods' in data) state.removedFoods = data.removedFoods || [];
    if ('weight' in data) state.weight = data.weight || {};
    if ('goals' in data) state.goals = data.goals || {};
    saveData(state);
    populateCategoryDropdowns();
    render();
    alert('Backup restored successfully.');
  };
  reader.readAsText(file);
}

function populateCategoryDropdowns() {
  const opts = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  $('#taskCategory').innerHTML = opts;
  $('#filterCategory').innerHTML = '<option value="all">All Categories</option>' + opts;
}
