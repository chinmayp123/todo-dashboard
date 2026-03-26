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

// Save all state to Firebase
function saveToFirebase(data) {
  if (!firebaseReady || suppressFirebaseWrite) return;
  DATA_REF.set({
    tasks: data.tasks || [],
    categories: data.categories || [],
    projects: data.projects || [],
    gym: data.gym || [],
    diet: data.diet || [],
    customFoods: data.customFoods || {},
    water: data.water || {},
    events: data.events || [],
    lastUpdated: Date.now(),
  }).catch(err => console.warn('Firebase write failed:', err));
}

// Load from Firebase once on startup, then listen for changes
function initFirebaseSync(onDataReceived) {
  // First load
  DATA_REF.once('value')
    .then(snapshot => {
      firebaseReady = true;
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
