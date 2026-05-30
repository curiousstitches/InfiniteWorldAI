// client/src/services/companionMemory.js
// AIRI-inspired in-browser long-term memory. Persists facts the player shares + rolling
// conversation summaries to localStorage, keyed per world, so the companion remembers
// you across sessions and builds a relationship over time. No server, no cost.

const KEY = 'iw_companion_memory_v1';
const MAX_FACTS = 40;
const MAX_SUMMARY = 1200;

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeAll(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

function bucket(worldId) {
  const all = readAll();
  return all[worldId] || { facts: [], summary: '', turns: 0, firstMet: Date.now() };
}
function saveBucket(worldId, b) {
  const all = readAll();
  all[worldId] = b;
  writeAll(all);
}

// Heuristic fact extraction from the player's message — names, likes, simple "I am/like/have".
const FACT_PATTERNS = [
  /\bmy name is ([\w' -]{2,30})/i,
  /\bi am (?:a |an )?([\w' -]{2,40})/i,
  /\bi like ([\w' -]{2,40})/i,
  /\bi love ([\w' -]{2,40})/i,
  /\bi hate ([\w' -]{2,40})/i,
  /\bi have (?:a |an )?([\w' -]{2,40})/i,
  /\bi'm (?:a |an )?([\w' -]{2,40})/i,
  /\bremember (?:that )?([\w' -]{3,60})/i,
];

export function recordPlayerMessage(worldId, text) {
  if (!worldId || !text) return;
  const b = bucket(worldId);
  b.turns += 1;
  for (const re of FACT_PATTERNS) {
    const m = text.match(re);
    if (m && m[1]) {
      const fact = m[0].trim().replace(/\s+/g, ' ').slice(0, 80);
      if (!b.facts.some(f => f.toLowerCase() === fact.toLowerCase())) {
        b.facts.push(fact);
        if (b.facts.length > MAX_FACTS) b.facts.shift();
      }
    }
  }
  saveBucket(worldId, b);
}

// Fold the latest exchange into a rolling summary (kept short, oldest-trimmed).
export function updateSummary(worldId, playerText, companionText) {
  if (!worldId) return;
  const b = bucket(worldId);
  const line = `You said "${(playerText || '').slice(0, 60)}"; I replied "${(companionText || '').slice(0, 60)}".`;
  b.summary = (b.summary + ' ' + line).trim().slice(-MAX_SUMMARY);
  saveBucket(worldId, b);
}

// Build a memory preamble to inject into the companion's system prompt.
export function memoryPreamble(worldId) {
  const b = bucket(worldId);
  if (!b.facts.length && !b.summary) return '';
  const daysKnown = Math.max(0, Math.floor((Date.now() - b.firstMet) / 86400000));
  const parts = [`— What you remember about your companion (the player) —`];
  if (daysKnown > 0) parts.push(`You've known each other for ${daysKnown} day(s), across ${b.turns} conversations.`);
  if (b.facts.length) parts.push(`Things you know about them: ${b.facts.join('; ')}.`);
  if (b.summary) parts.push(`Recently: ${b.summary}`);
  parts.push(`Reference these naturally when relevant — don't recite them like a list.`);
  return '\n\n' + parts.join('\n');
}

export function clearMemory(worldId) {
  if (worldId) { const all = readAll(); delete all[worldId]; writeAll(all); }
  else writeAll({});
}
