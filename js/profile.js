// ========== Profiles ==========
// Daylign began as a single-person app: everything lived at the `lifestack`
// node with no notion of who owned it, and every save was a full-blob
// DATA_REF.set(). The moment a second person opened the app they would adopt
// the first person's data and then overwrite it. Profiles fix that by giving
// each person their own node at `users/<id>`, chosen once per device.
//
// This is separation, not security. The database still has no auth rules, so
// anyone with the URL can reach any node. It stops accidental clobbering
// between people who trust each other; it is not a permission system.

const PROFILE_KEY = 'daylign_profile';

// The original user. `legacy: true` means two things: their app data is
// migrated out of the old `lifestack` node, and their Apple Health metrics
// stay at the un-namespaced `external/*` paths their iPhone Shortcut already
// posts to. Everyone else is namespaced from the start.
const OWNER_PROFILE = { id: 'chinmay', name: 'Chinmay', legacy: true };

let activeProfile = null;

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && p.id) return p;
  } catch (e) {
    console.warn('Corrupt profile in localStorage — asking again.', e);
  }
  return null;
}

function currentProfile() { return activeProfile; }

function profileDataPath() {
  return 'users/' + (activeProfile ? activeProfile.id : 'unknown');
}

// Chinmay's Shortcut has posted to external/steps/<date> since before profiles
// existed. Keep that path working rather than making him re-edit five Shortcut
// URLs; everyone else lives under external/u/<id>, where a profile id can
// never collide with a metric name.
function profileExternalPath() {
  if (activeProfile && activeProfile.legacy) return 'external';
  return 'external/u/' + (activeProfile ? activeProfile.id : 'unknown');
}

// Firebase keys cannot contain . $ # [ ] / — the slug avoids all of them.
function slugifyProfileName(name) {
  return String(name).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function saveProfile(profile) {
  activeProfile = profile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  // Registry of who exists, so a future "compare our week" view can find both
  // of us. Never read for auth — it is a convenience list, nothing more.
  try { db.ref('profiles/' + profile.id).set(profile.name); } catch (e) { /* offline is fine */ }
}

// Gate startup on a profile being chosen. Firebase sync is not started until
// this resolves, and saveToFirebase() is a no-op while firebaseReady is false,
// so nothing can reach the cloud before we know whose data it is.
function requireProfile(onReady) {
  const saved = loadProfile();
  if (saved) {
    activeProfile = saved;
    onReady(saved);
    return;
  }
  showProfileGate(onReady);
}

function showProfileGate(onReady) {
  const gate = document.getElementById('profileGate');
  if (!gate) { // markup missing — fall back to the owner rather than stranding the app
    activeProfile = OWNER_PROFILE;
    onReady(OWNER_PROFILE);
    return;
  }
  gate.hidden = false;
  document.body.classList.add('profile-gated');

  const err = document.getElementById('profileGateError');
  const nameInput = document.getElementById('profileNewName');

  function choose(profile) {
    saveProfile(profile);
    gate.hidden = true;
    document.body.classList.remove('profile-gated');
    updateProfileSettingsCard();
    onReady(profile);
  }

  const ownerBtn = document.getElementById('profileOwnerBtn');
  if (ownerBtn) {
    ownerBtn.textContent = OWNER_PROFILE.name;
    ownerBtn.addEventListener('click', () => choose(OWNER_PROFILE));
  }

  const createBtn = document.getElementById('profileCreateBtn');
  function createFromInput() {
    const name = nameInput ? nameInput.value.trim() : '';
    const id = slugifyProfileName(name);
    if (!name || !id) {
      if (err) { err.textContent = 'Enter a name with at least one letter or number.'; err.hidden = false; }
      return;
    }
    if (id === OWNER_PROFILE.id) {
      if (err) { err.textContent = 'That name is taken — use the button above instead.'; err.hidden = false; }
      return;
    }
    choose({ id: id, name: name, legacy: false });
  }
  if (createBtn) createBtn.addEventListener('click', createFromInput);
  if (nameInput) {
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') createFromInput(); });
  }
}

// Reflect the active profile in Settings.
function updateProfileSettingsCard() {
  const el = document.getElementById('profileCurrentName');
  if (el) el.textContent = activeProfile ? activeProfile.name : '—';
}

// Switching wipes this device's cached tf_* data first. Without that, the
// previous person's tasks and meals are still in localStorage when the next
// person's node loads, and the newer-timestamp reconciliation could push one
// person's data into the other's node.
function switchProfile() {
  const who = activeProfile ? activeProfile.name : 'this profile';
  const ok = confirm(
    `Switch away from ${who}?\n\n` +
    `This device's local copy will be cleared and reloaded from the cloud for whoever you pick next. ` +
    `${who}'s data stays safe in the cloud.\n\n` +
    `Download a backup first if you are unsure.`
  );
  if (!ok) return;
  Object.keys(localStorage)
    // The Anthropic API key belongs to the device, not the person — each
    // device pays for its own photo/voice calls. Keep it so it does not have
    // to be pasted in again.
    .filter(k => k.indexOf('tf_') === 0 && k !== 'tf_anthropic_key')
    .forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(PROFILE_KEY);
  location.reload();
}
