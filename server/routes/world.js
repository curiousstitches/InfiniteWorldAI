import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { query, run, get } from '../db/client.js';
import { runCharacterCreator } from '../agents/companion.js';
import { generateCharacterModel, createTextTo3DTask, pollTask, refineTask } from '../services/meshy.js';
import { VOICE_PRESETS } from '../services/elevenlabs.js';

const worldRouter = Router();
const charRouter = Router();

// ── World Routes ──────────────────────────────────────────────────────────────

worldRouter.post('/', (req, res) => {
  const id = uuidv4();
  const name = req.body.name || `World ${Date.now()}`;
  run('INSERT INTO worlds(id, name) VALUES(?,?)', [id, name]);
  res.json(get('SELECT * FROM worlds WHERE id=?', [id]));
});

worldRouter.get('/', (req, res) => {
  res.json(query('SELECT * FROM worlds WHERE is_active=1 ORDER BY updated_at DESC'));
});

worldRouter.get('/:id', (req, res) => {
  const world = get('SELECT * FROM worlds WHERE id=?', [req.params.id]);
  if (!world) return res.status(404).json({ error: 'Not found' });
  const character = get('SELECT * FROM characters WHERE world_id=?', [req.params.id]);
  const activeTasks = query("SELECT * FROM tasks WHERE world_id=? AND status='active'", [req.params.id]);
  const interactables = query("SELECT * FROM interactables WHERE world_id=? AND is_active=1", [req.params.id]);
  res.json({ world, character, activeTasks, interactables });
});

worldRouter.delete('/:id', (req, res) => {
  const { keepLegacy } = req.body;
  const world = get('SELECT * FROM worlds WHERE id=?', [req.params.id]);
  if (!world) return res.status(404).json({ error: 'Not found' });

  if (keepLegacy) {
    const convos = query('SELECT content FROM conversations WHERE world_id=? ORDER BY timestamp DESC LIMIT 10', [req.params.id]);
    const tasks = query("SELECT title, description FROM tasks WHERE world_id=? AND status='completed'", [req.params.id]);
    const fragments = [
      ...convos.map(c => ({ id: uuidv4(), source_world_id: req.params.id, echo_type: 'memory', content: c.content })),
      ...tasks.map(t => ({ id: uuidv4(), source_world_id: req.params.id, echo_type: 'legend', content: `${t.title}: ${t.description}` })),
    ];
    for (const f of fragments) {
      run('INSERT INTO legacy_echoes(id,source_world_id,echo_type,content) VALUES(?,?,?,?)',
        [f.id, f.source_world_id, f.echo_type, f.content]);
    }
  }

  run('UPDATE worlds SET is_active=0 WHERE id=?', [req.params.id]);
  res.json({ deleted: true, legacyPreserved: keepLegacy });
});

worldRouter.get('/:id/legacy', (req, res) => {
  const echoes = query('SELECT * FROM legacy_echoes ORDER BY created_at DESC LIMIT 20', []);
  res.json(echoes);
});

// ── Character Routes ──────────────────────────────────────────────────────────

charRouter.post('/create-step', async (req, res) => {
  const { userInput, conversationSoFar = [] } = req.body;
  const result = await runCharacterCreator(userInput, conversationSoFar);
  res.json(result);
});

charRouter.post('/:worldId', async (req, res) => {
  const { profile } = req.body;
  const { worldId } = req.params;
  const id = uuidv4();
  const voiceId = VOICE_PRESETS[profile.voiceType] || VOICE_PRESETS.mystical_female;

  run(`INSERT INTO characters(id,world_id,name,description,race,personality,appearance,voice_id,traits,model_status)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [id, worldId, profile.name, profile.meshPrompt || profile.appearance,
     profile.race, profile.personality, profile.appearance,
     voiceId, JSON.stringify(profile.traits || []), 'pending']
  );

  // Kick off async 3D model generation
  if (process.env.MESHY_API_KEY && profile.meshPrompt) {
    generateCharacterModel(profile.meshPrompt, worldId, id).then(({ taskId }) => {
      run('UPDATE characters SET model_status=?, metadata=? WHERE id=?',
        ['processing', JSON.stringify({ meshyTaskId: taskId }), id]);
    }).catch(() => {
      run('UPDATE characters SET model_status=? WHERE id=?', ['fallback', id]);
    });
  } else {
    run('UPDATE characters SET model_status=? WHERE id=?', ['fallback', id]);
  }

  res.json(get('SELECT * FROM characters WHERE id=?', [id]));
});

charRouter.get('/:worldId', (req, res) => {
  const c = get('SELECT * FROM characters WHERE world_id=?', [req.params.worldId]);
  res.json(c || null);
});

// ── Mesh generation endpoints used by client/src/services/meshSource.js ──────

charRouter.post('/mesh', async (req, res) => {
  if (!process.env.MESHY_API_KEY) return res.status(503).json({ error: 'meshy-not-configured' });
  const { prompt, art_style = 'realistic', enable_auto_rig = true, negative_prompt = '' } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt-required' });
  try {
    const taskId = await createTextTo3DTask(prompt, { art_style, enable_auto_rig, negativePrompt: negative_prompt });
    res.json({ taskId, status: 'processing' });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

charRouter.get('/mesh/:taskId', async (req, res) => {
  if (!process.env.MESHY_API_KEY) return res.status(503).json({ error: 'meshy-not-configured' });
  try {
    // One-shot poll (no wait) — return current state immediately.
    const r = await fetch(`https://api.meshy.ai/v2/text-to-3d/${req.params.taskId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MESHY_API_KEY}` }
    });
    const data = await r.json();
    res.json({
      status: data.status === 'SUCCEEDED' ? 'ready' : data.status === 'FAILED' ? 'failed' : 'processing',
      progress: data.progress ?? 0,
      modelUrl: data.model_urls?.glb || data.model_urls?.obj || null
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

export { worldRouter, charRouter };
