// client/src/services/providerGate.js
// Manages the first-run provider-choice gate: persisting the player's AI choice,
// their own API key (browser-only, never sent to our server), the "don't remind me"
// preference, and the every-15th-visit safety reminder.

const KEY = 'iw_provider_gate';
const REMIND_EVERY = 15;

const DEFAULTS = {
  chosen: false,            // has the player completed the gate at least once?
  providerId: null,         // selected provider id from the registry
  transport: null,          // 'puter' | 'server' | 'byok'
  ownKey: '',               // player's own API key (browser-only)
  ownKeyProvider: null,     // which provider the own-key is for (e.g. 'groq')
  dontRemind: false,        // suppress the warning screen on future visits
  visitCount: 0,            // increments each load once chosen
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function getGateState() { return read(); }

export function saveChoice({ providerId, transport, ownKey, ownKeyProvider, dontRemind }) {
  const s = read();
  write({
    ...s,
    chosen: true,
    providerId: providerId ?? s.providerId,
    transport: transport ?? s.transport,
    ownKey: ownKey ?? s.ownKey,
    ownKeyProvider: ownKeyProvider ?? s.ownKeyProvider,
    dontRemind: dontRemind ?? s.dontRemind,
  });
}

// Call once on app load. Returns whether to SHOW the gate this visit.
// Logic: show if never chosen. If chosen + dontRemind, only show every 15th visit.
export function shouldShowGate() {
  const s = read();
  if (!s.chosen) return true;
  const nextCount = s.visitCount + 1;
  write({ ...s, visitCount: nextCount });
  if (!s.dontRemind) return true;                  // reminders on → show each visit
  return nextCount % REMIND_EVERY === 0;           // reminders off → every 15th visit
}

// The player's own key, for the provider router to use (bypasses the daily cap).
export function getOwnKey() {
  const s = read();
  return s.ownKey ? { key: s.ownKey, provider: s.ownKeyProvider } : null;
}

export function resetGate() { write({ ...DEFAULTS }); }

export const REMIND_INTERVAL = REMIND_EVERY;
