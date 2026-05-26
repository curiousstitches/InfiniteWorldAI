// client/src/services/webSpeech.js
// Native browser TTS & STT. Truly free, zero network calls, lowest quality.

const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

// ── TTS ─────────────────────────────────────────────────────
let cachedVoices = null;
async function loadVoices() {
  if (cachedVoices) return cachedVoices;
  return new Promise((resolve) => {
    const tryLoad = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length) { cachedVoices = v; resolve(v); }
    };
    tryLoad();
    if (!cachedVoices) {
      window.speechSynthesis.onvoiceschanged = () => tryLoad();
      setTimeout(() => { if (!cachedVoices) { cachedVoices = []; resolve([]); } }, 1500);
    }
  });
}

export async function webSpeechTTS({ text, voiceHint, rate = 1, pitch = 1, onEnd } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) throw new Error('web-speech-tts-unavailable');
  const voices = await loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  if (voiceHint && voices.length) {
    const m = voices.find(v => v.name.toLowerCase().includes(voiceHint.toLowerCase())) ||
              voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (m) u.voice = m;
  }
  u.rate = rate; u.pitch = pitch;
  return new Promise((resolve) => {
    u.onend = () => { onEnd?.(); resolve(); };
    u.onerror = () => { onEnd?.(); resolve(); };
    window.speechSynthesis.speak(u);
  });
}

export function cancelWebSpeechTTS() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── STT ─────────────────────────────────────────────────────
export function webSpeechSTTAvailable() { return !!SpeechRec; }

export function createWebSpeechSTT({ continuous = false, interimResults = true, lang = 'en-US', onResult, onEnd, onError } = {}) {
  if (!SpeechRec) throw new Error('web-speech-stt-unavailable');
  const rec = new SpeechRec();
  rec.continuous = continuous;
  rec.interimResults = interimResults;
  rec.lang = lang;
  rec.onresult = (e) => {
    let final = '', interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    onResult?.({ final, interim });
  };
  rec.onend = () => onEnd?.();
  rec.onerror = (e) => onError?.(e);
  return rec;
}
