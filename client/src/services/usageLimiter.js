// client/src/services/usageLimiter.js
// Per-browser daily request cap so the free Puter path can't be hammered.
// Stored in localStorage (per-device). Resets at local midnight.

const KEY = 'iw_usage';
const DAILY_CAP = 100;

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { date: today(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== today()) return { date: today(), count: 0 };
    return parsed;
  } catch {
    return { date: today(), count: 0 };
  }
}

function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

// Returns { allowed, remaining, cap }. Does NOT increment.
export function checkUsage() {
  const s = read();
  const remaining = Math.max(0, DAILY_CAP - s.count);
  return { allowed: remaining > 0, remaining, cap: DAILY_CAP, used: s.count };
}

// Call right before a real AI request. Increments and returns the same shape.
// If a user has their own key configured, pass hasOwnKey=true to bypass the cap.
export function consumeUsage(hasOwnKey = false) {
  if (hasOwnKey) return { allowed: true, remaining: Infinity, cap: Infinity, used: 0, bypassed: true };
  const s = read();
  if (s.count >= DAILY_CAP) {
    return { allowed: false, remaining: 0, cap: DAILY_CAP, used: s.count };
  }
  s.count += 1;
  write(s);
  return { allowed: true, remaining: DAILY_CAP - s.count, cap: DAILY_CAP, used: s.count };
}

export const DAILY_CAP_VALUE = DAILY_CAP;
