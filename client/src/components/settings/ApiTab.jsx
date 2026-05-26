// client/src/components/settings/ApiTab.jsx
import React, { useState, useMemo } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { forAgent, TIER, requiredKeyEnvs, byId } from '../../providers/registry';

const AGENTS = [
  { key: 'companion', label: 'Companion',   icon: '🤝', desc: 'Your AI friend\'s brain. Pick for max lifelike feel.' },
  { key: 'gm',        label: 'World GM',    icon: '🌍', desc: 'Generates the world. Needs huge context.' },
  { key: 'taskgen',   label: 'Task Gen',    icon: '⚡', desc: 'Fast, cheap tasks & objectives.' },
  { key: 'stt',       label: 'Voice In',    icon: '🎤', desc: 'Speech-to-text.' },
  { key: 'tts',       label: 'Voice Out',   icon: '🔊', desc: 'Text-to-speech.' }
];

const KEY_LABELS = {
  GROQ_API_KEY: 'Groq', GOOGLE_AI_API_KEY: 'Google AI Studio', CEREBRAS_API_KEY: 'Cerebras',
  OPENROUTER_API_KEY: 'OpenRouter', MISTRAL_API_KEY: 'Mistral', SAMBANOVA_API_KEY: 'SambaNova',
  GITHUB_TOKEN: 'GitHub Models', COHERE_API_KEY: 'Cohere', CLOUDFLARE_API_KEY: 'Cloudflare',
  HF_API_KEY: 'HuggingFace', TOGETHER_API_KEY: 'Together AI',
  OPENAI_API_KEY: 'OpenAI (paid)', ANTHROPIC_API_KEY: 'Anthropic (paid)',
  ELEVENLABS_API_KEY: 'ElevenLabs (paid)', INWORLD_API_KEY: 'Inworld (paid)',
  CARTESIA_API_KEY: 'Cartesia (paid)', DEEPGRAM_API_KEY: 'Deepgram (paid)', XAI_API_KEY: 'xAI (paid)'
};
const KEY_URLS = {
  GROQ_API_KEY: 'https://console.groq.com/keys', GOOGLE_AI_API_KEY: 'https://aistudio.google.com/apikey',
  CEREBRAS_API_KEY: 'https://cloud.cerebras.ai', OPENROUTER_API_KEY: 'https://openrouter.ai/keys',
  MISTRAL_API_KEY: 'https://console.mistral.ai/api-keys', SAMBANOVA_API_KEY: 'https://cloud.sambanova.ai/apis',
  GITHUB_TOKEN: 'https://github.com/settings/personal-access-tokens', COHERE_API_KEY: 'https://dashboard.cohere.com/api-keys',
  CLOUDFLARE_API_KEY: 'https://dash.cloudflare.com/profile/api-tokens', HF_API_KEY: 'https://huggingface.co/settings/tokens',
  TOGETHER_API_KEY: 'https://api.together.ai/settings/api-keys',
  OPENAI_API_KEY: 'https://platform.openai.com/api-keys', ANTHROPIC_API_KEY: 'https://console.anthropic.com/settings/keys',
  ELEVENLABS_API_KEY: 'https://elevenlabs.io/app/settings/api-keys', INWORLD_API_KEY: 'https://platform.inworld.ai',
  CARTESIA_API_KEY: 'https://play.cartesia.ai/keys', DEEPGRAM_API_KEY: 'https://console.deepgram.com/project/_/keys',
  XAI_API_KEY: 'https://console.x.ai'
};

const css = {
  section: { background: 'rgba(204,136,255,0.06)', border: '1px solid rgba(204,136,255,0.2)', borderRadius: 14, padding: 14, marginBottom: 14 },
  h: { fontSize: 13, fontWeight: 700, color: '#cc88ff', letterSpacing: 0.5, marginBottom: 4 },
  desc: { fontSize: 11, opacity: 0.7, marginBottom: 10 },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 600, flex: '0 0 90px' },
  select: { flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.45)', color: '#f0e8ff', border: '1px solid rgba(204,136,255,0.3)', fontSize: 12, fontWeight: 500 },
  badge: (tier) => ({ display: 'inline-block', padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: TIER[tier]?.color || '#888', color: '#0a0218', marginRight: 6 }),
  keyRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 },
  keyLabel: { fontSize: 11, fontWeight: 600, flex: '0 0 130px' },
  keyInput: { flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.55)', color: '#f0e8ff', border: '1px solid rgba(204,136,255,0.25)', fontSize: 11, fontFamily: 'monospace' },
  link: { fontSize: 10, color: '#88ddff', textDecoration: 'none', whiteSpace: 'nowrap' },
  filled: { color: '#88dd66', fontSize: 11, fontWeight: 700 },
  toggleBtn: { marginTop: 4, padding: '6px 12px', borderRadius: 8, background: 'rgba(204,136,255,0.12)', color: '#cc88ff', border: '1px solid rgba(204,136,255,0.35)', fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' },
  note: { fontSize: 10, opacity: 0.6, fontStyle: 'italic', marginTop: 6 }
};

function ProviderSelect({ agent }) {
  const pick = useSettingsStore(s => s.providerPicks[agent]);
  const setPick = useSettingsStore(s => s.setProviderPick);
  const hasKey = useSettingsStore(s => s.hasKey);

  const opts = useMemo(() => {
    // Already sorted best→worst in the registry. Disable items the user can't run.
    return forAgent(agent).map(p => ({
      ...p,
      disabled: p.keyRequired && !hasKey(p.keyEnv)
    }));
  }, [agent, hasKey]);

  return (
    <select style={css.select} value={pick || ''} onChange={(e) => setPick(agent, e.target.value)}>
      {opts.map(p => (
        <option key={p.id} value={p.id} disabled={p.disabled}>
          [{p.tier}] {p.label}{p.disabled ? ' — key needed' : ''}{p.notes ? ` · ${p.notes}` : ''}
        </option>
      ))}
    </select>
  );
}

export default function ApiTab() {
  const apiKeys = useSettingsStore(s => s.apiKeys);
  const setApiKey = useSettingsStore(s => s.setApiKey);
  const serverFlags = useSettingsStore(s => s.serverKeyFlags);
  const [showKeys, setShowKeys] = useState(false);

  const envs = requiredKeyEnvs();
  const freeEnvs = envs.filter(e => !KEY_LABELS[e]?.includes('paid'));
  const paidEnvs = envs.filter(e => KEY_LABELS[e]?.includes('paid'));

  return (
    <div>
      {/* Per-agent provider picks (Q2-C) */}
      <div style={css.section}>
        <div style={css.h}>PROVIDERS · per-agent</div>
        <div style={css.desc}>Dropdowns are sorted best→worst for this build. Locked options need an API key.</div>
        {AGENTS.map(a => (
          <div key={a.key} style={{ marginBottom: 12 }}>
            <div style={{ ...css.row, marginBottom: 4 }}>
              <span style={css.label}>{a.icon} {a.label}</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6, paddingLeft: 8 }}>{a.desc}</div>
            <ProviderSelect agent={a.key} />
          </div>
        ))}
      </div>

      {/* API Key vault — collapsed by default */}
      <div style={css.section}>
        <div style={css.h}>API KEYS · free tiers</div>
        <div style={css.desc}>Optional. Stored locally on this device. Unlocks server-side free providers.</div>
        <button style={css.toggleBtn} onClick={() => setShowKeys(v => !v)}>
          {showKeys ? '▲ Hide keys' : '▼ Reveal key inputs'}
        </button>
        {showKeys && (
          <div style={{ marginTop: 12 }}>
            {freeEnvs.map(env => (
              <div key={env} style={css.keyRow}>
                <span style={css.keyLabel}>{KEY_LABELS[env] || env}</span>
                <input
                  type="password"
                  style={css.keyInput}
                  placeholder={serverFlags[env] ? 'set on server' : 'paste key…'}
                  value={apiKeys[env] || ''}
                  onChange={(e) => setApiKey(env, e.target.value)}
                  autoComplete="off"
                />
                {KEY_URLS[env] && <a href={KEY_URLS[env]} target="_blank" rel="noreferrer" style={css.link}>get →</a>}
              </div>
            ))}
            <div style={css.note}>Keys never leave this browser. Server uses its own .env keys independently.</div>
          </div>
        )}
      </div>

      <div style={css.section}>
        <div style={css.h}>PREMIUM · paid overrides</div>
        <div style={css.desc}>Optional. Unlocks top-tier paid models when free tiers throttle.</div>
        <button style={css.toggleBtn} onClick={() => setShowKeys(v => !v)}>
          {showKeys ? '▲ Hide premium keys' : '▼ Reveal premium key inputs'}
        </button>
        {showKeys && (
          <div style={{ marginTop: 12 }}>
            {paidEnvs.map(env => (
              <div key={env} style={css.keyRow}>
                <span style={css.keyLabel}>{KEY_LABELS[env] || env}</span>
                <input
                  type="password"
                  style={css.keyInput}
                  placeholder={serverFlags[env] ? 'set on server' : 'paste key…'}
                  value={apiKeys[env] || ''}
                  onChange={(e) => setApiKey(env, e.target.value)}
                  autoComplete="off"
                />
                {KEY_URLS[env] && <a href={KEY_URLS[env]} target="_blank" rel="noreferrer" style={css.link}>get →</a>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
