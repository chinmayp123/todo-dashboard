// ========== Firebase Sync ==========
const firebaseConfig = {
  apiKey: "AIzaSyBeoqmgxPOPxi--Jq5D4iQvHLhDZsUbKxQ",
  authDomain: "lifestack-d5300.firebaseapp.com",
  databaseURL: "https://lifestack-d5300-default-rtdb.firebaseio.com",
  projectId: "lifestack-d5300",
  storageBucket: "lifestack-d5300.firebasestorage.app",
  messagingSenderId: "126263493016",
  appId: "1:126263493016:web:e3afbc4136d45525d9abed"
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const DATA_REF = db.ref('lifestack');

// External data (written by iPhone Shortcuts / Apple Health exports) lives at
// a SEPARATE root node so the app's full-state writes to 'lifestack' can never
// clobber it. The app only ever reads it. See HEALTH-SYNC.md for the setup.
let externalData = null;

function getExternalMetric(node, dateStr) {
  const v = externalData && externalData[node] ? externalData[node][dateStr] : null;
  return v != null && Number(v) > 0 ? Number(v) : null;
}

function getExternalSteps(dateStr) { return getExternalMetric('steps', dateStr); }
// Apple Watch metrics (synced by the same Shortcut — see HEALTH-SYNC.md).
// activeEnergy is whole-day active calories, so it already includes walking.
function getExternalActiveEnergy(dateStr) { return getExternalMetric('activeEnergy', dateStr); }
function getExternalExerciseMinutes(dateStr) { return getExternalMetric('exerciseMinutes', dateStr); }
function getExternalRestingHR(dateStr) { return getExternalMetric('restingHR', dateStr); }
// Hours slept, keyed by the morning you woke up. Values over 24 are assumed
// to be minutes (Shortcut unit set to min instead of hr) and normalized.
function getExternalSleep(dateStr) {
  const v = getExternalMetric('sleep', dateStr);
  if (v === null) return null;
  const hours = v > 24 ? v / 60 : v;
  return Math.round(hours * 10) / 10;
}

function loadExternalData() {
  try {
    db.ref('external').once('value')
      .then(snap => {
        const v = snap.val();
        if (!v) return;
        externalData = v;
        if (typeof render === 'function') render();
      })
      .catch(() => {}); // steps are a bonus — never let them break the app
  } catch (e) { /* firebase unavailable — fine */ }
}

// Sync state
let firebaseReady = false;
let suppressFirebaseWrite = false; // prevent echo when receiving updates
// True once the initial cloud read has settled (success OR failure). Until then,
// saves must not advance the sync clock or push — otherwise automatic load-time
// saves (e.g. auto-banking foods) look "newer" than the cloud and trick the next
// load into overwriting good cloud data with stale local data.
let appReconciled = false;

// Update the visible sync indicator in the header.
// state: 'connecting' | 'saving' | 'synced' | 'error'
function setSyncStatus(state, message) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.classList.remove('is-synced', 'is-saving', 'is-error');
  const txt = el.querySelector('.sync-text');
  switch (state) {
    case 'saving':
      el.classList.add('is-saving');
      if (txt) txt.textContent = 'Saving…';
      el.title = 'Saving to cloud…';
      break;
    case 'synced':
      el.classList.add('is-synced');
      if (txt) txt.textContent = 'Synced';
      el.title = 'All changes saved to the cloud';
      break;
    case 'error':
      el.classList.add('is-error');
      if (txt) txt.textContent = 'Not saving';
      el.title = message || 'Cloud sync failed — your changes are only on this device. Use Backup to be safe.';
      break;
    default:
      if (txt) txt.textContent = 'Connecting…';
      el.title = 'Connecting to cloud…';
  }
}

// Save all state to Firebase
function saveToFirebase(data) {
  if (suppressFirebaseWrite) return;
  if (!firebaseReady) return;
  setSyncStatus('saving');
  DATA_REF.set({
    tasks: data.tasks || [],
    categories: data.categories || [],
    projects: data.projects || [],
    gym: data.gym || [],
    diet: data.diet || [],
    customFoods: data.customFoods || {},
    water: data.water || {},
    events: data.events || [],
    removedFoods: data.removedFoods || [],
    weight: data.weight || {},
    goals: data.goals || {},
    lastUpdated: Date.now(),
  })
    .then(() => setSyncStatus('synced'))
    .catch(err => {
      console.warn('Firebase write failed:', err);
      setSyncStatus('error', 'Cloud sync failed: ' + (err && err.message ? err.message : 'unknown error') + '. Use Backup to save a copy.');
    });
}

// Load from Firebase once on startup, then listen for changes
function initFirebaseSync(onDataReceived) {
  setSyncStatus('connecting');
  loadExternalData();
  // First load
  DATA_REF.once('value')
    .then(snapshot => {
      firebaseReady = true;
      const data = snapshot.val();
      const localTimestamp = parseInt(localStorage.getItem('tf_last_updated') || '0');
      if (data && data.lastUpdated && data.lastUpdated > localTimestamp) {
        // Cloud is genuinely newer — adopt it (this is the path that pulls back
        // data another device saved while this one was closed).
        onDataReceived(data);
        console.log('Loaded data from Firebase (newer than local)');
      } else {
        // Local is genuinely newer, or the cloud is empty — push local up once.
        // We only reach "local newer" here because load-time saves no longer
        // bump the clock, so this comparison is now trustworthy.
        console.log(data && data.lastUpdated ? 'Local data is newer, pushing to Firebase' : 'No Firebase data found, uploading local data');
        appReconciled = true; // allow the push below to advance the clock
        saveToFirebase(state);
      }
      appReconciled = true;
      setSyncStatus('synced');
    })
    .catch(err => {
      console.warn('Firebase initial load failed, using localStorage:', err);
      // Could not reach the cloud. Stay LOCAL-ONLY this session rather than risk
      // pushing a stale blob over newer cloud data when connectivity returns.
      // appReconciled=true still lets real edits advance the local clock, so they
      // are recognized as newer and preserved on the next successful load.
      firebaseReady = false;
      appReconciled = true;
      setSyncStatus('error', 'Could not reach the cloud: ' + (err && err.message ? err.message : 'unknown error') + '. Changes save on this device only — reopen when online to sync.');
    });

  // Listen for real-time changes from other devices
  DATA_REF.on('value', snapshot => {
    if (!firebaseReady) return;
    const data = snapshot.val();
    if (!data || !data.lastUpdated) return;

    const localTimestamp = parseInt(localStorage.getItem('tf_last_updated') || '0');
    // Only apply if the remote change is newer than our last save
    if (data.lastUpdated > localTimestamp + 1000) {
      suppressFirebaseWrite = true;
      onDataReceived(data);
      suppressFirebaseWrite = false;
      console.log('Received real-time update from Firebase');
    }
  });
}
