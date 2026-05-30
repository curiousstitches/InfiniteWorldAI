// client/src/services/sessionPersist.js
// Persists the active session (world + character + phase + stats) to localStorage so a
// browser close/refresh resumes exactly where the player left off — never resets to start.

const KEY = 'iw_session_v1';

export function saveSession(snapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
  } catch {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Only resumable if we actually got into a world.
    if (!s || !s.world || (s.phase !== 'playing')) return null;
    return s;
  } catch { return null; }
}

export function hasSession() { return !!loadSession(); }

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch {}
}

// Human-friendly "last played" label for the Continue button.
export function lastPlayedLabel() {
  const s = loadSession();
  if (!s) return '';
  const name = s.world?.name || 'your world';
  const ago = Date.now() - (s.savedAt || 0);
  const mins = Math.floor(ago / 60000);
  if (mins < 1) return `${name} · just now`;
  if (mins < 60) return `${name} · ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${name} · ${hrs}h ago`;
  return `${name} · ${Math.floor(hrs / 24)}d ago`;
}
