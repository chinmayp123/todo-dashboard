// ========== Calendar View ==========
function renderCalendar() {
  if (calViewMode === 'month') {
    $('#calMonthView').style.display = '';
    $('#calWeekView').style.display = 'none';
    renderCalendarMonth();
  } else {
    $('#calMonthView').style.display = 'none';
    $('#calWeekView').style.display = '';
    renderCalendarWeek();
  }
}

function renderCalendarMonth() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  $('#calMonth').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  let html = '';

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><span class="cal-day-number">${daysInPrev - i}</span></div>`;
  }

  const holidays = getUSHolidays(year);

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

  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-day other-month"><span class="cal-day-number">${i}</span></div>`;
  }

  $('#calendarDays').innerHTML = html;

  $$('.cal-task-dot').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}

function renderCalendarWeek() {
  const d = new Date(calendarDate);
  const dayOfWeek = d.getDay();
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - dayOfWeek);

  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const startMonth = monthNames[weekStart.getMonth()];
  const endMonth = monthNames[weekEnd.getMonth()];
  if (startMonth === endMonth) {
    $('#calMonth').textContent = `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  } else {
    $('#calMonth').textContent = `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }

  const holidays = [
    ...getUSHolidays(weekStart.getFullYear()),
    ...(weekStart.getFullYear() !== weekEnd.getFullYear() ? getUSHolidays(weekEnd.getFullYear()) : [])
  ];

  let html = '';
  for (let i = 0; i < 7; i++) {
    const colDate = new Date(weekStart);
    colDate.setDate(weekStart.getDate() + i);
    const dateStr = colDate.toISOString().split('T')[0];
    const isToday = dateStr === today;
    const holiday = holidays.find(h => h.date === dateStr);
    const dayTasks = state.tasks.filter(t => t.dueDate === dateStr);

    const scheduled = dayTasks.filter(t => t.scheduledHour != null).sort((a, b) => a.scheduledHour - b.scheduledHour);
    const unscheduled = dayTasks.filter(t => t.scheduledHour == null);

    html += `
      <div class="week-col${isToday ? ' today' : ''}">
        <div class="week-col-header">
          <span class="week-col-day">${dayNames[i]}</span>
          <span class="week-col-num${isToday ? ' today' : ''}">${colDate.getDate()}</span>
        </div>
        ${holiday ? `<div class="cal-holiday">${esc(holiday.name)}</div>` : ''}
        <div class="week-col-tasks">
          ${scheduled.map(t => {
            const cat = state.categories.find(c => c.id === t.category);
            const hour12 = t.scheduledHour > 12 ? t.scheduledHour - 12 : t.scheduledHour;
            const ampm = t.scheduledHour >= 12 ? 'PM' : 'AM';
            return `
              <div class="week-task" data-id="${t.id}">
                <span class="week-task-time">${hour12}${ampm}</span>
                <div class="week-task-info">
                  <div class="week-task-name priority-border-${t.priority}">${esc(t.name)}</div>
                  ${cat ? `<span class="week-task-cat" style="color:${cat.color}"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : ''}
                </div>
              </div>`;
          }).join('')}
          ${unscheduled.map(t => {
            const cat = state.categories.find(c => c.id === t.category);
            return `
              <div class="week-task" data-id="${t.id}">
                <div class="week-task-info">
                  <div class="week-task-name priority-border-${t.priority}">${esc(t.name)}</div>
                  ${cat ? `<span class="week-task-cat" style="color:${cat.color}"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : ''}
                </div>
              </div>`;
          }).join('')}
          ${!dayTasks.length ? '<div class="week-empty">No tasks</div>' : ''}
        </div>
      </div>`;
  }

  $('#weekGrid').innerHTML = html;

  $$('.week-task').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}
