// client/src/engine/BabylonEngine.jsx
// Engine integration. Wires the new tier/cameras/environment/skin/terrain/vegetation/postprocess modules.
// Same external contract as before — props: { worldState, interactables, onInteract, characterModelUrl }.
// New: subscribes to settingsStore for graphics tier + camera mode, and to gameStore for voice activity.

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Engine, Scene, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight, GlowLayer, UniversalCamera,
  SceneLoader, Animation, TransformNode, MeshBuilder, PBRMaterial,
  StandardMaterial, CubeTexture, Texture, SSAO2RenderingPipeline
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
import { buildProceduralHuman } from './visual/proceduralHuman.js';
import { loadRpmCompanion } from './visual/rpmCompanion.js';
import { defaultRealisticUrls } from './visual/characterSources.js';
import { applyRealisticEnv } from './visual/realisticEnv.js';
import { buildRealisticGround, scatterProps } from './visual/realisticScene.js';
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

export default function BabylonEngine({ worldState, interactables, onInteract, characterModelUrl, character }) {
  const canvasRef = useRef(null);
  const [debugLog, setDebugLog] = useState([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [assetMsg, setAssetMsg] = useState('Awakening…');  // small non-blocking loader label
  // Appends a timestamped line to the on-screen debug log.
  const setDebugMsg = useCallback((msg) => {
    if (!msg) return;
    // Surface friendly milestones in the small loader badge.
    if (/IBL|env/i.test(msg)) setAssetMsg('Conjuring light…');
    else if (/ground/i.test(msg)) setAssetMsg('Shaping the ground…');
    else if (/props/i.test(msg)) setAssetMsg('Growing the world…');
    else if (/companion/i.test(msg)) setAssetMsg('Summoning your companion…');
    else if (/rendering/i.test(msg)) setAssetMsg('');  // done — hide
    const t = ((performance.now() / 1000)).toFixed(1);
    setDebugLog(prev => [...prev.slice(-40), `[${t}s] ${msg}`]);
  }, []);
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
  const gestureTick = useGameStore(s => s.gestureTick);

  // Play a gesture whenever the AI emits one (gestureTick increments).
  useEffect(() => {
    const r = refs.current;
    if (!r.companionRoot?.playGesture) return;
    const action = useGameStore.getState().companionGesture || 'idle';
    // Face the player first, then perform the gesture.
    const playerPos = r.cameraCtl?.firstPerson?.position;
    r.companionRoot.facePlayer?.(playerPos);
    r.companionRoot.playGesture(action);
  }, [gestureTick]);

  // Talk loop + lip-sync while speaking.
  useEffect(() => {
    refs.current.companionRoot?.setSpeaking?.(isSpeaking);
  }, [isSpeaking]);

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
    r.scene.fogMode = Scene.FOGMODE_EXP2;
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
    if ((biomeChanged || scaleChanged) && r.terrain && r.tier) {
      try {
        r.terrain = morphTerrainHQ({
          scene: r.scene, terrain: r.terrain, newBiome: biome,
          newScale: scale, seed: r.noiseSeed, tier: r.tier,
        });
        r.vegetation?.populate({ biome, terrain: r.terrain, seed: r.noiseSeed });
      } catch (e) { console.warn('[terrain morph failed]', e); }
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

  // Keep latest character name on refs so the procedural builder can use it.
  refs.current.characterName = character?.name || 'Companion';

  // ── Companion mesh loader — stored on refs so initEngine can call it once the
  //    scene exists, AND the effect below can re-run it on characterModelUrl/skinTone change.
  refs.current.loadCompanion = async () => {
    const r = refs.current;
    if (!r.scene) return;
    if (r.companionRoot) { try { r.companionRoot.dispose(); } catch {} r.companionRoot = null; }

    const finishLoad = (root) => {
      r.companionRoot = root;
      try { if (!root._isProcedural) applyCharacterShaders(root, r.scene, r.tier, { skinTone }); }
      catch (e) { console.warn('[applyCharacterShaders skipped]', e); }
    };

    try {
      // Build the avatar URL chain: the character's chosen model + a guaranteed fallback,
      // or a default realistic preset chain when none was chosen. Realistic-by-default.
      const chain = characterModelUrl
        ? [characterModelUrl, ...defaultRealisticUrls()]
        : defaultRealisticUrls();
      const root = await loadRpmCompanion(r.scene, {
        avatarUrls: chain,
        name: r.characterName, skinTone,
      });
      r._companionIsProcedural = !!root._isProcedural;
      try { useGameStore.getState().setAvatarFallback(!!root._isProcedural); } catch {}
      finishLoad(root);
      attachCompanionFloat(r.scene, root);
    } catch (e) {
      console.warn('[companion load failed]', e);
    }
  };

  // Re-run loader on dependency change (skin tone swap, late model URL) — but only
  // after initEngine has created the scene. Guarded so it no-ops pre-init.
  useEffect(() => {
    const r = refs.current;
    if (!r.scene) return;            // initEngine will do the first load itself
    r.loadCompanion();
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
      setDebugMsg('engine: detecting GPU…');
      // Capability detection — never let a benchmark failure block engine init.
      let cap;
      try { cap = await detectCapability(); }
      catch (e) { console.warn('[capability detect failed]', e); cap = { tier: 'performance_low', supportsWebGPU: false }; }

      const resolvedBase = resolveTier(tierChoice, cap.tier);
      const tier = tierWithOverrides(resolvedBase, overrides);
      r.tier = tier;
      useSettingsStore.getState().setGraphics({ autoDetectedTier: cap.tier });

      // WebGL2 ONLY. Our sky/skin materials are hand-written GLSL in Effect.ShadersStore;
      // Babylon's WebGPU backend can't compile GLSL and silently drops them → black frame.
      // WebGL2 runs the entire pipeline identically on every device.
      let engine;
      try {
        engine = new Engine(canvas, tier.msaaSamples > 1, {
          antialias: tier.msaaSamples > 1,
          adaptToDeviceRatio: true,
          audioEngine: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        });
      } catch (e) {
        console.error('[WebGL2 engine creation failed]', e);
        return;
      }
      engine.setHardwareScalingLevel(tier.hardwareScaling || 1);
      r.engine = engine;
      setDebugMsg("engine: WebGL2 created ✓");

      // ── Mobile performance: cap the render resolution so phones don't try to draw at
      //    full retina density (the #1 cause of lag). High-DPI phones get scaled down a bit;
      //    low quality scales down more. Keeps motion smooth without looking blurry.
      try {
        const q = useSettingsStore.getState().graphics?.realismQuality || 'high';
        const dpr = window.devicePixelRatio || 1;
        // Target effective DPR: high≈1.5, med≈1.25, low≈1.0 — then convert to Babylon scaling.
        const targetDpr = q === 'low' ? 1.0 : q === 'med' ? 1.25 : 1.5;
        const scaling = Math.max(1, dpr / targetDpr);
        engine.setHardwareScalingLevel(scaling);
      } catch {}

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.45, 0.62, 0.85, 1); // sky blue, always
      r.scene = scene;
      setDebugMsg('scene created');

      // ── SIMPLE GUARANTEED CAMERA — explicitly frames where the companion spawns (2.5, _, 4).
      const cam = new UniversalCamera('mainCam', new Vector3(2.5, 2.2, -2.5), scene);
      cam.setTarget(new Vector3(2.5, 1.4, 4));
      cam.fov = 1.0; cam.minZ = 0.1; cam.maxZ = 4000;
      cam.attachControl(canvas, true);
      scene.activeCamera = cam;
      r.mainCam = cam;
      setDebugMsg('camera ready');

      // ── BRIGHT LIGHTS — hemispheric fills everything, directional adds shape.
      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 1.3;
      ambient.groundColor = Color3.FromHexString('#5a7a45');
      const sun = new DirectionalLight('sun', new Vector3(-0.4, -0.9, 0.3), scene);
      sun.intensity = 1.8;
      r.ambientLight = ambient; r.sunLight = sun;
      setDebugMsg('lights ready');

      // ── GROUND — emissive-tinted StandardMaterial, visible regardless of lighting.
      const initialBiome = worldState?.biome || 'forest';
      const BIOME_COLORS = {
        forest: ['#3a6a28', '#7fb0e8'], volcanic: ['#3a1810', '#d86a3a'],
        ocean: ['#1a4a6a', '#6ab0d8'], desert: ['#c8a868', '#e8d098'],
        tundra: ['#d8e8f0', '#b0d0e8'], cosmic: ['#1a0a2a', '#2a1a4a'],
        crystalline: ['#3a5a6a', '#a0d8e8'], ancient_ruins: ['#5a5040', '#c0b090'],
        mushroom_forest: ['#3a2a4a', '#c890d8'], cave: ['#2a2a30', '#4a4a55'],
        ethereal: ['#4a4a7a', '#c0c0f0'], storm: ['#2a3038', '#6a7a8a'],
      };
      const [groundHex, skyHex] = BIOME_COLORS[initialBiome] || BIOME_COLORS.forest;
      scene.clearColor = Color4.FromHexString(skyHex + 'ff');

      const quality = useSettingsStore.getState().graphics?.realismQuality || 'high';

      // ── Image-based lighting FIRST so PBR ground/props are lit correctly.
      try {
        r.realEnv = applyRealisticEnv(scene, { biome: initialBiome, quality });
        setDebugMsg('IBL env applied (' + quality + ')');
      } catch (e) { console.warn('[IBL skipped]', e); }

      // ── Realism post-processing: filmic tone mapping + gentle contrast make PBR read as
      //    "cinematic" rather than flat. Plus ambient occlusion on high for grounded shadows.
      try {
        scene.imageProcessingConfiguration.toneMappingEnabled = true;
        scene.imageProcessingConfiguration.toneMappingType = 1; // ACES filmic
        scene.imageProcessingConfiguration.contrast = 1.15;
        scene.imageProcessingConfiguration.exposure = 1.1;
        if (quality === 'high') {
          const ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [cam]);
          ssao.totalStrength = 0.9; ssao.radius = 1.2; ssao.samples = 8;
          r.ssao = ssao;
        }
        setDebugMsg('realism post-fx on (' + quality + ')');
      } catch (e) { console.warn('[postfx skipped]', e); }

      // ── Photorealistic PBR ground (textured) — falls back to lit color on failure.
      const ground = buildRealisticGround(scene, { biome: initialBiome, quality, groundHex });
      r.ground = ground;
      setDebugMsg('PBR ground built (' + initialBiome + ', ' + quality + ')');

      // ── Scatter realistic PBR nature props (trees/rocks) for depth.
      try {
        r.props = await scatterProps(scene, { biome: initialBiome, quality });
        setDebugMsg('props scattered: ' + (r.props?.length || 0));
      } catch (e) { console.warn('[props failed]', e); }

      // ── Performance: freeze static geometry so the CPU stops recomputing it each frame.
      //    Ground + props never move, so we lock their world matrices + materials.
      try {
        if (r.ground) { r.ground.freezeWorldMatrix(); r.ground.material?.freeze?.(); r.ground.isPickable = false; }
        (r.props || []).forEach(p => { try { p.freezeWorldMatrix(); p.material?.freeze?.(); p.isPickable = false; } catch {} });
        setDebugMsg('static meshes frozen (perf)');
      } catch (e) { console.warn('[freeze skipped]', e); }

      let glow = null;
      try { glow = new GlowLayer('glow', scene); glow.intensity = 0.5; r.glowLayer = glow; }
      catch (e) { console.warn('[glow init failed]', e); }

      try { r.interactableManager = new InteractableManager(scene, glow, onInteract); }
      catch (e) { console.warn('[interactables init failed]', e); }

      // Spawn the companion NOW that the scene exists.
      setDebugMsg('spawning companion…');
      try { await r.loadCompanion(); } catch (e) { console.warn('[loadCompanion failed]', e); setDebugMsg('companion ERROR: ' + (e?.message||e)); }
      setDebugMsg(r._companionIsProcedural
        ? 'companion: PROCEDURAL fallback (GLB failed to load)'
        : 'companion: realistic GLB loaded ✓');

      // Keep companion grounded.
      scene.registerBeforeRender(() => {
        try {
          if (r.companionRoot && r.companionRoot.position.y < 0) r.companionRoot.position.y = 0;
        } catch {}
      });
      if (worldState) applyWorldState(worldState);

      // CONTINUOUS render via our own requestAnimationFrame loop. This is immune to
      // Babylon's runRenderLoop being throttled/stopped, which was leaving the scene
      // black except when a React re-render forced a single frame ("blue only when talking").
      let firstFrame = false;
      r._renderActive = true;
      const renderFrame = () => {
        if (!r._renderActive) return;
        try {
          if (r.scene && r.scene.activeCamera) {
            r.scene.render();
            if (!firstFrame) { firstFrame = true; setDebugMsg('rendering ✓ (RAF loop live)'); }
          }
        } catch (e) { /* swallow transient frame errors, keep looping */ }
        r._rafId = requestAnimationFrame(renderFrame);
      };
      r._rafId = requestAnimationFrame(renderFrame);

      window.addEventListener('resize', () => { try { engine.resize(); } catch {} });

      // Mobile layout settles AFTER first paint — force resizes so the drawing buffer
      // matches the real canvas size (a common cause of a black/0-size canvas).
      const forceResize = () => { try { engine.resize(); } catch {} };
      requestAnimationFrame(forceResize);
      setTimeout(forceResize, 100);
      setTimeout(forceResize, 500);
      setTimeout(forceResize, 1200);
      setDebugMsg('canvas size: ' + canvas.clientWidth + 'x' + canvas.clientHeight);
    };

    initEngine().catch((e) => {
      console.error('[BabylonEngine init failed]', e);
      setDebugMsg('engine ERROR: ' + String(e?.message || e).slice(0, 120));
    });

    return () => {
      const r = refs.current;
      r._renderActive = false;
      if (r._rafId) cancelAnimationFrame(r._rafId);
      try { r.ssao?.dispose?.(); } catch {}
      try { r.realEnv?.dispose?.(); } catch {}
      r.interactableManager?.dispose();
      r.vegetation?.dispose();
      r.env?.dispose();
      r.particleSystem?.dispose();
      r.cameraCtl?.dispose();
      r.postProcess?.dispose?.();
      r.engine?.dispose();
    };
  }, []); // eslint-disable-line

  const devMode = useSettingsStore(s => s.ui?.devMode);
  const debugText = debugLog.join('\n');
  const copyDebug = async () => {
    try { await navigator.clipboard.writeText(debugText); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard blocked — user can still use the textarea */ }
  };
  const downloadDebug = () => {
    try {
      const blob = new Blob([debugText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `iw-debug-${Date.now()}.txt`;
      a.click(); URL.revokeObjectURL(url);
    } catch {}
  };
  const lastLine = debugLog[debugLog.length - 1] || '';

  return (
    <>
      {/* Small non-blocking "loading" badge — smoky cursive, fades when the world is ready.
          Never blocks gameplay; just tells the player what's still arriving. */}
      {assetMsg && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, pointerEvents: 'none',
          fontFamily: "'Crimson Pro', Georgia, serif", fontStyle: 'italic',
          fontSize: 15, color: 'rgba(220,210,255,0.55)',
          textShadow: '0 0 12px rgba(180,150,255,0.5)', letterSpacing: 1,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: 'rgba(204,136,255,0.8)',
            animation: 'iwHue 2s linear infinite', display: 'inline-block',
            boxShadow: '0 0 8px rgba(204,136,255,0.8)',
          }} />
          {assetMsg}
        </div>
      )}

      {/* Compact status pill — tap to open the full copyable log (devMode only) */}
      {devMode && lastLine && (
        <div
          onClick={() => setDebugOpen(o => !o)}
          style={{
            position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)',
            zIndex: 46, background: 'rgba(10,5,25,0.9)', color: '#88ddff',
            border: '1px solid rgba(136,221,255,0.4)', borderRadius: 10,
            padding: '6px 14px', fontSize: 12, fontFamily: 'monospace',
            maxWidth: '90vw', textAlign: 'center', cursor: 'pointer',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >🐞 {lastLine.replace(/^\[[\d.]+s\]\s*/, '')} ▾</div>
      )}

      {/* Expanded log panel with copy + download */}
      {debugOpen && (
        <div style={{
          position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 47, width: '92vw', maxWidth: 440,
          background: 'rgba(8,4,18,0.97)', border: '1px solid rgba(136,221,255,0.4)',
          borderRadius: 14, padding: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
          fontFamily: 'monospace',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#88ddff', fontSize: 13, fontWeight: 700 }}>Engine debug log</span>
            <button onClick={() => setDebugOpen(false)} style={{ background: 'none', border: 'none', color: '#88ddff', fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>
          <textarea
            readOnly
            value={debugText}
            onFocus={e => e.target.select()}
            style={{
              width: '100%', height: 180, boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.5)', color: '#aef', fontSize: 11,
              border: '1px solid rgba(136,221,255,0.25)', borderRadius: 8, padding: 10,
              fontFamily: 'monospace', resize: 'vertical', whiteSpace: 'pre',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={copyDebug} style={{
              flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg,#88ddff,#4a9ed8)', color: '#06121e', fontSize: 13, fontWeight: 800,
            }}>{copied ? '✓ Copied' : '⧉ Copy log'}</button>
            <button onClick={downloadDebug} style={{
              flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(136,221,255,0.4)', color: '#88ddff', fontSize: 13, fontWeight: 700,
            }}>⤓ Download</button>
          </div>
          <div style={{ color: 'rgba(200,200,255,0.4)', fontSize: 10, marginTop: 8, textAlign: 'center' }}>
            Tap the textarea to select all, then copy. Paste this to get help.
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', inset: 0,
          width: '100vw', height: '100vh',
          display: 'block', outline: 'none',
          touchAction: 'none', zIndex: 0,
        }}
        tabIndex={0}
      />
    </>
  );
}
