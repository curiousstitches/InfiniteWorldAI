// server/routes/voice.js
// Voice IN  → /transcribe  — multipart upload, routes through providerRouter STT cascade
// Voice OUT → /synthesize  — text-in, audio-out, ElevenLabs when key present (server-side path only)

import { Router } from 'express';
import multer from 'multer';
import { transcribe } from '../services/providerRouter.js';
import { synthesizeSpeech, VOICE_PRESETS } from '../services/elevenlabs.js';
import { get } from '../db/client.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Adapt a multer file (buffer) into a Web-API File the OpenAI SDK accepts.
const toFile = (req) => new File([req.file.buffer], req.file.originalname || 'in.webm', { type: req.file.mimetype || 'audio/webm' });

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file' });
  const providerPicks = req.body?.providerId ? { stt: req.body.providerId } : undefined;
  try {
    const { text, providerId } = await transcribe({ providerPicks, audioFile: toFile(req) });
    res.json({ transcript: text, text, providerId });
  } catch (err) {
    console.error('[stt]', err);
    res.status(503).json({ error: 'no-stt-available', detail: String(err?.message || err) });
  }
});

router.post('/synthesize', async (req, res) => {
  const { text, providerId, emotion = 'neutral' } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: 'no-text' });
  // Server-side TTS path is currently ElevenLabs only (key required). Client should call its own
  // Puter / Web Speech path when no paid key is present.
  if (!process.env.ELEVENLABS_API_KEY) return res.status(503).json({ error: 'no-paid-tts-key' });
  try {
    const audio = await synthesizeSpeech(text, VOICE_PRESETS.mystical_female, emotion);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Provider-Id', providerId || 'elevenlabs:turbo-v2.5');
    res.send(audio);
  } catch (err) {
    console.error('[tts]', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Legacy per-world synthesize (kept for backward compatibility).
router.post('/synthesize/:worldId', async (req, res) => {
  const { text, emotion = 'neutral' } = req.body;
  if (!process.env.ELEVENLABS_API_KEY) return res.status(503).json({ error: 'no-paid-tts-key' });
  const character = get('SELECT voice_id FROM characters WHERE world_id=?', [req.params.worldId]);
  const voiceId = character?.voice_id || VOICE_PRESETS.mystical_female;
  const audio = await synthesizeSpeech(text, voiceId, emotion);
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(audio);
});

router.get('/voices', (_req, res) => res.json(VOICE_PRESETS));

export default router;
