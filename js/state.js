// ========== Data Layer ==========
const DEFAULT_PROJECTS = [
  { id: 'proj-1', name: 'Dashboard Redesign', color: '#3b82f6' },
  { id: 'proj-2', name: 'API Migration', color: '#8b5cf6' },
];

const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#6366f1' },
  { id: 'personal', name: 'Personal', color: '#22c55e' },
  { id: 'health', name: 'Health', color: '#ef4444' },
  { id: 'learning', name: 'Learning', color: '#eab308' },
];

const SAMPLE_TASKS = [
  { id: '1', name: 'Design dashboard wireframes', description: 'Create mockups for the new analytics dashboard', priority: 'high', status: 'in-progress', category: 'work', project: 'proj-1', dueDate: getTodayOffset(2), created: getTodayOffset(-3), subtasks: [{ text: 'Research competitors', done: true }, { text: 'Sketch layouts', done: false }] },
  { id: '2', name: 'Weekly grocery shopping', description: '', priority: 'medium', status: 'todo', category: 'personal', dueDate: getTodayOffset(1), created: getTodayOffset(-1), subtasks: [] },
  { id: '3', name: 'Morning jog routine', description: '30 minutes around the park', priority: 'low', status: 'done', category: 'health', dueDate: getTodayOffset(0), created: getTodayOffset(-5), completedAt: getTodayOffset(-1), scheduledHour: 7, duration: 0.5, subtasks: [] },
  { id: '4', name: 'Complete React tutorial', description: 'Finish chapters 8-12', priority: 'medium', status: 'in-progress', category: 'learning', dueDate: getTodayOffset(5), created: getTodayOffset(-7), subtasks: [{ text: 'Chapter 8 - Hooks', done: true }, { text: 'Chapter 9 - Context', done: true }, { text: 'Chapter 10 - Reducers', done: false }, { text: 'Chapter 11 - Testing', done: false }] },
  { id: '5', name: 'Fix API authentication bug', description: 'Token refresh failing after 24h', priority: 'high', status: 'todo', category: 'work', project: 'proj-2', dueDate: getTodayOffset(-1), created: getTodayOffset(-2), subtasks: [] },
  { id: '6', name: 'Schedule dentist appointment', description: '', priority: 'low', status: 'todo', category: 'health', dueDate: getTodayOffset(7), created: getTodayOffset(-4), subtasks: [] },
  { id: '7', name: 'Prepare presentation slides', description: 'Quarterly review meeting', priority: 'high', status: 'todo', category: 'work', project: 'proj-1', dueDate: getTodayOffset(3), created: getTodayOffset(-1), subtasks: [{ text: 'Gather metrics', done: false }, { text: 'Create slides', done: false }, { text: 'Practice delivery', done: false }] },
  { id: '8', name: 'Read "Atomic Habits"', description: 'Finish remaining 100 pages', priority: 'low', status: 'in-progress', category: 'learning', dueDate: getTodayOffset(10), created: getTodayOffset(-14), subtasks: [] },
];

// Parse one localStorage key defensively. A single corrupt/truncated value
// (partial write, quota failure, aborted sync) must never crash the whole app
// and make it look like all data is gone — fall back to the default instead.
function safeParse(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Corrupt localStorage key "${key}" — keeping a copy and using the default.`, e);
    // Preserve the bad blob so it can be recovered/inspected instead of being
    // silently overwritten by the next save.
    try { localStorage.setItem(key + '_corrupt_backup', raw); } catch (_) {}
    return fallback;
  }
}

function loadData() {
  return {
    tasks: safeParse('tf_tasks', [...SAMPLE_TASKS]),
    categories: safeParse('tf_categories', [...DEFAULT_CATEGORIES]),
    projects: safeParse('tf_projects', [...DEFAULT_PROJECTS]),
    gym: safeParse('tf_gym', []),
    diet: safeParse('tf_diet', []),
    customFoods: safeParse('tf_custom_foods', {}),
    water: safeParse('tf_water', {}),
    events: safeParse('tf_events', []),
    removedFoods: safeParse('tf_removed_foods', []),
    weight: safeParse('tf_weight', {}),
    goals: safeParse('tf_goals', {}),
  };
}

function saveData(data) {
  localStorage.setItem('tf_tasks', JSON.stringify(data.tasks));
  localStorage.setItem('tf_categories', JSON.stringify(data.categories));
  localStorage.setItem('tf_gym', JSON.stringify(data.gym));
  localStorage.setItem('tf_diet', JSON.stringify(data.diet));
  localStorage.setItem('tf_custom_foods', JSON.stringify(data.customFoods));
  localStorage.setItem('tf_water', JSON.stringify(data.water));
  localStorage.setItem('tf_projects', JSON.stringify(data.projects));
  localStorage.setItem('tf_events', JSON.stringify(data.events));
  localStorage.setItem('tf_removed_foods', JSON.stringify(data.removedFoods || []));
  localStorage.setItem('tf_weight', JSON.stringify(data.weight || {}));
  localStorage.setItem('tf_goals', JSON.stringify(data.goals || {}));

  // Only advance the sync clock and push to the cloud once the initial cloud
  // reconciliation has settled. Saves that fire during initial load (e.g.
  // auto-banking foods in renderDiet) must NOT look newer than the cloud, or the
  // next load would overwrite good cloud data with stale local data. If the sync
  // layer failed to load at all, fall back to the previous behavior.
  const reconciled = (typeof appReconciled === 'undefined') ? true : appReconciled;
  if (!reconciled) return;
  localStorage.setItem('tf_last_updated', Date.now().toString());
  if (typeof saveToFirebase === 'function') saveToFirebase(data);
}

function applyFirebaseData(data) {
  state.tasks = data.tasks || [];
  state.categories = data.categories || [];
  state.projects = data.projects || [];
  state.gym = data.gym || [];
  state.diet = data.diet || [];
  state.customFoods = data.customFoods || {};
  state.water = data.water || {};
  state.events = data.events || [];
  state.removedFoods = data.removedFoods || [];
  state.weight = data.weight || {};
  state.goals = data.goals || {};
  // Cache locally
  localStorage.setItem('tf_tasks', JSON.stringify(state.tasks));
  localStorage.setItem('tf_categories', JSON.stringify(state.categories));
  localStorage.setItem('tf_gym', JSON.stringify(state.gym));
  localStorage.setItem('tf_diet', JSON.stringify(state.diet));
  localStorage.setItem('tf_custom_foods', JSON.stringify(state.customFoods));
  localStorage.setItem('tf_water', JSON.stringify(state.water));
  localStorage.setItem('tf_projects', JSON.stringify(state.projects));
  localStorage.setItem('tf_events', JSON.stringify(state.events));
  localStorage.setItem('tf_removed_foods', JSON.stringify(state.removedFoods));
  localStorage.setItem('tf_weight', JSON.stringify(state.weight));
  localStorage.setItem('tf_goals', JSON.stringify(state.goals));
  localStorage.setItem('tf_last_updated', (data.lastUpdated || Date.now()).toString());
  // Re-render the app after a tick to let DOM settle
  if (typeof render === 'function') {
    setTimeout(() => {
      try { populateCategoryDropdowns(); } catch(e) {}
      render();
    }, 50);
  }
}

// ========== State ==========
let state = loadData();
let currentView = localStorage.getItem('tf_view') || 'dashboard';
let calendarDate = new Date();
let miniCalDate = new Date();
let editingSubtasks = [];
let activeTaskTab = null;
let activeBoardFilter = null;
let boardFoldersCollapsed = {};
let scheduleDate = new Date();
let calViewMode = 'month';
let gymSets = [{ reps: '', weight: '' }];
let gymViewDate = getTodayStr();
let dietViewDate = getTodayStr();
let dietBaseMacros = null; // {calories, protein, carbs, fat} per 1 serving
let activeProject = null; // null = all, or a project id
