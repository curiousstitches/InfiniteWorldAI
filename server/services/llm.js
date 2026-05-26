import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.NINEROUTER_BASE_URL || 'http://localhost:20128/v1',
  apiKey: process.env.NINEROUTER_API_KEY || 'not-needed',
});

export const chat = async (model, messages, opts = {}) => {
  const res = await client.chat.completions.create({
    model,
    messages,
    temperature: opts.temperature ?? 0.85,
    max_tokens: opts.maxTokens ?? 1500,
    response_format: opts.json ? { type: 'json_object' } : undefined,
  });
  return res.choices[0].message.content;
};

export const streamChat = async (model, messages, onChunk, opts = {}) => {
  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: opts.temperature ?? 0.85,
    max_tokens: opts.maxTokens ?? 1500,
    stream: true,
  });
  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    full += delta;
    onChunk(delta);
  }
  return full;
};

export const transcribeAudio = async (audioBuffer, mimeType = 'audio/webm') => {
  const { File } = await import('node:buffer');
  const file = new File([audioBuffer], 'audio.webm', { type: mimeType });
  const res = await client.audio.transcriptions.create({
    model: process.env.WHISPER_MODEL || 'whisper-1',
    file,
    language: 'en',
  });
  return res.text;
};

export default client;
