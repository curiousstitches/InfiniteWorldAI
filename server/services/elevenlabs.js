import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const el = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

export const VOICE_PRESETS = {
  mystical_female:  'EXAVITQu4vr4xnSDxMaL',
  deep_male:        'VR6AewLTigWG4xSOukaG',
  playful_creature: 'yoZ06aMxZJJ28mfd3POQ',
  ancient_beast:    'pNInz6obpgDQGcFmaJgB',
  ethereal_spirit:  'jBpfuIE2acCO8z3wKNLl',
  gruff_warrior:    'g5CIjZEefAph4nQFvHAz',
  wise_elder:       'onwK4e9ZLuTAKqWW03F9',
};

export const EMOTION_TO_SETTINGS = {
  amused:     { stability: 0.35, similarity_boost: 0.85, style: 0.7, speaking_rate: 1.1  },
  nervous:    { stability: 0.25, similarity_boost: 0.75, style: 0.6, speaking_rate: 1.25 },
  excited:    { stability: 0.20, similarity_boost: 0.80, style: 0.9, speaking_rate: 1.3  },
  whisper:    { stability: 0.90, similarity_boost: 0.95, style: 0.1, speaking_rate: 0.8  },
  somber:     { stability: 0.70, similarity_boost: 0.90, style: 0.3, speaking_rate: 0.85 },
  mysterious: { stability: 0.55, similarity_boost: 0.85, style: 0.5, speaking_rate: 0.9  },
  playful:    { stability: 0.30, similarity_boost: 0.80, style: 0.8, speaking_rate: 1.15 },
  fearful:    { stability: 0.15, similarity_boost: 0.70, style: 0.7, speaking_rate: 1.4  },
  neutral:    { stability: 0.50, similarity_boost: 0.85, style: 0.4, speaking_rate: 1.0  },
};

const streamArgs = (text, s) => ({
  text,
  modelId: 'eleven_turbo_v2_5',
  voiceSettings: {
    stability:        s.stability,
    similarityBoost:  s.similarity_boost,
    style:            s.style,
    useSpeakerBoost:  true,
  },
  outputFormat: 'mp3_44100_128',
});

export const synthesizeSpeech = async (text, voiceId, emotion = 'neutral') => {
  const s = EMOTION_TO_SETTINGS[emotion] || EMOTION_TO_SETTINGS.neutral;
  const audioStream = await el.textToSpeech.stream(voiceId, streamArgs(text, s));
  const chunks = [];
  for await (const chunk of audioStream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

export const streamSpeechToResponse = async (text, voiceId, emotion, res) => {
  const s = EMOTION_TO_SETTINGS[emotion] || EMOTION_TO_SETTINGS.neutral;
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Transfer-Encoding', 'chunked');
  const audioStream = await el.textToSpeech.stream(voiceId, streamArgs(text, s));
  for await (const chunk of audioStream) res.write(chunk);
  res.end();
};

export default el;
