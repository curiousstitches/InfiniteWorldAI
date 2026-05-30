// client/src/providers/registry.js
// Single source of truth for every AI provider Infiniteworlds knows about.
// Ordered best→worst per agent. Tier color drives the in-game model badge.

export const TIER = {
  S: { color: '#cc88ff', label: 'S', name: 'Lifelike' },        // violet
  A: { color: '#88ddff', label: 'A', name: 'High Quality' },    // cyan
  B: { color: '#88dd66', label: 'B', name: 'Fast Free' },       // green
  C: { color: '#ffcc66', label: 'C', name: 'Fallback' },        // amber
  E: { color: '#ff6666', label: 'E', name: 'Emergency' }        // red
};

export const TRANSPORT = {
  PUTER: 'puter',         // client-side, user-pays, no key
  SERVER_FREE: 'server',  // server-proxied free tier (needs API key)
  SERVER_PAID: 'paid',    // server-proxied paid (needs API key)
  BROWSER: 'browser'      // native browser API (Web Speech)
};

export const AGENT = { COMPANION: 'companion', GM: 'gm', TASKGEN: 'taskgen', STT: 'stt', TTS: 'tts' };

// LLM providers — ordered best→worst for THIS build (lifelike voice companion).
export const LLM_PROVIDERS = [
  // ── PUTER (client, $0, no key) ─────────────────────────────
  { id: 'puter:claude-opus-4-7',      label: 'Claude Opus 4.7 (Puter)',         tier: 'S', transport: 'puter',     model: 'claude-opus-4-7',         agents: ['companion','gm'],           keyRequired: false, free: true, notes: 'Most lifelike. Slowest.' },
  { id: 'puter:claude-sonnet-4-6',    label: 'Claude Sonnet 4.6 (Puter)',       tier: 'S', transport: 'puter',     model: 'claude-sonnet-4-6',       agents: ['companion','gm','taskgen'], keyRequired: false, free: true, notes: 'Best companion default.' },
  { id: 'puter:gpt-5.5-pro',          label: 'GPT-5.5 Pro (Puter)',             tier: 'S', transport: 'puter',     model: 'gpt-5.5-pro',             agents: ['companion','gm'],           keyRequired: false, free: true },
  { id: 'puter:gpt-5.4',              label: 'GPT-5.4 (Puter)',                 tier: 'A', transport: 'puter',     model: 'gpt-5.4',                 agents: ['companion','gm','taskgen'], keyRequired: false, free: true },
  { id: 'puter:gemini-3.5-flash',     label: 'Gemini 3.5 Flash (Puter)',        tier: 'A', transport: 'puter',     model: 'gemini-3.5-flash',        agents: ['companion','gm','taskgen'], keyRequired: false, free: true, notes: '1M context. Best for GM.' },
  { id: 'puter:gemini-3.1-pro',       label: 'Gemini 3.1 Pro (Puter)',          tier: 'S', transport: 'puter',     model: 'gemini-3.1-pro',          agents: ['companion','gm'],           keyRequired: false, free: true },
  { id: 'puter:deepseek-v4-pro',      label: 'DeepSeek v4 Pro (Puter)',         tier: 'A', transport: 'puter',     model: 'deepseek-v4-pro',         agents: ['gm','taskgen'],             keyRequired: false, free: true },
  { id: 'puter:gpt-5.4-mini',         label: 'GPT-5.4 Mini (Puter)',            tier: 'B', transport: 'puter',     model: 'gpt-5.4-mini',            agents: ['companion','taskgen'],      keyRequired: false, free: true },
  { id: 'puter:gpt-5.4-nano',         label: 'GPT-5.4 Nano (Puter)',            tier: 'B', transport: 'puter',     model: 'gpt-5.4-nano',            agents: ['taskgen'],                  keyRequired: false, free: true, notes: 'Cheapest, fastest Puter.' },
  // ── 9ROUTER (local proxy, $0, no key) ──────────────────────
  // ── SERVER FREE TIERS (key required) ───────────────────────
  { id: 'groq:llama-3.3-70b-versatile', label: 'Groq Llama 3.3 70B',            tier: 'B', transport: 'server',    model: 'llama-3.3-70b-versatile', agents: ['companion','gm','taskgen'], keyRequired: true,  free: true, keyEnv: 'GROQ_API_KEY', notes: '315 TPS. TaskGen ideal.' },
  { id: 'groq:llama-4-scout',           label: 'Groq Llama 4 Scout',            tier: 'B', transport: 'server',    model: 'llama-4-scout',           agents: ['gm','taskgen'],             keyRequired: true,  free: true, keyEnv: 'GROQ_API_KEY' },
  { id: 'google:gemini-2.5-flash',      label: 'Google Gemini 2.5 Flash',       tier: 'A', transport: 'server',    model: 'gemini-2.5-flash',        agents: ['companion','gm','taskgen'], keyRequired: true,  free: true, keyEnv: 'GOOGLE_AI_API_KEY', notes: '1500 RPD, 1M ctx.' },
  { id: 'google:gemini-2.5-flash-lite', label: 'Google Gemini 2.5 Flash-Lite',  tier: 'B', transport: 'server',    model: 'gemini-2.5-flash-lite',   agents: ['taskgen'],                  keyRequired: true,  free: true, keyEnv: 'GOOGLE_AI_API_KEY' },
  { id: 'cerebras:llama-3.3-70b',       label: 'Cerebras Llama 3.3 70B',        tier: 'B', transport: 'server',    model: 'llama-3.3-70b',           agents: ['gm','taskgen'],             keyRequired: true,  free: true, keyEnv: 'CEREBRAS_API_KEY', notes: '1M tokens/day, 2000 TPS.' },
  { id: 'openrouter:qwen2.5-72b-free',  label: 'OpenRouter Qwen 2.5 72B',       tier: 'B', transport: 'server',    model: 'qwen/qwen-2.5-72b-instruct:free', agents: ['companion','gm','taskgen'], keyRequired: true, free: true, keyEnv: 'OPENROUTER_API_KEY' },
  { id: 'openrouter:llama-3.2-11b-vision-free', label: 'OpenRouter Llama 3.2 11B Vision', tier: 'C', transport: 'server', model: 'meta-llama/llama-3.2-11b-vision-instruct:free', agents: ['gm','taskgen'], keyRequired: true, free: true, keyEnv: 'OPENROUTER_API_KEY' },
  { id: 'mistral:mistral-large',        label: 'Mistral Large',                 tier: 'A', transport: 'server',    model: 'mistral-large-latest',    agents: ['companion','gm'],           keyRequired: true,  free: true, keyEnv: 'MISTRAL_API_KEY', notes: '1B tokens/month free.' },
  { id: 'mistral:mistral-small',        label: 'Mistral Small',                 tier: 'B', transport: 'server',    model: 'mistral-small-latest',    agents: ['taskgen'],                  keyRequired: true,  free: true, keyEnv: 'MISTRAL_API_KEY' },
  { id: 'sambanova:llama-3.3-70b',      label: 'SambaNova Llama 3.3 70B',       tier: 'B', transport: 'server',    model: 'Meta-Llama-3.3-70B-Instruct', agents: ['gm','taskgen'],         keyRequired: true,  free: true, keyEnv: 'SAMBANOVA_API_KEY' },
  { id: 'github:gpt-5-mini',            label: 'GitHub Models GPT-5 Mini',      tier: 'B', transport: 'server',    model: 'gpt-5-mini',              agents: ['companion','taskgen'],      keyRequired: true,  free: true, keyEnv: 'GITHUB_TOKEN', notes: '~150 RPD.' },
  { id: 'cohere:command-r-plus',        label: 'Cohere Command R+',             tier: 'B', transport: 'server',    model: 'command-r-plus',          agents: ['gm'],                       keyRequired: true,  free: true, keyEnv: 'COHERE_API_KEY' },
  { id: 'cloudflare:llama-3.3-70b',     label: 'Cloudflare Llama 3.3 70B',      tier: 'C', transport: 'server',    model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', agents: ['taskgen'], keyRequired: true,  free: true, keyEnv: 'CLOUDFLARE_API_KEY' },
  { id: 'hf:qwen-2.5-72b',              label: 'HuggingFace Qwen 2.5 72B',      tier: 'C', transport: 'server',    model: 'Qwen/Qwen2.5-72B-Instruct', agents: ['taskgen'],                keyRequired: true,  free: true, keyEnv: 'HF_API_KEY' },
  { id: 'together:llama-3.3-70b',       label: 'Together Llama 3.3 70B',        tier: 'C', transport: 'server',    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', agents: ['taskgen'], keyRequired: true, free: true, keyEnv: 'TOGETHER_API_KEY', notes: '$5 starter credit.' },
  // ── PAID OVERRIDES (key required, premium) ────────────────
  { id: 'openai:gpt-5.5-pro',     label: 'OpenAI GPT-5.5 Pro (paid)',          tier: 'S', transport: 'paid', model: 'gpt-5.5-pro',           agents: ['companion','gm'],           keyRequired: true,  free: false, keyEnv: 'OPENAI_API_KEY' },
  { id: 'anthropic:opus-4-7',     label: 'Anthropic Claude Opus 4.7 (paid)',   tier: 'S', transport: 'paid', model: 'claude-opus-4-7',       agents: ['companion','gm'],           keyRequired: true,  free: false, keyEnv: 'ANTHROPIC_API_KEY' },
  { id: 'anthropic:sonnet-4-6',   label: 'Anthropic Claude Sonnet 4.6 (paid)', tier: 'S', transport: 'paid', model: 'claude-sonnet-4-6',     agents: ['companion','gm','taskgen'], keyRequired: true,  free: false, keyEnv: 'ANTHROPIC_API_KEY' },
  { id: 'google-paid:gemini-3.5-pro', label: 'Google Gemini 3.5 Pro (paid)',   tier: 'S', transport: 'paid', model: 'gemini-3.5-pro',        agents: ['companion','gm'],           keyRequired: true,  free: false, keyEnv: 'GOOGLE_AI_API_KEY' },
  { id: 'xai:grok-4',             label: 'xAI Grok 4 (paid)',                  tier: 'A', transport: 'paid', model: 'grok-4',                agents: ['companion','gm'],           keyRequired: true,  free: false, keyEnv: 'XAI_API_KEY' }
];

// Voice STT providers (best→worst for live conversation).
export const STT_PROVIDERS = [
  { id: 'browser:webspeech',           label: 'Web Speech (browser, free)',     tier: 'B', transport: 'browser', model: 'browser-native',            keyRequired: false, free: true, notes: 'Zero-call. Chrome/Edge/Safari.' },
  { id: 'groq:whisper-large-v3-turbo', label: 'Groq Whisper Turbo',             tier: 'S', transport: 'server',  model: 'whisper-large-v3-turbo',     keyRequired: true,  free: true, keyEnv: 'GROQ_API_KEY', notes: '228× realtime.' },
  { id: 'puter:whisper',                label: 'Puter Whisper (user-pays)',     tier: 'A', transport: 'puter',   model: 'whisper-1',                  keyRequired: false, free: true },
  { id: 'openai:whisper-paid',          label: 'OpenAI Whisper (paid)',         tier: 'A', transport: 'paid',    model: 'whisper-1',                  keyRequired: true,  free: false, keyEnv: 'OPENAI_API_KEY' },
  { id: 'deepgram:nova-3',              label: 'Deepgram Nova-3 (paid)',        tier: 'S', transport: 'paid',    model: 'nova-3',                     keyRequired: true,  free: false, keyEnv: 'DEEPGRAM_API_KEY' }
];

// Voice TTS providers (best→worst).
export const TTS_PROVIDERS = [
  { id: 'elevenlabs:turbo-v2.5',        label: 'ElevenLabs Turbo v2.5 (paid)',  tier: 'S', transport: 'paid',    model: 'eleven_turbo_v2_5',          keyRequired: true,  free: false, keyEnv: 'ELEVENLABS_API_KEY', notes: 'Sub-200ms, emotion.' },
  { id: 'inworld:realtime-tts-max',     label: 'Inworld Realtime TTS Max (paid)', tier: 'S', transport: 'paid', model: 'inworld-tts-1.5-max',       keyRequired: true,  free: false, keyEnv: 'INWORLD_API_KEY' },
  { id: 'cartesia:sonic',               label: 'Cartesia Sonic (paid)',         tier: 'S', transport: 'paid',    model: 'sonic-english',              keyRequired: true,  free: false, keyEnv: 'CARTESIA_API_KEY', notes: '~40ms TTFA.' },
  { id: 'puter:elevenlabs',             label: 'Puter ElevenLabs (user-pays)',  tier: 'A', transport: 'puter',   model: 'elevenlabs',                 keyRequired: false, free: true },
  { id: 'puter:openai-tts',             label: 'Puter OpenAI TTS (user-pays)',  tier: 'A', transport: 'puter',   model: 'tts-1-hd',                   keyRequired: false, free: true },
  { id: 'openai:tts-paid',              label: 'OpenAI TTS (paid)',             tier: 'A', transport: 'paid',    model: 'gpt-4o-mini-tts',            keyRequired: true,  free: false, keyEnv: 'OPENAI_API_KEY' },
  { id: 'deepgram:aura-2',              label: 'Deepgram Aura-2 (paid)',        tier: 'A', transport: 'paid',    model: 'aura-2',                     keyRequired: true,  free: false, keyEnv: 'DEEPGRAM_API_KEY' },
  { id: 'browser:webspeech-tts',        label: 'Web Speech TTS (browser, free)',tier: 'C', transport: 'browser', model: 'browser-native',             keyRequired: false, free: true, notes: 'Zero-call. Robotic.' }
];

// Default per-agent picks (the "mandatory best free" cascade).
export const DEFAULT_CASCADE = {
  companion: ['puter:claude-opus-4-7','puter:claude-sonnet-4-6','puter:gpt-5.5-pro','puter:gemini-3.5-flash'],
  gm:        ['puter:gemini-3.5-flash','google:gemini-2.5-flash','puter:claude-sonnet-4-6'],
  taskgen:   ['puter:gpt-5.4-nano','groq:llama-3.3-70b-versatile','puter:gpt-5.4-mini','cerebras:llama-3.3-70b'],
  stt:       ['browser:webspeech','groq:whisper-large-v3-turbo'],
  tts:       ['elevenlabs:turbo-v2.5','puter:elevenlabs','puter:openai-tts','browser:webspeech-tts']
};

// Helpers ------------------------------------------------------
export const allProviders = () => [...LLM_PROVIDERS, ...STT_PROVIDERS, ...TTS_PROVIDERS];
export const byId = (id) => allProviders().find(p => p.id === id) || null;
export const forAgent = (agent) => {
  if (agent === 'stt') return STT_PROVIDERS;
  if (agent === 'tts') return TTS_PROVIDERS;
  return LLM_PROVIDERS.filter(p => p.agents?.includes(agent));
};
export const tierOf = (id) => TIER[byId(id)?.tier] || TIER.C;

// Unique keyEnv set — used by Settings UI to render only the key fields actually needed.
export const requiredKeyEnvs = () => [...new Set(allProviders().filter(p => p.keyRequired).map(p => p.keyEnv))];
