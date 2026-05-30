import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { worldRouter, charRouter } from './routes/world.js';
import voiceRouter from './routes/voice.js';
import interactRouter from './routes/interact.js';
import settingsRouter from './routes/settings.js';
import llmRouter from './routes/llm.js';
import { authRouter } from './routes/auth.js';
import { pollTask } from './services/meshy.js';
import { run, get } from './db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Safety net: a failed AI provider or async error must never crash the whole server.
// Log and keep running so the client can fall back to other providers.
process.on('unhandledRejection', (reason) => {
  console.warn('[unhandledRejection]', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('[uncaughtException]', err?.message || err);
});
const server = createServer(app);
const wss = new WebSocketServer({ server });

// CORS — allow the configured client origin, or all in single-service mode.
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());
app.use('/models', express.static('./data/models'));

app.use('/api/worlds', worldRouter);
app.use('/api/characters', charRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/interact', interactRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/llm', llmRouter);
app.use('/api/auth', authRouter);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// Private admin page — paste your ADMIN_PASSWORD to view the user log.
app.get('/admin', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin · Users</title><style>body{font-family:system-ui;background:#0a0418;color:#eee;padding:20px;max-width:600px;margin:auto}
  input,button{padding:12px;border-radius:8px;border:1px solid #555;background:#1a0a38;color:#fff;font-size:15px;width:100%;margin:6px 0;box-sizing:border-box}
  button{background:linear-gradient(135deg,#cc88ff,#7a3acc);border:none;font-weight:700;cursor:pointer}
  table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #333;padding:8px;text-align:left;font-size:13px}
  .muted{color:#888;font-size:12px}</style></head><body>
  <h2>User Log</h2><p class="muted">Private — only viewable with your admin password.</p>
  <input id="pw" type="password" placeholder="Admin password"/><button onclick="load()">View users</button>
  <div id="out"></div>
  <script>
    async function load(){
      const r=await fetch('/api/auth/admin/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});
      const o=document.getElementById('out');
      if(!r.ok){o.innerHTML='<p style="color:#f88">Wrong password.</p>';return;}
      const d=await r.json();
      let h='<p>'+d.count+' users</p><table><tr><th>Email</th><th>Joined</th><th>Last seen</th><th>Worlds</th></tr>';
      for(const u of d.users){const j=new Date(u.created_at*1000).toLocaleDateString();const s=new Date(u.last_seen*1000).toLocaleDateString();
      h+='<tr><td>'+u.email+'</td><td>'+j+'</td><td>'+s+'</td><td>'+u.world_count+'</td></tr>';}
      o.innerHTML=h+'</table>';
    }
  </script></body></html>`);
});

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

// ── Serve the built client (single-service deploy on Railway/Render/VPS) ──
// The Dockerfile / build step places the Vite build at ../client-dist (or ../client/dist in dev).
const CLIENT_DIST = [
  join(__dirname, '../client-dist'),
  join(__dirname, '../client/dist'),
].find(existsSync);

if (CLIENT_DIST) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback — any non-API route returns index.html so client routing works.
  app.get(/^\/(?!api|models).*/, (_, res) => res.sendFile(join(CLIENT_DIST, 'index.html')));
  console.log(`📦 Serving client from ${CLIENT_DIST}`);
} else {
  console.log('ℹ️  No client build found — running API-only (dev mode uses Vite on :5173)');
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🌍 Infiniteworlds server on :${PORT}`));
