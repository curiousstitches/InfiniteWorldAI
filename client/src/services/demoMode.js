// client/src/services/demoMode.js
// Fetch interceptor for GitHub Pages demo. ORDER MATTERS — specific routes first.

const DEMO = import.meta.env.DEMO_MODE === true;

const DEMO_WORLD_ID = 'demo-world-001';
const DEMO_CHAR_ID  = 'demo-char-stella';

const DEMO_WORLD = {
  id: DEMO_WORLD_ID, name: 'Gaia', biome: 'forest', scale: 'HUMAN',
  mood: 'curious', timeOfDay: 0.45, weather: 'clear',
  created_at: new Date().toISOString(),
};

const DEMO_CHARACTER = {
  id: DEMO_CHAR_ID, world_id: DEMO_WORLD_ID, name: 'Stella', species: 'human',
  description: 'A mission specialist who lost contact with her crew six months ago.',
  voice_preset: 'mystical_female',
  personality: {
    ocean: { o: 0.75, c: 0.6, e: 0.55, a: 0.7, n: 0.4 },
    traits: ['curious', 'loyal', 'observant', 'dry wit'],
    backstory: "Lost contact with mission control six months ago.",
  },
  metadata: '{}', model_url: null, model_status: 'ready',
};

const DEMO_INTERACTABLES = [
  { id: 'i1', label: 'Glowing mushroom', description: 'It pulses with a soft blue light.', x:  3, y: 0, z:  2 },
  { id: 'i2', label: 'Ancient stone',     description: 'Worn with strange glyphs.',       x: -4, y: 0, z:  5 },
];

const DEMO_DIALOGUE = [
  { mood: 'curious',    text: "Do you hear that wind through the canopy? Feels like a song." },
  { mood: 'amused',     text: "You've been quiet. Lost in thought, or planning something dangerous?" },
  { mood: 'thoughtful', text: "I keep thinking about my crew. But here, with you, it's... quieter." },
  { mood: 'playful',    text: "Bet you can't catch up before I reach those mushrooms." },
  { mood: 'somber',     text: "If this is a dream, I don't want to wake up yet." },
  { mood: 'excited',    text: "Wait — did you see that light? Through the trees, west of us!" },
];

let dialogueIndex = 0;

const SCRIPTED_QUESTIONS = [
  "Beautiful. What's their name, and what's the most striking thing about how they look?",
  "Lovely. What pulls them toward you — curiosity, loyalty, something else? And what do they fear?",
  "One last thing: in three words, how do they speak? Soft and lyrical? Sharp and dry? Tell me.",
];

export const isDemoMode = () => DEMO;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function routeDemoRequest(url, init = {}) {
  const m = url.match(/\/api\/.*$/);
  const path = m ? m[0].split('?')[0] : url;
  const method = (init.method || 'GET').toUpperCase();
  let body = {};
  if (init.body) {
    try { body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch {}
  }

  // ── CHARACTER CREATOR STEP MACHINE (specific path, must come first) ──
  if (path === '/api/characters/create-step' && method === 'POST') {
    const convo = body.conversationSoFar || [];
    const userTurns = convo.filter(m => m.role === 'user').length;

    // Turn 0 (empty interview / retry / remount) must never leak into completion.
    if (userTurns === 0) {
      return json({ status: 'gathering', question: SCRIPTED_QUESTIONS[0] });
    }
    // Turns 1..N serve each scripted follow-up. Completion fires only after the last.
    if (userTurns <= SCRIPTED_QUESTIONS.length) {
      return json({ status: 'gathering', question: SCRIPTED_QUESTIONS[userTurns - 1] });
    }
    return json({
      status: 'complete',
      profile: {
        name: (convo[0]?.content || 'Companion').split(/[\s,]+/)[0],
        description: convo.map(m => m.content).join(' · '),
        species: 'unknown', voice_preset: 'mystical_female',
        personality: {
          ocean: { o: 0.75, c: 0.6, e: 0.55, a: 0.7, n: 0.4 },
          traits: ['curious', 'loyal', 'observant'],
          backstory: convo[0]?.content || 'A companion shaped from your description.',
        },
      },
    });
  }

  // ── MESH ENDPOINTS ──
  if (path === '/api/characters/mesh' && method === 'POST') return json({ taskId: 'demo-task', status: 'processing' });
  if (/^\/api\/characters\/mesh\/[^/]+$/.test(path))         return json({ status: 'ready', progress: 100, modelUrl: null });

  // ── WORLDS — both bare and {world,character,interactables} envelope ──
  if (path === '/api/worlds' && method === 'GET')  return json([DEMO_WORLD]);
  if (path === '/api/worlds' && method === 'POST') return json(DEMO_WORLD);

  // GET /api/worlds/:id — HomeScreen.loadWorld destructures {world, character, interactables}
  if (/^\/api\/worlds\/[^/]+$/.test(path) && method === 'GET') {
    return json({
      world: DEMO_WORLD,
      character: DEMO_CHARACTER,
      interactables: DEMO_INTERACTABLES,
    });
  }
  if (/^\/api\/worlds\/[^/]+$/.test(path) && method === 'DELETE') return json({ ok: true });

  // ── CHARACTERS (generic) ──
  if (/^\/api\/characters\/[^/]+$/.test(path) && method === 'GET')  return json(DEMO_CHARACTER);
  if (/^\/api\/characters\/[^/]+$/.test(path) && method === 'POST') {
    // Save profile → return full character record
    const merged = { ...DEMO_CHARACTER, ...(body.profile || {}), model_status: 'ready' };
    return json(merged);
  }

  // ── INTERACTION — useVoice posts to /api/interact/:worldId, NOT bare /api/interact ──
  if (/^\/api\/interact(\/[^/]+)?$/.test(path) && method === 'POST') {
    const line = DEMO_DIALOGUE[dialogueIndex % DEMO_DIALOGUE.length];
    dialogueIndex++;
    return json({
      worldState: DEMO_WORLD,
      sceneChanges: { summary: 'Stella turns to look at you.' },
      companion: {
        text: line.text, mood: line.mood,
        affection_delta: 0.05, trust_delta: 0.03,
      },
      task: dialogueIndex === 2
        ? { id: 't1', title: 'Follow the western light', description: 'Stella spotted something through the trees.' }
        : null,
      audioUrl: null,
      activeTasks: [],
    });
  }

  // ── LLM INVOKE — providers/router uses this for non-Puter/browser models ──
  if (path === '/api/llm/invoke' && method === 'POST') {
    // Return a generic companion-shaped response so the Companion runs even with no API keys
    const fallbackLine = DEMO_DIALOGUE[Math.floor(Math.random() * DEMO_DIALOGUE.length)];
    return json({
      text: fallbackLine.text,
      content: fallbackLine.text,
      role: 'assistant',
      mood: fallbackLine.mood,
      provider: 'demo',
      model: 'demo-canned',
    });
  }

  // ── SETTINGS / KEYS — Settings.jsx expects {keys: {...}} ──
  if (path === '/api/settings/status' || path === '/api/settings/key-flags') {
    return json({ keys: { openai: false, anthropic: false, groq: false, elevenlabs: false, meshy: false } });
  }

  // ── VOICE ──
  if (path === '/api/voice/stt'        && method === 'POST') return json({ text: '' });
  if (path === '/api/voice/transcribe' && method === 'POST') return json({ text: '' });
  if (path === '/api/voice/tts'        && method === 'POST') return json({ audioUrl: null });
  if (path === '/api/voice/synthesize' && method === 'POST') return json({ audioUrl: null });

  // ── INTERACTABLES (standalone) ──
  if (path.includes('/interactables')) return json([]);

  // ── DEFAULT — 200 OK with empty so the UI never blocks on a fetch ──
  console.warn('[demoMode] unhandled', method, path);
  return json({ demo: true, message: 'unhandled in demo' });
}

export function installDemoFetch() {
  if (!DEMO) return;
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('/api') || url.includes('/api/')) {
      return Promise.resolve(routeDemoRequest(url, init));
    }
    return origFetch(input, init);
  };
  console.log('%c🎬 Demo Mode Active','background:#cc88ff;color:#0a0218;padding:4px 8px;border-radius:4px;font-weight:bold');
}
