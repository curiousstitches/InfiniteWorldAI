# 🔌 AI Provider Reference

Every provider Infiniteworlds knows about, ordered best→worst **for this build** (voice-driven lifelike companion). Tier letter drives the in-game model badge color.

> 🟪 S = Lifelike · 🟦 A = High Quality · 🟩 B = Fast & Free · 🟨 C = Fallback · 🟥 E = Emergency

---

## 🟪 S-Tier — Most lifelike

| Provider | Models | Free? | Signup | Notes |
|---|---|---|---|---|
| **Puter.js** | Claude Opus 4.7, Claude Sonnet 4.6, GPT-5.5 Pro, Gemini 3.1 Pro, GPT-5.4 | ✅ User-pays | [puter.com](https://puter.com) | Client-side. Zero server cost. **Default for Companion.** |
| **9router → Kiro AI** | Claude Sonnet 4.5, Claude Haiku 4.5 | ✅ Unlimited via AWS Builder ID | [decolua/9router](https://github.com/decolua/9router) | Best server-side Claude. Already in your stack. |
| **9router → Vertex** | Gemini 3.1 Pro Preview, Gemini 3 Flash Preview | ✅ $300 GCP credit | [cloud.google.com](https://console.cloud.google.com) | 90-day window. |
| **OpenAI** (paid) | GPT-5.5 Pro | 💳 Premium | [platform.openai.com](https://platform.openai.com/api-keys) | Highest-tier paid override. |
| **Anthropic** (paid) | Claude Opus 4.7, Claude Sonnet 4.6 | 💳 Premium | [console.anthropic.com](https://console.anthropic.com/settings/keys) | Highest-tier paid override. |

## 🟦 A-Tier — High quality

| Provider | Models | Free? | Signup | Notes |
|---|---|---|---|---|
| **Google AI Studio** | Gemini 2.5 Flash, Flash-Lite | ✅ 1,500 RPD, 1M ctx | [aistudio.google.com](https://aistudio.google.com/apikey) | **Best for GM** — massive context. |
| **Puter Gemini 3.5 Flash** | gemini-3.5-flash | ✅ User-pays | — | 1M context via Puter SDK. |
| **Puter DeepSeek v4 Pro** | deepseek-v4-pro | ✅ User-pays | — | Strong reasoning. |
| **Mistral La Plateforme** | mistral-large-latest | ✅ 1B tokens/month | [console.mistral.ai](https://console.mistral.ai/api-keys) | 2 RPM cap — bulk only. |
| **xAI** (paid) | Grok-4 | 💳 Premium | [console.x.ai](https://console.x.ai) | Personality-tuned. |
| **Inworld** (paid) | Realtime TTS 1.5 Max | 💳 Premium TTS | [platform.inworld.ai](https://platform.inworld.ai) | #1 TTS leaderboard, sub-200ms. |
| **Cartesia** (paid) | Sonic Turbo | 💳 Premium TTS | [play.cartesia.ai](https://play.cartesia.ai/keys) | ~40ms TTFA. Fastest streaming. |

## 🟩 B-Tier — Fast & free

| Provider | Models | Free? | Signup | Notes |
|---|---|---|---|---|
| **Groq** | Llama 3.3 70B, Llama 4 Scout, Whisper v3 Turbo | ✅ 30 RPM, 1000 RPD, 6K TPM | [console.groq.com](https://console.groq.com/keys) | **Best for TaskGen** — 315 TPS LPU. |
| **Cerebras** | Llama 3.3 70B, Llama 4 | ✅ 30 RPM, 60K TPM, 1M tokens/day | [cloud.cerebras.ai](https://cloud.cerebras.ai) | Up to 2000 TPS. No card. |
| **9router → Kiro** | GLM-5, MiniMax-M2.5, DeepSeek 3.2 | ✅ Unlimited | — | Diverse non-frontier models. |
| **OpenRouter** | Qwen 2.5 72B free, Llama 3.2 11B Vision free | ✅ $0/M pool | [openrouter.ai](https://openrouter.ai/keys) | Dozens of free community models. |
| **SambaNova** | Llama 3.3 70B, Qwen | ✅ Email signup | [cloud.sambanova.ai](https://cloud.sambanova.ai/apis) | 294 TPS. |
| **GitHub Models** | GPT-5 Mini, Claude Sonnet | ✅ ~150 RPD | [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens) | Need a GitHub PAT. |
| **Web Speech** (browser) | native STT + TTS | ✅ Zero-call | — | **Default voice fallback.** No network. |

## 🟨 C-Tier — Fallback

| Provider | Models | Free? | Signup | Notes |
|---|---|---|---|---|
| **9router → OpenCode Free** | auto from `opencode.ai/zen/v1/models` | ✅ Zero auth | — | Quick-start tertiary. |
| **Cohere** | Command R+, Embed 4, Rerank 3.5 | ✅ Trial tier | [dashboard.cohere.com](https://dashboard.cohere.com/api-keys) | Better for RAG than dialogue. |
| **Cloudflare Workers AI** | Llama 3.3 70B (edge) | ✅ 10K neurons/day | [dash.cloudflare.com](https://dash.cloudflare.com/profile/api-tokens) | Edge-deployed, narrow menu. |
| **HuggingFace Inference** | Qwen 2.5 72B + zoo | ✅ Strict rate | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | Big library, tight throttling. |
| **Together AI** | Llama, Mixtral | 🪙 $5 credit, then paid | [api.together.ai](https://api.together.ai/settings/api-keys) | Trial converts to paid. |

---

## 🎙️ Voice stack

**STT cascade (best → worst):**
1. 🟪 **Groq Whisper Large v3 Turbo** — 228× realtime, $0 free
2. 🟦 **9router Whisper** — server-side, unlimited
3. 🟦 **Puter Whisper** — client-side, user-pays
4. 🟩 **Web Speech API** — browser-native, zero-call. **Default if no key.**
5. 💳 **OpenAI Whisper / Deepgram Nova-3** — paid

**TTS cascade (best → worst):**
1. 🟪 **ElevenLabs Turbo v2.5** — sub-200ms, emotion-mapped (paid)
2. 🟪 **Inworld Realtime TTS Max** — #1 leaderboard (paid)
3. 🟪 **Cartesia Sonic** — ~40ms TTFA (paid)
4. 🟦 **Puter ElevenLabs / OpenAI TTS** — user-pays
5. 💳 **OpenAI TTS / Deepgram Aura-2** — paid
6. 🟨 **Web Speech TTS** — browser-native, zero-call. **Default if no key.**

---

## 📋 Default per-agent cascade

```
Companion → puter:claude-opus-4-7 → puter:claude-sonnet-4-6 →
            9router:kr/claude-sonnet-4.5 → puter:gpt-5.5-pro →
            9router:vertex/gemini-3.1-pro → puter:gemini-3.5-flash

GM        → puter:gemini-3.5-flash → google:gemini-2.5-flash →
            puter:claude-sonnet-4-6 → 9router:vertex/gemini-3-flash →
            9router:kr/claude-sonnet-4.5

TaskGen   → puter:gpt-5.4-nano → groq:llama-3.3-70b-versatile →
            puter:gpt-5.4-mini → 9router:kr/MiniMax-M2.5 →
            cerebras:llama-3.3-70b

STT       → browser:webspeech → groq:whisper-large-v3-turbo → 9router:whisper

TTS       → elevenlabs:turbo-v2.5 → puter:elevenlabs →
            puter:openai-tts → browser:webspeech-tts
```

Configurable per-agent in **Settings → API tab**. The full ordering lives in [`client/src/providers/registry.js`](client/src/providers/registry.js).

---

## ⚖️ Important — fair use

These free tiers are offered by their respective providers for development and personal use. Some have terms that prohibit high-volume production use, data-retention opt-outs, or rate limits not documented above. **Always review the actual provider's ToS before relying on a tier for production**, and never resell access.

Infiniteworlds **does not** route any prompts you don't initiate and **does not** strip provider safety policies — each provider's models behave according to their own rules.
