# LifeStack — Enhancements 002

## Completed This Session

### Bodyweight Exercise Support (Gym)
- Auto-detects bodyweight exercises (push ups, sit ups, crunches, burpees, pull ups, etc.)
- Hides weight input and shows "BW" label when bodyweight exercise is selected
- Saves sets with just reps (no weight required)
- Displays "Bodyweight" badge and total reps instead of volume in the log
- Added more bodyweight exercises: jumping jacks, box jumps, flutter kicks, russian twists, superman, glute bridge

### Dashboard Project Filter
- Pill-style tab bar at top of dashboard: "All Projects" + each project
- Selecting a project filters stats, My Tasks board, and Upcoming Deadlines
- Project color dot shown on each tab

### Calendar Custom Events
- Double-click any day (month or week view) to add a custom event
- Event modal with: name, date, time (optional), description, color picker (10 colors)
- Click an existing event to edit or delete it
- Events displayed with colored left border on calendar days
- Events persist in localStorage

### Morning Routine → Gym Auto-Log
- Clicking "Done" on the "Morning routine: Pushups & Situps" reminder now auto-logs 10 reps of Push Ups and 10 reps of Sit Ups to the gym for today

### Expanded Food Database
- Added 35+ snack foods: Cheez-Its, Oreos, Chips Ahoy, Goldfish, Uncrustables, Pop-Tarts, all nuts (almonds, cashews, walnuts, pecans, pistachios, peanuts, macadamia), beef jerky, string cheese, fruit snacks, Hot Cheetos, etc.
- Added 60+ fast food items from: McDonald's, Chick-fil-A, Wendy's, Taco Bell, Subway, Chipotle, Popeyes, Five Guys, Panda Express, Domino's, Pizza Hut, KFC

### Diet Serving Multiplier Fix
- Fixed double-multiplication bug: macros in input fields already include servings, so display/totals no longer multiply again
- Fixed same bug in dashboard calorie and protein reminders

---

## TODO — Next Session

### 1. Firebase Cloud Sync (Priority)
- Set up GitHub Pages deployment so app is accessible via URL on any device
- Integrate Firebase Realtime Database for cross-device data sync
- User is the sole user — needs seamless sync across: Windows PC, MacBook, iPhone
- Firebase free tier (Spark plan) is sufficient: 1GB storage, 10GB/month transfer
- Steps:
  1. User creates a free Firebase project at firebase.google.com
  2. Add Firebase SDK to the app (client-side only, no backend needed)
  3. Replace localStorage reads/writes with Firebase Realtime Database
  4. Keep localStorage as offline fallback/cache
  5. Enable GitHub Pages in repo settings
  6. Test across devices

### 2. Vegetables in Food Database
- User reported not finding vegetables like beetroot
- Expand vegetable section: beetroot, kale, Brussels sprouts, artichoke, turnip, parsnip, radish, bok choy, collard greens, Swiss chard, endive, watercress, jicama, kohlrabi, etc.

### 3. Mobile Responsiveness
- Test and optimize layout for iPhone screen sizes
- Gym and Diet sections should be fully usable on mobile
- Touch-friendly buttons and inputs

### 4. Any Additional User Requests
- Continue iterating based on feedback
