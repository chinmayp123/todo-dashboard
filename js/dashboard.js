// ========== Dashboard ==========
let dashboardProjectFilter = null; // null = all projects

function renderDashboardProjectFilter() {
  const projects = state.projects || [];
  if (!projects.length) {
    $('#dashboardProjectFilter').innerHTML = '';
    return;
  }
  $('#dashboardProjectFilter').innerHTML = `
    <div class="dash-project-tabs">
      <button class="dash-project-tab ${dashboardProjectFilter === null ? 'active' : ''}" data-proj="all">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        All Projects
      </button>
      ${projects.map(p => `
        <button class="dash-project-tab ${dashboardProjectFilter === p.id ? 'active' : ''}" data-proj="${p.id}">
          <span class="category-dot" style="background:${p.color}"></span>${esc(p.name)}
        </button>
      `).join('')}
    </div>`;

  $$('.dash-project-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      dashboardProjectFilter = tab.dataset.proj === 'all' ? null : tab.dataset.proj;
      renderDashboard();
    });
  });
}

function renderDashboard() {
  renderDashboardProjectFilter();

  let tasks = state.tasks;
  if (dashboardProjectFilter) {
    tasks = tasks.filter(t => t.project === dashboardProjectFilter);
  }
  const today = new Date().toISOString().split('T')[0];

  const total = tasks.length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;

  $('#totalTasks').textContent = total;
  $('#inProgressTasks').textContent = inProgress;
  $('#completedTasks').textContent = completed;
  $('#overdueTasks').textContent = overdue;

  renderReminders(today);
  renderMyTasksBoard(tasks);

  // Deadlines
  const upcoming = tasks
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  $('#deadlinesList').innerHTML = upcoming.length ? upcoming.map(t => {
    const isOverdue = t.dueDate < today;
    const dateStr = formatDate(t.dueDate);
    const proj = t.project ? state.projects.find(p => p.id === t.project) : null;
    const cat = state.categories.find(c => c.id === t.category);
    const itemColor = proj ? proj.color : (cat ? cat.color : null);
    return `
      <div class="deadline-item">
        <span class="deadline-date ${isOverdue ? 'overdue' : ''}" ${!isOverdue && itemColor ? `style="color:${itemColor}"` : ''}>${dateStr}</span>
        <span class="deadline-name">${esc(t.name)}</span>
      </div>`;
  }).join('') : '<div class="empty-state"><p>No upcoming deadlines</p></div>';
}

// ========== My Tasks Board (Dashboard) ==========
function renderMyTasksBoard(taskPool) {
  const allTasks = taskPool || state.tasks;
  const today = new Date().toISOString().split('T')[0];

  const cats = state.categories.filter(c =>
    allTasks.some(t => t.category === c.id)
  );
  const tabsHtml = `
    <button class="my-tasks-tab ${activeTaskTab === null ? 'active' : ''}" data-cat="all">All</button>
    ${cats.map(c => `
      <button class="my-tasks-tab ${activeTaskTab === c.id ? 'active' : ''}" data-cat="${c.id}">
        <span class="category-dot" style="background:${c.color}"></span>${c.name}
      </button>
    `).join('')}`;
  $('#myTasksTabs').innerHTML = tabsHtml;

  $$('.my-tasks-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTaskTab = tab.dataset.cat === 'all' ? null : tab.dataset.cat;
      renderMyTasksBoard(allTasks);
    });
  });

  let filtered = allTasks.filter(t => t.status !== 'done');
  if (activeTaskTab) {
    filtered = filtered.filter(t => t.category === activeTaskTab);
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => {
    const aOverdue = a.dueDate && a.dueDate < today ? 0 : 1;
    const bOverdue = b.dueDate && b.dueDate < today ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

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
          </div>
        </div>
      </div>`;
  }).join('');

  $$('#myTasksBoard .task-check').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskDone(el.dataset.id);
    });
  });

  $$('#myTasksBoard .my-task-card').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}

// ========== Mini Calendar (Dashboard) ==========
function renderMiniCalendar() {
  if (!$('#miniCalDays')) return;
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

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<span class="mini-cal-cell other-month">${daysInPrev - i}</span>`;
  }

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

  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<span class="mini-cal-cell other-month">${i}</span>`;
  }

  $('#miniCalDays').innerHTML = html;
}

// ========== Daily Schedule ==========
function renderSchedule() {
  const now = new Date();
  const nowStr = now.toISOString().split('T')[0];
  const viewDate = new Date(scheduleDate);
  const viewStr = viewDate.toISOString().split('T')[0];
  const isToday = viewStr === nowStr;
  const currentHour = isToday ? now.getHours() : -1;

  if (isToday) {
    $('#scheduleTitle').textContent = "Today's Schedule";
  } else {
    $('#scheduleTitle').textContent = 'Schedule';
  }
  $('#scheduleDate').textContent = viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  $('#scheduleToday').style.display = isToday ? 'none' : '';

  const todayTasks = state.tasks.filter(t => t.dueDate === viewStr && t.status !== 'done');
  const scheduled = todayTasks.filter(t => t.scheduledHour != null);
  const unscheduled = todayTasks.filter(t => t.scheduledHour == null);

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

  $$('.schedule-event').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('schedule-event-remove')) return;
      openModal(el.dataset.id);
    });
  });

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

  $$('.schedule-hour-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      if (e.target !== slot) return;
      const hour = parseInt(slot.dataset.hour);
      openModal(null, hour);
    });
  });

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
        if (!task.dueDate) task.dueDate = viewStr;
        saveData(state);
        render();
      }
    });
  });

  const currentSlot = $('.schedule-hour.current');
  if (currentSlot) {
    currentSlot.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ========== Reminders ==========
function renderReminders(today) {
  const reminders = [];
  const hour = new Date().getHours();

  // --- Brush teeth (morning) ---
  const brushAM = localStorage.getItem('tf_brush_am_' + today);
  if (!brushAM && hour < 12) {
    reminders.push({
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 21h10"/><rect x="10" y="2" width="4" height="12" rx="2"/><path d="M12 14v7"/></svg>',
      color: '#22d3ee',
      bg: 'rgba(34, 211, 238, 0.1)',
      text: 'Brush your teeth (morning)',
      sub: '',
      action: `<button class="reminder-done-btn" data-habit="brush_am">Done</button>`,
    });
  }

  // --- Morning routine: pushups & situps ---
  const morningDone = localStorage.getItem('tf_morning_' + today);
  if (!morningDone && hour < 14) {
    reminders.push({
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
      color: 'var(--purple)',
      bg: 'rgba(139, 92, 246, 0.1)',
      text: 'Morning routine: Pushups & Situps',
      sub: 'Start your day strong!',
      action: `<button class="reminder-done-btn" data-habit="morning">Done</button>`,
    });
  }

  // --- Gym reminder ---
  const gymToday = state.gym.filter(e => e.date === today);
  const daysSinceGym = (() => {
    const gymDates = [...new Set(state.gym.map(e => e.date))].sort().reverse();
    if (!gymDates.length) return 99;
    const last = new Date(gymDates[0] + 'T00:00:00');
    const now = new Date(today + 'T00:00:00');
    return Math.round((now - last) / (1000 * 60 * 60 * 24));
  })();

  if (!gymToday.length) {
    if (daysSinceGym >= 2) {
      reminders.push({
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h-3a1 1 0 00-1 1v9a1 1 0 001 1h3"/><path d="M17.5 6.5h3a1 1 0 011 1v9a1 1 0 01-1 1h-3"/><rect x="6.5" y="4" width="4" height="16" rx="1"/><rect x="13.5" y="4" width="4" height="16" rx="1"/><line x1="10.5" y1="12" x2="13.5" y2="12"/></svg>',
        color: 'var(--red)',
        bg: 'var(--red-bg)',
        text: `No workout in ${daysSinceGym} days`,
        sub: 'Time to hit the gym! Consistency is key for gaining.',
        action: `<button class="reminder-nav-btn" data-view="gym">Log Workout</button>`,
      });
    } else if (hour >= 8) {
      reminders.push({
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h-3a1 1 0 00-1 1v9a1 1 0 001 1h3"/><path d="M17.5 6.5h3a1 1 0 011 1v9a1 1 0 01-1 1h-3"/><rect x="6.5" y="4" width="4" height="16" rx="1"/><rect x="13.5" y="4" width="4" height="16" rx="1"/><line x1="10.5" y1="12" x2="13.5" y2="12"/></svg>',
        color: 'var(--yellow)',
        bg: 'var(--yellow-bg)',
        text: "Haven't logged a workout today",
        sub: 'Keep your streak going!',
        action: `<button class="reminder-nav-btn" data-view="gym">Log Workout</button>`,
      });
    }
  }

  // --- Water reminder ---
  const waterEntries = state.water[today] || [];
  const waterTotal = waterEntries.reduce((s, v) => s + v, 0);
  const waterGoal = 66;
  if (waterTotal < waterGoal && hour >= 10) {
    const waterPct = Math.round((waterTotal / waterGoal) * 100);
    if (waterPct < 50 && hour >= 14) {
      reminders.push({
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.1)',
        text: `Only ${waterTotal} oz water today (${waterPct}%)`,
        sub: `Drink up! ${waterGoal - waterTotal} oz to go.`,
        action: `<button class="reminder-nav-btn" data-view="diet">Log Water</button>`,
      });
    } else if (waterPct < 80) {
      reminders.push({
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.1)',
        text: `Water: ${waterTotal} / ${waterGoal} oz`,
        sub: `${waterGoal - waterTotal} oz remaining today`,
        action: `<button class="reminder-nav-btn" data-view="diet">Log Water</button>`,
      });
    }
  }

  // --- Calorie reminder ---
  const dietToday = state.diet.filter(e => e.date === today);
  const calToday = dietToday.reduce((s, e) => s + (e.calories || 0), 0);
  const calGoal = 2900;
  if (hour >= 12 && calToday < calGoal * 0.4) {
    reminders.push({
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      color: 'var(--yellow)',
      bg: 'var(--yellow-bg)',
      text: `Only ${Math.round(calToday)} / ${calGoal} cal logged`,
      sub: `You need ${calGoal - Math.round(calToday)} more calories to hit your gain goal.`,
      action: `<button class="reminder-nav-btn" data-view="diet">Log Food</button>`,
    });
  } else if (hour >= 18 && calToday < calGoal * 0.7) {
    reminders.push({
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      color: 'var(--red)',
      bg: 'var(--red-bg)',
      text: `Behind on calories: ${Math.round(calToday)} / ${calGoal}`,
      sub: `Evening already — eat a big meal or high-cal snack!`,
      action: `<button class="reminder-nav-btn" data-view="diet">Log Food</button>`,
    });
  }

  // --- Protein reminder ---
  const proteinToday = dietToday.reduce((s, e) => s + (e.protein || 0), 0);
  if (hour >= 14 && proteinToday < 50) {
    reminders.push({
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.1)',
      text: `Low protein: ${Math.round(proteinToday)}g / 150g`,
      sub: 'Have chicken, eggs, or a protein shake!',
      action: `<button class="reminder-nav-btn" data-view="diet">Log Food</button>`,
    });
  }

  // --- Brush teeth (evening) ---
  const brushPM = localStorage.getItem('tf_brush_pm_' + today);
  if (!brushPM && hour >= 18) {
    reminders.push({
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 21h10"/><rect x="10" y="2" width="4" height="12" rx="2"/><path d="M12 14v7"/></svg>',
      color: '#22d3ee',
      bg: 'rgba(34, 211, 238, 0.1)',
      text: 'Brush your teeth (evening)',
      sub: '',
      action: `<button class="reminder-done-btn" data-habit="brush_pm">Done</button>`,
    });
  }

  // Render
  const bar = $('#remindersBar');
  if (!reminders.length) {
    bar.innerHTML = '';
    return;
  }

  bar.innerHTML = reminders.map(r => `
    <div class="reminder-card" style="border-left-color:${r.color}">
      <div class="reminder-icon" style="color:${r.color};background:${r.bg}">${r.icon}</div>
      <div class="reminder-body">
        <div class="reminder-text">${r.text}</div>
        ${r.sub ? `<div class="reminder-sub">${r.sub}</div>` : ''}
      </div>
      ${r.action}
    </div>
  `).join('');

  // Bind nav buttons
  $$('.reminder-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Bind all habit done buttons
  $$('.reminder-done-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const habit = btn.dataset.habit;
      localStorage.setItem(`tf_${habit}_` + today, '1');

      // Auto-log pushups & situps to gym when morning routine is completed
      if (habit === 'morning') {
        const alreadyPushups = state.gym.some(e => e.date === today && e.exercise === 'Push Ups' && e._fromReminder);
        if (!alreadyPushups) {
          state.gym.push({ date: today, exercise: 'Push Ups', sets: [{ reps: 10, weight: 0 }], bodyweight: true, _fromReminder: true });
          state.gym.push({ date: today, exercise: 'Sit Ups', sets: [{ reps: 10, weight: 0 }], bodyweight: true, _fromReminder: true });
          saveData(state);
        }
      }

      renderReminders(today);
    });
  });
}
