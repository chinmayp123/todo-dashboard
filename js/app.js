// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
  setHeaderDate();
  bindEvents();
  if (currentView !== 'dashboard') {
    switchView(currentView);
  } else {
    render();
  }

  // Initialize Firebase real-time sync
  initFirebaseSync(applyFirebaseData);
  // Push current local data to Firebase on first load
  setTimeout(() => saveToFirebase(state), 1500);
});

function setHeaderDate() {
  const d = new Date();
  $('#headerDate').textContent = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ========== Events ==========
function bindEvents() {
  // Navigation
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });

  // Add task
  $('#addTaskBtn').addEventListener('click', () => openModal());
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
  bindDietEvents();

  // Add category / project
  $('#addCategoryBtn').addEventListener('click', handleAddCategory);
  $('#addProjectBtn').addEventListener('click', handleAddProject);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ========== Views ==========
function switchView(view) {
  currentView = view;
  localStorage.setItem('tf_view', view);
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.remove('active'));

  const titles = { dashboard: 'Dashboard', tasks: 'All Tasks', board: 'Board', calendar: 'Calendar', gym: 'Gym', diet: 'Diet' };
  $('#viewTitle').textContent = titles[view];
  $(`#${view}View`).classList.add('active');
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

function populateCategoryDropdowns() {
  const opts = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  $('#taskCategory').innerHTML = opts;
  $('#filterCategory').innerHTML = '<option value="all">All Categories</option>' + opts;
}
