// client/src/personality/schema.js
// Hybrid OCEAN-based personality. Basic mode = 5 OCEAN + free-text vibe.
// Detailed mode = +12 sub-traits + moods + attachment + speech tics + backstory + dynamic relationship.

// Slider range is 0-100 (50 = neutral). The prompt builder maps these to qualitative descriptors.

export const OCEAN = [
  { key: 'openness',          label: 'Openness',          icon: '🌱', desc: 'Curiosity vs. tradition.' },
  { key: 'conscientiousness', label: 'Conscientiousness', icon: '🎯', desc: 'Discipline vs. spontaneity.' },
  { key: 'extraversion',      label: 'Extraversion',      icon: '✨', desc: 'Outgoing vs. reserved.' },
  { key: 'agreeableness',     label: 'Agreeableness',     icon: '🤝', desc: 'Warm vs. challenging.' },
  { key: 'neuroticism',       label: 'Emotional Volatility', icon: '🌊', desc: 'Sensitive vs. stable.' }
];

export const SUB_TRAITS = [
  { key: 'wit',          label: 'Wit',         icon: '🗯', desc: 'Dry humor & wordplay.' },
  { key: 'bravery',      label: 'Bravery',     icon: '🔥', desc: 'Approach vs. avoidance.' },
  { key: 'mischief',     label: 'Mischief',    icon: '😈', desc: 'Playful trouble-making.' },
  { key: 'empathy',      label: 'Empathy',     icon: '💞', desc: 'Reads & mirrors emotions.' },
  { key: 'loyalty',      label: 'Loyalty',     icon: '⚔', desc: 'Devotion to the player.' },
  { key: 'curiosity',    label: 'Curiosity',   icon: '🔭', desc: 'Asks questions, explores.' },
  { key: 'wisdom',       label: 'Wisdom',      icon: '📜', desc: 'Patient, philosophical.' },
  { key: 'spontaneity',  label: 'Spontaneity', icon: '🎲', desc: 'Impulsive vs. planned.' },
  { key: 'melancholy',   label: 'Melancholy',  icon: '🌧', desc: 'Wistful undertones.' },
  { key: 'optimism',     label: 'Optimism',    icon: '🌅', desc: 'Hopeful vs. cynical.' },
  { key: 'protectiveness', label: 'Protectiveness', icon: '🛡', desc: 'Guards the player.' },
  { key: 'playfulness',  label: 'Playfulness',  icon: '🎈', desc: 'Light-hearted energy.' }
];

export const ATTACHMENT_STYLES = ['secure','anxious','avoidant','disorganized'];

export const SPEECH_REGISTERS = [
  { key: 'casual',      label: 'Casual' },
  { key: 'formal',      label: 'Formal' },
  { key: 'poetic',      label: 'Poetic' },
  { key: 'archaic',     label: 'Archaic / Old-Speech' },
  { key: 'streetwise',  label: 'Streetwise' },
  { key: 'scholarly',   label: 'Scholarly' },
  { key: 'fae',         label: 'Fae / Ethereal' },
  { key: 'gruff',       label: 'Gruff / Terse' }
];

// Quirks pool — randomizer picks 0-3. The prompt builder injects them as behavioral rules.
export const QUIRK_POOL = [
  'hums softly when thinking',
  'collects shiny pebbles',
  'speaks to inanimate objects',
  'flinches at sudden bright light',
  'always names new creatures they see',
  'counts steps when nervous',
  'whispers when sharing secrets',
  'laughs at their own jokes first',
  'misquotes ancient proverbs',
  'invents words when emotional',
  'refuses to step on shadows',
  'remembers every meal they\'ve eaten',
  'speaks in metaphors when scared',
  'sings under their breath in danger',
  'finishes the player\'s sentences sometimes',
  'has a phobia of perfect symmetry',
  'always thanks the wind',
  'mimics bird calls',
  'sketches in the dirt when bored',
  'apologizes to the rain'
];

export const VOICE_PROSODY = [
  { key: 'soft_low',     label: 'Soft & Low' },
  { key: 'bright_quick', label: 'Bright & Quick' },
  { key: 'breathy',      label: 'Breathy' },
  { key: 'gravelly',     label: 'Gravelly' },
  { key: 'sing_song',    label: 'Sing-Song' },
  { key: 'monotone',     label: 'Monotone (eerie)' },
  { key: 'theatrical',   label: 'Theatrical' }
];

// Default personality (neutral baseline).
export const defaultPersonality = () => ({
  mode: 'basic',                  // 'basic' | 'detailed'
  name: 'Lyra',
  vibe: '',                       // free-text "vibe" box (always shown)
  ocean: Object.fromEntries(OCEAN.map(t => [t.key, 50])),
  subTraits: Object.fromEntries(SUB_TRAITS.map(t => [t.key, 50])),
  attachment: 'secure',
  speechRegister: 'casual',
  voiceProsody: 'soft_low',
  moodVolatility: 30,             // how fast moods swing (0-100)
  currentMood: 'neutral',         // updated by Companion agent at runtime
  quirks: [],                     // up to 3 from QUIRK_POOL
  backstory: '',                  // free-text, injected into system prompt
  relationshipEvolution: true,    // companion grows attached/distant based on player actions
  affection: 50,                  // 0-100, runtime relationship state
  trust: 50                       // 0-100, runtime relationship state
});

// Section descriptors for the randomizer & UI tabs.
export const SECTIONS = [
  { key: 'ocean',          label: 'Core Personality (OCEAN)', basic: true,  trait_keys: () => OCEAN.map(t => t.key) },
  { key: 'subTraits',      label: 'Sub-Traits',               basic: false, trait_keys: () => SUB_TRAITS.map(t => t.key) },
  { key: 'attachment',     label: 'Attachment Style',         basic: false, trait_keys: () => ['attachment'] },
  { key: 'speech',         label: 'Speech & Voice',           basic: false, trait_keys: () => ['speechRegister','voiceProsody','moodVolatility'] },
  { key: 'quirks',         label: 'Quirks',                   basic: false, trait_keys: () => ['quirks'] },
  { key: 'backstory',      label: 'Backstory',                basic: false, trait_keys: () => ['backstory'] },
  { key: 'relationship',   label: 'Relationship Dynamics',    basic: false, trait_keys: () => ['relationshipEvolution','affection','trust'] }
];
