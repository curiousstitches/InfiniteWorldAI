// client/src/engine/visual/animController.js
// Loads a set of GLB animation clips and blends between them on an RPM avatar skeleton.
// Driven by the <gesture> tags the AI already emits. Falls back to procedural motion
// (proceduralAnim) per-clip when a GLB for that action isn't present yet.

import { SceneLoader, AnimationGroup } from '@babylonjs/core';

// Maps our gesture vocabulary → animation clip filenames.
// Clips load from a CDN mirror of the RPM animation library (free, CORS-enabled via
// jsDelivr). If a file 404s or a local /animations/<file> exists, the loader adapts.
// One-shot clips return to idle; looping clips (idle/talk/walk) persist until changed.
export const CLIP_MANIFEST = {
  idle:          { file: 'idle.glb',          loop: true },
  talk:          { file: 'talk.glb',          loop: true },
  walk:          { file: 'walk.glb',          loop: true },
  turn:          { file: 'turn.glb',          loop: false },
  sit:           { file: 'sit.glb',           loop: false },
  stand:         { file: 'stand.glb',         loop: false },
  nod:           { file: 'nod.glb',           loop: false },
  shake_head:    { file: 'shake_head.glb',    loop: false },
  wave:          { file: 'wave.glb',          loop: false },
  lean_in:       { file: 'lean_in.glb',       loop: false },
  step_back:     { file: 'step_back.glb',     loop: false },
  look_around:   { file: 'look_around.glb',   loop: false },
  gesture_hands: { file: 'gesture_hands.glb', loop: false },
  point:         { file: 'point.glb',         loop: false },
  shrug:         { file: 'shrug.glb',         loop: false },
  laugh:         { file: 'laugh.glb',         loop: false },
  tilt_head:     { file: 'tilt_head.glb',     loop: false },
};

// Prefer self-hosted /animations/ (commit your own GLBs there for full control).
// Falls back to the public CDN mirror of the RPM animation library for the core clips.
const LOCAL_BASE = (import.meta.env.BASE_URL || '/') + 'animations/';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/readyplayerme/animation-library@master/masculine/glb/';

export class AnimController {
  constructor(scene, skeleton, opts = {}) {
    this.scene = scene;
    this.skeleton = skeleton;
    this.target = opts.target;          // the avatar root mesh (retarget source)
    this.clips = {};                    // action → AnimationGroup
    this.current = null;
    this.idleAction = 'idle';
    this.proceduralFallback = opts.proceduralFallback || null; // fn(action) for missing clips
    this.loaded = false;
  }

  // Known RPM-library filenames (masculine/glb) for clips that exist upstream.
  // Anything not mapped or that fails to load falls back to procedural motion.
  static REMOTE_NAMES = {
    idle: 'M_Standing_Idle_001.glb',
    talk: 'M_Talking_Variations_001.glb',
    walk: 'M_Walk_001.glb',
    wave: 'M_Standing_Expressions_001.glb',
    laugh: 'M_Standing_Expressions_006.glb',
    point: 'M_Standing_Expressions_008.glb',
    shrug: 'M_Standing_Expressions_009.glb',
  };

  // Preload all available clips. Tries local /animations/<file> first, then the CDN
  // mirror. Missing/failed files are skipped — procedural fallback covers them.
  async preload() {
    const tasks = Object.entries(CLIP_MANIFEST).map(async ([action, { loop }]) => {
      const candidates = [
        LOCAL_BASE + CLIP_MANIFEST[action].file,
        AnimController.REMOTE_NAMES[action] ? CDN_BASE + AnimController.REMOTE_NAMES[action] : null,
      ].filter(Boolean);

      for (const url of candidates) {
        try {
          const before = this.scene.animationGroups.length;
          await SceneLoader.ImportAnimationsAsync(
            url.substring(0, url.lastIndexOf('/') + 1),
            url.substring(url.lastIndexOf('/') + 1),
            this.scene, false, undefined
          );
          const g = this.scene.animationGroups[this.scene.animationGroups.length - 1];
          if (g && this.scene.animationGroups.length > before) {
            g.name = `clip_${action}`;
            g.loopAnimation = loop;
            g.stop();
            try { g.setWeightForAllAnimatables(0); } catch {}
            this.clips[action] = g;
            return; // got it, stop trying candidates
          }
        } catch { /* try next candidate */ }
      }
    });
    await Promise.all(tasks);
    this.loaded = Object.keys(this.clips).length > 0;
    if (this.clips.idle) this.play('idle');
    return this.loaded;
  }

  // Play an action. Blends from current. One-shots auto-return to idle.
  play(action, { blend = 0.15 } = {}) {
    const clip = this.clips[action];
    if (!clip) {
      // No GLB for this action → procedural motion (head/torso) if provided.
      this.proceduralFallback?.(action);
      return;
    }
    const manifest = CLIP_MANIFEST[action] || { loop: false };

    if (this.current && this.current !== clip) {
      this.current.enableBlending = true;
      this.current.blendingSpeed = blend;
      this.current.setWeightForAllAnimatables(0);
      this.current.stop();
    }

    clip.enableBlending = true;
    clip.blendingSpeed = blend;
    clip.setWeightForAllAnimatables(1);
    clip.play(manifest.loop);
    this.current = clip;

    if (!manifest.loop) {
      clip.onAnimationGroupEndObservable.addOnce(() => {
        if (this.current === clip) this.play(this.idleAction);
      });
    }
  }

  // Loop talk while speaking, return to idle after.
  setSpeaking(on) {
    if (on) this.play('talk');
    else if (this.current === this.clips.talk) this.play('idle');
  }

  dispose() {
    for (const g of Object.values(this.clips)) { try { g.dispose(); } catch {} }
    this.clips = {};
  }
}
