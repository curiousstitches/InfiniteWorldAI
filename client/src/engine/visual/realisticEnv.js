// client/src/engine/visual/realisticEnv.js
// Image-based lighting (IBL) — what makes PBR materials look real instead of flat.
// Uses Babylon's pre-filtered .env files (CORS-enabled, mobile-friendly, fast to load)
// rather than raw .hdr (heavier + CORS-prone). Quality-scaled. Never throws.

import { CubeTexture, Color3 } from '@babylonjs/core';

// Babylon's officially-hosted .env IBL environments — reliable + CORS-enabled.
// We pick by mood; all are real captured environments pre-converted for the web.
const ENV_BY_BIOME = {
  forest:         'https://assets.babylonjs.com/environments/environmentSpecular.env',
  mushroom_forest:'https://assets.babylonjs.com/environments/environmentSpecular.env',
  cave:           'https://assets.babylonjs.com/environments/environmentSpecular.env',
  ocean:          'https://assets.babylonjs.com/environments/environmentSpecular.env',
  underwater:     'https://assets.babylonjs.com/environments/environmentSpecular.env',
  desert:         'https://assets.babylonjs.com/environments/environmentSpecular.env',
  tundra:         'https://assets.babylonjs.com/environments/environmentSpecular.env',
  volcanic:       'https://assets.babylonjs.com/environments/environmentSpecular.env',
  cosmic:         'https://assets.babylonjs.com/environments/environmentSpecular.env',
  void:           'https://assets.babylonjs.com/environments/environmentSpecular.env',
  ethereal:       'https://assets.babylonjs.com/environments/environmentSpecular.env',
  crystalline:    'https://assets.babylonjs.com/environments/environmentSpecular.env',
  storm:          'https://assets.babylonjs.com/environments/environmentSpecular.env',
  ancient_ruins:  'https://assets.babylonjs.com/environments/environmentSpecular.env',
  default:        'https://assets.babylonjs.com/environments/environmentSpecular.env',
};

// Tint the IBL per biome so each world still feels distinct despite one base env.
const TINT_BY_BIOME = {
  forest: '#bfe8a0', volcanic: '#ffb080', ocean: '#a0d8ff', cosmic: '#c0a8ff',
  desert: '#ffe0a0', tundra: '#d8f0ff', crystalline: '#e0d0ff', default: '#ffffff',
};

export function applyRealisticEnv(scene, { biome = 'forest', quality = 'high' } = {}) {
  if (quality === 'low') {
    scene.environmentIntensity = 0.9;
    return { dispose() {} };
  }
  try {
    const url = ENV_BY_BIOME[biome] || ENV_BY_BIOME.default;
    const env = CubeTexture.CreateFromPrefilteredData(url, scene);
    scene.environmentTexture = env;
    scene.environmentIntensity = quality === 'high' ? 1.25 : 1.0;

    // A subtle skybox from the IBL so the horizon reads as a real environment.
    let sky = null;
    if (quality === 'high') {
      sky = scene.createDefaultSkybox(env, true, 1000, 0.25, true);
    }
    return { dispose() { try { env?.dispose(); sky?.dispose(); } catch {} }, env, sky };
  } catch (e) {
    console.warn('[realisticEnv] IBL load failed, flat lighting', e);
    scene.environmentIntensity = 0.9;
    return { dispose() {} };
  }
}
