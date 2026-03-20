// ========== Tasks List View ==========
function renderTasksView() {
  let tasks = [...state.tasks];
  const search = $('#searchInput').value.toLowerCase();
  const statusF = $('#filterStatus').value;
  const categoryF = $('#filterCategory').value;
  const sortBy = $('#sortBy').value;

  if (search) tasks = tasks.filter(t => t.name.toLowerCase().includes(search) || (t.description && t.description.toLowerCase().includes(search)));
  if (statusF !== 'all') tasks = tasks.filter(t => t.status === statusF);
  if (categoryF !== 'all') tasks = tasks.filter(t => t.category === categoryF);
  if (activeProject) tasks = tasks.filter(t => t.project === activeProject);

  // Always sort uncompleted first, then by selected sort
  tasks.sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0;
    const bDone = b.status === 'done' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    switch (sortBy) {
      case 'created': return b.created.localeCompare(a.created);
      case 'dueDate': return (a.dueDate || 'z').localeCompare(b.dueDate || 'z');
      case 'name': return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const today = new Date().toISOString().split('T')[0];

  $('#tasksList').innerHTML = tasks.length ? tasks.map(t => {
    const cat = state.categories.find(c => c.id === t.category);
    const proj = t.project ? state.projects.find(p => p.id === t.project) : null;
    const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
    const subtaskInfo = t.subtasks.length ? `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : '';
    return `
      <div class="task-row ${t.status === 'done' ? 'task-row-done' : ''}" data-id="${t.id}">
        <div class="task-check ${t.status === 'done' ? 'checked' : ''}" data-id="${t.id}"></div>
        <div class="task-row-info">
          <div class="task-row-name ${t.status === 'done' ? 'completed' : ''}">${esc(t.name)}</div>
          <div class="task-row-meta">
            ${cat ? `<span class="task-row-category"><span class="category-dot" style="background:${cat.color}"></span>${cat.name}</span>` : ''}
            ${proj ? `<span class="task-row-project" style="color:${proj.color}">${proj.name}</span>` : ''}
            ${t.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">${isOverdue ? 'Overdue: ' : ''}${formatDate(t.dueDate)}</span>` : ''}
            ${subtaskInfo ? `<span>Subtasks: ${subtaskInfo}</span>` : ''}
          </div>
        </div>
        <span class="status-badge ${t.status}">${t.status.replace('-', ' ')}</span>
      </div>`;
  }).join('') : '<div class="empty-state"><p>No tasks match your filters</p></div>';

  $$('#tasksList .task-check').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); toggleTaskDone(el.dataset.id); });
  });
  $$('#tasksList .task-row').forEach(el => {
    el.addEventListener('click', () => openModal(el.dataset.id));
  });
}
