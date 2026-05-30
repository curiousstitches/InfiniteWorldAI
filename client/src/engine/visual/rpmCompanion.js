// client/src/engine/visual/rpmCompanion.js
// Loads a Ready Player Me avatar GLB and wires it for animation + lip-sync.
// RPM avatars are fully rigged; we attach an AnimController for body motion and
// drive ARKit jaw/viseme morph targets from TTS audio amplitude for talking.

import { SceneLoader, Vector3, Animation } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { AnimController } from './animController.js';
import { buildProceduralHuman } from './proceduralHuman.js';
import { attachAliveness } from './aliveness.js';

// Append RPM query params for an animation-ready, higher-fidelity avatar.
function rpmUrl(url) {
  if (!url) return url;
  if (url.includes('?')) return url;
  // ARKit morphs for lipsync; meshopt compression; higher texture res for realism.
  return `${url}?morphTargets=ARKit&textureAtlas=1024&pose=A&meshLod=0&quality=high&textureFormat=webp`;
}

export async function loadRpmCompanion(scene, { avatarUrl, avatarUrls, name, skinTone, x = 2.5, z = 4 } = {}) {
  // Build the candidate list: explicit chain, or single url, or none.
  const candidates = (avatarUrls && avatarUrls.length) ? avatarUrls : (avatarUrl ? [avatarUrl] : []);

  // No avatar URL → procedural humanoid fallback (still animated via gesture tags).
  if (!candidates.length) {
    const proc = buildProceduralHuman(scene, { skinTone, name, x, z });
    proc._isProcedural = true;
    return proc;
  }

  // Try each candidate URL in order until one loads.
  let result = null, usedUrl = null;
  for (const url of candidates) {
    try {
      result = await SceneLoader.ImportMeshAsync('', '', rpmUrl(url), scene);
      usedUrl = url;
      break;
    } catch (e) {
      console.warn('[avatar candidate failed, trying next]', url, e?.message || e);
    }
  }

  if (!result) {
    console.warn('[all avatar candidates failed → procedural]');
    const proc = buildProceduralHuman(scene, { skinTone, name, x, z });
    proc._isProcedural = true;
    return proc;
  }

  const root = result.meshes[0];
  root.name = 'companion';
  root.position = new Vector3(x, 0, z);

  const skeleton = result.skeletons?.[0] || null;

  // Collect ARKit morph target managers for lip-sync (jawOpen + mouth visemes).
  const morphManagers = [];
  for (const m of result.meshes) {
    if (m.morphTargetManager) morphManagers.push(m.morphTargetManager);
  }
  const findMorph = (names) => {
    for (const mgr of morphManagers) {
      for (let i = 0; i < mgr.numTargets; i++) {
        const t = mgr.getTarget(i);
        if (names.includes(t.name)) return t;
      }
    }
    return null;
  };
  root._jawOpen = findMorph(['jawOpen', 'mouthOpen', 'viseme_aa']);

  // Animation controller — procedural fallback animates head/torso when a GLB clip is absent.
  const proceduralFallback = makeProceduralFallback(scene, root, skeleton);
  const anim = new AnimController(scene, skeleton, { target: root, proceduralFallback });
  await anim.preload();
  root._anim = anim;

  // Public API mirrors proceduralHuman so the engine treats both the same.
  root.facePlayer = (playerPos) => {
    if (!playerPos) return;
    const dx = playerPos.x - root.position.x, dz = playerPos.z - root.position.z;
    const targetY = Math.atan2(dx, dz);
    const turn = new Animation('faceTurn', 'rotation.y', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    turn.setKeys([{ frame: 0, value: root.rotation.y }, { frame: 18, value: targetY }]);
    scene.beginDirectAnimation(root, [turn], 0, 18, false, 1.5);
  };
  root.playGesture = (action) => anim.play(action || 'idle');
  root.setSpeaking = (on) => {
    anim.setSpeaking(on);
    if (on) startLipSync(scene, root); else stopLipSync(root);
  };

  // AIRI-style aliveness — auto-blink, look-at-camera, idle breath/sway.
  try {
    const alive = attachAliveness(scene, root, {
      meshes: result.meshes,
      getTarget: () => scene.activeCamera?.position,
    });
    root._aliveness = alive;
  } catch (e) { console.warn('[aliveness skipped]', e); }

  return root;
}

// Procedural head/torso motion used when a specific GLB clip isn't loaded yet.
function makeProceduralFallback(scene, root, skeleton) {
  const headBone = skeleton?.bones?.find(b => /head/i.test(b.name));
  return (action) => {
    if (!headBone) return;
    const node = headBone.getTransformNode?.();
    if (!node) return;
    const a = new Animation(`pf_${action}`, 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    const keys = action === 'nod'
      ? [{frame:0,value:0},{frame:8,value:0.3},{frame:16,value:0},{frame:24,value:0.3},{frame:32,value:0}]
      : [{frame:0,value:0},{frame:12,value:0.15},{frame:24,value:0}];
    a.setKeys(keys);
    scene.beginDirectAnimation(node, [a], 0, keys[keys.length-1].frame, false, 1);
  };
}

// ── Lip-sync: oscillate jawOpen morph while speaking (amplitude-free simple version;
//    upgraded to audio-amplitude-driven in the perfect-B pass) ──
function startLipSync(scene, root) {
  if (!root._jawOpen) return;
  stopLipSync(root);
  let t = 0;
  root._lipObserver = scene.onBeforeRenderObservable.add(() => {
    t += 0.35;
    // Pseudo-random mouth movement that reads as speech.
    const v = Math.abs(Math.sin(t) * 0.5 + Math.sin(t * 2.3) * 0.25);
    root._jawOpen.influence = Math.min(1, v);
  });
}
function stopLipSync(root) {
  if (root._lipObserver) {
    root.getScene().onBeforeRenderObservable.remove(root._lipObserver);
    root._lipObserver = null;
  }
  if (root._jawOpen) root._jawOpen.influence = 0;
}
