// server/routes/settings.js
// GET  /api/settings/status  → which env API keys the server has (booleans only, never the keys)
// The client uses this to hide the premium toggle when no key is configured (Q3-C invisible button rule).

import express from 'express';

const PAID_ENVS = [
  'OPENAI_API_KEY','ANTHROPIC_API_KEY','ELEVENLABS_API_KEY','INWORLD_API_KEY',
  'CARTESIA_API_KEY','DEEPGRAM_API_KEY','XAI_API_KEY'
];
const FREE_ENVS = [
  'GROQ_API_KEY','GOOGLE_AI_API_KEY','CEREBRAS_API_KEY','OPENROUTER_API_KEY',
  'MISTRAL_API_KEY','SAMBANOVA_API_KEY','GITHUB_TOKEN','COHERE_API_KEY',
  'CLOUDFLARE_API_KEY','HF_API_KEY','TOGETHER_API_KEY'
];
const ALL_ENVS = [...FREE_ENVS, ...PAID_ENVS, 'NINEROUTER_BASE_URL','MESHY_API_KEY'];

export const settingsRouter = express.Router();

settingsRouter.get('/status', (_req, res) => {
  const keys = Object.fromEntries(ALL_ENVS.map(e => [e, !!(process.env[e] && process.env[e].length > 4)]));
  // Useful flags for the UI.
  const hasAnyPaid = PAID_ENVS.some(e => keys[e]);
  const hasAnyFree = FREE_ENVS.some(e => keys[e]);
  res.json({ keys, hasAnyPaid, hasAnyFree, nineRouterUrl: process.env.NINEROUTER_BASE_URL || 'http://localhost:20128/v1' });
});

export default settingsRouter;
