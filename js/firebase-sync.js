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

// Sync state
let firebaseReady = false;
let suppressFirebaseWrite = false; // prevent echo when receiving updates

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
  // First load
  DATA_REF.once('value')
    .then(snapshot => {
      firebaseReady = true;
      setSyncStatus('synced');
      const data = snapshot.val();
      if (data && data.lastUpdated) {
        const localTimestamp = parseInt(localStorage.getItem('tf_last_updated') || '0');
        if (data.lastUpdated > localTimestamp) {
          // Firebase is newer — use it
          onDataReceived(data);
          console.log('Loaded data from Firebase (newer than local)');
        } else {
          // Local is newer — push to Firebase
          console.log('Local data is newer, pushing to Firebase');
        }
      } else {
        // No Firebase data yet — push local data up
        console.log('No Firebase data found, uploading local data');
      }
    })
    .catch(err => {
      console.warn('Firebase initial load failed, using localStorage:', err);
      firebaseReady = true; // still allow writes
      setSyncStatus('error', 'Could not reach the cloud: ' + (err && err.message ? err.message : 'unknown error') + '. Changes save on this device only — use Backup.');
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
