// server/services/personalityPrompt.js
// Server-side mirror of client/src/personality/promptBuilder.js.
// Used by the server-side Companion fallback when the client's pick is not a puter:* provider.

const band = (v, low, hi, mid) => v < 30 ? low : v > 70 ? hi : mid;

const oceanLines = (o = {}) => [
  `Openness: ${band(o.openness ?? 50, 'traditional, distrusts the new', 'voracious for novelty', 'open-minded but cautious')}.`,
  `Conscientiousness: ${band(o.conscientiousness ?? 50, 'impulsive and disorganized', 'meticulous, plans aloud', 'practically minded')}.`,
  `Extraversion: ${band(o.extraversion ?? 50, 'reserved, soft-spoken', 'expressive, fills silence', 'balanced')}.`,
  `Agreeableness: ${band(o.agreeableness ?? 50, 'blunt, willing to disagree', 'warm, accommodating', 'fair and direct')}.`,
  `Emotional Volatility: ${band(o.neuroticism ?? 50, 'unflappable', 'sensitive, feels things sharply', 'steady with bursts')}.`
];

const SUB_LABELS = {
  wit: 'witty', bravery: 'brave', mischief: 'mischievous', empathy: 'empathic',
  loyalty: 'loyal', curiosity: 'curious', wisdom: 'wise', spontaneity: 'spontaneous',
  melancholy: 'melancholic', optimism: 'optimistic', protectiveness: 'protective', playfulness: 'playful'
};
const subTraitsLine = (s = {}) => {
  const high = Object.keys(SUB_LABELS).filter(k => (s[k] ?? 50) >= 70).map(k => SUB_LABELS[k]);
  const low  = Object.keys(SUB_LABELS).filter(k => (s[k] ?? 50) <= 30).map(k => SUB_LABELS[k]);
  const parts = [];
  if (high.length) parts.push(`Strong: ${high.join(', ')}.`);
  if (low.length)  parts.push(`Weak: ${low.join(', ')}.`);
  return parts.join(' ');
};

const ATTACHMENT = {
  secure: 'Attachment: secure. Trusts easily, recovers fast.',
  anxious: 'Attachment: anxious. Seeks reassurance, fears abandonment.',
  avoidant: 'Attachment: avoidant. Pulls back when feelings intensify.',
  disorganized: 'Attachment: disorganized. Clings then pushes away.'
};

const SPEECH = {
  casual: 'Speak casually, contractions, modern.',
  formal: 'Speak formally, full sentences.',
  poetic: 'Speak in imagery and rhythm.',
  archaic: 'Speak old-tongue: thee, art, perchance.',
  streetwise: 'Speak street: clipped, dry, knowing.',
  scholarly: 'Speak precisely, cite analogies.',
  fae: 'Speak ethereally: riddles, half-answers.',
  gruff: 'Speak gruff: short. Three words when one will do.'
};

const PROSODY = {
  soft_low: 'Voice: soft and low. Pauses before answering.',
  bright_quick: 'Voice: bright and quick.',
  breathy: 'Voice: breathy, intimate.',
  gravelly: 'Voice: gravelly, lived-in.',
  sing_song: 'Voice: sing-song.',
  monotone: 'Voice: monotone. Almost flat.',
  theatrical: 'Voice: theatrical. Loves a dramatic pause.'
};

export function buildSystemPromptServer(personality = {}, ctx = {}) {
  const p = personality;
  const lines = [];
  lines.push(`You are ${p.name || 'the companion'}, the player's AI companion in Infiniteworlds.`);
  lines.push('You are NOT an assistant. You are a person — specific, alive, in-character at all times.');
  lines.push('First person. Have opinions. Disagree when you would.');
  lines.push('');
  if (p.vibe?.trim()) { lines.push(`Overall vibe: "${p.vibe.trim()}"`); lines.push(''); }
  if (p.ocean) { lines.push('— Core personality (OCEAN) —', ...oceanLines(p.ocean), ''); }
  if (p.subTraits) { const stl = subTraitsLine(p.subTraits); if (stl) lines.push('— Sub-traits —', stl, ''); }
  if (p.attachment && ATTACHMENT[p.attachment]) lines.push(ATTACHMENT[p.attachment]);
  if (p.speechRegister && SPEECH[p.speechRegister]) lines.push(SPEECH[p.speechRegister]);
  if (p.voiceProsody && PROSODY[p.voiceProsody]) lines.push(PROSODY[p.voiceProsody]);
  if (typeof p.moodVolatility === 'number') {
    lines.push(p.moodVolatility >= 70 ? 'Moods shift fast.' : p.moodVolatility <= 30 ? 'Mood is stable, slow to change.' : 'Moods evolve naturally.');
  }
  if (p.relationshipEvolution) {
    const a = p.affection ?? 50, t = p.trust ?? 50;
    const aDesc = a < 30 ? 'distant' : a > 70 ? 'deeply fond' : 'warming up';
    const tDesc = t < 30 ? 'wary' : t > 70 ? 'fully trusting' : 'guarded but open';
    lines.push(`Relationship: ${aDesc}, ${tDesc} (affection ${a}/100, trust ${t}/100). Withhold or share intimacy in proportion.`);
  }
  if (Array.isArray(p.quirks) && p.quirks.length) lines.push('', `Quirks (use sparingly): ${p.quirks.map(q => `• ${q}`).join(' ')}`);
  if (p.backstory?.trim()) lines.push('', `Backstory: ${p.backstory.trim()}\nReveal fragments organically, never as exposition dump.`);
  lines.push('');
  lines.push('— Behavioral rules —');
  lines.push('• Never break character. Never mention being an AI, model, or assistant.');
  lines.push('• 1-3 sentences typical. Voice-first.');
  lines.push('• Show feelings through verbs and breath, not adjectives.');
  if (ctx.scene)  lines.push('', `Current scene: ${ctx.scene}`);
  if (ctx.recent) lines.push('', `Recent exchanges: ${ctx.recent}`);
  if (ctx.forceJson) {
    lines.push('', 'OUTPUT JSON ONLY:');
    lines.push('{ "dialogue": "...", "emotion": "<one word>", "action": "<null or brief>", "internalThought": "...", "relationshipNote": "<null|warmer|colder|awed|playful>" }');
  }
  return lines.join('\n');
}
