// client/src/services/authClient.js
// Talks to the server auth API. Stores the session token in localStorage so the player
// stays logged in. Provides slot save/load so a companion follows them across devices.

const API = '/api/auth';
const TOKEN_KEY = 'iw_auth_token';
const EMAIL_KEY = 'iw_auth_email';

export function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function getEmail() { try { return localStorage.getItem(EMAIL_KEY); } catch { return null; } }
export function isLoggedIn() { return !!getToken(); }

function saveSession(token, email) {
  try { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(EMAIL_KEY, email); } catch {}
}
export function logout() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EMAIL_KEY); } catch {}
}

async function post(path, body, auth = false) {
  const headers = { 'content-type': 'application/json' };
  if (auth) { const t = getToken(); if (t) headers.authorization = `Bearer ${t}`; }
  const res = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `http-${res.status}`);
  return data;
}

export async function signup(email, password) {
  const d = await post('/signup', { email, password });
  saveSession(d.token, d.email);
  return d;
}
export async function login(email, password) {
  const d = await post('/login', { email, password });
  saveSession(d.token, d.email);
  return d;
}

// ── Slots ──
async function authFetch(path, opts = {}) {
  const t = getToken();
  const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
  if (t) headers.authorization = `Bearer ${t}`;
  const res = await fetch(API + path, { ...opts, headers });
  if (!res.ok) throw new Error(`http-${res.status}`);
  return res.json();
}
export function listSlots() { return authFetch('/slots').then(d => d.slots); }
export function loadSlot(i) { return authFetch(`/slots/${i}`).then(d => d.slot); }
export function saveSlot(i, label, data) {
  return authFetch(`/slots/${i}`, { method: 'PUT', body: JSON.stringify({ label, data }) });
}
export function deleteSlot(i) { return authFetch(`/slots/${i}`, { method: 'DELETE' }); }
