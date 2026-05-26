// client/src/services/puterClient.js
// Thin wrapper around window.puter loaded via <script src="https://js.puter.com/v2/"> in index.html.
// Provides chat/stream/tts/stt with the same interface as the server providerRouter so callers don't care.

const ready = () => typeof window !== 'undefined' && typeof window.puter !== 'undefined';

export async function puterChat({ model, messages, temperature = 0.85, max_tokens = 1024 }) {
  if (!ready()) throw new Error('puter-sdk-not-loaded');
  const resp = await window.puter.ai.chat(messages, { model, temperature, max_tokens });
  // Puter normalizes responses; handle both shapes.
  if (typeof resp === 'string') return { text: resp, model };
  if (resp?.message?.content) {
    const c = resp.message.content;
    if (Array.isArray(c)) return { text: c.map(b => b.text || '').join('').trim(), model };
    return { text: String(c).trim(), model };
  }
  return { text: String(resp ?? '').trim(), model };
}

export async function puterChatStream({ model, messages, temperature = 0.85, onChunk }) {
  if (!ready()) throw new Error('puter-sdk-not-loaded');
  const stream = await window.puter.ai.chat(messages, { model, temperature, stream: true });
  let full = '';
  for await (const part of stream) {
    const t = part?.text || part?.message?.content?.[0]?.text || '';
    if (t) { full += t; onChunk?.(t); }
  }
  return { text: full.trim(), model };
}

export async function puterTTS({ text, voice = 'aria', model = 'tts-1-hd' }) {
  if (!ready()) throw new Error('puter-sdk-not-loaded');
  // window.puter.ai.txt2speech returns an HTMLAudioElement; we hand it back for the caller to play.
  const audio = await window.puter.ai.txt2speech(text, { voice, model });
  return audio;
}

export async function puterSTT({ blob, model = 'whisper-1' }) {
  if (!ready()) throw new Error('puter-sdk-not-loaded');
  if (typeof window.puter.ai.speech2text !== 'function') throw new Error('puter-stt-unavailable');
  const text = await window.puter.ai.speech2text(blob, { model });
  return { text: typeof text === 'string' ? text : (text?.text || '') };
}

export function isPuterReady() { return ready(); }
