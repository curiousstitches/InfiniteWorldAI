// client/src/providers/router.js
// Unified per-agent invocation. Tries the cascade in order: configured pick → fallbacks → emergency.
// Emits the resolved provider id so the AI Status Panel can color-code it live.

import { byId, forAgent, DEFAULT_CASCADE, tierOf } from './registry';
import { getGateState, getOwnKey } from '../services/providerGate';
import { puterChat, isPuterReady } from '../services/puterClient';
import { webSpeechTTS } from '../services/webSpeech';
import { consumeUsage } from '../services/usageLimiter';

// Server proxy endpoint — used for any transport that isn't 'puter' or 'browser'.
const SERVER_INVOKE = '/api/llm/invoke';

// In-flight provider tracker — components subscribe to render the model badge.
const listeners = new Set();
let lastActive = { companion: null, gm: null, taskgen: null, stt: null, tts: null };

export function onProviderChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getActive() { return lastActive; }

function setActive(agent, providerId) {
  lastActive = { ...lastActive, [agent]: providerId };
  listeners.forEach(fn => { try { fn(lastActive); } catch (e) { /* ignore */ } });
}

// Build the ordered try-list for a given agent + user settings.
function buildCascade(agent, settings) {
  const userPick = settings?.providerPicks?.[agent];
  const userFallbacks = settings?.providerFallbacks?.[agent] || [];
  const defaults = DEFAULT_CASCADE[agent] || [];

  // The provider gate's chosen id (e.g. a BYOK 'groq:...' or 'puter:...') leads the cascade.
  const gate = getGateState?.();
  let gateLead = [];
  if (gate?.transport === 'byok' && gate.ownKeyProvider) {
    // Find a registry provider in this family that serves this agent.
    const fam = gate.ownKeyProvider;
    gateLead = (DEFAULT_CASCADE[agent] || [])
      .concat(forAgent(agent).map(p => p.id))
      .filter(id => id.startsWith(fam + ':'));
  } else if (gate?.transport === 'puter') {
    gateLead = (DEFAULT_CASCADE[agent] || []).filter(id => id.startsWith('puter:'));
    // Ensure at least one puter option leads even if not in defaults.
    if (!gateLead.length) gateLead = ['puter:claude-sonnet-4-6'];
  } else if (gate?.transport === 'server') {
    gateLead = (DEFAULT_CASCADE[agent] || []).filter(id => id.startsWith('groq:'));
  }

  const seen = new Set(), out = [];

  // If the user pasted a server-side API key (e.g. Groq), lead with providers that use
  // it — Puter requires interactive auth and silently fails on hosted mobile, so a pasted
  // key should take priority and actually produce replies.
  const keyedLead = [];
  const keys = settings?.apiKeys || {};
  for (const id of (DEFAULT_CASCADE[agent] || []).concat(forAgent(agent).map(p => p.id))) {
    const p = byId(id);
    if (p && (p.transport === 'server' || p.transport === 'paid') && p.keyEnv && keys[p.keyEnv]) {
      keyedLead.push(id);
    }
  }

  for (const id of [...gateLead, ...keyedLead, userPick, ...userFallbacks, ...defaults]) {
    if (!id || seen.has(id)) continue;
    seen.add(id); out.push(id);
  }
  return out;
}

// Decide whether a provider is invokable given the user's available keys.
function canInvoke(provider, settings) {
  if (!provider) return false;
  if (provider.transport === 'puter')   return isPuterReady();
  if (provider.transport === 'browser') return typeof window !== 'undefined' && !!window.speechSynthesis;
  if (provider.transport === 'server' || provider.transport === 'paid') {
    // Server env key OR the player's own gate key (matched by provider family).
    if (settings?.apiKeys?.[provider.keyEnv]) return true;
    const gateKey = getOwnKey();
    if (gateKey?.key) {
      const fam = (provider.id.split(':')[0] || '').toLowerCase();
      return gateKey.provider === fam || gateKey.provider === 'any';
    }
    return false;
  }
  return false;
}

async function invokeServer(provider, body) {
  // If the player pasted their own key in the gate, send it so the server uses THEIR
  // key (their cost, their rate limit) instead of any server env key.
  const gateKey = getOwnKey();
  const res = await fetch(SERVER_INVOKE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      providerId: provider.id,
      ...body,
      byokKey: gateKey?.key || undefined,
      byokProvider: gateKey?.provider || undefined,
    })
  });
  if (!res.ok) throw new Error(`server-invoke-${res.status}`);
  return res.json();
}

// Generic chat — try cascade until one works.
export async function invokeChat(agent, { messages, temperature = 0.85, max_tokens = 1024, settings }) {
  // Daily usage cap (per browser). Users with their own API key bypass it.
  const gateKey = getOwnKey();
  const hasOwnKey = !!gateKey || !!(settings?.apiKeys && Object.values(settings.apiKeys).some(Boolean));
  const usage = consumeUsage(hasOwnKey);
  if (!usage.allowed) {
    throw new Error(`daily-limit-reached:${usage.cap}`);
  }

  const cascade = buildCascade(agent, settings);
  let lastErr = null;
  for (const pid of cascade) {
    const p = byId(pid); if (!p) continue;
    if (!canInvoke(p, settings)) continue;
    try {
      let out;
      if (p.transport === 'puter') {
        out = await puterChat({ model: p.model, messages, temperature, max_tokens });
        // Puter returns empty when unauthenticated/blocked — treat as failure so we fall through.
        if (!out || !out.text || !out.text.trim()) throw new Error('puter-empty-or-unauthed');
      } else {
        out = await invokeServer(p, { messages, temperature, max_tokens });
      }
      setActive(agent, p.id);
      return { ...out, providerId: p.id, tier: tierOf(p.id) };
    } catch (err) {
      lastErr = err;
      // Continue to next fallback.
    }
  }
  setActive(agent, null);
  throw new Error(`no-provider-succeeded:${agent}:${lastErr?.message || 'all-failed'}`);
}

// TTS — same cascade pattern but routes to playable audio.
export async function invokeTTS({ text, settings, onEnd }) {
  const cascade = buildCascade('tts', settings);
  for (const pid of cascade) {
    const p = byId(pid); if (!p) continue;
    if (!canInvoke(p, settings)) continue;
    try {
      if (p.transport === 'browser') {
        setActive('tts', p.id);
        await webSpeechTTS({ text, onEnd });
        return { providerId: p.id, tier: tierOf(p.id) };
      }
      if (p.transport === 'puter') {
        const { puterTTS } = await import('../services/puterClient');
        const audio = await puterTTS({ text, model: p.model });
        setActive('tts', p.id);
        audio.onended = () => onEnd?.();
        audio.play();
        return { providerId: p.id, tier: tierOf(p.id), audio };
      }
      // server / paid → fetch streamed audio from server
      const res = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerId: p.id, text })
      });
      if (!res.ok) throw new Error(`tts-${res.status}`);
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => onEnd?.();
      audio.play();
      setActive('tts', p.id);
      return { providerId: p.id, tier: tierOf(p.id), audio };
    } catch (err) {
      // Try the next provider in the cascade.
    }
  }
  setActive('tts', null);
  throw new Error('no-tts-provider');
}

// STT — accepts a Blob; routes to the configured cascade.
export async function invokeSTT({ blob, settings }) {
  const cascade = buildCascade('stt', settings);
  for (const pid of cascade) {
    const p = byId(pid); if (!p) continue;
    if (!canInvoke(p, settings)) continue;
    try {
      if (p.transport === 'browser') {
        // Browser STT is live-streamed, not blob-based — caller should use createWebSpeechSTT directly.
        // We skip it here so the cascade falls to a blob-capable provider.
        continue;
      }
      if (p.transport === 'puter') {
        const { puterSTT } = await import('../services/puterClient');
        const out = await puterSTT({ blob, model: p.model });
        setActive('stt', p.id);
        return { ...out, providerId: p.id, tier: tierOf(p.id) };
      }
      // server / paid → upload via multipart
      const fd = new FormData();
      fd.append('audio', blob, 'in.webm');
      fd.append('providerId', p.id);
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`stt-${res.status}`);
      const out = await res.json();
      setActive('stt', p.id);
      return { ...out, providerId: p.id, tier: tierOf(p.id) };
    } catch (err) { /* fall through */ }
  }
  setActive('stt', null);
  throw new Error('no-stt-provider');
}
