# Q2-B — Rigged Animated Companion: Build Spec

**Status:** Planned / not started. This is the roadmap for replacing the procedural
primitive companion with a real rigged, animated humanoid that performs actions
(sit, stand, walk, turn, talk, gesture) driven by the AI — instead of narrating them.

**Vision:** When the companion "sets down a cup, stands, turns to look at you," the
3D character actually *animates* those motions. No asterisk narration.

---

## The compounded free stack (everything below is $0)

All four pieces combine into one pipeline. Each is free; the cost is build effort, not money.

1. **Ready Player Me (RPM) — avatars.** Free, fully rigged, skinned, game-ready GLB humanoids.
   - GET avatar endpoints are PUBLIC, no API key, no auth required.
   - Avatar Creator embeds as an iframe with subdomain `"demo"` (no signup needed to start).
   - Avatars include ARKit blend shapes (52 morph targets) for facial/lip animation.
   - Download URL pattern: `https://models.readyplayer.me/<AVATAR_ID>.glb?morphTargets=ARKit&lod=1&textureFormat=webp`
   - React wrapper: `@readyplayerme/react-avatar-creator` (npm) — fires `onAvatarExported` → gives avatar URL.

2. **RPM Animation Library — body motion.** Free, 200+ mocap clips already retargeted
   to the RPM armature (idle, talk, walk, sit, stand, turn, wave, etc.).
   - Repo: github.com/readyplayerme/animation-library (clips ship as FBX).

3. **FBX→GLB converter — asset prep.** Free NodeJS batch tool.
   - Repo: github.com/crazyramirez/FBX2GLB-Batch-Convert-Optimizer
   - Converts the FBX animation clips into GLB Babylon can import. Run ONCE, commit the GLBs.

4. **Babylon.js reference implementation — the glue.** Free, working template.
   - Repo: github.com/crazyramirez/readyplayer-talk (live demo: viseni.com/readyplayer_talk)
   - Shows: load RPM avatar, import separate animation GLBs, clone/retarget animation
     groups onto the avatar skeleton, blend between them, drive face via ARKit morph targets.

---

## How they compound into ONE pipeline

```
[Visitor] → RPM iframe avatar creator (subdomain "demo")
              │ onAvatarExported → avatarUrl
              ▼
[Our app stores avatarUrl on the character record]
              │
              ▼
[Engine] loads avatar GLB (?morphTargets=ARKit&lod=1)
   + preloads a fixed set of animation GLBs (converted once from RPM Anim Library):
     idle.glb, talk.glb, walk.glb, sit.glb, stand.glb, turn.glb, wave.glb, nod.glb, ...
              │ clone animationGroups onto avatar skeleton (retarget)
              ▼
[AnimationController] state machine:
   - default: idle (looping)
   - on companion speaking: blend idle → talk (+ ARKit jaw/viseme morphs from audio)
   - on <gesture action="..."> tag (ALREADY EMITTED by our AI): blend into that clip, then back to idle
   - on scene/movement intent: walk / turn / sit / stand
              ▼
[The <gesture> tag system built in v24 is the control layer — already done.]
```

**Key insight:** the AI already emits `<gesture action="...">` tags (built in v24-gestures).
Today those drive crude procedural motions on primitives. In Q2-B we keep the EXACT same
tag contract and just swap the *playback*: map each action to a real mocap clip + blend.
Nothing in the prompt/parser layer needs to change. The AI already "speaks animation."

---

## Build steps (when we start)

1. **Asset prep (one-time, local):**
   - Pull ~10-15 clips from RPM Animation Library covering our gesture vocabulary
     (idle, talk, nod, shake_head, wave, lean_in, step_back, look_around, gesture_hands,
     point, shrug, laugh, tilt_head, walk, turn, sit, stand).
   - Run FBX2GLB-Batch-Convert-Optimizer → produce GLBs.
   - Commit them to `client/public/animations/`.

2. **Avatar creation flow:**
   - Add an RPM iframe step to CharacterCreator (after the text Q&A) OR map our text
     description → preset avatar. Capture `avatarUrl`, store on character record
     (new column `avatar_url` or reuse `model_url`).

3. **Engine loader (`proceduralHuman.js` → new `rpmCompanion.js`):**
   - `SceneLoader.ImportMeshAsync(avatarUrl)` for the body.
   - Preload animation GLBs, extract `animationGroups`, retarget/clone onto avatar skeleton
     (the readyplayer-talk repo shows the clone-to-target pattern).

4. **AnimationController (`client/src/engine/visual/animController.js`):**
   - Holds clip map { action → AnimationGroup }.
   - `play(action, { loop, blend })` with `enableBlending` + `blendingSpeed` for smooth
     transitions; auto-return to idle when a one-shot finishes.
   - Wire to the existing `gestureTick` / `companionGesture` store channel (already built).

5. **Talking + face:** while `isSpeaking`, loop `talk` clip; optionally drive ARKit
     `jawOpen`/viseme morph targets from TTS audio amplitude for lip-sync
     (readyplayer-talk demo does exactly this).

6. **Keep the fallback:** if avatarUrl missing or RPM load fails → current procedural
     human (already built). Zero-regression.

---

## Cost summary

| Piece | Money | Notes |
|---|---|---|
| RPM avatars | $0 | Public GET endpoints, no auth; "demo" subdomain for creator |
| RPM Animation Library | $0 | 200+ free retargeted mocap clips |
| FBX2GLB converter | $0 | Open-source NodeJS, run once |
| Babylon integration | $0 | Open-source reference repo to fork |
| **Total** | **$0** | Cost is build effort: ~asset prep + animation state machine + retarget wiring |

**Paid alternative (NOT needed):** Meshy auto-rig (~$0.50-2/character) if we ever want
to rig fully-custom non-humanoid creatures RPM can't represent (dragons, etc.). Keep as
a future optional tier.

---

## Starting point for next session

"Start Q2-B from step 1 (asset prep). The `<gesture>` tag contract from v24 is the control
layer — reuse it verbatim. Build `rpmCompanion.js` + `animController.js`, keep the procedural
human as fallback. Reference github.com/crazyramirez/readyplayer-talk for the
load+retarget+blend pattern."
