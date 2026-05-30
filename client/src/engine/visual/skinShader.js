// client/src/engine/visual/skinShader.js
// Photoreal-ish skin material using Babylon's PBR with subsurface scattering enabled.
// Detects skin meshes on a loaded GLB (by name heuristic) and upgrades their materials.
// Tier preset decides whether SSS is active and how deep.

import { PBRMaterial, Color3, Texture } from '@babylonjs/core';

const SKIN_NAME_RE = /\b(head|face|skin|body|hand|arm|leg|neck|cheek)\b/i;
const HAIR_NAME_RE = /\b(hair|braid|ponytail|fringe|bang)\b/i;
const EYE_NAME_RE  = /\b(eye(?!brow)|iris|pupil|cornea|sclera)\b/i;

const SKIN_TONES = {
  fair:     '#f6d4b6',
  light:    '#e8b894',
  tan:      '#c89272',
  olive:    '#a87852',
  brown:    '#7a4830',
  deep:     '#523018',
  porcelain:'#fae0d2'
};

function upgradeToSkin(mat, scene, tier, toneHex = SKIN_TONES.light) {
  if (!(mat instanceof PBRMaterial)) return mat;
  // SSS via PBR's subSurface module.
  if (tier.sssEnabled) {
    mat.subSurface.isTranslucencyEnabled = true;
    mat.subSurface.translucencyIntensity = tier.sssDepth;
    mat.subSurface.tintColor = Color3.FromHexString(toneHex).scale(0.85);
    mat.subSurface.minimumThickness = 0.1;
    mat.subSurface.maximumThickness = 0.6;
  }
  // Realistic skin: low metallic, moderate roughness, slight clearcoat for sheen.
  mat.metallic = 0.0;
  mat.roughness = 0.55;
  mat.clearCoat.isEnabled = true;
  mat.clearCoat.intensity = 0.15;
  mat.clearCoat.roughness = 0.5;
  // Bias toward warmth.
  if (!mat.albedoTexture) mat.albedoColor = Color3.FromHexString(toneHex);
  mat.ambientColor = Color3.FromHexString(toneHex).scale(0.4);
  return mat;
}

function upgradeToHair(mat, scene, tier) {
  if (!(mat instanceof PBRMaterial)) return mat;
  mat.metallic = 0.0;
  mat.roughness = 0.35;
  if (tier.anisotropicHair) {
    mat.anisotropy.isEnabled = true;
    mat.anisotropy.intensity = 0.7;
  }
  return mat;
}

function upgradeToEye(mat) {
  if (!(mat instanceof PBRMaterial)) return mat;
  mat.metallic = 0.1;
  mat.roughness = 0.08;
  mat.clearCoat.isEnabled = true;
  mat.clearCoat.intensity = 0.9;
  mat.clearCoat.roughness = 0.05;
  return mat;
}

// Iterates the root of a GLB-imported character, classifying meshes by name and
// upgrading their materials. Returns counts so the caller can log.
export function applyCharacterShaders(rootNode, scene, tier, opts = {}) {
  const tone = SKIN_TONES[opts.skinTone] || SKIN_TONES.light;
  let skin = 0, hair = 0, eye = 0;
  rootNode.getChildMeshes(false).forEach(m => {
    const n = (m.name || '').toLowerCase();
    if (EYE_NAME_RE.test(n))       { upgradeToEye(m.material); eye++; }
    else if (HAIR_NAME_RE.test(n)) { upgradeToHair(m.material, scene, tier); hair++; }
    else if (SKIN_NAME_RE.test(n)) { upgradeToSkin(m.material, scene, tier, tone); skin++; }
    else if (m.material instanceof PBRMaterial && m.material.albedoColor) {
      // Default for any unclassified material on a character — tighten roughness a bit.
      m.material.roughness = Math.min(0.7, (m.material.roughness ?? 1) * 0.9);
    }
  });
  return { skin, hair, eye };
}

export { SKIN_TONES };
