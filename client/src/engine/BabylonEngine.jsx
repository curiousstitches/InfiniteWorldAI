// client/src/engine/BabylonEngine.jsx
// Engine integration. Wires the new tier/cameras/environment/skin/terrain/vegetation/postprocess modules.
// Same external contract as before — props: { worldState, interactables, onInteract, characterModelUrl }.
// New: subscribes to settingsStore for graphics tier + camera mode, and to gameStore for voice activity.

import { useEffect, useRef, useCallback } from 'react';
import {
  WebGPUEngine, Engine, Scene, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, GlowLayer, FogMode,
  SceneLoader, Animation, TransformNode, MeshBuilder, PBRMaterial
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import { getBiome, getScale } from './biomes.js';
import { createParticleSystem, switchParticleSystem } from './particles.js';
import { InteractableManager } from './interactables.js';
import { buildTerrainHQ, morphTerrainHQ } from './visual/terrainHQ.js';
import { buildPostProcessHQ } from './visual/postprocessHQ.js';
import { EnvironmentManager } from './visual/environment.js';
import { applyCharacterShaders } from './visual/skinShader.js';
import { Vegetation } from './visual/vegetation.js';
import { CameraController, MODE } from './cameras.js';
import { detectCapability } from './tier/capability.js';
import { resolveTier } from './tier/tierConfig.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useGameStore } from '../store/worldStore.js';

// ── primitive companion fallback (kept tight) ─────────────────────────
const buildPrimitiveCompanion = (scene) => {
  const root = new TransformNode('companion_root', scene);
  root.position = new Vector3(2.5, 0, 4);
  const mkMat = (hex, emissive = 0) => {
    const m = new PBRMaterial(`m_${Math.random()}`, scene);
    m.albedoColor = Color3.FromHexString(hex); m.metallic = 0.2; m.roughness = 0.5;
    if (emissive > 0) m.emissiveColor = Color3.FromHexString(hex).scale(emissive);
    return m;
  };
  const body = MeshBuilder.CreateCapsule('cBody', { height: 1.2, radius: 0.25 }, scene);
  body.parent = root; body.position.y = 1.1; body.material = mkMat('#5a3a8a', 0.15);
  const head = MeshBuilder.CreateSphere('cHead', { diameter: 0.5, segments: 16 }, scene);
  head.parent = root; head.position.y = 2.0; head.material = mkMat('#7a4abf', 0.25);
  for (const dx of [-0.12, 0.12]) {
    const eye = MeshBuilder.CreateSphere('cEye', { diameter: 0.08 }, scene);
    eye.parent = head; eye.position = new Vector3(dx, 0.05, -0.22);
    eye.material = mkMat('#ffeeff', 1.5);
  }
  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateCapsule('arm', { height: 0.8, radius: 0.08 }, scene);
    arm.parent = root; arm.position = new Vector3(side * 0.35, 1.3, 0); arm.rotation.z = side * 0.2;
    arm.material = mkMat('#5a3a8a', 0.1);
  }
  attachCompanionFloat(scene, root);
  return root;
};

const attachCompanionFloat = (scene, root) => {
  const anim = new Animation('floatY', 'position.y', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  const base = root.position.y;
  anim.setKeys([
    { frame: 0, value: base },
    { frame: 60, value: base + 0.08 },
    { frame: 120, value: base }
  ]);
  root.animations = [anim];
  scene.beginAnimation(root, 0, 120, true, 0.6);
};

// Apply overrides on top of the resolved tier preset.
const tierWithOverrides = (tier, overrides) => {
  const out = { ...tier };
  for (const k of Object.keys(overrides || {})) {
    if (overrides[k] !== null && overrides[k] !== undefined) out[k] = overrides[k];
  }
  return out;
};

export default function BabylonEngine({ worldState, interactables, onInteract, characterModelUrl }) {
  const canvasRef = useRef(null);
  const refs = useRef({
    engine: null, scene: null, cameraCtl: null, env: null,
    terrain: null, particleSystem: null, postProcess: null,
    interactableManager: null, glowLayer: null, vegetation: null,
    sunLight: null, ambientLight: null,
    companionRoot: null, noiseSeed: Math.random() * 1000,
    currentBiome: null, currentScale: null, tier: null
  });

  // ── settings subscriptions ──────────────────────────────────────────
  const graphics    = useSettingsStore(s => s.graphics);
  const tierChoice  = graphics.tierChoice;
  const cameraMode  = graphics.cameraMode;
  const skinTone    = graphics.skinTone;
  const overrides   = graphics.overrides;

  // Voice state — drives hybrid camera mode.
  const isListening = useGameStore(s => s.isListening);
  const isSpeaking  = useGameStore(s => s.isSpeaking);
  const voiceActive = isListening || isSpeaking;

  const applyWorldState = useCallback((ws) => {
    const r = refs.current;
    if (!r.scene || !ws) return;
    const biome = ws.biome || 'forest';
    const scale = ws.scale || 'HUMAN';
    const b = getBiome(biome);
    const s = getScale(scale);
    const biomeChanged = biome !== r.currentBiome;
    const scaleChanged = scale !== r.currentScale;

    // Environment manager handles sky + HDRI + atmosphere.
    if (biomeChanged && r.env) r.env.setBiome(biome, ws.mood);
    if (r.env) r.env.setTimeOfDay(ws.timeOfDay ?? 0.5);

    // Fog
    r.scene.fogMode = FogMode.FOG_EXP2;
    r.scene.fogColor = Color3.FromHexString(b.fogColor);
    r.scene.fogDensity = b.fogDensity * s.fogMult;

    // Lights
    if (r.ambientLight) {
      r.ambientLight.diffuse = Color3.FromHexString(b.ambientColor);
      r.ambientLight.intensity = b.ambientIntensity;
    }
    if (r.sunLight) {
      r.sunLight.diffuse = Color3.FromHexString(b.sunColor);
      r.sunLight.intensity = b.sunIntensity;
      const tod = ws.timeOfDay ?? 0.5;
      r.sunLight.direction = new Vector3(
        Math.sin(tod * Math.PI * 2),
        -Math.abs(Math.cos(tod * Math.PI * 2)) - 0.2,
        0.5
      );
    }

    // Terrain (rebuild on biome / scale change).
    if ((biomeChanged || scaleChanged) && r.terrain) {
      r.terrain = morphTerrainHQ({ scene: r.scene, terrain: r.terrain, newBiome: biome, newScale: scale, seed: r.noiseSeed });
      // Repopulate vegetation to match new biome.
      r.vegetation?.populate({ biome, terrain: r.terrain, seed: r.noiseSeed });
    }

    // Particles
    if (biomeChanged) {
      r.particleSystem = switchParticleSystem(r.scene, r.particleSystem, b.particleType, Vector3.Zero());
    }

    // Post-process per-biome exposure tweak
    r.postProcess?.setBiomeTuning?.(biome);

    r.currentBiome = biome;
    r.currentScale = scale;
  }, []);

  // ── Companion mesh loader — applies skin SSS shaders when GLB lands ──
  useEffect(() => {
    const r = refs.current;
    if (!r.scene) return;
    if (r.companionRoot) { r.companionRoot.dispose(); r.companionRoot = null; }

    const finishLoad = (root) => {
      r.companionRoot = root;
      // Auto-classify meshes by name and upgrade materials.
      applyCharacterShaders(root, r.scene, r.tier, { skinTone });
    };

    if (characterModelUrl) {
      SceneLoader.ImportMeshAsync('', characterModelUrl, '', r.scene).then((result) => {
        const root = result.meshes[0];
        root.name = 'companion';
        root.position = new Vector3(2, 0, 4);
        root.scaling = new Vector3(0.8, 0.8, 0.8);
        finishLoad(root);
        attachCompanionFloat(r.scene, root);
      }).catch(() => { finishLoad(buildPrimitiveCompanion(r.scene)); });
    } else {
      finishLoad(buildPrimitiveCompanion(r.scene));
    }
  }, [characterModelUrl, skinTone]);

  // Interactables sync
  useEffect(() => {
    const r = refs.current;
    if (!r.interactableManager || !interactables) return;
    r.interactableManager.syncWithServer(interactables, { terrainSize: 400, subdivisions: 180 });
  }, [interactables]);

  // World state
  useEffect(() => { applyWorldState(worldState); }, [worldState, applyWorldState]);

  // ── Camera mode driver — auto-engages over-shoulder during voice ────
  useEffect(() => {
    const r = refs.current;
    if (!r.cameraCtl) return;
    if (cameraMode === 'auto') {
      r.cameraCtl.setVoiceActive(voiceActive, MODE.FIRST_PERSON);
    } else {
      // Manual modes — ignore voice state, snap to user's pick.
      const map = { first: MODE.FIRST_PERSON, over: MODE.OVER_SHOULDER, orbit: MODE.FREE_ORBIT };
      r.cameraCtl.setMode(map[cameraMode] || MODE.FIRST_PERSON);
    }
  }, [cameraMode, voiceActive]);

  // ── Engine init (runs once) ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = refs.current;

    const initEngine = async () => {
      const cap = await detectCapability();
      // Resolve the active tier with the user's choice + any per-feature overrides.
      const resolvedBase = resolveTier(tierChoice, cap.tier);
      const tier = tierWithOverrides(resolvedBase, overrides);
      r.tier = tier;
      useSettingsStore.getState().setGraphics({ autoDetectedTier: cap.tier });

      // Engine — prefer WebGPU when capability advertises it AND tier preset benefits.
      let engine;
      if (cap.supportsWebGPU && tier.renderScale >= 1) {
        try {
          const gpu = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: true, audioEngine: false });
          await gpu.initAsync();
          engine = gpu;
        } catch {
          engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true, audioEngine: false });
        }
      } else {
        engine = new Engine(canvas, tier.msaaSamples > 1, { antialias: tier.msaaSamples > 1, adaptToDeviceRatio: true, audioEngine: false });
      }
      engine.setHardwareScalingLevel(tier.hardwareScaling || 1);
      r.engine = engine;

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.04, 0.06, 0.12, 1);
      r.scene = scene;

      // Camera controller — receives getter callbacks so it can follow companion/player.
      r.cameraCtl = new CameraController({
        scene, canvas,
        getCompanionNode: () => r.companionRoot,
        getPlayerNode:    () => r.cameraCtl.firstPerson?.position || new Vector3(0, 1.7, 0)
      });

      // Lights
      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.4;
      ambient.diffuse = Color3.FromHexString('#8fbb6a');
      ambient.groundColor = Color3.FromHexString('#2d4a1e');
      r.ambientLight = ambient;

      const sun = new DirectionalLight('sun', new Vector3(-0.5, -0.8, 0.3), scene);
      sun.intensity = 1.2;
      sun.diffuse = Color3.FromHexString('#fff5d0');
      r.sunLight = sun;

      // Glow for magical / interactable highlights
      const glow = new GlowLayer('glow', scene);
      glow.intensity = 0.6;
      r.glowLayer = glow;

      // Environment manager — HDRI + sky.
      r.env = new EnvironmentManager(scene, tier);

      // Terrain HQ
      const initialBiome = worldState?.biome || 'forest';
      const initialScale = worldState?.scale || 'HUMAN';
      r.terrain = buildTerrainHQ({ scene, tier, biome: initialBiome, scale: initialScale, seed: r.noiseSeed });

      // Vegetation
      r.vegetation = new Vegetation(scene, tier);
      r.vegetation.populate({ biome: initialBiome, terrain: r.terrain, seed: r.noiseSeed });

      // Particles
      r.particleSystem = createParticleSystem(scene, getBiome(initialBiome).particleType, Vector3.Zero());

      // Post-process HQ
      r.postProcess = buildPostProcessHQ(scene, scene.activeCamera, tier);

      // Interactables
      r.interactableManager = new InteractableManager(scene, glow, onInteract);

      // Terrain follow (raise FP camera above ground)
      scene.registerBeforeRender(() => {
        const fp = r.cameraCtl?.firstPerson;
        if (!fp) return;
        const h = r.terrain?.getHeightAt?.(fp.position.x, fp.position.z) ?? 0;
        const minY = h + 1.8;
        if (fp.position.y < minY) fp.position.y = minY;
        // Keep companion grounded too.
        if (r.companionRoot) {
          const ch = r.terrain?.getHeightAt?.(r.companionRoot.position.x, r.companionRoot.position.z) ?? 0;
          if (r.companionRoot.position.y < ch) r.companionRoot.position.y = ch;
        }
        // Update DOF focus to distance from camera → companion.
        if (r.postProcess?.setDofFocus && r.companionRoot && scene.activeCamera) {
          const d = Vector3.Distance(scene.activeCamera.position, r.companionRoot.position);
          r.postProcess.setDofFocus(Math.max(0.5, d));
        }
      });

      // Pointer-lock the canvas for first-person.
      canvas.addEventListener('click', () => {
        if (r.cameraCtl?.mode === MODE.FIRST_PERSON) canvas.requestPointerLock?.();
      });

      // Apply initial world state.
      if (worldState) applyWorldState(worldState);

      engine.runRenderLoop(() => scene.render());
      window.addEventListener('resize', () => engine.resize());
    };

    initEngine().catch((e) => console.error('[BabylonEngine init failed]', e));

    return () => {
      const r = refs.current;
      r.interactableManager?.dispose();
      r.vegetation?.dispose();
      r.env?.dispose();
      r.particleSystem?.dispose();
      r.cameraCtl?.dispose();
      r.postProcess?.dispose?.();
      r.engine?.dispose();
    };
  }, []); // eslint-disable-line

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      tabIndex={0}
    />
  );
}
