import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { worldRouter, charRouter } from './routes/world.js';
import voiceRouter from './routes/voice.js';
import interactRouter from './routes/interact.js';
import settingsRouter from './routes/settings.js';
import llmRouter from './routes/llm.js';
import { pollTask } from './services/meshy.js';
import { run, get } from './db/client.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/models', express.static('./data/models'));

app.use('/api/worlds', worldRouter);
app.use('/api/characters', charRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/interact', interactRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/llm', llmRouter);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// WebSocket — used for Meshy polling progress and real-time world events
const worldConnections = new Map(); // worldId → Set<ws>

wss.on('connection', (ws) => {
  let worldId = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'subscribe' && msg.worldId) {
        worldId = msg.worldId;
        if (!worldConnections.has(worldId)) worldConnections.set(worldId, new Set());
        worldConnections.get(worldId).add(ws);
        ws.send(JSON.stringify({ type: 'subscribed', worldId }));
      }
      if (msg.type === 'poll_model' && msg.taskId && msg.characterId) {
        pollMeshyTask(msg.taskId, msg.characterId, ws);
      }
    } catch {}
  });

  ws.on('close', () => {
    if (worldId && worldConnections.has(worldId)) {
      worldConnections.get(worldId).delete(ws);
    }
  });
});

const pollMeshyTask = async (taskId, characterId, ws) => {
  try {
    ws.send(JSON.stringify({ type: 'model_progress', progress: 10, characterId }));
    const result = await pollTask(taskId, 60, 5000);
    const modelUrl = result.model_urls?.glb || result.model_urls?.obj;
    run('UPDATE characters SET model_url=?, model_status=? WHERE id=?', [modelUrl, 'ready', characterId]);
    ws.send(JSON.stringify({ type: 'model_ready', modelUrl, characterId }));
  } catch (e) {
    run('UPDATE characters SET model_status=? WHERE id=?', ['fallback', characterId]);
    ws.send(JSON.stringify({ type: 'model_fallback', characterId, error: e.message }));
  }
};

export const broadcastToWorld = (worldId, payload) => {
  const conns = worldConnections.get(worldId);
  if (!conns) return;
  const msg = JSON.stringify(payload);
  for (const ws of conns) {
    if (ws.readyState === 1) ws.send(msg);
  }
};

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🌍 Infiniteworlds server on :${PORT}`));
