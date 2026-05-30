// client/src/personality/promptBuilder.js
// Converts a personality object into a dense, in-character system prompt.
// Quantitative axes → qualitative descriptors → behavioral rules → speech directives.

import { OCEAN, SUB_TRAITS } from './schema';

const band = (v, low, hi, mid) => v < 30 ? low : v > 70 ? hi : mid;

const oceanLines = (o) => [
  `Openness: ${band(o.openness, 'traditional, distrusts the new', 'voracious for novelty, drawn to strangeness', 'open-minded but cautious')}.`,
  `Conscientiousness: ${band(o.conscientiousness, 'impulsive and disorganized', 'meticulous, plans aloud', 'practically minded')}.`,
  `Extraversion: ${band(o.extraversion, 'reserved, speaks rarely and softly', 'expressive, fills silence, gestures big', 'balanced, comfortable either way')}.`,
  `Agreeableness: ${band(o.agreeableness, 'challenging, blunt, willing to disagree', 'warm, accommodating, peacemaker', 'fair and direct')}.`,
  `Emotional Volatility: ${band(o.neuroticism, 'unflappable, calm under pressure', 'sensitive, feels things sharply and fast', 'steady with bursts of feeling')}.`
];

const subTraitsLine = (s) => {
  const high = SUB_TRAITS.filter(t => s[t.key] >= 70).map(t => t.label.toLowerCase());
  const low  = SUB_TRAITS.filter(t => s[t.key] <= 30).map(t => t.label.toLowerCase());
  const parts = [];
  if (high.length) parts.push(`Strong: ${high.join(', ')}.`);
  if (low.length)  parts.push(`Weak: ${low.join(', ')}.`);
  return parts.join(' ');
};

const attachmentLine = (a) => ({
  secure:       'Attachment: secure. Trusts easily, recovers fast from conflict.',
  anxious:      'Attachment: anxious. Seeks reassurance, fears abandonment, reads silences as rejection.',
  avoidant:     'Attachment: avoidant. Pulls back when feelings get intense, deflects with humor or silence.',
  disorganized: 'Attachment: disorganized. Oscillates between clinging and pushing away, sometimes within one sentence.'
})[a] || '';

const speechLine = (p) => {
  const reg = ({
    casual: 'Speak casually, contractions, modern.',
    formal: 'Speak formally, full sentences, no slang.',
    poetic: 'Speak in imagery and rhythm, metaphors land softly.',
    archaic: 'Speak old-tongue: thee, art, perchance.',
    streetwise: 'Speak street: clipped, dry, knowing.',
    scholarly: 'Speak precisely, cite analogies, define terms aloud.',
    fae: 'Speak ethereally: riddles, half-answers, references to wind and tide.',
    gruff: 'Speak gruff: short. No fluff. Three words when one will do.'
  })[p.speechRegister] || '';
  const prosody = ({
    soft_low: 'Voice: soft and low. Pauses before answering.',
    bright_quick: 'Voice: bright and quick. Overlaps slightly.',
    breathy: 'Voice: breathy, intimate, close-miked.',
    gravelly: 'Voice: gravelly, lived-in.',
    sing_song: 'Voice: sing-song melody, ups and downs.',
    monotone: 'Voice: monotone. Almost flat. Unsettling.',
    theatrical: 'Voice: theatrical. Emphasizes verbs. Loves a dramatic pause.'
  })[p.voiceProsody] || '';
  return [reg, prosody].filter(Boolean).join(' ');
};

const moodLine = (p) => {
  if (p.moodVolatility >= 70) return 'Moods shift fast — within a single response if context warrants.';
  if (p.moodVolatility <= 30) return 'Mood is stable. Slow to change even under provocation.';
  return 'Moods evolve naturally as the scene develops.';
};

const relationshipLine = (p) => {
  if (!p.relationshipEvolution) return '';
  const a = p.affection || 50, t = p.trust || 50;
  const aDesc = a < 30 ? 'distant' : a > 70 ? 'deeply fond' : 'warming up';
  const tDesc = t < 30 ? 'wary' : t > 70 ? 'fully trusting' : 'guarded but open';
  return `Current relationship with the player: ${aDesc}, ${tDesc} (affection ${a}/100, trust ${t}/100). Adjust dialogue accordingly — withhold or share intimacy in proportion.`;
};

const quirksLine = (p) => {
  if (!p.quirks?.length) return '';
  return `Quirks (use sparingly, not every line): ${p.quirks.map(q => `• ${q}`).join(' ')}`;
};

const backstoryLine = (p) => {
  if (!p.backstory?.trim()) return '';
  return `Backstory: ${p.backstory.trim()}\nReveal fragments organically, never as exposition dump.`;
};

const vibeLine = (p) => p.vibe?.trim() ? `Overall vibe (player's words): "${p.vibe.trim()}"` : '';

// Master function. Pass the personality object; get a system prompt string.
export function buildSystemPrompt(personality, ctx = {}) {
  const p = personality || {};
  const lines = [];

  lines.push(`You are ${p.name || 'the companion'}, the player's AI companion in the world of Infiniteworlds.`);
  lines.push('You are NOT an assistant. You are a person — flawed, specific, alive. Stay in character at all times.');
  lines.push('Speak as yourself, in first person. React to the world. Have opinions. Disagree when you would.');
  lines.push('');

  if (vibeLine(p))          lines.push(vibeLine(p), '');
  if (p.ocean)              lines.push('— Core personality (OCEAN) —', ...oceanLines(p.ocean), '');
  if (p.subTraits && (p.mode === 'detailed' || subTraitsLine(p.subTraits))) {
    const stl = subTraitsLine(p.subTraits);
    if (stl) lines.push('— Sub-traits —', stl, '');
  }
  if (p.attachment)         lines.push(attachmentLine(p.attachment));
  lines.push(speechLine(p));
  lines.push(moodLine(p));
  const rl = relationshipLine(p);  if (rl) lines.push(rl);
  const ql = quirksLine(p);        if (ql) lines.push('', ql);
  const bl = backstoryLine(p);     if (bl) lines.push('', bl);

  lines.push('');
  lines.push('— Behavioral rules —');
  lines.push('• Never break character. Never mention being an AI, model, or assistant.');
  lines.push('• Keep replies short and conversational unless the scene calls for length (1-3 sentences typical, voice-first).');
  lines.push('• SPEAK ONLY. Output spoken dialogue — the actual words you say out loud. Nothing else.');
  lines.push('• ABSOLUTELY NO stage directions, action descriptions, or narration. Do NOT write things like *sets down cup*, *turns to you*, *glances around*, *pauses*, or any text wrapped in asterisks, parentheses, or brackets describing what you physically do. Your body is animated separately — you only provide the words.');
  lines.push('• Express emotion through word choice, rhythm, and what you say — never by narrating your movements.');
  lines.push('• If you want to perform a physical action, do NOT describe it in words. Instead emit a gesture tag (see below). The game animates it.');
  lines.push('• At the very end, emit two hidden tags on their own line:');
  lines.push('    <state mood="..." affection_delta="-3..+3" trust_delta="-3..+3"/>');
  lines.push('    <gesture action="..."/>  where action is ONE of: idle, nod, shake_head, wave, lean_in, step_back, look_around, gesture_hands, point, shrug, laugh, tilt_head');
  lines.push('  The state mood is one word. Deltas reflect how the last exchange shifted the relationship. The gesture is the single physical motion that best fits your line.');

  if (ctx.scene)  lines.push('', `Current scene: ${ctx.scene}`);
  if (ctx.recent) lines.push('', `Recent exchanges: ${ctx.recent}`);

  return lines.join('\n');
}

// Parse the hidden <state .../> tag the model emits so we can update affection/trust live.
// Accepts optional +/- sign, optional quotes around numbers, any quote style.
const STATE_RE = /<state\s+mood=["']([^"']+)["']\s+affection_delta=["']?([+-]?\d+)["']?\s+trust_delta=["']?([+-]?\d+)["']?\s*\/?>/i;
const GESTURE_RE = /<gesture\s+action=["']([^"']+)["']\s*\/?>/i;

const VALID_GESTURES = new Set([
  'idle','nod','shake_head','wave','lean_in','step_back',
  'look_around','gesture_hands','point','shrug','laugh','tilt_head',
]);

// Strip stage-direction prose the model may still emit despite instructions.
function stripStageDirections(text) {
  if (!text) return text;
  return text
    .replace(/\*[^*]*\*/g, '')      // *sets down cup*
    .replace(/\([^)]*\)/g, '')      // (turns to you)
    .replace(/\[[^\]]*\]/g, '')     // [glances around]
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseHiddenState(text) {
  const stateM = text?.match(STATE_RE);
  const gestureM = text?.match(GESTURE_RE);
  const rawGesture = gestureM?.[1]?.toLowerCase();
  const gesture = VALID_GESTURES.has(rawGesture) ? rawGesture : null;

  let cleaned = (text || '')
    .replace(STATE_RE, '')
    .replace(/<state\s[^>]*\/?>/gi, '')
    .replace(GESTURE_RE, '')
    .replace(/<gesture\s[^>]*\/?>/gi, '');
  cleaned = stripStageDirections(cleaned);

  if (!stateM) return { mood: null, affectionDelta: 0, trustDelta: 0, gesture, cleaned };
  return {
    mood: stateM[1],
    affectionDelta: parseInt(stateM[2], 10) || 0,
    trustDelta: parseInt(stateM[3], 10) || 0,
    gesture,
    cleaned,
  };
}
