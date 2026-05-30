// client/src/engine/tier/tierConfig.js
// Maps tier slugs → a complete graphics feature flag set.
// Every renderer module reads from here so individual modules stay decoupled.

export const TIER_PRESETS = {
  // ── Performance (low end / phones / older laptops) ─────────────────
  performance_low: {
    label: 'Performance (Low)',
    targetFps: 60,
    renderScale: 0.75,
    textureRes: 1024,
    shadowsEnabled: false,
    shadowRes: 0,
    hardwareScaling: 1.5,
    msaaSamples: 1,

    // Environment
    hdriEnabled: false,
    skyType: 'gradient',                  // gradient | hdri | volumetric
    fogQuality: 'simple',
    atmosphericScattering: false,
    volumetricClouds: false,

    // Materials
    sssEnabled: false,
    sssDepth: 0,
    anisotropicHair: false,
    parallaxMaps: false,
    detailMaps: false,

    // Geometry
    terrainSubdivisions: 80,
    terrainTessellation: false,
    vegetationDensity: 0.2,
    vegetationWind: false,
    lodAggressive: true,
    lodDistances: [10, 25, 60],

    // Post-process
    bloom: true,
    bloomKernel: 32,
    eyeAdaptation: false,
    bokehDof: false,
    dofKernel: 8,
    chromaticAberration: false,
    grain: 0.2,
    ssao: false
  },

  // ── Performance High ───────────────────────────────────────────────
  performance_high: {
    label: 'Performance (High)',
    targetFps: 60,
    renderScale: 1,
    textureRes: 2048,
    shadowsEnabled: true,
    shadowRes: 1024,
    hardwareScaling: 1,
    msaaSamples: 1,

    hdriEnabled: true,
    skyType: 'hdri',
    fogQuality: 'medium',
    atmosphericScattering: false,
    volumetricClouds: false,

    sssEnabled: true,
    sssDepth: 0.3,
    anisotropicHair: false,
    parallaxMaps: false,
    detailMaps: true,

    terrainSubdivisions: 120,
    terrainTessellation: false,
    vegetationDensity: 0.5,
    vegetationWind: true,
    lodAggressive: true,
    lodDistances: [15, 40, 100],

    bloom: true,
    bloomKernel: 48,
    eyeAdaptation: true,
    bokehDof: false,
    dofKernel: 16,
    chromaticAberration: true,
    grain: 0.3,
    ssao: true
  },

  // ── Cinematic Mid (most desktops, recent phones) ───────────────────
  cinematic_mid: {
    label: 'Cinematic',
    targetFps: 45,
    renderScale: 1,
    textureRes: 2048,
    shadowsEnabled: true,
    shadowRes: 2048,
    hardwareScaling: 1,
    msaaSamples: 2,

    hdriEnabled: true,
    skyType: 'volumetric',
    fogQuality: 'high',
    atmosphericScattering: true,
    volumetricClouds: true,

    sssEnabled: true,
    sssDepth: 0.6,
    anisotropicHair: true,
    parallaxMaps: true,
    detailMaps: true,

    terrainSubdivisions: 180,
    terrainTessellation: false,
    vegetationDensity: 0.8,
    vegetationWind: true,
    lodAggressive: false,
    lodDistances: [25, 60, 150],

    bloom: true,
    bloomKernel: 64,
    eyeAdaptation: true,
    bokehDof: true,
    dofKernel: 32,
    chromaticAberration: true,
    grain: 0.35,
    ssao: true
  },

  // ── Cinematic High (gaming PCs, M-series Macs, WebGPU desktops) ────
  cinematic_high: {
    label: 'Cinematic (Max)',
    targetFps: 30,
    renderScale: 1,
    textureRes: 4096,
    shadowsEnabled: true,
    shadowRes: 4096,
    hardwareScaling: 1,
    msaaSamples: 4,

    hdriEnabled: true,
    skyType: 'volumetric',
    fogQuality: 'high',
    atmosphericScattering: true,
    volumetricClouds: true,

    sssEnabled: true,
    sssDepth: 0.8,
    anisotropicHair: true,
    parallaxMaps: true,
    detailMaps: true,

    terrainSubdivisions: 256,
    terrainTessellation: true,
    vegetationDensity: 1,
    vegetationWind: true,
    lodAggressive: false,
    lodDistances: [40, 100, 250],

    bloom: true,
    bloomKernel: 96,
    eyeAdaptation: true,
    bokehDof: true,
    dofKernel: 64,
    chromaticAberration: true,
    grain: 0.4,
    ssao: true
  }
};

export const USER_TIER_CHOICES = [
  { key: 'adaptive',          label: 'Adaptive (auto-detect)', icon: '🤖', desc: 'Picks best tier for your device.' },
  { key: 'performance_low',   label: 'Performance · Low',      icon: '⚡', desc: 'Max framerate. Mobile-friendly.' },
  { key: 'performance_high',  label: 'Performance · High',     icon: '🚀', desc: '60fps target. PBR + light SSS.' },
  { key: 'cinematic_mid',     label: 'Cinematic',              icon: '🎬', desc: '45fps. Volumetric sky + SSS + bokeh DOF.' },
  { key: 'cinematic_high',    label: 'Cinematic · Max',        icon: '✨', desc: '30fps. Everything on. Desktop GPUs.' }
];

export function resolveTier(userChoice, autoDetected) {
  if (userChoice === 'adaptive' || !userChoice) return TIER_PRESETS[autoDetected || 'performance_high'];
  return TIER_PRESETS[userChoice] || TIER_PRESETS.performance_high;
}
