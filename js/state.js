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

function loadData() {
  const tasks = localStorage.getItem('tf_tasks');
  const categories = localStorage.getItem('tf_categories');
  const gymLog = localStorage.getItem('tf_gym');
  const dietLog = localStorage.getItem('tf_diet');
  const customFoods = localStorage.getItem('tf_custom_foods');
  const water = localStorage.getItem('tf_water');
  const projects = localStorage.getItem('tf_projects');
  return {
    tasks: tasks ? JSON.parse(tasks) : [...SAMPLE_TASKS],
    categories: categories ? JSON.parse(categories) : [...DEFAULT_CATEGORIES],
    projects: projects ? JSON.parse(projects) : [...DEFAULT_PROJECTS],
    gym: gymLog ? JSON.parse(gymLog) : [],
    diet: dietLog ? JSON.parse(dietLog) : [],
    customFoods: customFoods ? JSON.parse(customFoods) : {},
    water: water ? JSON.parse(water) : {},
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
let gymViewDate = new Date().toISOString().split('T')[0];
let dietViewDate = new Date().toISOString().split('T')[0];
let dietBaseMacros = null; // {calories, protein, carbs, fat} per 1 serving
let activeProject = null; // null = all, or a project id
