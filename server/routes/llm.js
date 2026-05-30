// server/routes/llm.js
// POST /api/llm/invoke
//   { providerId, messages, temperature, max_tokens, json }
// Used by the client provider router when the chosen provider lives server-side
// (Groq, Google, Cerebras, OpenRouter, Mistral, 9router, paid overrides).

import express from 'express';
import { chat, isProviderAvailable } from '../services/providerRouter.js';

export const llmRouter = express.Router();

llmRouter.post('/invoke', async (req, res) => {
  const { providerId, messages, temperature = 0.85, max_tokens = 1024, json = false, agent, byokKey } = req.body || {};
  if (!providerId || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'providerId and messages required' });
  }
  if (providerId.startsWith('puter:') || providerId.startsWith('browser:')) {
    return res.status(400).json({ error: 'client-only-provider' });
  }
  if (!byokKey && !isProviderAvailable(providerId)) {
    return res.status(503).json({ error: 'provider-not-configured', providerId });
  }
  try {
    const out = await chat({
      agent: agent || 'companion',
      providerPicks: { companion: providerId, gm: providerId, taskgen: providerId },
      messages,
      temperature,
      max_tokens,
      json,
      byokKey: byokKey || null,
    });
    res.json(out);
  } catch (err) {
    console.error('[llm/invoke]', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

export default llmRouter;
