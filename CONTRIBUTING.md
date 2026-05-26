# Contributing to Infiniteworlds

Thanks for considering a contribution to the infinite. Every word you add to this codebase reshapes its reality.

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/Infiniteworlds.git
cd Infiniteworlds
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

Server runs at `:3001`, client at `:5173`.

## Ground Rules

1. **One PR, one concern.** Don't bundle a refactor with a feature with a typo fix.
2. **Match existing style.** Inline styles (no Tailwind), `'Crimson Pro'` + `'Cinzel Decorative'` typography, mystical-void color palette (see [BRAND.md](./.github/assets/brand/BRAND.md)).
3. **Mobile-first.** All UI must look correct in a 380px viewport.
4. **Voice is the primary input.** Anything keyboard-only is a regression unless it's a fallback.
5. **No new dependencies without a reason in the PR description.** This project deliberately runs lean.

## Branch + Commit Convention

- Branches: `feat/<short-slug>`, `fix/<short-slug>`, `docs/<short-slug>`, `chore/<short-slug>`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `perf:`, `test:`

Example: `feat(scale): add NANO→PICO transition for sub-atomic worlds`

## What Needs Help

- **New biomes** — see `client/src/engine/biomes.js`. Each biome is ~30 lines of config.
- **Voice options** — additional ElevenLabs presets, Cartesia integration, local Whisper.
- **Companion personalities** — improvements to `server/agents/companion.js` prompt engineering.
- **Performance** — GPU instancing for interactables, terrain LOD chunking.
- **Accessibility** — captions, voice-control alternatives, motion-reduction toggles.

## Development Tips

- The 3-agent loop in `server/routes/interact.js` fires all agents in parallel with `Promise.allSettled` — if you add a 4th, follow the same pattern.
- All world mutations go through SQLite. No agent state lives in memory between requests.
- Babylon's WebGPU engine has subtle differences from WebGL2 — test both. Toggle by removing the `WebGPUEngine` try block.
- `simplex-noise` requires a 0-1 PRNG; we use `mulberry32` (deterministic seed).

## Reporting Bugs

Use the **Bug Report** issue template. Include:
- Browser + version
- Console errors (full stack)
- World state JSON if reproducible (server logs)
- Whether WebGPU was active (check `chrome://gpu`)

## Submitting PRs

1. Fork → branch → commit → push → PR.
2. Fill out the PR template completely.
3. CI must pass (lint + build).
4. One approving review required before merge.
5. We squash-merge by default; write a good commit body.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Be kind. The void is already void enough.
