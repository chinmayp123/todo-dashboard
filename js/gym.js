// ========== Gym ==========
const BODYWEIGHT_EXERCISES = new Set([
  'Push Ups', 'Wide Push Ups', 'Diamond Push Ups', 'Decline Push Ups', 'Pike Push Ups',
  'Pull Up', 'Chin Up', 'Muscle Up', 'Dip', 'Ring Dip',
  'Sit Ups', 'Crunches', 'Leg Raises', 'Hanging Leg Raises', 'Bicycle Crunches',
  'Plank', 'Side Plank', 'Mountain Climbers', 'Burpees',
  'Pistol Squat', 'Bodyweight Squat', 'Jump Squat', 'Lunges', 'Bulgarian Split Squat',
  'Handstand Push Up', 'L-Sit', 'Dragon Flag', 'Back Lever', 'Front Lever',
  'Australian Rows', 'Inverted Rows', 'Jumping Jacks', 'Box Jumps',
  'Flutter Kicks', 'Russian Twists', 'Superman', 'Glute Bridge',
]);

const COMMON_EXERCISES = [
  ...BODYWEIGHT_EXERCISES,
  // Weights
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Lat Pulldown', 'Cable Row', 'Dumbbell Curl', 'Tricep Pushdown',
  'Leg Press', 'Calf Raise', 'Romanian Deadlift', 'Hip Thrust',
  'Lateral Raise', 'Face Pull',
];

let gymBodyweight = false; // current input mode

function isBodyweightExercise(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  for (const bw of BODYWEIGHT_EXERCISES) {
    if (bw.toLowerCase() === lower) return true;
  }
  return false;
}

function renderGym() {
  const dateInput = $('#gymDate');
  if (!dateInput) return;
  dateInput.value = gymViewDate;

  // Date label
  const todayStr = getTodayStr();
  const viewDate = new Date(gymViewDate + 'T00:00:00');
  const isToday = gymViewDate === todayStr;
  $('#gymDateLabel').textContent = isToday ? 'Today' :
    viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Populate exercise suggestions
  const allExercises = [...new Set([...COMMON_EXERCISES, ...state.gym.map(e => e.exercise)])].sort();
  $('#exerciseSuggestions').innerHTML = allExercises.map(e => `<option value="${e}">`).join('');

  // Detect bodyweight mode from exercise name
  const exerciseName = $('#gymExerciseName').value.trim();
  gymBodyweight = isBodyweightExercise(exerciseName);

  // Render set inputs
  $('#gymSetsList').innerHTML = gymSets.map((s, i) => `
    <div class="gym-set-chip" data-index="${i}">
      <span class="gym-set-chip-num">${i + 1}</span>
      <input type="number" class="gym-reps-input" value="${s.reps}" placeholder="reps" min="0" data-index="${i}">
      ${!gymBodyweight ? `
        <span class="gym-set-chip-x">&times;</span>
        <input type="number" class="gym-weight-input" value="${s.weight}" placeholder="lbs" min="0" step="2.5" data-index="${i}">
      ` : '<span class="gym-bw-label">BW</span>'}
      ${gymSets.length > 1 ? `<button type="button" class="gym-remove-set" data-index="${i}">&times;</button>` : ''}
    </div>
  `).join('');

  $$('.gym-reps-input').forEach(inp => {
    inp.addEventListener('input', () => { gymSets[inp.dataset.index].reps = inp.value; });
  });
  $$('.gym-weight-input').forEach(inp => {
    inp.addEventListener('input', () => { gymSets[inp.dataset.index].weight = inp.value; });
  });
  $$('.gym-remove-set').forEach(btn => {
    btn.addEventListener('click', () => { gymSets.splice(btn.dataset.index, 1); renderGym(); });
  });

  // Day exercises
  const dayExercises = state.gym.filter(e => e.date === gymViewDate);
  const totalSets = dayExercises.reduce((s, ex) => s + ex.sets.length, 0);
  const weightedExercises = dayExercises.filter(ex => !ex.bodyweight && !isBodyweightExercise(ex.exercise));
  const totalVolume = weightedExercises.reduce((s, ex) => s + ex.sets.reduce((v, set) => v + Number(set.reps) * Number(set.weight), 0), 0);
  const totalReps = dayExercises.reduce((s, ex) => s + ex.sets.reduce((v, set) => v + Number(set.reps), 0), 0);

  // Stats
  $('#gymStats').innerHTML = dayExercises.length ? `
    <div class="gym-stat"><span class="gym-stat-val">${dayExercises.length}</span><span class="gym-stat-lbl">Exercises</span></div>
    <div class="gym-stat"><span class="gym-stat-val">${totalSets}</span><span class="gym-stat-lbl">Sets</span></div>
    <div class="gym-stat"><span class="gym-stat-val">${totalReps.toLocaleString()}</span><span class="gym-stat-lbl">Reps</span></div>
    <div class="gym-stat"><span class="gym-stat-val">${totalVolume.toLocaleString()}</span><span class="gym-stat-lbl">Volume (lbs)</span></div>
  ` : '';

  // Exercise list
  if (!dayExercises.length) {
    $('#gymTodayList').innerHTML = '<div class="gym-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" opacity="0.4"><path d="M6.5 6.5h-3a1 1 0 00-1 1v9a1 1 0 001 1h3"/><path d="M17.5 6.5h3a1 1 0 011 1v9a1 1 0 01-1 1h-3"/><rect x="6.5" y="4" width="4" height="16" rx="1"/><rect x="13.5" y="4" width="4" height="16" rx="1"/><line x1="10.5" y1="12" x2="13.5" y2="12"/></svg><p>No exercises logged</p><p class="gym-empty-sub">Add an exercise below to start tracking</p></div>';
  } else {
    $('#gymTodayList').innerHTML = dayExercises.map((ex, idx) => {
      const isBW = ex.bodyweight || isBodyweightExercise(ex.exercise);
      const totalRepsEx = ex.sets.reduce((sum, s) => sum + Number(s.reps), 0);
      const vol = ex.sets.reduce((sum, s) => sum + (Number(s.reps) * Number(s.weight)), 0);
      return `
      <div class="gym-entry">
        <div class="gym-entry-head">
          <div class="gym-entry-left">
            <span class="gym-entry-num">${idx + 1}</span>
            <span class="gym-entry-name">${esc(ex.exercise)}</span>
            ${isBW ? '<span class="gym-bw-badge">Bodyweight</span>' : ''}
          </div>
          <div class="gym-entry-right">
            <span class="gym-entry-vol">${isBW ? totalRepsEx + ' reps' : vol.toLocaleString() + ' lbs'}</span>
            <button class="gym-entry-del" data-gym-idx="${idx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
        <table class="gym-sets-table">
          <thead><tr><th>Set</th><th>Reps</th>${!isBW ? '<th>Weight</th>' : ''}</tr></thead>
          <tbody>
            ${ex.sets.map((s, si) => `<tr><td>${si + 1}</td><td>${s.reps}</td>${!isBW ? `<td>${s.weight} lbs</td>` : ''}</tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }).join('');
  }

  // Bind delete
  $$('.gym-entry-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const dayEx = state.gym.filter(e => e.date === gymViewDate);
      const target = dayEx[btn.dataset.gymIdx];
      if (target) {
        state.gym = state.gym.filter(e => e !== target);
        saveData(state);
        renderGym();
      }
    });
  });
}

function bindGymEvents() {
  // Re-render set inputs when exercise name changes (bodyweight detection)
  $('#gymExerciseName').addEventListener('change', () => renderGym());
  $('#gymDate').addEventListener('change', (e) => { gymViewDate = e.target.value; renderGym(); });
  $('#gymPrevDay').addEventListener('click', () => {
    const d = new Date(gymViewDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    gymViewDate = toLocalDateStr(d);
    renderGym();
  });
  $('#gymNextDay').addEventListener('click', () => {
    const d = new Date(gymViewDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    gymViewDate = toLocalDateStr(d);
    renderGym();
  });
  $('#gymToday').addEventListener('click', () => {
    gymViewDate = getTodayStr();
    renderGym();
  });
  $('#gymAddSetBtn').addEventListener('click', () => { gymSets.push({ reps: '', weight: '' }); renderGym(); });
  $('#gymSaveExerciseBtn').addEventListener('click', () => {
    const name = $('#gymExerciseName').value.trim();
    if (!name) return;
    const bw = isBodyweightExercise(name);
    const validSets = gymSets
      .filter(s => s.reps && (bw || s.weight))
      .map(s => ({ reps: Number(s.reps), weight: bw ? 0 : Number(s.weight) }));
    if (!validSets.length) return;
    state.gym.push({ date: gymViewDate, exercise: name, sets: validSets, bodyweight: bw });
    saveData(state);
    $('#gymExerciseName').value = '';
    gymSets = [{ reps: '', weight: '' }];
    gymBodyweight = false;
    renderGym();
  });
}
