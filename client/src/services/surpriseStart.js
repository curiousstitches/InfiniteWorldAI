// client/src/services/surpriseStart.js
// "Surprise Me" — auto-generates a random world + random companion and drops the player
// straight into gameplay with an amnesia cold-open. No questions, no idea what's coming.

import { runCreateStep } from './characterCreatorBrain.js';

const API = '/api';

// Pools the generator draws from. The world name seeds the biome server-side.
const WORLD_NAMES = [
  'Emberfall Hollow', 'The Drowned Cathedral', 'Mycelium Deep', 'Glasswind Reach',
  'The Humming Void', 'Saltbone Coast', 'Frostmary Tundra', 'The Clockwork Orchard',
  'Volcanic Spire of Ix', 'Whispergrove', 'The Shattered Aurora', 'Sunken Library of Nodd',
  'Crystalfang Caverns', 'The Last Greenhouse', 'Stormbreak Atoll', 'Ashen Bloom Desert',
  'The Velvet Nebula', 'Rootspeak Forest', 'Gravetide Marsh', 'The Mirror Steppes',
];

// Seed descriptions fed to the character brain so the companion is fully AI-generated
// and different every time — the player never sees or picks these.
const COMPANION_SEEDS = [
  'a sarcastic talking raven with a monocle and a gambling problem',
  'a melancholy moss-covered golem who collects lost socks',
  'an overly caffeinated fox spirit who speaks in riddles',
  'a tiny ancient dragon convinced it is enormous and terrifying',
  'a polite skeleton botanist who forgot it was dead',
  'a shapeshifting puddle with abandonment issues and great advice',
  'a retired star that fell to earth and now runs a tea stall',
  'a nervous mushroom knight sworn to protect you for no clear reason',
  'a glitching hologram of a librarian from a civilization that never existed',
  'a grumpy sentient compass that always points toward snacks',
  'a velvet-voiced moth the size of a dog who hoards secrets',
  'an immortal jellyfish philosopher drifting in a floating bubble',
];

// Funny amnesia intros — one is picked at random as the opening companion line.
export const AMNESIA_INTROS = [
  "Oh good, you're awake! You've been face-down in the {biome} for — honestly? No idea. Hours? A geological age? Do you remember your name? ...No? Perfect. Neither do I. We'll figure it out together.",
  "Easy there. You took a tumble through what I can only describe as 'reality's trapdoor.' Last thing you said before passing out was 'I definitely know what I'm doing.' You did not.",
  "Welcome back to consciousness! Small problem: you've got the memory of a goldfish that just got startled. Big problem: so do I. But hey — fresh start, right?",
  "Don't panic. You washed up here with no memories, no shoes, and an alarming amount of confidence. I've decided to adopt you. You're welcome.",
  "Ah, the amnesia special. Classic. You woke up in the {biome} mumbling about 'the plan.' There is no plan. There has never been a plan. Shall we make one up?",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Generates a companion in ONE shot. Tries a single AI call for flavor; if anything
// fails or is slow, immediately uses a rich local profile built from the seed.
// No multi-turn loop — surprise mode must be fast and never hang.
async function generateRandomCompanion() {
  const seed = pick(COMPANION_SEEDS);

  // Rich local profile — always works, zero network dependency.
  const localProfile = {
    name: pick(['Pib', 'Vesper', 'Koro', 'Mossa', 'Zinn', 'Bramble', 'Nyx', 'Tup', 'Ravel', 'Sol']),
    race: 'unknown',
    personality: seed,
    appearance: seed,
    traits: pick([
      ['curious', 'chaotic', 'loyal'],
      ['grumpy', 'secretly kind', 'dramatic'],
      ['playful', 'mischievous', 'devoted'],
      ['wise', 'cryptic', 'gentle'],
      ['anxious', 'brave-when-it-counts', 'funny'],
    ]),
    voiceType: pick(['mystical_female', 'playful_creature', 'ancient_beast', 'ethereal_spirit', 'wise_elder', 'gruff_warrior']),
    meshPrompt: seed,
  };

  // Try ONE quick AI call (3s timeout) to enrich it. If it fails, use local.
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000));
    const result = await Promise.race([runCreateStep(seed, []), timeout]);
    if (result?.status === 'complete' && result.profile) return result.profile;
  } catch { /* fall through to local */ }

  return localProfile;
}

// Full surprise flow: create world → generate companion → return everything for play.
export async function surpriseStart() {
  const worldName = pick(WORLD_NAMES);

  // 1. Create the world (server derives biome). Timeout-guarded with local fallback.
  let world;
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000));
    const worldRes = await Promise.race([
      fetch(`${API}/worlds`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: worldName }),
      }),
      timeout,
    ]);
    world = await worldRes.json();
  } catch {
    // Local fallback world so surprise always works even if the server is unreachable.
    const biomeGuess = pick(['forest', 'volcanic', 'ocean', 'tundra', 'cosmic', 'crystalline', 'ancient_ruins']);
    world = { id: `local-${Date.now()}`, name: worldName, biome: biomeGuess, scale: 'HUMAN' };
  }

  // 2. Generate a fully random companion via the AI brain.
  const profile = await generateRandomCompanion();

  // 3. Save the character to the world.
  let character = null;
  try {
    const charRes = await fetch(`${API}/characters/${world.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });
    if (charRes.ok) character = await charRes.json();
  } catch {}
  if (!character) {
    character = { id: `local-${Date.now()}`, world_id: world.id, ...profile,
      model_url: null, model_status: 'ready' };
  }

  // 4. Pick the amnesia opener, fill in the biome.
  const intro = pick(AMNESIA_INTROS).replace('{biome}', world.biome || 'wilderness');

  return { world, character, intro };
}
