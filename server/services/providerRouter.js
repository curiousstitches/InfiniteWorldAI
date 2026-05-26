// server/services/providerRouter.js
// Server-side counterpart to the client provider router.
// Handles every transport that ISN'T puter (client-only) or browser (browser-only).
// Each provider is an OpenAI-compatible chat completion call with the right baseURL + key.

import OpenAI from 'openai';

const NINEROUTER_BASE = process.env.NINEROUTER_BASE_URL || 'http://localhost:20128/v1';

// Provider configuration map — extracted from client registry (server keeps its own copy
// so it can run independently and validate at startup). The client picks an id; the server
// resolves the id → { baseURL, apiKey, model }.
const PROVIDER_CONFIG = {
  // ── 9router (no key) ───────────────────────────
  '9router:kr/claude-sonnet-4.5':       { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'kr/claude-sonnet-4.5' },
  '9router:kr/claude-haiku-4.5':        { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'kr/claude-haiku-4.5' },
  '9router:vertex/gemini-3.1-pro':      { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'vertex/gemini-3.1-pro-preview' },
  '9router:vertex/gemini-3-flash':      { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'vertex/gemini-3-flash-preview' },
  '9router:kr/glm-5':                   { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'kr/glm-5' },
  '9router:kr/MiniMax-M2.5':            { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'kr/MiniMax-M2.5' },
  '9router:kr/deepseek-3.2':            { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'kr/deepseek-3.2' },
  '9router:oc/auto':                    { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'oc/auto' },
  '9router:whisper':                    { baseURL: NINEROUTER_BASE, key: () => 'x',                                 model: 'whisper-1', kind: 'stt' },
  // ── Groq ───────────────────────────────────────
  'groq:llama-3.3-70b-versatile':       { baseURL: 'https://api.groq.com/openai/v1',                                 key: () => process.env.GROQ_API_KEY,        model: 'llama-3.3-70b-versatile' },
  'groq:llama-4-scout':                 { baseURL: 'https://api.groq.com/openai/v1',                                 key: () => process.env.GROQ_API_KEY,        model: 'llama-4-scout-17b-16e-instruct' },
  'groq:whisper-large-v3-turbo':        { baseURL: 'https://api.groq.com/openai/v1',                                 key: () => process.env.GROQ_API_KEY,        model: 'whisper-large-v3-turbo', kind: 'stt' },
  // ── Google AI Studio (Gemini, OpenAI-compatible /v1beta/openai) ─
  'google:gemini-2.5-flash':            { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',        key: () => process.env.GOOGLE_AI_API_KEY,   model: 'gemini-2.5-flash' },
  'google:gemini-2.5-flash-lite':       { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',        key: () => process.env.GOOGLE_AI_API_KEY,   model: 'gemini-2.5-flash-lite' },
  // ── Cerebras ───────────────────────────────────
  'cerebras:llama-3.3-70b':             { baseURL: 'https://api.cerebras.ai/v1',                                     key: () => process.env.CEREBRAS_API_KEY,    model: 'llama-3.3-70b' },
  // ── OpenRouter ─────────────────────────────────
  'openrouter:qwen2.5-72b-free':        { baseURL: 'https://openrouter.ai/api/v1',                                   key: () => process.env.OPENROUTER_API_KEY,  model: 'qwen/qwen-2.5-72b-instruct:free' },
  'openrouter:llama-3.2-11b-vision-free': { baseURL: 'https://openrouter.ai/api/v1',                                 key: () => process.env.OPENROUTER_API_KEY,  model: 'meta-llama/llama-3.2-11b-vision-instruct:free' },
  // ── Mistral ────────────────────────────────────
  'mistral:mistral-large':              { baseURL: 'https://api.mistral.ai/v1',                                      key: () => process.env.MISTRAL_API_KEY,     model: 'mistral-large-latest' },
  'mistral:mistral-small':              { baseURL: 'https://api.mistral.ai/v1',                                      key: () => process.env.MISTRAL_API_KEY,     model: 'mistral-small-latest' },
  // ── SambaNova ──────────────────────────────────
  'sambanova:llama-3.3-70b':            { baseURL: 'https://api.sambanova.ai/v1',                                    key: () => process.env.SAMBANOVA_API_KEY,   model: 'Meta-Llama-3.3-70B-Instruct' },
  // ── GitHub Models ──────────────────────────────
  'github:gpt-5-mini':                  { baseURL: 'https://models.inference.ai.azure.com',                          key: () => process.env.GITHUB_TOKEN,        model: 'gpt-5-mini' },
  // ── Cohere ─────────────────────────────────────
  'cohere:command-r-plus':              { baseURL: 'https://api.cohere.com/compatibility/v1',                        key: () => process.env.COHERE_API_KEY,      model: 'command-r-plus' },
  // ── Cloudflare ─────────────────────────────────
  'cloudflare:llama-3.3-70b':           { baseURL: () => `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`, key: () => process.env.CLOUDFLARE_API_KEY, model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
  // ── HuggingFace ────────────────────────────────
  'hf:qwen-2.5-72b':                    { baseURL: 'https://api-inference.huggingface.co/v1',                        key: () => process.env.HF_API_KEY,          model: 'Qwen/Qwen2.5-72B-Instruct' },
  // ── Together ───────────────────────────────────
  'together:llama-3.3-70b':             { baseURL: 'https://api.together.xyz/v1',                                    key: () => process.env.TOGETHER_API_KEY,    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  // ── Paid overrides ─────────────────────────────
  'openai:gpt-5.5-pro':                 { baseURL: 'https://api.openai.com/v1',                                      key: () => process.env.OPENAI_API_KEY,      model: 'gpt-5.5-pro' },
  'anthropic:opus-4-7':                 { baseURL: 'https://api.anthropic.com/v1',                                   key: () => process.env.ANTHROPIC_API_KEY,   model: 'claude-opus-4-7' },
  'anthropic:sonnet-4-6':               { baseURL: 'https://api.anthropic.com/v1',                                   key: () => process.env.ANTHROPIC_API_KEY,   model: 'claude-sonnet-4-6' },
  'google-paid:gemini-3.5-pro':         { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',        key: () => process.env.GOOGLE_AI_API_KEY,   model: 'gemini-3.5-pro' },
  'xai:grok-4':                         { baseURL: 'https://api.x.ai/v1',                                            key: () => process.env.XAI_API_KEY,         model: 'grok-4' }
};

// Default server-side fallback chains per agent (used when client doesn't pin a pick or pick is puter-only).
const DEFAULT_CASCADE = {
  companion: ['9router:kr/claude-sonnet-4.5','9router:vertex/gemini-3.1-pro','google:gemini-2.5-flash','groq:llama-3.3-70b-versatile','9router:kr/claude-haiku-4.5'],
  gm:        ['google:gemini-2.5-flash','9router:vertex/gemini-3-flash','9router:kr/claude-sonnet-4.5','cerebras:llama-3.3-70b','groq:llama-3.3-70b-versatile'],
  taskgen:   ['groq:llama-3.3-70b-versatile','9router:kr/MiniMax-M2.5','9router:kr/deepseek-3.2','cerebras:llama-3.3-70b','mistral:mistral-small','9router:oc/auto']
};

const isAvailable = (id) => {
  const c = PROVIDER_CONFIG[id]; if (!c) return false;
  const k = typeof c.key === 'function' ? c.key() : c.key;
  return !!k;
};

const buildCascade = (agent, providerPicks) => {
  const pick = providerPicks?.[agent];
  // Skip client-only picks (puter:* / browser:*) — they can't run server-side.
  const skipClientOnly = (id) => id && !id.startsWith('puter:') && !id.startsWith('browser:');
  const ordered = [skipClientOnly(pick) ? pick : null, ...DEFAULT_CASCADE[agent] || []].filter(Boolean);
  // Stable de-dupe.
  return [...new Set(ordered)];
};

const clientFor = (id) => {
  const c = PROVIDER_CONFIG[id]; if (!c) throw new Error(`unknown-provider:${id}`);
  const baseURL = typeof c.baseURL === 'function' ? c.baseURL() : c.baseURL;
  const apiKey  = typeof c.key === 'function' ? c.key() : c.key;
  if (!apiKey) throw new Error(`missing-key:${id}`);
  return new OpenAI({ baseURL, apiKey });
};

// Main entry — chat completion across the cascade.
export async function chat({ agent, providerPicks, messages, temperature = 0.85, max_tokens = 1024, json = false }) {
  const cascade = buildCascade(agent, providerPicks);
  let lastErr = null;
  for (const id of cascade) {
    if (!isAvailable(id)) continue;
    try {
      const client = clientFor(id);
      const resp = await client.chat.completions.create({
        model: PROVIDER_CONFIG[id].model,
        messages,
        temperature,
        max_tokens,
        ...(json ? { response_format: { type: 'json_object' } } : {})
      });
      const text = resp.choices?.[0]?.message?.content || '';
      return { text, providerId: id, model: PROVIDER_CONFIG[id].model };
    } catch (err) {
      console.warn(`[providerRouter] ${id} failed:`, err?.message || err);
      lastErr = err;
    }
  }
  throw new Error(`no-server-provider-succeeded:${agent}:${lastErr?.message || 'all-failed'}`);
}

// Audio transcription (STT) — Groq Whisper / 9router Whisper.
export async function transcribe({ providerPicks, audioFile }) {
  const cascade = buildCascade('stt', providerPicks).filter(id => PROVIDER_CONFIG[id]?.kind === 'stt');
  // Add explicit fallbacks if cascade empties.
  const ids = cascade.length ? cascade : ['groq:whisper-large-v3-turbo','9router:whisper'];
  let lastErr = null;
  for (const id of ids) {
    if (!isAvailable(id)) continue;
    try {
      const client = clientFor(id);
      const resp = await client.audio.transcriptions.create({
        file: audioFile,
        model: PROVIDER_CONFIG[id].model
      });
      return { text: resp.text || '', providerId: id };
    } catch (err) {
      console.warn(`[stt] ${id} failed:`, err?.message || err);
      lastErr = err;
    }
  }
  throw new Error(`no-stt:${lastErr?.message || 'all-failed'}`);
}

export const SERVER_PROVIDER_IDS = Object.keys(PROVIDER_CONFIG);
export const isProviderAvailable = isAvailable;
