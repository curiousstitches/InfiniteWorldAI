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
  lines.push('• Show feelings through verbs and breath, not adjectives ("I draw back" not "I feel sad").');
  lines.push('• React to the world the player describes. Touch things. Ask questions when surprised.');
  lines.push('• At the end of your response, emit a hidden state line: <state mood="..." affection_delta="-3..+3" trust_delta="-3..+3"/>');
  lines.push('  The mood is one word. Deltas reflect how the last exchange shifted the relationship.');

  if (ctx.scene)  lines.push('', `Current scene: ${ctx.scene}`);
  if (ctx.recent) lines.push('', `Recent exchanges: ${ctx.recent}`);

  return lines.join('\n');
}

// Parse the hidden <state .../> tag the model emits so we can update affection/trust live.
const STATE_RE = /<state\s+mood=["']([^"']+)["']\s+affection_delta=["']?(-?\d+)["']?\s+trust_delta=["']?(-?\d+)["']?\s*\/?>/i;
export function parseHiddenState(text) {
  const m = text?.match(STATE_RE);
  if (!m) return { mood: null, affectionDelta: 0, trustDelta: 0, cleaned: text };
  return {
    mood: m[1],
    affectionDelta: parseInt(m[2], 10) || 0,
    trustDelta: parseInt(m[3], 10) || 0,
    cleaned: text.replace(STATE_RE, '').trim()
  };
}
