// ========== Data Layer ==========
const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#6366f1' },
  { id: 'personal', name: 'Personal', color: '#22c55e' },
  { id: 'health', name: 'Health', color: '#ef4444' },
  { id: 'learning', name: 'Learning', color: '#eab308' },
];

const SAMPLE_TASKS = [
  { id: '1', name: 'Design dashboard wireframes', description: 'Create mockups for the new analytics dashboard', priority: 'high', status: 'in-progress', category: 'work', dueDate: getTodayOffset(2), created: getTodayOffset(-3), subtasks: [{ text: 'Research competitors', done: true }, { text: 'Sketch layouts', done: false }] },
  { id: '2', name: 'Weekly grocery shopping', description: '', priority: 'medium', status: 'todo', category: 'personal', dueDate: getTodayOffset(1), created: getTodayOffset(-1), subtasks: [] },
  { id: '3', name: 'Morning jog routine', description: '30 minutes around the park', priority: 'low', status: 'done', category: 'health', dueDate: getTodayOffset(0), created: getTodayOffset(-5), scheduledHour: 7, duration: 0.5, subtasks: [] },
  { id: '4', name: 'Complete React tutorial', description: 'Finish chapters 8-12', priority: 'medium', status: 'in-progress', category: 'learning', dueDate: getTodayOffset(5), created: getTodayOffset(-7), subtasks: [{ text: 'Chapter 8 - Hooks', done: true }, { text: 'Chapter 9 - Context', done: true }, { text: 'Chapter 10 - Reducers', done: false }, { text: 'Chapter 11 - Testing', done: false }] },
  { id: '5', name: 'Fix API authentication bug', description: 'Token refresh failing after 24h', priority: 'high', status: 'todo', category: 'work', dueDate: getTodayOffset(-1), created: getTodayOffset(-2), subtasks: [] },
  { id: '6', name: 'Schedule dentist appointment', description: '', priority: 'low', status: 'todo', category: 'health', dueDate: getTodayOffset(7), created: getTodayOffset(-4), subtasks: [] },
  { id: '7', name: 'Prepare presentation slides', description: 'Quarterly review meeting', priority: 'high', status: 'todo', category: 'work', dueDate: getTodayOffset(3), created: getTodayOffset(-1), subtasks: [{ text: 'Gather metrics', done: false }, { text: 'Create slides', done: false }, { text: 'Practice delivery', done: false }] },
  { id: '8', name: 'Read "Atomic Habits"', description: 'Finish remaining 100 pages', priority: 'low', status: 'in-progress', category: 'learning', dueDate: getTodayOffset(10), created: getTodayOffset(-14), subtasks: [] },
];

function getTodayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function loadData() {
  const tasks = localStorage.getItem('tf_tasks');
  const categories = localStorage.getItem('tf_categories');
  return {
    tasks: tasks ? JSON.parse(tasks) : [...SAMPLE_TASKS],
    categories: categories ? JSON.parse(categories) : [...DEFAULT_CATEGORIES],
  };
}

function saveData(data) {
  localStorage.setItem('tf_tasks', JSON.stringify(data.tasks));
  localStorage.setItem('tf_categories', JSON.stringify(data.categories));
}

// ========== State ==========
let state = loadData();
let currentView = 'dashboard';
let calendarDate = new Date();
let miniCalDate = new Date();
let editingSubtasks = [];
let activeTaskTab = null; // null = show all, or a category id
let activeBoardFilter = null; // null = show all, or a category id

// ========== DOM Refs ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
  setHeaderDate();
  bindEvents();
  render();
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

  // Subtasks
  $('#addSubtaskBtn').addEventListener('click', addSubtask);
  $('#subtaskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
  });

  // Filters
  $('#filterStatus').addEventListener('change', renderTasksView);
  $('#filterPriority').addEventListener('change', renderTasksView);
  $('#filterCategory').addEventListener('change', renderTasksView);
  $('#sortBy').addEventListener('change', renderTasksView);

  // Search
  $('#searchInput').addEventListener('input', renderTasksView);

  // Calendar nav
  $('#calPrev').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });

  // Mini calendar nav
  $('#miniCalPrev').addEventListener('click', () => { miniCalDate.setMonth(miniCalDate.getMonth() - 1); renderMiniCalendar(); });
  $('#miniCalNext').addEventListener('click', () => { miniCalDate.setMonth(miniCalDate.getMonth() + 1); renderMiniCalendar(); });

  // Add category
  $('#addCategoryBtn').addEventListener('click', handleAddCategory);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ========== Views ==========
function switchView(view) {
  currentView = view;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.remove('active'));

  const titles = { dashboard: 'Dashboard', tasks: 'All Tasks', board: 'Board', calendar: 'Calendar' };
  $('#viewTitle').textContent = titles[view];
  $(`#${view}View`).classList.add('active');
  render();
}

// ========== Render ==========
function render() {
  renderSidebarCategories();
  renderDashboard();
  renderMiniCalendar();
  renderSchedule();
  renderTasksView();
  renderBoard();
  renderCalendar();
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
      </div>`;
  }).join('');
}

function populateCategoryDropdowns() {
  const opts = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  $('#taskCategory').innerHTML = opts;
  $('#filterCategory').innerHTML = '<option value="all">All Categories</option>' + opts;
}

// ========== Dashboard ==========
function renderDashboard() {
  const tasks = state.tasks;
  const today = new Date().toISOString().split('T')[0];

  const total = tasks.length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;

  $('#totalTasks').textContent = total;
  $('#inProgressTasks').textContent = inProgress;
  $('#completedTasks').textContent = completed;
  $('#overdueTasks').textContent = overdue;

  // My Tasks Board — category tabs + task list by status
  renderMyTasksBoard();

  // Priority bars
  const highCount = tasks.filter(t => t.priority === 'high').length;
  const medCount = tasks.filter(t => t.priority === 'medium').length;
  const lowCount = tasks.filter(t => t.priority === 'low').length;
  const maxP = Math.max(highCount, medCount, lowCount, 1);

  $('#priorityBars').innerHTML = [
    { label: 'High', cls: 'high', count: highCount },
    { label: 'Medium', cls: 'medium', count: medCount },
    { label: 'Low', cls: 'low', count: lowCount },
  ].map(p => `
    <div class="priority-bar-row">
      <div class="priority-bar-label"><span>${p.label}</span><span>${p.count}</span></div>
      <div class="priority-bar-track">
        <div class="priority-bar-fill ${p.cls}" style="width:${(p.count / maxP) * 100}%"></div>
      </div>
    </div>
  `).join('');

  // Deadlines
  const upcoming = tasks
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  $('#deadlinesList').innerHTML = upcoming.length ? upcoming.map(t => {
    const isOverdue = t.dueDate < today;
    const dateStr = formatDate(t.dueDate);
    return `
      <div class="deadline-item">
        <span class="deadline-date ${isOverdue ? 'overdue' : ''}">${dateStr}</span>
        <span class="deadline-name">${esc(t.name)}</span>
        <span class="priority-badge ${t.priority}">${t.priority}</span>
      </div>`;
  }).join('') : '<div class="empty-state"><p>No upcoming deadlines</p></div>';
}

// ========== My Tasks Board (Dashboard) ==========
function renderMyTasksBoard() {
  const today = new Date().toISOString().split('T')[0];

  // Build category tabs
  const cats = state.categories.filter(c =>
    state.tasks.some(t => t.category === c.id)
  );
  const tabsHtml = `
    <button class="my-tasks-tab ${activeTaskTab === null ? 'active' : ''}" data-cat="all">All</button>
    ${cats.map(c => `
      <button class="my-tasks-tab ${activeTaskTab === c.id ? 'active' : ''}" data-cat="${c.id}">
        <span class="category-dot" style="background:${c.color}"></span>${c.name}
      </button>
    `).join('')}`;
  $('#myTasksTabs').innerHTML = tabsHtml;

  // Bind tab clicks
  $$('.my-tasks-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTaskTab = tab.dataset.cat === 'all' ? null : tab.dataset.cat;
      renderMyTasksBoard();
    });
  });

  // Filter tasks by active tab
  let filtered = state.tasks.filter(t => t.status !== 'done');
  if (activeTaskTab) {
    filtered = filtered.filter(t => t.category === activeTaskTab);
  }

  // Sort: overdue first, then by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => {
    const aOverdue = a.dueDate && a.dueDate < today ? 0 : 1;
    const bOverdue = b.dueDate && b.dueDate < today ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Render task cards
  if (!filtered.length) {
    $('#myTasksBoard').innerHTML = '<div class="empty-state"><p>No active tasks</p></div>';
    return;
  }

  $('#myTasksBoard').innerHTML = filtered.slice(0, 8).map(t => {
    const cat = state.categories.find(c => c.id === t.category);
    const isOverdue = t.dueDate && t.dueDate < today;
    return `
      <div class="my-task-card" data-id="${t.id}">
        <div class="my-task-card-top">
          <div class="task-check ${t.status === 'done' ? 'checked' : ''}" data-id="${t.id}"></div>
          <span class="my-task-card-name">${esc(t.name)}</span>
        </div>
        <div class="my-task-card-bottom">
          ${cat ? `<span class="my-task-card-cat" style="color:${cat.color}"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : '<span></span>'}
          <div class="my-task-card-tags">
            ${isOverdue ? '<span class="my-task-tag overdue">Overdue</span>' : t.dueDate ? `<span class="my-task-tag">${formatDate(t.dueDate)}</span>` : ''}
            <span class="priority-badge ${t.priority}">${t.priority}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  // Bind check toggles
  $$('#myTasksBoard .task-check').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskDone(el.dataset.id);
    });
  });

  // Bind click to edit
  $$('#myTasksBoard .my-task-card').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}

// ========== Tasks List View ==========
function renderTasksView() {
  let tasks = [...state.tasks];
  const search = $('#searchInput').value.toLowerCase();
  const statusF = $('#filterStatus').value;
  const priorityF = $('#filterPriority').value;
  const categoryF = $('#filterCategory').value;
  const sortBy = $('#sortBy').value;

  if (search) tasks = tasks.filter(t => t.name.toLowerCase().includes(search) || (t.description && t.description.toLowerCase().includes(search)));
  if (statusF !== 'all') tasks = tasks.filter(t => t.status === statusF);
  if (priorityF !== 'all') tasks = tasks.filter(t => t.priority === priorityF);
  if (categoryF !== 'all') tasks = tasks.filter(t => t.category === categoryF);

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  switch (sortBy) {
    case 'created': tasks.sort((a, b) => b.created.localeCompare(a.created)); break;
    case 'dueDate': tasks.sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z')); break;
    case 'priority': tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]); break;
    case 'name': tasks.sort((a, b) => a.name.localeCompare(b.name)); break;
  }

  const today = new Date().toISOString().split('T')[0];

  $('#tasksList').innerHTML = tasks.length ? tasks.map(t => {
    const cat = state.categories.find(c => c.id === t.category);
    const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
    const subtaskInfo = t.subtasks.length ? `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : '';
    return `
      <div class="task-row" data-id="${t.id}">
        <div class="task-check ${t.status === 'done' ? 'checked' : ''}" data-id="${t.id}"></div>
        <div class="task-row-info">
          <div class="task-row-name ${t.status === 'done' ? 'completed' : ''}">${esc(t.name)}</div>
          <div class="task-row-meta">
            ${cat ? `<span class="task-row-category"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : ''}
            ${t.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">${isOverdue ? 'Overdue: ' : ''}${formatDate(t.dueDate)}</span>` : ''}
            ${subtaskInfo ? `<span>Subtasks: ${subtaskInfo}</span>` : ''}
          </div>
        </div>
        <span class="priority-badge ${t.priority}">${t.priority}</span>
        <span class="status-badge ${t.status}">${t.status.replace('-', ' ')}</span>
      </div>`;
  }).join('') : '<div class="empty-state"><p>No tasks match your filters</p></div>';

  // Bind events
  $$('#tasksList .task-check').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); toggleTaskDone(el.dataset.id); });
  });
  $$('#tasksList .task-row').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}

// ========== Board View ==========
function renderBoard() {
  // Build category filter tabs
  const cats = state.categories.filter(c =>
    state.tasks.some(t => t.category === c.id)
  );
  const filtersHtml = `
    <button class="my-tasks-tab ${activeBoardFilter === null ? 'active' : ''}" data-cat="all">All</button>
    ${cats.map(c => `
      <button class="my-tasks-tab ${activeBoardFilter === c.id ? 'active' : ''}" data-cat="${c.id}">
        <span class="category-dot" style="background:${c.color}"></span>${c.name}
      </button>
    `).join('')}`;
  $('#boardFilters').innerHTML = filtersHtml;

  // Bind filter tab clicks
  $$('#boardFilters .my-tasks-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeBoardFilter = tab.dataset.cat === 'all' ? null : tab.dataset.cat;
      renderBoard();
    });
  });

  const statuses = ['todo', 'in-progress', 'done'];
  const containers = { todo: $('#boardTodo'), 'in-progress': $('#boardProgress'), done: $('#boardDone') };
  const counts = { todo: $('#boardTodoCount'), 'in-progress': $('#boardProgressCount'), done: $('#boardDoneCount') };

  statuses.forEach(status => {
    let tasks = state.tasks.filter(t => t.status === status);
    if (activeBoardFilter) {
      tasks = tasks.filter(t => t.category === activeBoardFilter);
    }
    counts[status].textContent = tasks.length;
    containers[status].innerHTML = tasks.length ? tasks.map(t => {
      const cat = state.categories.find(c => c.id === t.category);
      return `
        <div class="board-card" data-id="${t.id}">
          <div class="board-card-name">${esc(t.name)}</div>
          <div class="board-card-footer">
            ${cat ? `<span class="board-card-category"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : '<span></span>'}
            <span class="priority-badge ${t.priority}">${t.priority}</span>
          </div>
        </div>`;
    }).join('') : '<div class="empty-state"><p>No tasks</p></div>';
  });

  // Bind click
  $$('.board-card').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });

  // Drag and drop
  $$('.board-card').forEach(card => {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => { card.style.opacity = '1'; });
  });

  $$('.column-tasks').forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.style.background = 'var(--accent-glow)'; });
    col.addEventListener('dragleave', () => { col.style.background = ''; });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.style.background = '';
      const taskId = e.dataTransfer.getData('text/plain');
      const newStatus = col.closest('.board-column').dataset.status;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = newStatus;
        saveData(state);
        render();
      }
    });
  });
}

// ========== Mini Calendar (Dashboard) ==========
function renderMiniCalendar() {
  const year = miniCalDate.getFullYear();
  const month = miniCalDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  $('#miniCalMonth').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const miniHolidays = getUSHolidays(year);
  let html = '';

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<span class="mini-cal-cell other-month">${daysInPrev - i}</span>`;
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const hasTasks = state.tasks.some(t => t.dueDate === dateStr);
    const isHoliday = miniHolidays.some(h => h.date === dateStr);
    const classes = ['mini-cal-cell'];
    if (isToday) classes.push('today');
    if (hasTasks) classes.push('has-tasks');
    if (isHoliday) classes.push('holiday');
    html += `<span class="${classes.join(' ')}" ${isHoliday ? `title="${miniHolidays.find(h => h.date === dateStr).name}"` : ''}>${d}</span>`;
  }

  // Next month padding
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<span class="mini-cal-cell other-month">${i}</span>`;
  }

  $('#miniCalDays').innerHTML = html;
}

// ========== Daily Schedule ==========
function renderSchedule() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentHour = today.getHours();

  $('#scheduleDate').textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Get tasks due today
  const todayTasks = state.tasks.filter(t => t.dueDate === todayStr && t.status !== 'done');
  const scheduled = todayTasks.filter(t => t.scheduledHour != null);
  const unscheduled = todayTasks.filter(t => t.scheduledHour == null);

  // Render unscheduled tasks
  if (unscheduled.length) {
    $('#scheduleUnscheduled').innerHTML = `
      <div class="unscheduled-label">Unscheduled tasks — drag to a time slot</div>
      <div class="unscheduled-tasks">
        ${unscheduled.map(t => {
          const cat = state.categories.find(c => c.id === t.category);
          return `
          <div class="schedule-event priority-${t.priority} draggable-event" draggable="true" data-id="${t.id}">
            <div class="schedule-event-header">
              <div class="schedule-event-name">${esc(t.name)}</div>
            </div>
            <div class="schedule-event-meta">
              <span class="schedule-event-priority ${t.priority}">${t.priority}</span>
              ${cat ? `<span class="schedule-event-category"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } else {
    $('#scheduleUnscheduled').innerHTML = '';
  }

  // Build schedule from 6 AM to 9 PM
  let html = '';
  for (let h = 6; h <= 21; h++) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const isCurrent = h === currentHour;
    const slotTasks = scheduled.filter(t => t.scheduledHour === h);

    html += `
      <div class="schedule-hour${isCurrent ? ' current' : ''}" data-hour="${h}">
        <div class="schedule-hour-label">${hour12} ${ampm}</div>
        <div class="schedule-hour-slot" data-hour="${h}">
          ${slotTasks.map(t => {
            const cat = state.categories.find(c => c.id === t.category);
            return `
            <div class="schedule-event priority-${t.priority} draggable-event" draggable="true" data-id="${t.id}">
              <div class="schedule-event-header">
                <div class="schedule-event-name">${esc(t.name)}</div>
                ${cat ? `<span class="schedule-event-category"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : ''}
              </div>
              <div class="schedule-event-meta">
                <span class="schedule-event-priority ${t.priority}">${t.priority}</span>
                ${t.duration && t.duration !== 1 ? `<span>${t.duration}h</span>` : ''}
                ${t.subtasks.length ? `<span>${t.subtasks.filter(s => s.done).length}/${t.subtasks.length} subtasks</span>` : ''}
              </div>
              <button class="schedule-event-remove" data-id="${t.id}" title="Unschedule">&times;</button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  $('#scheduleTimeline').innerHTML = html;

  // Bind click on schedule events to edit
  $$('.schedule-event').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('schedule-event-remove')) return;
      openModal(el.dataset.id);
    });
  });

  // Bind unschedule buttons
  $$('.schedule-event-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const task = state.tasks.find(t => t.id === btn.dataset.id);
      if (task) {
        delete task.scheduledHour;
        delete task.duration;
        saveData(state);
        render();
      }
    });
  });

  // Click empty slot to add task at that hour
  $$('.schedule-hour-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      if (e.target !== slot) return;
      const hour = parseInt(slot.dataset.hour);
      openModal(null, hour);
    });
  });

  // Drag and drop for schedule events
  $$('.draggable-event').forEach(ev => {
    ev.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', ev.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      ev.style.opacity = '0.4';
    });
    ev.addEventListener('dragend', () => { ev.style.opacity = '1'; });
  });

  $$('.schedule-hour-slot').forEach(slot => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const hour = parseInt(slot.dataset.hour);
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        task.scheduledHour = hour;
        if (!task.duration) task.duration = 1;
        // If task wasn't due today, set it
        const todayStr = new Date().toISOString().split('T')[0];
        if (!task.dueDate) task.dueDate = todayStr;
        saveData(state);
        render();
      }
    });
  });

  // Auto-scroll to current hour
  const currentSlot = $('.schedule-hour.current');
  if (currentSlot) {
    currentSlot.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ========== Calendar View ==========
function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  $('#calMonth').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  let html = '';

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><span class="cal-day-number">${daysInPrev - i}</span></div>`;
  }

  // Get holidays for this year
  const holidays = getUSHolidays(year);

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const holiday = holidays.find(h => h.date === dateStr);
    const dayTasks = state.tasks.filter(t => t.dueDate === dateStr);
    const holidayHtml = holiday ? `<div class="cal-holiday">${esc(holiday.name)}</div>` : '';
    const taskDots = dayTasks.slice(0, 3).map(t =>
      `<div class="cal-task-dot ${t.priority}" data-id="${t.id}" title="${esc(t.name)}">${esc(t.name)}</div>`
    ).join('');
    html += `<div class="cal-day${isToday ? ' today' : ''}${holiday ? ' holiday' : ''}"><span class="cal-day-number">${d}</span>${holidayHtml}${taskDots}</div>`;
  }

  // Next month padding
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-day other-month"><span class="cal-day-number">${i}</span></div>`;
  }

  $('#calendarDays').innerHTML = html;

  // Bind calendar task clicks
  $$('.cal-task-dot').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}

// ========== Modal ==========
function populateScheduleHourDropdown() {
  const sel = $('#taskScheduledHour');
  let html = '<option value="">Not scheduled</option>';
  for (let h = 6; h <= 21; h++) {
    const hour12 = h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    html += `<option value="${h}">${hour12}:00 ${ampm}</option>`;
  }
  sel.innerHTML = html;
}

function openModal(taskId = null, scheduledHour = null) {
  const modal = $('#taskModal');
  const form = $('#taskForm');
  form.reset();
  editingSubtasks = [];
  populateScheduleHourDropdown();

  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    $('#modalTitle').textContent = 'Edit Task';
    $('#taskId').value = task.id;
    $('#taskName').value = task.name;
    $('#taskDesc').value = task.description || '';
    $('#taskPriority').value = task.priority;
    $('#taskStatus').value = task.status;
    $('#taskCategory').value = task.category;
    $('#taskDueDate').value = task.dueDate || '';
    $('#taskScheduledHour').value = task.scheduledHour != null ? task.scheduledHour : '';
    $('#taskDuration').value = task.duration || '1';
    editingSubtasks = task.subtasks ? task.subtasks.map(s => ({ ...s })) : [];
    $('#deleteBtn').style.display = 'block';
  } else {
    $('#modalTitle').textContent = 'New Task';
    $('#taskId').value = '';
    $('#deleteBtn').style.display = 'none';
    if (scheduledHour != null) {
      $('#taskScheduledHour').value = scheduledHour;
      $('#taskDueDate').value = new Date().toISOString().split('T')[0];
    }
  }

  renderSubtasks();
  modal.classList.add('active');
  setTimeout(() => $('#taskName').focus(), 100);
}

function closeModal() {
  $('#taskModal').classList.remove('active');
}

function renderSubtasks() {
  $('#subtasksList').innerHTML = editingSubtasks.map((s, i) => `
    <div class="subtask-item">
      <input type="checkbox" ${s.done ? 'checked' : ''} data-idx="${i}">
      <span class="${s.done ? 'done' : ''}">${esc(s.text)}</span>
      <button class="subtask-remove" data-idx="${i}" type="button">&times;</button>
    </div>
  `).join('');

  $$('#subtasksList input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      editingSubtasks[parseInt(cb.dataset.idx)].done = cb.checked;
      renderSubtasks();
    });
  });

  $$('#subtasksList .subtask-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      editingSubtasks.splice(parseInt(btn.dataset.idx), 1);
      renderSubtasks();
    });
  });
}

function addSubtask() {
  const input = $('#subtaskInput');
  const text = input.value.trim();
  if (!text) return;
  editingSubtasks.push({ text, done: false });
  input.value = '';
  renderSubtasks();
  input.focus();
}

// ========== CRUD ==========
function handleSaveTask(e) {
  e.preventDefault();
  const id = $('#taskId').value;
  const scheduledVal = $('#taskScheduledHour').value;
  const taskData = {
    name: $('#taskName').value.trim(),
    description: $('#taskDesc').value.trim(),
    priority: $('#taskPriority').value,
    status: $('#taskStatus').value,
    category: $('#taskCategory').value,
    dueDate: $('#taskDueDate').value,
    scheduledHour: scheduledVal !== '' ? parseInt(scheduledVal) : null,
    duration: scheduledVal !== '' ? parseFloat($('#taskDuration').value) : null,
    subtasks: [...editingSubtasks],
  };

  if (!taskData.name) return;

  if (id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) Object.assign(task, taskData);
  } else {
    state.tasks.push({
      id: Date.now().toString(),
      ...taskData,
      created: new Date().toISOString().split('T')[0],
    });
  }

  saveData(state);
  closeModal();
  render();
}

function handleDeleteTask() {
  const id = $('#taskId').value;
  if (!id) return;
  if (!confirm('Delete this task?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveData(state);
  closeModal();
  render();
}

function toggleTaskDone(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === 'done' ? 'todo' : 'done';
  saveData(state);
  render();
}

function handleAddCategory() {
  const name = prompt('Category name:');
  if (!name || !name.trim()) return;
  const colors = ['#6366f1', '#22c55e', '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const color = colors[state.categories.length % colors.length];
  state.categories.push({ id: name.trim().toLowerCase().replace(/\s+/g, '-'), name: name.trim(), color });
  saveData(state);
  render();
}

// ========== US Holidays ==========
function getUSHolidays(year) {
  const holidays = [];

  // Fixed-date holidays
  holidays.push({ date: `${year}-01-01`, name: "New Year's Day" });
  holidays.push({ date: `${year}-06-19`, name: 'Juneteenth' });
  holidays.push({ date: `${year}-07-04`, name: 'Independence Day' });
  holidays.push({ date: `${year}-11-11`, name: "Veterans Day" });
  holidays.push({ date: `${year}-12-25`, name: 'Christmas Day' });

  // MLK Day: 3rd Monday of January
  holidays.push({ date: getNthWeekday(year, 0, 1, 3), name: 'MLK Day' });

  // Presidents' Day: 3rd Monday of February
  holidays.push({ date: getNthWeekday(year, 1, 1, 3), name: "Presidents' Day" });

  // Memorial Day: last Monday of May
  holidays.push({ date: getLastWeekday(year, 4, 1), name: 'Memorial Day' });

  // Labor Day: 1st Monday of September
  holidays.push({ date: getNthWeekday(year, 8, 1, 1), name: 'Labor Day' });

  // Columbus Day: 2nd Monday of October
  holidays.push({ date: getNthWeekday(year, 9, 1, 2), name: 'Columbus Day' });

  // Thanksgiving: 4th Thursday of November
  holidays.push({ date: getNthWeekday(year, 10, 4, 4), name: 'Thanksgiving' });

  return holidays;
}

function getNthWeekday(year, month, weekday, n) {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === weekday) {
      count++;
      if (count === n) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function getLastWeekday(year, month, weekday) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = daysInMonth; d >= 1; d--) {
    const date = new Date(year, month, d);
    if (date.getDay() === weekday) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

// ========== Helpers ==========
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
