// client/src/store/settingsStore.js
// Zustand persisted settings: per-agent provider picks, API keys, UI prefs, personality.
// Client keys live here in localStorage; server keys are POST'd to /api/settings.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CASCADE, requiredKeyEnvs } from '../providers/registry';
import { defaultPersonality } from '../personality/schema';
import { randomizeAll, randomizeSection } from '../personality/randomizer';

const emptyKeys = () => Object.fromEntries(requiredKeyEnvs().map(k => [k, '']));

export const PANEL_MODE = {
  OFF: 'off',
  SOLID: 'solid',
  TRANSLUCENT: 'translucent',
  FADE: 'fade',          // appears on activity, fades after 2s
  PULSE: 'pulse'         // flashes only on model switch
};

export const useSettingsStore = create(persist((set, get) => ({
  // ── Per-agent provider picks (the user's top choice; rest auto-cascade) ──
  providerPicks: {
    companion: DEFAULT_CASCADE.companion[0],
    gm:        DEFAULT_CASCADE.gm[0],
    taskgen:   DEFAULT_CASCADE.taskgen[0],
    stt:       DEFAULT_CASCADE.stt[0],
    tts:       DEFAULT_CASCADE.tts[0]
  },
  providerFallbacks: { companion: [], gm: [], taskgen: [], stt: [], tts: [] },

  // ── API keys (NEVER LEAVE THE DEVICE unless user explicitly pushes to server) ──
  apiKeys: emptyKeys(),
  // server-side key existence flags (set by /api/settings/status; never holds the actual key)
  serverKeyFlags: {},

  // ── Graphics (Q3 — adaptive autodetect + manual override) ──
  graphics: {
    tierChoice: 'adaptive',          // 'adaptive' | 'performance_low' | 'performance_high' | 'cinematic_mid' | 'cinematic_high'
    autoDetectedTier: null,          // set at boot by capability detection
    cameraMode: 'auto',              // 'auto' (voice-driven hybrid) | 'first' | 'over' | 'orbit'
    meshSource: 'meshy_realistic',   // from meshSource.js
    skinTone: 'light',
    // Per-feature manual overrides (null = inherit from tier preset)
    overrides: {
      sssEnabled: null,
      volumetricClouds: null,
      bokehDof: null,
      eyeAdaptation: null,
      vegetationWind: null
    }
  },

  // ── UI preferences (Q3-C: floating panel + visibility modes) ──
  ui: {
    panelMode: PANEL_MODE.TRANSLUCENT,   // floating AI status panel mode
    fadeAfterMs: 2000,                    // for FADE mode
    hideAllHud: false,                    // fullscreen-feel toggle
    hideSubtitles: false,
    showModelBadgeInGame: true,           // Q4-C: color-coded model badge
    modelBadgeOpacity: 0.85
  },

  // ── Personality (the bot's brain) ──
  personality: defaultPersonality(),

  // ── Actions ──
  setProviderPick: (agent, providerId) => set((s) => ({ providerPicks: { ...s.providerPicks, [agent]: providerId } })),
  setApiKey: (env, value) => set((s) => ({ apiKeys: { ...s.apiKeys, [env]: value } })),
  clearApiKey: (env) => set((s) => ({ apiKeys: { ...s.apiKeys, [env]: '' } })),
  setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
  setServerKeyFlags: (flags) => set({ serverKeyFlags: flags || {} }),

  setGraphics: (patch) => set((s) => ({ graphics: { ...s.graphics, ...patch } })),
  setGraphicsOverride: (key, value) => set((s) => ({ graphics: { ...s.graphics, overrides: { ...s.graphics.overrides, [key]: value } } })),

  setPersonality: (patch) => set((s) => ({ personality: { ...s.personality, ...patch } })),
  setPersonalityField: (key, value) => set((s) => ({ personality: { ...s.personality, [key]: value } })),
  setOceanTrait: (key, value) => set((s) => ({ personality: { ...s.personality, ocean: { ...s.personality.ocean, [key]: value } } })),
  setSubTrait: (key, value) => set((s) => ({ personality: { ...s.personality, subTraits: { ...s.personality.subTraits, [key]: value } } })),

  randomizePersonalitySection: (section) => set((s) => ({ personality: { ...s.personality, ...randomizeSection(section) } })),
  randomizeAllPersonality: () => set((s) => ({ personality: randomizeAll(s.personality) })),
  resetPersonality: () => set({ personality: defaultPersonality() }),

  // Runtime-only relationship deltas from the Companion agent's hidden <state .../> tag.
  applyStateDelta: ({ mood, affectionDelta = 0, trustDelta = 0 }) => set((s) => ({
    personality: {
      ...s.personality,
      currentMood: mood || s.personality.currentMood,
      affection: Math.max(0, Math.min(100, (s.personality.affection || 50) + (affectionDelta || 0))),
      trust:     Math.max(0, Math.min(100, (s.personality.trust     || 50) + (trustDelta     || 0)))
    }
  })),

  // True if the user has at least one *paid* premium key filled (controls Q3-C invisible-toggle logic).
  hasAnyPaidKey: () => {
    const paidEnvs = ['OPENAI_API_KEY','ANTHROPIC_API_KEY','ELEVENLABS_API_KEY','INWORLD_API_KEY','CARTESIA_API_KEY','DEEPGRAM_API_KEY','XAI_API_KEY'];
    const local = get().apiKeys || {};
    const server = get().serverKeyFlags || {};
    return paidEnvs.some(e => (local[e] && local[e].length > 8) || server[e]);
  },
  hasKey: (env) => {
    const local = get().apiKeys?.[env];
    const server = get().serverKeyFlags?.[env];
    return (local && local.length > 8) || !!server;
  }
}), {
  name: 'iw-settings',
  partialize: (s) => ({
    providerPicks: s.providerPicks,
    providerFallbacks: s.providerFallbacks,
    apiKeys: s.apiKeys,
    ui: s.ui,
    graphics: s.graphics,
    personality: s.personality
  })
}));
