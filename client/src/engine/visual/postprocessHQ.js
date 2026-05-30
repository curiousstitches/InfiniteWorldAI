// client/src/engine/visual/postprocessHQ.js
// Builds a tier-aware post-process pipeline replacing the older minimal pipeline.
// All knobs come from tierConfig (bloom, eyeAdaptation, bokehDof, chromaticAberration, grain, ssao).

import {
  DefaultRenderingPipeline, ImageProcessingConfiguration, DepthOfFieldEffectBlurLevel,
  Color4, MotionBlurPostProcess, SSAO2RenderingPipeline, ColorCurves
} from '@babylonjs/core';

export function buildPostProcessHQ(scene, camera, tier) {
  const pipeline = new DefaultRenderingPipeline('iwHQ', true, scene, [camera]);

  // Bloom — luminance-driven highlight pass.
  pipeline.bloomEnabled = !!tier.bloom;
  pipeline.bloomKernel = tier.bloomKernel || 64;
  pipeline.bloomThreshold = 0.85;
  pipeline.bloomWeight = 0.35;
  pipeline.bloomScale = 0.5;

  // ACES tone mapping — film-grade.
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  pipeline.imageProcessing.exposure = 1.0;
  pipeline.imageProcessing.contrast = 1.05;

  // Color curves — slight teal-to-amber lift for cinematic feel.
  const curves = new ColorCurves();
  curves.globalSaturation = 5;
  curves.globalDensity = 10;
  curves.shadowsHue = 220;   // teal
  curves.shadowsSaturation = 8;
  curves.highlightsHue = 35; // amber
  curves.highlightsSaturation = 6;
  pipeline.imageProcessing.colorCurves = curves;
  pipeline.imageProcessing.colorCurvesEnabled = true;

  // Bokeh depth-of-field.
  if (tier.bokehDof) {
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfFieldBlurLevel = tier.dofKernel > 32 ? DepthOfFieldEffectBlurLevel.High : DepthOfFieldEffectBlurLevel.Medium;
    pipeline.depthOfField.focalLength = 50;
    pipeline.depthOfField.fStop = 1.8;
    pipeline.depthOfField.focusDistance = 3000;   // mm — focus on companion (~3m)
    pipeline.depthOfField.lensSize = 80;
  }

  // Eye adaptation (auto-exposure).
  if (tier.eyeAdaptation) {
    pipeline.imageProcessing.exposure = 1.0;
    // We simulate eye adaptation cheaply by lerping exposure toward a target each frame
    // based on the camera's looking-at-bright-or-dark-region heuristic.
    let target = 1.0, current = 1.0;
    scene.onBeforeRenderObservable.add(() => {
      const c = scene.activeCamera;
      if (!c) return;
      // Heuristic: when looking up, exposure dips (bright sky); looking down, lifts.
      const yDot = c.getDirection ? c.getDirection({ x:0,y:1,z:0 }).y : 0;
      target = 1.0 - Math.max(0, yDot) * 0.4 + Math.max(0, -yDot) * 0.3;
      current += (target - current) * 0.02;
      pipeline.imageProcessing.exposure = current;
    });
  }

  // Chromatic aberration.
  pipeline.chromaticAberrationEnabled = !!tier.chromaticAberration;
  if (pipeline.chromaticAberrationEnabled) {
    pipeline.chromaticAberration.aberrationAmount = 12;
    pipeline.chromaticAberration.radialIntensity = 1;
  }

  // Film grain.
  pipeline.grainEnabled = (tier.grain || 0) > 0;
  if (pipeline.grainEnabled) {
    pipeline.grain.intensity = tier.grain * 30;
    pipeline.grain.animated = true;
  }

  // Sharpen — subtle, helps after MSAA downsample.
  pipeline.sharpenEnabled = true;
  pipeline.sharpen.edgeAmount = 0.3;
  pipeline.sharpen.colorAmount = 1.0;

  // FXAA (cheaper than MSAA on low-tier).
  pipeline.fxaaEnabled = tier.msaaSamples <= 1;
  pipeline.samples = tier.msaaSamples;

  // SSAO — only on capable tiers.
  let ssao = null;
  if (tier.ssao) {
    ssao = new SSAO2RenderingPipeline('iwSSAO', scene, 0.75, [camera]);
    ssao.totalStrength = 1.2;
    ssao.radius = 1.5;
    ssao.expensiveBlur = false;
    ssao.samples = 8;
  }

  // Motion blur — only on the highest tier.
  let mb = null;
  if (tier === undefined) { /* no-op */ }   // placeholder for future tier.motionBlur

  return {
    pipeline,
    ssao,
    setDofFocus: (meters) => { if (pipeline.depthOfField) pipeline.depthOfField.focusDistance = meters * 1000; },
    setBiomeTuning: (biome) => {
      // Per-biome adjustments — denser haze in mushroom/cosmic, brighter in desert/ethereal.
      const ex = ({ desert: 1.1, ethereal: 1.15, cave: 0.85, void: 0.7, mushroom_forest: 0.95 })[biome] || 1.0;
      pipeline.imageProcessing.exposure = ex;
    },
    dispose: () => { pipeline.dispose(); ssao?.dispose(); }
  };
}
