// client/src/services/characterCreatorBrain.js
// Runs the companion-design interview client-side via Puter (free, browser-based AI),
// with a server fallback and a hardcoded scripted fallback if both fail.
// This is why a hosted public site works without any API keys on the server.

import { puterChat, isPuterReady } from './puterClient.js';

const API = '/api';

const SYSTEM_PROMPT = `You are helping a player design their AI companion for an infinite world adventure game.
Ask 3 imaginative, distinct follow-up questions (one per turn) to flesh out the character. Vary the topics: appearance, personality, voice/speech style.
When you have enough info (after 3-4 player responses), output the final JSON character profile.

If still gathering info, output ONLY valid JSON: { "status": "gathering", "question": "<your single next question>" }
If complete, output ONLY valid JSON: { "status": "complete", "profile": { "name": "...", "race": "...", "personality": "...", "appearance": "...", "traits": ["..."], "voiceType": "<mystical_female|deep_male|playful_creature|ancient_beast|ethereal_spirit|gruff_warrior|wise_elder>", "meshPrompt": "<detailed 3D model prompt>" } }

Be creative — allow mythical races, sentient animals, cosmic entities, hybrids. NEVER output text outside the JSON.`;

const SCRIPTED_FALLBACK_QUESTIONS = [
  "Beautiful. What's their name, and what's the most striking thing about how they look?",
  "Lovely. What pulls them toward you — curiosity, loyalty, something else? And what do they fear?",
  "One last thing: in three words, how do they speak? Soft and lyrical? Sharp and dry? Tell me.",
];

function buildScriptedComplete(convo) {
  const firstAnswer = convo[0]?.content || 'A companion';
  const allAnswers = convo.map(m => m.content).join(' · ');
  return {
    status: 'complete',
    profile: {
      name: firstAnswer.split(/[\s,]+/)[0] || 'Companion',
      race: 'unknown',
      personality: allAnswers,
      appearance: allAnswers,
      traits: ['curious', 'loyal', 'observant'],
      voiceType: 'mystical_female',
      meshPrompt: `A ${firstAnswer.slice(0, 100)} — full body, ${allAnswers.slice(0, 200)}`,
    },
  };
}

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// Try Puter (free, browser-side) first. Returns null on any failure.
async function tryPuter(messages) {
  if (!isPuterReady()) return null;
  try {
    const out = await puterChat({
      model: 'claude-sonnet-4-6',
      messages,
      temperature: 0.88,
      max_tokens: 600,
    });
    const text = out?.content || out?.text || '';
    return parseJsonLoose(text);
  } catch (e) {
    console.warn('[puter character-creator failed]', e);
    return null;
  }
}

// Try the server (requires API keys configured server-side; will 5xx on Railway with no keys).
async function tryServer(userInput, conversationSoFar) {
  try {
    const res = await fetch(`${API}/characters/create-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput, conversationSoFar }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Hardcoded scripted fallback — guarantees the interview completes even with zero AI available.
function scriptedFallback(conversationSoFar) {
  const userTurns = conversationSoFar.filter(m => m.role === 'user').length;
  if (userTurns === 0) {
    return { status: 'gathering', question: SCRIPTED_FALLBACK_QUESTIONS[0] };
  }
  if (userTurns <= SCRIPTED_FALLBACK_QUESTIONS.length) {
    return { status: 'gathering', question: SCRIPTED_FALLBACK_QUESTIONS[userTurns - 1] };
  }
  return buildScriptedComplete(conversationSoFar);
}

// Public: try each strategy in order, return whichever works first.
// Server FIRST (uses your free Groq key — costs visitors nothing), then Puter
// (visitor's own credit), then scripted fallback. This avoids forcing Puter upgrades.
export async function runCreateStep(userInput, conversationSoFar) {
  // 1. Server — your hosted Groq/Gemini free key. Zero cost to the visitor.
  const serverResult = await tryServer(userInput, conversationSoFar);
  if (serverResult && (serverResult.status === 'gathering' || serverResult.status === 'complete')) {
    return serverResult;
  }

  // 2. Puter — only if the server has no key configured. Uses visitor's Puter credit.
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationSoFar,
    { role: 'user', content: userInput },
  ];
  const puterResult = await tryPuter(messages);
  if (puterResult && (puterResult.status === 'gathering' || puterResult.status === 'complete')) {
    return puterResult;
  }

  // 3. Scripted fallback — always succeeds.
  return scriptedFallback(conversationSoFar);
}
