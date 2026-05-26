<div align="center">

<img src=".github/assets/logo/logo-full.svg" alt="Infiniteworlds" width="320"/>

### A voice-interactive AI-driven 3D world engine

*Never-ending stories. Lifelike companions. Whispers-tier visuals on your phone.*

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-cc88ff?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-22+-88dd66?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Babylon.js](https://img.shields.io/badge/Babylon.js-7-ffcc66?style=flat-square)](https://babylonjs.com)
[![Status](https://img.shields.io/badge/status-alpha-ff6699?style=flat-square)](#)

</div>

<br/>

<div align="center">
  <img src=".github/assets/screenshots/phone-whispers-tier.svg" alt="Stella · in-game over-shoulder dialogue mode" width="280"/>
</div>

<br/>

---

## ⚡ Quick Start

**Three commands. Two minutes.**

```bash
git clone https://github.com/curiousstitches/Infiniteworlds.git && cd Infiniteworlds
npm install --prefix server && npm install --prefix client && cp .env.example .env
node server/index.js &  npm run dev --prefix client -- --host
```

Open the URL Vite prints (usually `http://localhost:5173`).

> Want to fork & push your own copy first? Run **`./push.sh`** — see [Uploading to GitHub](#-uploading-to-github) below.

---

## 🎬 What it looks like

<table>
  <tr>
    <td align="center"><strong>Whispers Tier</strong></td>
    <td align="center"><strong>Home</strong></td>
    <td align="center"><strong>Companion Creator</strong></td>
    <td align="center"><strong>In World</strong></td>
  </tr>
  <tr>
    <td><img src=".github/assets/screenshots/phone-whispers-tier.svg" width="100%"/></td>
    <td><img src=".github/assets/screenshots/phone-home.svg" width="100%"/></td>
    <td><img src=".github/assets/screenshots/phone-creator.svg" width="100%"/></td>
    <td><img src=".github/assets/screenshots/phone-game.svg" width="100%"/></td>
  </tr>
</table>

---

## 📦 Uploading to GitHub

The included **`push.sh`** is bulletproof — no `gh` CLI required, uses a Personal Access Token, and prints every step so silent failures are impossible.

```bash
cd ~/Infiniteworlds && ./push.sh
```

It'll ask for:
1. Your GitHub username
2. Repo name (default: `Infiniteworlds`)
3. Commit message
4. A **[Personal Access Token](https://github.com/settings/tokens/new)** with `repo` scope (input hidden)

That's it. The script creates the repo if missing, force-pushes the tree, and scrubs the token from `.git/config` afterward.

<details>
<summary><strong>🆘 If push.sh fails</strong></summary>

| Symptom | Fix |
|---|---|
| `Token rejected (401)` | Re-generate at github.com/settings/tokens/new — make sure `repo` scope is ticked |
| `repo check failed (HTTP 000)` | No internet. Toggle airplane mode + retry. |
| `nothing to commit` | Empty dir. Make sure you're in the Infiniteworlds project root. |
| Stuck at the password prompt | The PAT is your password. Paste it whole (`ghp_...`) and press Enter. Input is hidden. |
| `pkg: command not found` | You're not in Termux. Use the equivalent (`apt`, `brew`, etc.) |

**Manual fallback** — create the repo on github.com manually, then:
```bash
git init -b main && git add -A && git commit -m "init"
git remote add origin https://USERNAME:TOKEN@github.com/USERNAME/Infiniteworlds.git
git push -u origin main --force
```

</details>

---

## 🚀 Deploy a live demo

Each option is collapsible — pick one that fits your stack.

<details>
<summary><strong>🅰️ Vercel + Render</strong> &nbsp; ★ recommended &nbsp; · free tier · ~3 min</summary>

<br/>

**Frontend on Vercel, backend on Render. Both deploy directly from your GitHub repo.**

### 1. Push to GitHub first
```bash
./push.sh
```

### 2. Backend → Render
1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Web Service** → pick your `Infiniteworlds` repo.
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Environment:** add your `.env` keys (`ELEVENLABS_API_KEY`, `MESHY_API_KEY`, etc — all optional)
4. Hit **Create Web Service**. Copy the URL it gives you, e.g. `https://infiniteworlds-api.onrender.com`.

### 3. Frontend → Vercel
1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import `Infiniteworlds`.
3. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (auto-detected)
   - **Environment Variables:** `VITE_API_URL=<your Render URL from step 2>`
4. **Deploy**. You'll get `https://infiniteworlds.vercel.app`.

**Cost:** $0/mo on free tiers. Render spins down after 15 min idle — first request after cold = ~30s.

</details>

<details>
<summary><strong>🅱️ Railway</strong> &nbsp; · single platform · $5/mo after trial</summary>

<br/>

**Single dashboard for both back+front. Easier mental model, paid after trial.**

### 1. Push to GitHub first
```bash
./push.sh
```

### 2. Deploy
1. [railway.app](https://railway.app) → sign in with GitHub.
2. **New Project → Deploy from GitHub repo** → pick `Infiniteworlds`.
3. Railway auto-detects monorepo. Add **two services**:
   - **server**: root = `server`, start = `node index.js`
   - **client**: root = `client`, build = `npm run build`, serve via static
4. **Settings → Variables** on each service — add your `.env` keys.
5. **Settings → Networking → Generate Domain** on both services.

**Cost:** $5 free trial credit, then ~$5–10/mo. Slightly faster than Render (no cold starts).

</details>

<details>
<summary><strong>🅲 Cloudflare Pages + Workers</strong> &nbsp; · fastest globally · free · trickier</summary>

<br/>

**Edge-distributed. Free forever for personal use. Backend needs adapter work.**

### 1. Push to GitHub first
```bash
./push.sh
```

### 2. Frontend → Cloudflare Pages
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect Git** → pick `Infiniteworlds`.
2. Settings:
   - **Build command:** `cd client && npm install && npm run build`
   - **Build output:** `client/dist`
   - **Env vars:** `VITE_API_URL=<your worker URL>`
3. **Save and Deploy**.

### 3. Backend — two paths
- **Easy:** Deploy the server to Render/Railway instead, keep frontend on Cloudflare for global edge speed.
- **All-Cloudflare:** Rewrite server to use [Hono](https://hono.dev/) instead of Express + replace `node-sqlite3-wasm` with [Cloudflare D1](https://developers.cloudflare.com/d1/). Roughly a half-day refactor.

**Cost:** $0/mo personal use, ~$5/mo if you exceed 100k req/day.

</details>

<details>
<summary><strong>🅳 Termux + Cloudflare Tunnel</strong> &nbsp; · self-host on your phone · free forever</summary>

<br/>

**Run the entire app from your phone. Tunnel exposes it to a real https URL. No server costs ever.**

### 1. Get it running locally
```bash
cd ~/Infiniteworlds
npm install --prefix server && npm install --prefix client
node server/index.js &
npm run dev --prefix client -- --host
```

### 2. Install cloudflared
```bash
pkg install -y cloudflared
```

### 3. Tunnel both ports
Open two extra Termux sessions (swipe right → New session):

**Session A — backend tunnel:**
```bash
cloudflared tunnel --url http://localhost:3001
```
It prints `https://random-name.trycloudflare.com` — copy this.

**Session B — frontend tunnel:**
```bash
cloudflared tunnel --url http://localhost:5173
```

### 4. Wire frontend to backend tunnel
Edit `client/.env`:
```
VITE_API_URL=https://your-backend-tunnel-url.trycloudflare.com
```

Restart the frontend. Share the frontend tunnel URL with anyone.

**Cost:** $0 forever. **Catch:** the phone must stay on with Termux running. URLs change each restart unless you make a [named tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/).

</details>

---

## 🧠 How It Works

- **Voice-first.** Every interaction routes Whisper (STT) → multi-agent LLM cascade → ElevenLabs (TTS). Type is the fallback.
- **Multi-agent.** Three LLMs run in parallel per turn — *World GM* (narrative), *Companion* (dialogue + emotion), *Task Generator* (dynamic objectives).
- **Hybrid camera.** First-person exploring; cinematic over-shoulder during conversation; free-orbit on demand.
- **Adaptive visuals.** GPU benchmark + UA auto-tier the renderer — phones at 60fps, desktops at full Whispers-tier.
- **Five scale tiers.** Cosmic → Planet → Human → Microscopic → Subatomic. The world morphs as you speak.
- **Legacy echoes.** Delete a world and a fragment of its companion's memory carries forward into the next.

---

## 📚 More info

<details>
<summary><strong>🎨 Visuals — the Whispers-tier pipeline</strong></summary>

<br/>

| Layer | What it does |
|---|---|
| **Camera Controller** | Hybrid — first-person exploration + over-shoulder dialogue + free-orbit |
| **Capability Autodetector** | Boot-time GPU benchmark + UA/RAM/cores → tier slug |
| **Tier Presets** | 4 levels × ~25 feature flags each |
| **Environment Manager** | Per-biome HDRI (opt-in) + volumetric sky fallback |
| **Volumetric Sky Shader** | Custom GLSL — sun disc + Rayleigh + FBM cloud noise |
| **Skin Shader (SSS)** | PBR with subsurface translucency, clearcoat sheen, anisotropic hair |
| **Terrain HQ** | Heightmap-displaced PBR terrain |
| **Vegetation** | Instanced trees / grass / mushrooms / crystals with wind sway |
| **Post-process** | ACES tonemap, bokeh DOF (focus on companion), eye adaptation, SSAO, bloom, grain |
| **Mesh Source** | Pluggable — Meshy realistic + auto-rig active; Ready Player Me wired as future plug-in |

Every layer is **gated by tier**. Toggle individual features in **Settings → Graphics**.

</details>

<details>
<summary><strong>🔌 Provider system — 40+ LLM/TTS providers with auto-fallback</strong></summary>

<br/>

- **S-tier** (lifelike): Puter (Claude Opus 4.7, Sonnet 4.6, GPT-5.5 Pro, Gemini 3.1 Pro), 9router → Kiro/Vertex, OpenAI paid, Anthropic paid
- **A-tier** (high quality): Google AI Studio (1500 RPD, 1M ctx), Mistral, xAI Grok-4, Inworld TTS, Cartesia
- **B-tier** (fast free): Groq (Llama 3.3 70B + Whisper Turbo @ 315 TPS), Cerebras (2000 TPS), 9router free pool, OpenRouter free, GitHub Models
- **C-tier** (fallback): OpenCode Free, Cohere, Cloudflare, HuggingFace, Together

**Voice cascade:**
STT: Web Speech → Groq Whisper → 9router → Puter → paid
TTS: ElevenLabs Turbo v2.5 → Inworld → Cartesia → Puter → Web Speech

See [`PROVIDERS.md`](PROVIDERS.md) for the full matrix.

</details>

<details>
<summary><strong>🧬 Personality engine — OCEAN + sub-traits + speech style</strong></summary>

<br/>

Your companion's personality is a structured schema — five Big Five traits plus sub-traits, attachment style, speech patterns, quirks, and backstory. The model receives a frozen instruction block per turn and emits hidden state deltas (`<state mood= affection_delta= trust_delta=/>`) that adjust the relationship over time.

Customize it all in **Settings → Personality** with master + per-section randomizers.

</details>

<details>
<summary><strong>⚙️ Environment variables</strong></summary>

<br/>

Copy `.env.example` to `.env`. Every key is optional — the free path works with none of them.

| Key | Purpose | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | Default LLM agent | platform.openai.com |
| `ANTHROPIC_API_KEY` | Claude direct | console.anthropic.com |
| `GROQ_API_KEY` | Free Whisper Turbo + Llama 3.3 70B | console.groq.com |
| `GOOGLE_API_KEY` | Free Gemini 1500 RPD | aistudio.google.com |
| `ELEVENLABS_API_KEY` | Lifelike TTS | elevenlabs.io |
| `MESHY_API_KEY` | 3D companion mesh | meshy.ai |
| `NINEROUTER_BASE_URL` | Local 9router proxy | usually `http://localhost:20128/v1` |
| `PUTER_ENABLED` | Browser-side Puter SDK | toggle on/off |
| `PORT` | Backend port | default `3001` |
| `DB_PATH` | SQLite path | default `./data/infiniteworlds.db` |

</details>

<details>
<summary><strong>🎨 Brand & press kit</strong></summary>

<br/>

`/.github/assets/brand/` contains:
- Logo (full + wordmark + mark, light + dark variants)
- Palette — primary violet `#cc88ff`, accent cyan `#88ddff`, lifelike gold `#ffcc88`
- Typography spec
- Full guidelines: [`BRAND.md`](.github/assets/brand/BRAND.md)

</details>

<details>
<summary><strong>🌿 Biomes & controls</strong></summary>

<br/>

**14 biomes** — forest, ocean, desert, cave, tundra, volcanic, cosmic, ethereal, microorganism, crystalline, storm, void, ancient ruins, mushroom forest.

| Action | Input |
|---|---|
| Move (FP mode) | WASD |
| Look (FP mode) | Mouse / touch drag |
| Orbit (orbit mode) | Touch drag / mouse drag |
| Zoom (orbit mode) | Pinch / scroll |
| Talk to companion | Hold mic button |
| Open settings | ⚙ icon top-right |
| Pause | Esc |

</details>

<details>
<summary><strong>🤝 Contributing & citing</strong></summary>

<br/>

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contributor guide and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community standards.

```bibtex
@software{infiniteworlds_2026,
  author       = {curiousstitches},
  title        = {Infiniteworlds: A voice-interactive AI-driven 3D world engine},
  year         = 2026,
  url          = {https://github.com/curiousstitches/Infiniteworlds}
}
```

See [`CITATION.cff`](CITATION.cff) for the canonical form.

</details>

---

<div align="center">

**Built with Babylon.js · Inspired by Whispers from the Star · MIT License**

<sub>If you ship something with this, ping me — I want to see it.</sub>

</div>
