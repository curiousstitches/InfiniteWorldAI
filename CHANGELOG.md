# Changelog

All notable changes to Infiniteworlds will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Whispers-tier visual upgrade
- **Multi-mode camera controller** (`engine/cameras.js`) — hybrid first-person + over-shoulder dialogue cam (Mass Effect / Cyberpunk style) + free-orbit option. Auto-swaps to over-shoulder during voice conversations.
- **Device capability autodetector** (`engine/tier/capability.js`) — WebGPU + UA + RAM + cores + 500ms fill-rate benchmark → tier slug.
- **Tier presets** (`engine/tier/tierConfig.js`) — 4 levels (`performance_low`, `performance_high`, `cinematic_mid`, `cinematic_high`) × ~25 feature flags. User override + adaptive.
- **HDRI Environment Manager** (`engine/visual/environment.js`) — per-biome HDRI from PolyHaven CDN (CC0), full IBL + skybox.
- **Volumetric sky shader** — custom GLSL with sun disc, Rayleigh gradient, FBM cloud noise, biome-tuned palettes.
- **SSS Skin Shader** (`engine/visual/skinShader.js`) — PBR subsurface translucency, clearcoat sheen, anisotropic hair, 7 skin-tone presets, automatic mesh classification on GLB import.
- **Terrain HQ** (`engine/visual/terrainHQ.js`) — heightmap-displaced procedural ground with biome-aware PBR materials.
- **Vegetation system** (`engine/visual/vegetation.js`) — instanced trees, grass, mushrooms, crystals, kelp per biome with wind sway.
- **Post-process HQ** (`engine/visual/postprocessHQ.js`) — ACES tonemap, bokeh DOF (auto-focus on companion), eye adaptation, bloom, SSAO2, chromatic aberration, film grain, sharpen.
- **Mesh source abstraction** (`services/meshSource.js`) — pluggable provider system. Meshy realistic + auto-rig active; Ready Player Me wired as future plug-in.
- **Graphics settings tab** — device capability panel, tier picker, camera mode picker, mesh source picker, skin tone swatches, per-feature 3-state overrides.
- **Whispers-tier phone mockup** (`.github/assets/screenshots/phone-whispers-tier.svg`) — astronaut companion over-shoulder framing on alien planet.

### Changed
- `server/services/meshy.js` — `createTextTo3DTask` now accepts `{ art_style, enable_auto_rig, negativePrompt, mode }` for realistic + auto-rigged characters.
- `server/routes/world.js` — added `POST /api/characters/mesh` and `GET /api/characters/mesh/:taskId` for the mesh source client.
- `client/src/engine/BabylonEngine.jsx` — full integration of tier/cameras/environment/skin/terrain/vegetation/post-process pipeline.
- `client/src/store/settingsStore.js` — added `graphics` state slice and `setGraphics`/`setGraphicsOverride` actions.

### Added
- **Provider Router** — unified client/server cascade across 40+ free AI providers (Puter.js, 9router, Groq, Google AI Studio, Cerebras, OpenRouter, Mistral, etc.) with auto-fallback.
- **Puter.js SDK** integration (client-side) for zero-cost Claude/GPT/Gemini/DeepSeek access via User-Pays model.
- **Settings tab** with three sub-tabs: API (per-agent provider dropdowns, key vault with auto-hide), Personality (OCEAN + sub-traits + randomizers), Interface (panel modes, HUD hide).
- **Personality Engine** — Basic/Detailed modes, Big Five OCEAN sliders, 12 sub-traits, attachment styles, speech registers, voice prosody, quirks, backstory, runtime relationship evolution.
- **Per-section + master randomizer** for the personality engine.
- **AI Status Panel** — floating, color-coded model badge (5 tiers: violet/cyan/green/amber/red) with 5 visibility modes (off/solid/translucent/fade/pulse).
- **Hidden state protocol** — companion emits `<state mood=… affection_delta=… trust_delta=…/>` tags to drive live relationship deltas.
- **Free voice fallback** — Web Speech API (browser-native) for STT + TTS when no premium key is configured.
- **Smart UX gating** — premium provider options and TTS toggles auto-hide when the underlying API key is empty.
- **Fullscreen-feel toggle** — hide all HUD / hide subtitles for cinematic mode.
- `CITATION.cff` for academic / derivative-work citation (CFF 1.2.0 schema).
- `screen-game.svg` raw in-game HUD asset for issue templates.
- README hero banner, phone-mockup gallery, CI/license/cite badges, brand press-kit links.
- Core 3-agent architecture (World GM + Companion + Task Generator)
- Babylon.js WebGPU rendering pipeline with WebGL2 fallback
- 10 procedurally generated biomes (forest, cave, ocean, desert, volcanic, cosmic, ethereal, microorganism, tundra, mushroom_forest)
- 5-level scale system from COSMIC (8000u) to NANO (3u)
- ElevenLabs Turbo v2.5 streaming TTS with 9 emotion presets
- Whisper STT pipeline via 9router
- Meshy.ai text-to-3D character generation with primitive fallback
- SQLite world persistence (WAL mode)
- Multi-step AI dialogue character creator
- Legacy echo system — ghost fragments persist across deleted worlds
- Push-to-talk + text input modes
- Mobile-first responsive UI (380px viewport baseline)
- Full PBR rendering pipeline: SSAO2, bloom, DOF, chromatic aberration, ACES tone mapping, film grain
- WebSocket world updates for async model generation
- Simplex noise terrain with mulberry32 seeded RNG

### Documentation
- Initial README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT
- Brand kit + asset library
- Issue and PR templates

## [0.1.0] — TBD

First tagged release. Pin this to the commit that's known-good for handoff.

---

[Unreleased]: https://github.com/YOUR_USERNAME/Infiniteworlds/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YOUR_USERNAME/Infiniteworlds/releases/tag/v0.1.0
