# LifeStack

A personal productivity dashboard that brings your tasks, workouts, nutrition, and schedule into one place. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies.

![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### Dashboard
- At-a-glance stats: total tasks, in progress, completed, overdue
- Project filter to scope the entire dashboard to a specific project
- Smart reminders: gym streaks, water intake, calorie goals, morning routine, brush teeth
- Daily schedule with drag-and-drop time slot assignment
- Upcoming deadlines with project color coding

### Task Management
- **Board View** — Kanban-style columns (To Do, In Progress, Done) with drag-and-drop
- **List View** — Filterable and sortable task table
- Tasks grouped into collapsible category folders in all columns
- Subtask checklists within each task
- Auto-archive: tasks completed 2+ weeks ago move to an archived section
- Creation date and completion date tracking

### Projects
- Create projects with custom colors
- Filter tasks, board, and dashboard by project
- Project labels displayed on task cards
- Sidebar project list with active task counts

### Calendar
- Month and week views with US holiday markers
- Custom events: double-click any day to add an event with a color picker
- Click events to edit or delete
- Task dots shown on their due dates

### Gym Tracking
- Log exercises with sets, reps, and weight
- Bodyweight exercise detection: push ups, sit ups, pull ups, etc. automatically hide the weight field
- Day-by-day navigation to browse workout history
- Daily stats: exercises, sets, total reps, volume

### Diet & Nutrition
- **200+ food database** — proteins, grains, vegetables, fruits, snacks, fast food (McDonald's, Chick-fil-A, Taco Bell, Chipotle, and more), South Indian foods, branded cereals
- Live search with debounced dropdown and API fallback (Open Food Facts + USDA)
- Save custom foods with your own macros
- Serving size adjustment with real-time macro recalculation (0.5 increments)
- Daily macro goal tracker: calories, protein, carbs, fat with progress bars
- Food recommendations based on remaining daily goals
- Meal grouping: breakfast, lunch, dinner, snack
- Water intake tracker with quick-add buttons and daily goal

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/chinmayp123/todo-dashboard.git
   ```
2. Open `index.html` in your browser.

That's it. No build step, no install, no server required.

## Data Storage

All data is stored in your browser's `localStorage`. Nothing is sent to any server. Your tasks, workouts, meals, and events stay on your device.

## Project Structure

```
index.html          — Main HTML
style.css           — All styles
js/
  state.js          — Data model and localStorage persistence
  utils.js          — DOM helpers, date formatting, US holidays
  app.js            — Entry point, navigation, event binding
  dashboard.js      — Dashboard stats, reminders, schedule
  tasks.js          — List view with filters and sorting
  board.js          — Kanban board with drag-and-drop
  calendar.js       — Month/week calendar and custom events
  modal.js          — Task create/edit modal
  gym.js            — Workout logging
  diet.js           — Food tracking, database, and API lookups
```

## Tech Stack

- Vanilla JavaScript (ES6+)
- CSS custom properties for theming
- Zero dependencies
- Runs entirely in the browser

## License

MIT
