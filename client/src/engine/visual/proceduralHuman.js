// client/src/engine/visual/proceduralHuman.js
// Builds a recognizable humanoid companion from primitives — no external API, no GLB.
// Articulated: head, hair, torso, arms, hands, legs, feet, plus a simple face.
// Gives the hosted/free build a real character instead of a floating capsule.

import { MeshBuilder, StandardMaterial, Color3, Vector3, TransformNode, Animation } from '@babylonjs/core';

const SKIN_TONES = {
  porcelain: '#fae0d2', fair: '#f6d4b6', light: '#e8b894', tan: '#c89272',
  olive: '#a87852', brown: '#7a4830', deep: '#523018',
};

const HAIR_COLORS = ['#1a0c08', '#3a2418', '#5a3a1a', '#0a0404', '#6a4a2a', '#2a2a2a'];

function mat(scene, hex, { emissive = 0 } = {}) {
  const m = new StandardMaterial(`ph_${Math.random().toString(36).slice(2)}`, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.1, 0.1, 0.1);
  if (emissive > 0) m.emissiveColor = Color3.FromHexString(hex).scale(emissive);
  return m;
}

// Deterministic pick from a seed string so the same character looks consistent.
function pick(arr, seed) {
  let h = 0;
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

export function buildProceduralHuman(scene, opts = {}) {
  const skinHex = SKIN_TONES[opts.skinTone] || SKIN_TONES.light;
  const hairHex = opts.hairColor || pick(HAIR_COLORS, opts.seed || opts.name || 'companion');
  const outfitHex = opts.outfitColor || '#5a3a8a';
  const accentHex = opts.accentColor || '#cc88ff';

  const skin = mat(scene, skinHex, { roughness: 0.55 });
  const hair = mat(scene, hairHex, { roughness: 0.45 });
  const outfit = mat(scene, outfitHex, { roughness: 0.5, metallic: 0.1 });
  const accent = mat(scene, accentHex, { roughness: 0.4, emissive: 0.2 });
  const eyeWhite = mat(scene, '#ffffff', { roughness: 0.1 });
  const iris = mat(scene, opts.eyeColor || '#5a3818', { roughness: 0.15, emissive: 0.1 });
  const mouth = mat(scene, '#a85848', { roughness: 0.5 });

  const root = new TransformNode('companion_root', scene);
  root.position = new Vector3(opts.x ?? 2.5, 0, opts.z ?? 4);

  // ── TORSO ──
  const torso = MeshBuilder.CreateCylinder('torso', { height: 0.75, diameterTop: 0.42, diameterBottom: 0.5, tessellation: 16 }, scene);
  torso.parent = root; torso.position.y = 1.15; torso.material = outfit;

  // Chest accent stripe
  const stripe = MeshBuilder.CreateCylinder('stripe', { height: 0.3, diameterTop: 0.44, diameterBottom: 0.46, tessellation: 16 }, scene);
  stripe.parent = root; stripe.position.y = 1.3; stripe.material = accent;

  // ── HIPS ──
  const hips = MeshBuilder.CreateCylinder('hips', { height: 0.3, diameterTop: 0.5, diameterBottom: 0.42, tessellation: 16 }, scene);
  hips.parent = root; hips.position.y = 0.68; hips.material = outfit;

  // ── NECK ──
  const neck = MeshBuilder.CreateCylinder('neck', { height: 0.18, diameter: 0.16, tessellation: 12 }, scene);
  neck.parent = root; neck.position.y = 1.62; neck.material = skin;

  // ── HEAD ──
  const head = MeshBuilder.CreateSphere('head', { diameter: 0.42, segments: 20 }, scene);
  head.parent = root; head.position.y = 1.85; head.scaling.y = 1.12; head.material = skin;

  // ── HAIR (cap + back) ──
  const hairCap = MeshBuilder.CreateSphere('hairCap', { diameter: 0.46, segments: 20, slice: 0.62 }, scene);
  hairCap.parent = root; hairCap.position.y = 1.9; hairCap.material = hair;
  const hairBack = MeshBuilder.CreateSphere('hairBack', { diameter: 0.44, segments: 16 }, scene);
  hairBack.parent = root; hairBack.position.set(0, 1.86, 0.06); hairBack.scaling.set(1, 1.15, 0.7); hairBack.material = hair;

  // ── FACE — eyes ──
  for (const dx of [-0.09, 0.09]) {
    const white = MeshBuilder.CreateSphere('eyeW', { diameter: 0.09, segments: 10 }, scene);
    white.parent = root; white.position.set(dx, 1.88, -0.18); white.scaling.z = 0.6; white.material = eyeWhite;
    const pupil = MeshBuilder.CreateSphere('iris', { diameter: 0.05, segments: 8 }, scene);
    pupil.parent = root; pupil.position.set(dx, 1.88, -0.21); pupil.material = iris;
  }
  // eyebrows
  for (const dx of [-0.09, 0.09]) {
    const brow = MeshBuilder.CreateBox('brow', { width: 0.1, height: 0.018, depth: 0.03 }, scene);
    brow.parent = root; brow.position.set(dx, 1.95, -0.19); brow.material = hair;
  }
  // nose
  const nose = MeshBuilder.CreateCylinder('nose', { height: 0.08, diameterTop: 0.01, diameterBottom: 0.05, tessellation: 6 }, scene);
  nose.parent = root; nose.position.set(0, 1.83, -0.2); nose.rotation.x = Math.PI / 2; nose.material = skin;
  // mouth
  const lips = MeshBuilder.CreateBox('mouth', { width: 0.12, height: 0.025, depth: 0.02 }, scene);
  lips.parent = root; lips.position.set(0, 1.76, -0.19); lips.material = mouth;

  // ── ARMS (shoulder → hand) ──
  for (const side of [-1, 1]) {
    const shoulder = MeshBuilder.CreateSphere('shoulder', { diameter: 0.2 }, scene);
    shoulder.parent = root; shoulder.position.set(side * 0.32, 1.45, 0); shoulder.material = outfit;

    const upperArm = MeshBuilder.CreateCylinder('upperArm', { height: 0.42, diameter: 0.13, tessellation: 10 }, scene);
    upperArm.parent = root; upperArm.position.set(side * 0.38, 1.2, 0); upperArm.rotation.z = side * 0.12; upperArm.material = outfit;

    const foreArm = MeshBuilder.CreateCylinder('foreArm', { height: 0.4, diameter: 0.11, tessellation: 10 }, scene);
    foreArm.parent = root; foreArm.position.set(side * 0.44, 0.82, 0); foreArm.rotation.z = side * 0.12; foreArm.material = skin;

    const hand = MeshBuilder.CreateSphere('hand', { diameter: 0.13 }, scene);
    hand.parent = root; hand.position.set(side * 0.48, 0.6, 0); hand.scaling.y = 1.2; hand.material = skin;
  }

  // ── LEGS ──
  for (const side of [-1, 1]) {
    const thigh = MeshBuilder.CreateCylinder('thigh', { height: 0.5, diameter: 0.17, tessellation: 10 }, scene);
    thigh.parent = root; thigh.position.set(side * 0.15, 0.32, 0); thigh.material = outfit;

    const shin = MeshBuilder.CreateCylinder('shin', { height: 0.5, diameter: 0.13, tessellation: 10 }, scene);
    shin.parent = root; shin.position.set(side * 0.15, -0.15, 0); shin.material = outfit;

    const foot = MeshBuilder.CreateBox('foot', { width: 0.14, height: 0.1, depth: 0.28 }, scene);
    foot.parent = root; foot.position.set(side * 0.15, -0.42, -0.06); foot.material = accent;
  }

  // ── Gentle idle breathing/float ──
  const anim = new Animation('breathe', 'position.y', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  const baseY = root.position.y;
  anim.setKeys([
    { frame: 0, value: baseY },
    { frame: 45, value: baseY + 0.04 },
    { frame: 90, value: baseY },
  ]);
  root.animations = [anim];
  scene.beginAnimation(root, 0, 90, true, 0.5);

  // ── Gesture system — simple procedural motions driven by the AI's <gesture> tag ──
  // Stores references so we can animate specific parts.
  root._parts = { head, torso, root };
  root._baseRotation = { y: root.rotation.y };

  // Turn to face the player (called when companion starts speaking).
  root.facePlayer = (playerPos) => {
    if (!playerPos) return;
    const dx = playerPos.x - root.position.x;
    const dz = playerPos.z - root.position.z;
    const targetY = Math.atan2(dx, dz);
    const turn = new Animation('turn', 'rotation.y', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    turn.setKeys([
      { frame: 0, value: root.rotation.y },
      { frame: 20, value: targetY },
    ]);
    scene.beginDirectAnimation(root, [turn], 0, 20, false, 1.5);
    root._baseRotation.y = targetY;
  };

  // Play a named gesture. Each is a short procedural motion on head/torso.
  root.playGesture = (action) => {
    const animations = [];
    const mk = (target, prop, keys, type = Animation.ANIMATIONTYPE_FLOAT) => {
      const a = new Animation(`g_${prop}_${Math.random()}`, prop, 30, type, Animation.ANIMATIONLOOPMODE_CONSTANT);
      a.setKeys(keys); return { node: target, anim: a };
    };
    const by = root._baseRotation.y;

    switch (action) {
      case 'nod':
        animations.push(mk(head, 'rotation.x', [{frame:0,value:0},{frame:8,value:0.35},{frame:16,value:0},{frame:24,value:0.35},{frame:32,value:0}]));
        break;
      case 'shake_head':
        animations.push(mk(head, 'rotation.y', [{frame:0,value:0},{frame:8,value:0.4},{frame:16,value:-0.4},{frame:24,value:0.4},{frame:32,value:0}]));
        break;
      case 'tilt_head':
        animations.push(mk(head, 'rotation.z', [{frame:0,value:0},{frame:15,value:0.4},{frame:45,value:0.4},{frame:60,value:0}]));
        break;
      case 'lean_in':
        animations.push(mk(torso, 'rotation.x', [{frame:0,value:0},{frame:15,value:-0.25},{frame:50,value:-0.25},{frame:70,value:0}]));
        break;
      case 'step_back':
        animations.push(mk(root, 'position.z', [{frame:0,value:root.position.z},{frame:15,value:root.position.z+0.5},{frame:60,value:root.position.z+0.5},{frame:80,value:root.position.z}]));
        break;
      case 'look_around':
        animations.push(mk(head, 'rotation.y', [{frame:0,value:0},{frame:20,value:0.6},{frame:50,value:-0.6},{frame:75,value:0}]));
        break;
      case 'laugh':
        animations.push(mk(torso, 'rotation.x', [{frame:0,value:0},{frame:6,value:-0.12},{frame:12,value:0},{frame:18,value:-0.12},{frame:24,value:0},{frame:30,value:-0.12},{frame:36,value:0}]));
        animations.push(mk(head, 'rotation.x', [{frame:0,value:0},{frame:10,value:-0.2},{frame:36,value:0}]));
        break;
      case 'shrug':
        animations.push(mk(torso, 'position.y', [{frame:0,value:torso.position.y},{frame:12,value:torso.position.y+0.06},{frame:40,value:torso.position.y+0.06},{frame:55,value:torso.position.y}]));
        break;
      case 'wave':
      case 'gesture_hands':
      case 'point':
        // Subtle torso emphasis (arms aren't separately rigged in this primitive build).
        animations.push(mk(torso, 'rotation.y', [{frame:0,value:0},{frame:10,value:0.12},{frame:20,value:-0.12},{frame:30,value:0}]));
        break;
      default: // idle — tiny acknowledgement
        animations.push(mk(head, 'rotation.x', [{frame:0,value:0},{frame:12,value:0.12},{frame:24,value:0}]));
    }

    for (const { node, anim } of animations) {
      const maxFrame = anim.getKeys()[anim.getKeys().length - 1].frame;
      scene.beginDirectAnimation(node, [anim], 0, maxFrame, false, 1);
    }
  };

  return root;
}

export { SKIN_TONES as PROCEDURAL_SKIN_TONES };
