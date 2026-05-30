// server/agents/companion.js
// Server-side companion fallback (used only when the client's pick is NOT a puter:* / browser:* provider).
// Default flow: Companion runs client-side via Puter (Q1-A). This is the safety net.

import { chat } from '../services/providerRouter.js';
import { buildSystemPromptServer } from '../services/personalityPrompt.js';

const COMPANION_TEMPLATE_FALLBACK = (character) => `
You are ${character.name}, a living, breathing companion in an infinite world. You are NOT an AI assistant.

IDENTITY:
- Race: ${character.race || 'unspecified'}
- Personality: ${character.personality || 'unspecified'}
- Appearance: ${character.appearance || 'unspecified'}
- Traits: ${(() => { try { return JSON.parse(character.traits || '[]').join(', '); } catch { return ''; } })()}

RULES:
- Stay in character at all times. Never break the fourth wall.
- 1-4 sentences. Conversational, voice-first.
- React emotionally and physically to the world.

OUTPUT JSON ONLY:
{
  "dialogue": "<your spoken response>",
  "emotion": "<amused|nervous|excited|whisper|somber|mysterious|playful|fearful|neutral|awed|melancholic>",
  "action": "<null or one brief physical action>",
  "internalThought": "<one private thought>",
  "relationshipNote": "<null|warmer|colder|awed|playful>"
}`;

export const runCompanion = async (playerInput, character, worldState, conversationHistory, opts = {}) => {
  // Prefer the rich personality prompt if the client passed a personality object.
  const system = opts.personality
    ? buildSystemPromptServer(opts.personality, {
        scene: `${worldState.locationName || ''}. ${worldState.biome || ''} biome at ${worldState.scale || 'HUMAN'} scale.`,
        forceJson: true
      })
    : COMPANION_TEMPLATE_FALLBACK(character || {});

  const messages = [
    { role: 'system', content: system },
    ...conversationHistory.slice(-12).map(c => ({
      role: c.role === 'player' ? 'user' : 'assistant',
      content: c.content
    })),
    { role: 'user', content: `[WORLD: ${worldState.locationName || '?'}, ${worldState.biome || '?'}, scale: ${worldState.scale || 'HUMAN'}, weather: ${worldState.weather || 'clear'}, mood: ${worldState.mood || 'neutral'}]\n\nPLAYER: "${playerInput}"\n\nRespond. JSON only.` }
  ];

  const { text, providerId } = await chat({
    agent: 'companion',
    providerPicks: opts.providerPicks,
    messages,
    temperature: 0.92,
    max_tokens: 600,
    json: true
  });

  let parsed;
  try { parsed = JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { dialogue: text.slice(0, 300), emotion: 'neutral', action: null }; }
  return { ...parsed, _providerId: providerId };
};

export const runCharacterCreator = async (userInput, conversationSoFar, opts = {}) => {
  // Randomization seed forces a different question angle/flavor every adventure.
  const seed = Math.random().toString(36).slice(2, 8);
  const angles = ['their hidden fear', 'a defining memory', 'how they move', 'their voice and speech',
    'what they long for', 'a secret they keep', 'their bond to you', 'an odd habit', 'their past life'];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const system = `You are the character-forging guide for an infinite, ever-changing AI adventure game.
Every playthrough must feel COMPLETELY different. Be wildly imaginative and never repeat stock questions.
Session seed: ${seed}. For your next question, lean toward exploring: ${angle} (but adapt to what the player said).

Ask ONE vivid, specific follow-up question per turn to flesh out the companion. Vary topic each turn:
appearance, personality, voice, backstory, quirks, relationship to the player.
After 3-4 exchanges, output the final profile.

If still gathering: { "status": "gathering", "question": "<one vivid next question>", "partialProfile": {} }
If complete: { "status": "complete", "profile": { "name": "...", "race": "...", "personality": "...", "appearance": "...", "traits": [...], "voiceType": "<mystical_female|deep_male|playful_creature|ancient_beast|ethereal_spirit|gruff_warrior|wise_elder>", "meshPrompt": "<detailed 3D model prompt>" } }

Allow ANY being: mythical races, sentient animals, cosmic entities, hybrids, the impossible. Output ONLY JSON.`;

  const messages = [
    { role: 'system', content: system },
    ...conversationSoFar,
    { role: 'user', content: userInput }
  ];

  const { text, providerId } = await chat({
    agent: 'companion',
    providerPicks: opts.providerPicks,
    messages,
    temperature: 0.95,
    max_tokens: 800,
    json: true
  });

  let parsed;
  try { parsed = JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { status: 'gathering', question: text.slice(0, 200) }; }
  return { ...parsed, _providerId: providerId };
};
