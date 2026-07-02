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
let gymEditingIdx = null; // index into day's exercises when editing

function isBodyweightExercise(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  for (const bw of BODYWEIGHT_EXERCISES) {
    if (bw.toLowerCase() === lower) return true;
  }
  return false;
}

function renderWeight() {
  const currentEl = $('#weightCurrent');
  if (!currentEl) return;
  const WEIGHT_GOAL = (typeof getGoals === 'function' && getGoals().weight) || 150;
  const log = state.weight || {};
  const entries = Object.entries(log).sort((a, b) => a[0].localeCompare(b[0]));
  const input = $('#weightInput');
  const viewedVal = log[gymViewDate];
  input.placeholder = viewedVal ? `${viewedVal} lbs` : 'lbs';

  if (!entries.length) {
    currentEl.innerHTML = '<span class="weight-empty">Log your first weigh-in</span>';
    $('#weightSpark').innerHTML = '';
    $('#weightGoalChip').textContent = `Goal: ${WEIGHT_GOAL} lbs`;
    return;
  }

  const [latestDate, latest] = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2][1] : null;
  const delta = prev !== null ? Math.round((latest - prev) * 10) / 10 : null;
  // Direction-aware: moving toward the goal is good (green), away is red
  const losing = latest > WEIGHT_GOAL;
  const deltaGood = delta !== null && (losing ? delta <= 0 : delta >= 0);
  const toGo = Math.round(Math.abs(latest - WEIGHT_GOAL) * 10) / 10;

  currentEl.innerHTML = `
    <span class="weight-num">${latest}<small> lbs</small></span>
    ${delta !== null ? `<span class="weight-delta ${deltaGood ? 'good' : 'bad'}">${delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} ${Math.abs(delta)}</span>` : ''}
    <span class="weight-date">${formatDate(latestDate)}</span>
  `;
  $('#weightGoalChip').textContent = toGo === 0
    ? `At goal: ${WEIGHT_GOAL} lbs`
    : `${toGo} lbs to ${losing ? 'lose' : 'gain'} → ${WEIGHT_GOAL}`;

  // Sparkline of the last 12 weigh-ins
  const pts = entries.slice(-12).map(([, w]) => w);
  if (pts.length < 2) {
    $('#weightSpark').innerHTML = '';
    return;
  }
  const min = Math.min(...pts), max = Math.max(...pts);
  const range = max - min || 1;
  const W = 140, H = 40, PAD = 4;
  const coords = pts.map((w, i) => {
    const x = PAD + (i / (pts.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((w - min) / range) * (H - PAD * 2);
    return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
  });
  const last = coords[coords.length - 1].split(',');
  $('#weightSpark').innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <polyline points="${coords.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" pathLength="100" class="weight-spark-line"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="var(--accent-hover)"/>
    </svg>`;
}

function renderGym() {
  const dateInput = $('#gymDate');
  if (!dateInput) return;
  dateInput.value = gymViewDate;

  renderWeight();

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
            <button class="gym-entry-edit" data-gym-idx="${idx}" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="gym-entry-del" data-gym-idx="${idx}" title="Delete">
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

  // Bind edit
  $$('.gym-entry-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const dayEx = state.gym.filter(e => e.date === gymViewDate);
      const ex = dayEx[btn.dataset.gymIdx];
      if (!ex) return;
      gymEditingIdx = parseInt(btn.dataset.gymIdx);
      $('#gymExerciseName').value = ex.exercise;
      gymSets = ex.sets.map(s => ({ reps: String(s.reps), weight: String(s.weight) }));
      // Update button text
      $('#gymSaveExerciseBtn').innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>
        Update Exercise`;
      renderGym();
      $('#gymExerciseName').focus();
    });
  });

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
  $('#weightLogBtn').addEventListener('click', () => {
    const v = Number($('#weightInput').value);
    if (!v || v < 50 || v > 500) { showToast('Enter your weight in lbs'); return; }
    state.weight = state.weight || {};
    state.weight[gymViewDate] = Math.round(v * 10) / 10;
    saveData(state);
    $('#weightInput').value = '';
    renderGym();
    showToast(`Weight logged: ${v} lbs`);
  });
  $('#weightInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#weightLogBtn').click();
  });
  $('#gymSaveExerciseBtn').addEventListener('click', () => {
    const name = $('#gymExerciseName').value.trim();
    if (!name) return;
    const bw = isBodyweightExercise(name);
    const validSets = gymSets
      .filter(s => s.reps && (bw || s.weight))
      .map(s => ({ reps: Number(s.reps), weight: bw ? 0 : Number(s.weight) }));
    if (!validSets.length) return;

    if (gymEditingIdx !== null) {
      // Update existing exercise
      const dayEx = state.gym.filter(e => e.date === gymViewDate);
      const target = dayEx[gymEditingIdx];
      if (target) {
        target.exercise = name;
        target.sets = validSets;
        target.bodyweight = bw;
      }
      gymEditingIdx = null;
      $('#gymSaveExerciseBtn').innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Exercise`;
    } else {
      state.gym.push({ date: gymViewDate, exercise: name, sets: validSets, bodyweight: bw });
    }

    saveData(state);
    $('#gymExerciseName').value = '';
    gymSets = [{ reps: '', weight: '' }];
    gymBodyweight = false;
    renderGym();
  });
}
