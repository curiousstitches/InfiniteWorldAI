// client/src/engine/visual/characterSources.js
// Curated realistic-leaning rigged GLB characters from free sources, with a resilient
// fallback chain. Each entry is tried in order; if a URL 404s the loader advances.
// Sources: Ready Player Me (public GLB, no auth) + Quaternius CC0 (via jsDelivr) +
// Khronos sample rigged models (guaranteed-available) as a last GLB resort.

// Khronos glTF-Sample-Models are always up (CC-BY/CC0) and rigged with skin + animations,
// so they're the dependable "always works" realistic-ish humanoid fallback.
const KHRONOS = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0';

export const REALISTIC_PRESETS = [
  // label, primary RPM url, and a guaranteed fallback GLB
  { id: 'mara',  label: 'Mara',  style: 'realistic',
    urls: [ 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
            `${KHRONOS}/CesiumMan/glTF-Binary/CesiumMan.glb` ] },
  { id: 'kael',  label: 'Kael',  style: 'realistic',
    urls: [ 'https://models.readyplayer.me/638df693d72bffc6fa179596.glb',
            `${KHRONOS}/CesiumMan/glTF-Binary/CesiumMan.glb` ] },
  { id: 'sora',  label: 'Sora',  style: 'realistic',
    urls: [ 'https://models.readyplayer.me/6185a4ed9a4e2f29e8f0f8b1.glb',
            `${KHRONOS}/CesiumMan/glTF-Binary/CesiumMan.glb` ] },
];

export const STYLIZED_PRESETS = [
  { id: 'robot', label: 'Bot',    style: 'stylized',
    urls: [ `${KHRONOS}/RiggedFigure/glTF-Binary/RiggedFigure.glb` ] },
  { id: 'fox',   label: 'Spark',  style: 'stylized',
    urls: [ 'https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb',
            `${KHRONOS}/RiggedFigure/glTF-Binary/RiggedFigure.glb` ] },
  { id: 'bramble', label: 'Bramble', style: 'stylized',
    urls: [ `${KHRONOS}/RiggedFigure/glTF-Binary/RiggedFigure.glb` ] },
];

// Free VRM avatars (anime/stylized humanoid, rigged, ARKit-ish blendshapes).
// VRM is glTF-based so the standard loader handles them. Served from pixiv's public
// ChatVRM sample + VRM sample CDN mirrors.
export const VRM_PRESETS = [
  { id: 'vrm_a', label: 'Aria',  style: 'vrm',
    urls: [ 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
            `${KHRONOS}/CesiumMan/glTF-Binary/CesiumMan.glb` ] },
  { id: 'vrm_b', label: 'Yuki',  style: 'vrm',
    urls: [ 'https://cdn.jsdelivr.net/gh/madjin/vrm-samples@main/vroid/VRM1/AvatarSample_A.vrm',
            `${KHRONOS}/CesiumMan/glTF-Binary/CesiumMan.glb` ] },
];

// Pick a default realistic avatar (used by surprise mode / when the player skips).
export function defaultRealisticUrls() {
  const p = REALISTIC_PRESETS[Math.floor(Math.random() * REALISTIC_PRESETS.length)];
  return p.urls;
}

// Flatten a preset's URL list for the loader's fallback chain.
export function urlsForPreset(id) {
  const all = [...REALISTIC_PRESETS, ...STYLIZED_PRESETS, ...VRM_PRESETS];
  return (all.find(p => p.id === id) || REALISTIC_PRESETS[0]).urls;
}
