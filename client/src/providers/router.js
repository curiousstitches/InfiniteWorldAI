// client/src/providers/router.js
// Unified per-agent invocation. Tries the cascade in order: configured pick → fallbacks → emergency.
// Emits the resolved provider id so the AI Status Panel can color-code it live.

import { byId, forAgent, DEFAULT_CASCADE, tierOf } from './registry';
import { puterChat, isPuterReady } from '../services/puterClient';
import { webSpeechTTS } from '../services/webSpeech';

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
  // Stable de-dupe preserving order: user pick first, then user-defined fallbacks, then defaults.
  const seen = new Set(), out = [];
  for (const id of [userPick, ...userFallbacks, ...defaults]) {
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
  if (provider.transport === '9router') return true;  // server-proxied, no key
  if (provider.transport === 'server' || provider.transport === 'paid') {
    return !!(settings?.apiKeys?.[provider.keyEnv]);
  }
  return false;
}

async function invokeServer(provider, body) {
  const res = await fetch(SERVER_INVOKE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ providerId: provider.id, ...body })
  });
  if (!res.ok) throw new Error(`server-invoke-${res.status}`);
  return res.json();
}

// Generic chat — try cascade until one works.
export async function invokeChat(agent, { messages, temperature = 0.85, max_tokens = 1024, settings }) {
  const cascade = buildCascade(agent, settings);
  let lastErr = null;
  for (const pid of cascade) {
    const p = byId(pid); if (!p) continue;
    if (!canInvoke(p, settings)) continue;
    try {
      let out;
      if (p.transport === 'puter') {
        out = await puterChat({ model: p.model, messages, temperature, max_tokens });
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
      // server / paid / 9router → upload via multipart
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
