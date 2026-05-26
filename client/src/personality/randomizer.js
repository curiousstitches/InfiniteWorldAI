// client/src/personality/randomizer.js
// Per-section and master randomizer. Curve = beta-biased so most rolls aren't 50.

import { OCEAN, SUB_TRAITS, ATTACHMENT_STYLES, SPEECH_REGISTERS, VOICE_PROSODY, QUIRK_POOL, defaultPersonality } from './schema';

// Beta-distribution approximation that pushes values away from the dead center
// so the personality actually has shape (random-walk over 5+ traits clustering near 50 = boring NPC).
const polarized = () => {
  const u = Math.random();
  // Mix uniform with edge-bias: 60% uniform, 40% triangular at extremes
  if (u < 0.6) return Math.round(Math.random() * 100);
  return Math.round(Math.random() < 0.5 ? Math.pow(Math.random(), 0.5) * 30 : 70 + Math.pow(Math.random(), 0.5) * 30);
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const pool = [...arr], out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
};

// Randomize ONE section. Returns a partial personality object to merge.
export function randomizeSection(section) {
  switch (section) {
    case 'ocean':
      return { ocean: Object.fromEntries(OCEAN.map(t => [t.key, polarized()])) };
    case 'subTraits':
      return { subTraits: Object.fromEntries(SUB_TRAITS.map(t => [t.key, polarized()])) };
    case 'attachment':
      return { attachment: pick(ATTACHMENT_STYLES) };
    case 'speech':
      return {
        speechRegister: pick(SPEECH_REGISTERS).key,
        voiceProsody: pick(VOICE_PROSODY).key,
        moodVolatility: polarized()
      };
    case 'quirks':
      return { quirks: pickN(QUIRK_POOL, 1 + Math.floor(Math.random() * 3)) };
    case 'backstory':
      return { backstory: pick(BACKSTORY_SEEDS) };
    case 'relationship':
      return {
        relationshipEvolution: Math.random() > 0.15,
        affection: 30 + Math.floor(Math.random() * 40),
        trust: 30 + Math.floor(Math.random() * 40)
      };
    case 'name':
      return { name: pick(NAME_POOL) };
    default:
      return {};
  }
}

// Randomize EVERYTHING. Preserves the player's intent flag (mode) and keeps vibe if not empty.
export function randomizeAll(current = {}) {
  return {
    ...defaultPersonality(),
    mode: current.mode || 'detailed',  // surface all the chaos
    vibe: current.vibe || '',
    name: pick(NAME_POOL),
    ...randomizeSection('ocean'),
    ...randomizeSection('subTraits'),
    ...randomizeSection('attachment'),
    ...randomizeSection('speech'),
    ...randomizeSection('quirks'),
    ...randomizeSection('backstory'),
    ...randomizeSection('relationship')
  };
}

// Seed pools — kept inline so the engine ships standalone.
const NAME_POOL = [
  'Lyra','Kael','Vesper','Mira','Thorne','Sable','Bram','Indigo','Wren','Echo',
  'Onyx','Saga','Pip','Quill','Reverie','Sol','Tindra','Umbra','Verity','Wisp',
  'Yarrow','Zephyr','Mossglow','Hollow','Briar','Cinder','Dust','Fable','Glim','Hush'
];

const BACKSTORY_SEEDS = [
  'Born in a city that no longer exists. Carries a single key with no door.',
  'Once a star-cartographer. Got lost mapping a constellation that turned out to be a sleeping creature.',
  'A former temple guardian. The temple is gone but the duty is not.',
  'Was raised by something that wasn\'t a parent. Doesn\'t talk about it.',
  'Used to be much smaller. Or much larger. The memory is foggy.',
  'Believes they died once. Won\'t say when.',
  'Speaks three languages no one else has ever heard.',
  'Collected dreams as a profession. Has a satchel full of them somewhere.',
  'Refugee from a world that folded in on itself.',
  'Was a shadow before becoming a person. Sometimes forgets which.',
  'Apprenticed to a bee. The bee was wise.',
  'Carries a debt to the moon. The moon hasn\'t collected yet.',
  'Was the last of their kind. Then forgot what their kind was.',
  'Walked out of a painting on accident.',
  'Built from grief, repaired with curiosity.'
];

export { NAME_POOL, BACKSTORY_SEEDS };
