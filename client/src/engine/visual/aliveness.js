// client/src/engine/visual/aliveness.js
// AIRI-inspired "aliveness" — makes any loaded avatar (VRM or GLB) feel alive:
// auto-blink, look-at-camera, idle breathing/sway, subtle eye drift.
// Works off morph targets when present (blink/look), falls back to bone/transform motion.

import { Vector3, Quaternion } from '@babylonjs/core';

const BLINK_NAMES = ['blink', 'Blink', 'eyesClosed', 'EyesClosed', 'blink_l', 'eyeBlinkLeft', 'vrc.blink_left', 'Fcl_EYE_Close'];
const BLINK_R_NAMES = ['blink_r', 'eyeBlinkRight', 'vrc.blink_right'];

function collectMorphs(meshes) {
  const mgrs = [];
  for (const m of meshes) if (m.morphTargetManager) mgrs.push(m.morphTargetManager);
  return mgrs;
}
function findMorph(mgrs, names) {
  for (const mgr of mgrs) {
    for (let i = 0; i < mgr.numTargets; i++) {
      const t = mgr.getTarget(i);
      if (names.some(n => t.name === n || t.name?.toLowerCase().includes(n.toLowerCase()))) return t;
    }
  }
  return null;
}

// Attach aliveness to an avatar root. Returns a disposer.
export function attachAliveness(scene, root, { meshes = [], getTarget } = {}) {
  const mgrs = collectMorphs(meshes.length ? meshes : [root]);
  const blinkL = findMorph(mgrs, BLINK_NAMES);
  const blinkR = findMorph(mgrs, BLINK_R_NAMES) || blinkL;

  // Find a head node for subtle look-at + idle sway (bone or transform).
  const headBone = root.skeleton?.bones?.find(b => /head|neck/i.test(b.name));
  const headNode = headBone?.getTransformNode?.() || root;

  let t = 0;
  let nextBlink = 1.5 + Math.random() * 3;
  let blinkPhase = -1; // -1 idle, 0..1 closing/opening

  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t += dt;

    // ── Auto-blink ──
    if (blinkL) {
      if (blinkPhase < 0) {
        nextBlink -= dt;
        if (nextBlink <= 0) { blinkPhase = 0; nextBlink = 2 + Math.random() * 4; }
      } else {
        blinkPhase += dt * 8; // ~0.25s blink
        const v = blinkPhase < 0.5 ? blinkPhase * 2 : (1 - blinkPhase) * 2;
        const inf = Math.max(0, Math.min(1, v));
        blinkL.influence = inf; if (blinkR) blinkR.influence = inf;
        if (blinkPhase >= 1) { blinkPhase = -1; blinkL.influence = 0; if (blinkR) blinkR.influence = 0; }
      }
    }

    // ── Idle breath/sway on the whole body ──
    root.position.y = (root._baseY ?? root.position.y);
    if (root._baseY === undefined) root._baseY = root.position.y;
    root.position.y = root._baseY + Math.sin(t * 1.1) * 0.012;

    // ── Subtle head look-at-camera + idle drift ──
    if (headNode && headNode.rotationQuaternion === undefined) {
      const target = getTarget?.();
      const sway = Math.sin(t * 0.6) * 0.04;
      if (target) {
        const dx = target.x - root.position.x;
        const dz = target.z - root.position.z;
        const yaw = Math.atan2(dx, dz);
        // ease head toward a fraction of the yaw so it "glances" not snaps
        headNode.rotation.y = (headNode.rotation.y || 0) * 0.9 + (yaw * 0.15 + sway) * 0.1;
      } else {
        headNode.rotation.y = (headNode.rotation.y || 0) * 0.95 + sway * 0.05;
      }
      headNode.rotation.x = Math.sin(t * 0.8) * 0.03;
    }
  });

  return { dispose() { try { scene.onBeforeRenderObservable.remove(obs); } catch {} } };
}
