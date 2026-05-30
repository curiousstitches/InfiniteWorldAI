// client/src/store/lifeSimStore.js
// The life-sim layer: companion needs (hunger/energy/happiness), relationship
// (affection/trust/bond), and player resources. Care actions + mini-games adjust these.
// Stats decay slowly over real time so the companion feels alive and needs attention.

import { create } from 'zustand';

const SAVE_KEY = 'iw_lifesim_v1';

const DEFAULTS = {
  // Needs (0-100). Decay over time; care actions raise them.
  hunger: 70,      // higher = more fed
  energy: 80,
  happiness: 65,
  // Relationship (0-100). Grow through positive interaction + winning mini-games.
  affection: 30,
  trust: 25,
  bond: 1,         // bond LEVEL (1+), levels up as affection+trust accumulate
  bondXp: 0,       // progress toward next bond level
  // Resources the player gathers and spends on care.
  berries: 3,
  crystals: 0,
  toys: 1,
  lastDecayAt: Date.now(),
};

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}
function persist(state) {
  const { _hydrated, ...data } = state;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// Bond level-up curve: each level needs level*100 XP.
function applyBondXp(s, gain) {
  let { bond, bondXp } = s;
  bondXp += gain;
  let need = bond * 100;
  while (bondXp >= need) { bondXp -= need; bond += 1; need = bond * 100; }
  return { bond, bondXp };
}

export const useLifeSim = create((set, get) => ({
  ...load(),
  _hydrated: true,

  // Apply decay based on elapsed real time (call on load + periodically).
  tickDecay: () => set((s) => {
    const now = Date.now();
    const mins = (now - (s.lastDecayAt || now)) / 60000;
    if (mins < 0.5) return {};
    const d = mins * 0.6; // ~0.6 points/min per need
    const next = {
      hunger: clamp(s.hunger - d),
      energy: clamp(s.energy - d * 0.7),
      happiness: clamp(s.happiness - d * 0.5),
      lastDecayAt: now,
    };
    persist({ ...s, ...next });
    return next;
  }),

  // ── Care actions ──
  feed: () => set((s) => {
    if (s.berries <= 0) return {};
    const next = { berries: s.berries - 1, hunger: clamp(s.hunger + 25),
      happiness: clamp(s.happiness + 5), affection: clamp(s.affection + 2) };
    const bond = applyBondXp(s, 4);
    const merged = { ...s, ...next, ...bond }; persist(merged); return { ...next, ...bond };
  }),
  play: () => set((s) => {
    if (s.energy < 10) return {};
    const next = { happiness: clamp(s.happiness + 20), energy: clamp(s.energy - 12),
      affection: clamp(s.affection + 4), trust: clamp(s.trust + 2) };
    const bond = applyBondXp(s, 8);
    const merged = { ...s, ...next, ...bond }; persist(merged); return { ...next, ...bond };
  }),
  rest: () => set((s) => {
    const next = { energy: clamp(s.energy + 35), happiness: clamp(s.happiness + 3) };
    const merged = { ...s, ...next }; persist(merged); return next;
  }),
  giveToy: () => set((s) => {
    if (s.toys <= 0) return {};
    const next = { toys: s.toys - 1, happiness: clamp(s.happiness + 15),
      affection: clamp(s.affection + 6), trust: clamp(s.trust + 4) };
    const bond = applyBondXp(s, 12);
    const merged = { ...s, ...next, ...bond }; persist(merged); return { ...next, ...bond };
  }),

  // ── Resource gathering (clicker/gather loop) ──
  gather: (kind) => set((s) => {
    const map = { berries: 'berries', crystals: 'crystals', toys: 'toys' };
    const key = map[kind] || 'berries';
    const next = { [key]: (s[key] || 0) + 1 };
    const merged = { ...s, ...next }; persist(merged); return next;
  }),

  // ── Mini-game rewards ──
  rewardWin: (game) => set((s) => {
    const rewards = {
      ispy:   { trust: 6, happiness: 8, crystals: 1, xp: 10 },
      memory: { trust: 8, affection: 4, xp: 12 },
      quick:  { happiness: 10, energy: -5, xp: 8 },
    };
    const r = rewards[game] || { happiness: 5, xp: 5 };
    const next = {
      trust: clamp(s.trust + (r.trust || 0)),
      affection: clamp(s.affection + (r.affection || 0)),
      happiness: clamp(s.happiness + (r.happiness || 0)),
      energy: clamp(s.energy + (r.energy || 0)),
      crystals: (s.crystals || 0) + (r.crystals || 0),
    };
    const bond = applyBondXp(s, r.xp || 5);
    const merged = { ...s, ...next, ...bond }; persist(merged); return { ...next, ...bond };
  }),

  // Mood label derived from needs — used to color the companion's responses.
  moodLabel: () => {
    const s = get();
    if (s.happiness > 75 && s.affection > 60) return 'joyful';
    if (s.hunger < 25) return 'hungry';
    if (s.energy < 25) return 'tired';
    if (s.happiness < 30) return 'sad';
    if (s.trust > 70) return 'devoted';
    return 'content';
  },

  resetLifeSim: () => set(() => { persist(DEFAULTS); return { ...DEFAULTS }; }),
}));
