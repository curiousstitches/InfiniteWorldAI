import { DefaultRenderingPipeline, SSAO2RenderingPipeline, Color4 } from '@babylonjs/core';

export const buildPostProcessPipeline = (scene, camera, engine) => {
  const pipeline = new DefaultRenderingPipeline('main', true, scene, [camera]);

  // Bloom — gives god rays and glow to light sources
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.65;
  pipeline.bloomWeight = 0.4;
  pipeline.bloomKernel = 64;
  pipeline.bloomScale = 0.5;

  // Chromatic aberration — subtle lens distortion at edges
  pipeline.chromaticAberrationEnabled = true;
  pipeline.chromaticAberration.aberrationAmount = 18;
  pipeline.chromaticAberration.radialIntensity = 1;

  // Depth of field — creates cinematic focus
  pipeline.depthOfFieldEnabled = true;
  pipeline.depthOfField.focalLength = 50;
  pipeline.depthOfField.fStop = 1.4;
  pipeline.depthOfField.focusDistance = 2500;
  pipeline.depthOfFieldBlurLevel = 1;

  // Sharpening
  pipeline.sharpenEnabled = true;
  pipeline.sharpen.edgeAmount = 0.35;

  // Grain — filmic texture
  pipeline.grainEnabled = true;
  pipeline.grain.intensity = 14;
  pipeline.grain.animated = true;

  // FXAA antialiasing
  pipeline.fxaaEnabled = true;
  pipeline.samples = engine.getCaps().maxMSAASamples > 4 ? 4 : 2;

  // Tone mapping
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = 1; // ACES
  pipeline.imageProcessing.exposure = 1.0;
  pipeline.imageProcessing.contrast = 1.15;

  // SSAO
  let ssao = null;
  try {
    ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera]);
    ssao.radius = 1.5;
    ssao.totalStrength = 0.8;
    ssao.base = 0.1;
    ssao.maxZ = 250;
    ssao.minZAspect = 0.2;
  } catch (e) {
    console.warn('SSAO not available:', e.message);
  }

  return { pipeline, ssao };
};

export const updatePipelineForBiome = (pipeline, biome, scale) => {
  if (!pipeline) return;
  const isUnderground = ['cave', 'volcanic'].includes(biome);
  const isCosmic = scale === 'COSMIC';
  const isMicro = ['MICRO', 'NANO'].includes(scale);

  pipeline.bloomWeight = isCosmic ? 0.8 : isUnderground ? 0.6 : 0.4;
  pipeline.bloomThreshold = isCosmic ? 0.3 : 0.65;
  pipeline.depthOfField.fStop = isMicro ? 0.7 : 1.4;
  pipeline.depthOfField.focusDistance = isMicro ? 500 : 2500;
  pipeline.grain.intensity = isCosmic ? 6 : 14;
  pipeline.imageProcessing.exposure = isCosmic ? 0.7 : isUnderground ? 0.85 : 1.0;
};
