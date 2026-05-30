import fetch from 'node-fetch';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = 'https://api.meshy.ai';
const HEADERS = () => ({
  'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
  'Content-Type': 'application/json',
});

export const FALLBACK_MODELS = {
  humanoid:   '/models/fallback/humanoid.glb',
  beast:      '/models/fallback/beast.glb',
  creature:   '/models/fallback/creature.glb',
  spirit:     '/models/fallback/spirit.glb',
  animal:     '/models/fallback/animal.glb',
};

export const createTextTo3DTask = async (prompt, opts = {}) => {
  const {
    negativePrompt = 'low quality, blurry, distorted, ugly, deformed, two heads',
    art_style = 'realistic',
    enable_auto_rig = true,
    should_remesh = true,
    mode = 'preview'
  } = opts;
  const r = await fetch(`${BASE}/v2/text-to-3d`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      mode,
      prompt,
      negative_prompt: negativePrompt,
      art_style,
      should_remesh,
      enable_auto_rig
    })
  });
  if (!r.ok) throw new Error(`Meshy task creation failed: ${r.status}`);
  const data = await r.json();
  return data.result;
};

export const pollTask = async (taskId, maxAttempts = 60, intervalMs = 5000) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const r = await fetch(`${BASE}/v2/text-to-3d/${taskId}`, { headers: HEADERS() });
    const data = await r.json();
    if (data.status === 'SUCCEEDED') return data;
    if (data.status === 'FAILED') throw new Error(`Meshy task failed: ${data.task_error?.message}`);
  }
  throw new Error('Meshy task timed out');
};

export const generateCharacterModel = async (prompt, worldId, characterId) => {
  const taskId = await createTextTo3DTask(prompt);
  // Return taskId immediately; client polls via WebSocket
  return { taskId, status: 'processing' };
};

export const refineTask = async (previewTaskId) => {
  const r = await fetch(`${BASE}/v2/text-to-3d`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({ mode: 'refine', preview_task_id: previewTaskId }),
  });
  const data = await r.json();
  return data.result;
};

export const downloadModel = async (url, savePath) => {
  mkdirSync(savePath.split('/').slice(0, -1).join('/'), { recursive: true });
  const r = await fetch(url);
  const buf = await r.buffer();
  writeFileSync(savePath, buf);
  return savePath;
};
