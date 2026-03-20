# LifeStack — Enhancements 001

## App Rebranding
- Renamed from TaskFlow to **LifeStack**
- New stacked-layers logo (three descending bars representing layers of life)

## Code Architecture
- Split monolithic `app.js` (1,894 lines) into **10 focused modules**:
  - `utils.js` — DOM helpers, date formatting, US holidays
  - `state.js` — Data model, localStorage persistence, global state
  - `modal.js` — Task modal, subtasks, CRUD operations
  - `dashboard.js` — Dashboard stats, My Tasks board, schedule, reminders
  - `tasks.js` — All Tasks list view with filtering/sorting
  - `board.js` — Kanban board with category folders and drag-and-drop
  - `calendar.js` — Month and week calendar views
  - `gym.js` — Gym workout logging
  - `diet.js` — Diet tracking, food database, API lookups
  - `app.js` — Main entry point, event binding, view switching

## Board View
- Collapsible category folders added to **all three columns** (To Do, In Progress, Done)
- Completed date shown on Done cards
- Project labels shown as colored pills on cards

## Gym Section (New)
- Day navigation bar with < Today > arrows
- Stats row: Exercises, Sets, Reps, Volume
- Exercise cards with clean set tables
- Exercise autocomplete with calisthenics focus (pushups, pull ups, dips, pistol squats, etc.)
- Delete exercises, navigate workout history by day
- Data persisted in localStorage

## Diet Section (New)
- Day navigation bar with < Today > arrows
- **Food database** with 200+ items including:
  - South Indian foods (dosa, idli, sambar, biryani, paneer dishes, etc.)
  - Branded cereals (Honey Bunches of Oats, Cheerios, etc.)
  - Chips (Doritos, Lays, Cheetos, Takis, banana chips, etc.)
  - Proteins, grains, vegetables, fruits, dairy, nuts, legumes, meals, snacks, beverages, condiments
- **Live search dropdown** with 600ms debounce, mouse-hover freeze (dropdown won't change while hovering)
- **API lookup** — Open Food Facts + USDA FoodData Central searched in parallel with 5s timeout
- **Custom foods** — Save your own foods with macros, appear first in search with "My Food" badge
- **Serving size** — Increments by 0.5, macros recalculate in real time when changed
- **Macro tracking** with daily goals:
  - Calories: 2,900/day
  - Protein: 150g/day
  - Carbs: 390g/day
  - Fat: 65g/day
- **Food recommendations** — Collapsible suggestions panel based on remaining macros, includes South Indian meal options
- **Water tracker** — 66 oz/day goal, quick-add buttons (+8, +12, +16, +20, +40 oz), custom entry, undo, progress bar, per-day persistence
- Meals grouped by Breakfast/Lunch/Dinner/Snack with per-meal calorie totals
- Diet history with daily macro summaries

## Projects System (New)
- Create and manage projects (name, color)
- Sidebar project list with active task counts, click to filter
- Delete projects (with confirmation, tasks become unassigned)
- Task modal shows Project dropdown when category is Work
- Board view groups by project when filtering Work tasks
- Project labels shown on board cards and task list rows

## Dashboard Reminders (New)
- **Brush teeth** — Morning (before noon) and evening (after 6pm) reminders
- **Morning routine** — Pushups & Situps reminder, resets daily
- **Gym** — Warns if no workout logged, turns red after 2+ days
- **Water** — Nudges if behind on intake, more urgent in afternoon
- **Calories** — Alerts if under 40% by noon or under 70% by evening
- **Protein** — Flags if under 50g by afternoon
- Each reminder has a "Done" or navigation button

## UI Improvements
- Removed mini calendar from dashboard
- Removed priority system entirely (badges, filters, sort options, modal field, dashboard breakdown)
- Tasks list sorts uncompleted tasks first, done tasks shown at 50% opacity
- Category and project delete buttons (hover to reveal, confirm with task count)
- View persisted in localStorage (remembers which page you were on after refresh)
- Header date made more visible (larger, brighter)
- Nav divider separating core views from Gym/Diet

## Removed
- Priority field, badges, and filters throughout the app
- Mini calendar from dashboard
- Old monolithic app.js (replaced by modular js/ directory)
