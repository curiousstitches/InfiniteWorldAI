// client/src/engine/visual/environment.js
// HDRI environment manager + volumetric sky + atmospheric scattering.
// All HDRIs are CC0 from PolyHaven CDN (no auth required, no licensing pitfalls).
// We keep a small biome → HDRI map and fall back to a procedural gradient skybox
// when hdriEnabled = false in the tier preset.

import { CubeTexture, HDRCubeTexture, Color3, Color4, Vector3, MeshBuilder, ShaderMaterial, Effect, BackgroundMaterial, Texture } from '@babylonjs/core';

const HDRI_CDN = ''; // Set to your own CDN/static path if you want HDRI-based IBL.
// To enable HDRI lighting:
//   1. Download CC0 HDRIs from polyhaven.com/hdris (any 2K .hdr file works)
//   2. Drop them in `client/public/hdri/`
//   3. Set HDRI_CDN = '/hdri'
// Without HDRIs, the volumetric sky shader renders alone — still looks great, just no IBL bounce light.
const BIOME_HDRI = HDRI_CDN ? {
  forest:           `${HDRI_CDN}/forest_slope_2k.hdr`,
  cave:             `${HDRI_CDN}/cave_2k.hdr`,
  ocean:            `${HDRI_CDN}/qwantani_2k.hdr`,
  desert:           `${HDRI_CDN}/qwantani_dusk_2k.hdr`,
  tundra:           `${HDRI_CDN}/snowy_field_2k.hdr`,
  volcanic:         `${HDRI_CDN}/lava_field_2k.hdr`,
  cosmic:           `${HDRI_CDN}/starmap_2020_2k.hdr`,
  ethereal:         `${HDRI_CDN}/kloofendal_48d_partly_cloudy_2k.hdr`,
  underwater:       `${HDRI_CDN}/abandoned_factory_canteen_01_2k.hdr`,
  microorganism:    `${HDRI_CDN}/symmetrical_garden_02_2k.hdr`,
  crystalline:      `${HDRI_CDN}/spruit_sunrise_2k.hdr`,
  storm:            `${HDRI_CDN}/kiara_8_morning_2k.hdr`,
  void:             `${HDRI_CDN}/dikhololo_night_2k.hdr`,
  ancient_ruins:    `${HDRI_CDN}/the_sky_is_on_fire_2k.hdr`,
  mushroom_forest:  `${HDRI_CDN}/forest_slope_2k.hdr`
} : {};

const FALLBACK_GRADIENTS = {
  forest:          ['#1a3a28', '#88b070', '#cfeaa8'],
  cave:            ['#0a0a14', '#2a1a30', '#0a0a14'],
  ocean:           ['#0a1430', '#3070b0', '#8acce0'],
  desert:          ['#3a2a14', '#cc9050', '#ffcc88'],
  cosmic:          ['#000010', '#080424', '#1a0040'],
  ethereal:        ['#aaccff', '#ffeecc', '#ffaabb'],
  microorganism:   ['#082030', '#306080', '#80c0d8'],
  mushroom_forest: ['#1a0a2a', '#5a2080', '#cc88ff'],
  default:         ['#0a0a18', '#2a1a4a', '#6a3aa8']
};

// ──────────────────────────────────────────────────────────────────────
// Volumetric sky shader — single full-screen background mesh with a custom
// shader that computes sun disc + Rayleigh blue + cloud noise + horizon glow.
// Compiles once per scene. Driven by sun direction + time-of-day.
// ──────────────────────────────────────────────────────────────────────
Effect.ShadersStore.volSkyVertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

Effect.ShadersStore.volSkyFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 sunDir;
  uniform vec3 sunColor;
  uniform vec3 zenithColor;
  uniform vec3 horizonColor;
  uniform vec3 groundColor;
  uniform float time;
  uniform float cloudDensity;

  // 2D hash + value noise for cheap cloud layer.
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++) { v += amp * noise(p); p *= 2.05; amp *= 0.5; }
    return v;
  }

  void main() {
    // Reconstruct view ray from UV (assume background plane at clip-space z=1).
    vec3 dir = normalize(vec3(vUv * 2.0 - 1.0, 1.0));
    dir.y = vUv.y - 0.5;
    dir = normalize(dir);

    float h = dir.y;                              // -0.5 (down) → 0.5 (up)
    // Gradient: ground → horizon → zenith
    vec3 sky = h < 0.0
      ? mix(groundColor, horizonColor, smoothstep(-0.3, 0.0, h))
      : mix(horizonColor, zenithColor, smoothstep(0.0, 0.7, h));

    // Sun disc + glow.
    float sunAmt = max(dot(dir, sunDir), 0.0);
    float disc = smoothstep(0.998, 0.9999, sunAmt);
    float glow = pow(sunAmt, 8.0) * 0.35 + pow(sunAmt, 64.0) * 0.6;
    sky += sunColor * (disc + glow);

    // Volumetric clouds (only above horizon).
    if (h > 0.0 && cloudDensity > 0.01) {
      vec2 cuv = dir.xz / max(dir.y, 0.05) * 0.5 + vec2(time * 0.02, time * 0.005);
      float c = fbm(cuv * 2.0);
      c = smoothstep(0.5 - cloudDensity * 0.3, 0.8, c);
      sky = mix(sky, mix(vec3(1.0), sunColor, 0.3), c * smoothstep(0.0, 0.3, h) * cloudDensity);
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export class EnvironmentManager {
  constructor(scene, tier) {
    this.scene = scene;
    this.tier = tier;
    this._hdri = null;
    this._skyMesh = null;
    this._skyMat  = null;
    this._timeOfDay = 0.5;
    this._biome = 'forest';
  }

  // Loads and applies the HDRI for IBL + skybox (if tier allows).
  async setBiome(biome, mood) {
    this._biome = biome;
    const cfg = this.tier;

    // Always tint scene.clearColor from gradient — covers gaps before HDRI loads.
    const g = FALLBACK_GRADIENTS[biome] || FALLBACK_GRADIENTS.default;
    this.scene.clearColor = Color4.FromHexString(g[1] + 'ff');
    this.scene.ambientColor = Color3.FromHexString(g[0]);

    if (cfg.hdriEnabled && cfg.skyType !== 'gradient' && BIOME_HDRI[biome]) {
      const url = BIOME_HDRI[biome];
      try {
        const tex = new HDRCubeTexture(url, this.scene, 256, false, true, false, true);
        this._hdri?.dispose();
        this._hdri = tex;
        this.scene.environmentTexture = tex;
        if (cfg.skyType === 'hdri') {
          this.scene.createDefaultSkybox(tex, true, 1000, 0.3);
        }
        this.scene.environmentIntensity = 1.0;
      } catch (e) {
        // Silent — volumetric sky shader provides the fallback.
      }
    }

    if (cfg.skyType === 'volumetric') this._ensureVolumetricSky();
    this._tuneSkyForBiome(biome, mood);
  }

  _ensureVolumetricSky() {
    if (this._skyMesh) return;
    const skyMesh = MeshBuilder.CreatePlane('volSkyMesh', { size: 2 }, this.scene);
    skyMesh.isPickable = false;
    skyMesh.alwaysSelectAsActiveMesh = true;
    skyMesh.infiniteDistance = true;
    skyMesh.renderingGroupId = 0;
    const mat = new ShaderMaterial('volSky', this.scene, { vertex: 'volSky', fragment: 'volSky' }, {
      attributes: ['position', 'uv'],
      uniforms: ['sunDir', 'sunColor', 'zenithColor', 'horizonColor', 'groundColor', 'time', 'cloudDensity']
    });
    mat.backFaceCulling = false;
    mat.disableDepthWrite = true;
    skyMesh.material = mat;
    this._skyMesh = skyMesh; this._skyMat = mat;

    this.scene.onBeforeRenderObservable.add(() => {
      if (!this._skyMat) return;
      this._skyMat.setFloat('time', performance.now() * 0.0001);
    });
  }

  _tuneSkyForBiome(biome, mood) {
    if (!this._skyMat) return;
    const presets = {
      forest:         { zenith: '#1a4a78', horizon: '#cfeaa8', ground: '#1a2a14', sun: '#fff4c0', clouds: 0.5 },
      ocean:          { zenith: '#1a3050', horizon: '#8acce0', ground: '#0a1430', sun: '#fff4c0', clouds: 0.4 },
      desert:         { zenith: '#cc8a40', horizon: '#ffcc88', ground: '#3a2a14', sun: '#ffe080', clouds: 0.2 },
      cosmic:         { zenith: '#000010', horizon: '#180440', ground: '#000000', sun: '#aabbff', clouds: 0.0 },
      ethereal:       { zenith: '#aaccff', horizon: '#ffeecc', ground: '#ddccff', sun: '#ffe080', clouds: 0.7 },
      mushroom_forest:{ zenith: '#5a2080', horizon: '#cc88ff', ground: '#1a0a2a', sun: '#ffccff', clouds: 0.4 },
      cave:           { zenith: '#0a0a14', horizon: '#2a1a30', ground: '#0a0a14', sun: '#664488', clouds: 0.0 },
      volcanic:       { zenith: '#3a0a0a', horizon: '#cc4030', ground: '#1a0a08', sun: '#ff8030', clouds: 0.3 },
      tundra:         { zenith: '#2a4060', horizon: '#cce0f0', ground: '#608080', sun: '#fff4f0', clouds: 0.6 },
      storm:          { zenith: '#1a1a24', horizon: '#404858', ground: '#202830', sun: '#aaccff', clouds: 0.9 },
      void:           { zenith: '#000000', horizon: '#100020', ground: '#000000', sun: '#440088', clouds: 0.0 }
    };
    const p = presets[biome] || presets.forest;
    const sunAng = (this._timeOfDay - 0.5) * Math.PI;  // -π/2 at midnight, +π/2 at noon
    this._skyMat.setVector3('sunDir', new Vector3(Math.cos(sunAng), Math.sin(sunAng), 0.3));
    this._skyMat.setColor3('sunColor',     Color3.FromHexString(p.sun));
    this._skyMat.setColor3('zenithColor',  Color3.FromHexString(p.zenith));
    this._skyMat.setColor3('horizonColor', Color3.FromHexString(p.horizon));
    this._skyMat.setColor3('groundColor',  Color3.FromHexString(p.ground));
    this._skyMat.setFloat('cloudDensity',  this.tier.volumetricClouds ? p.clouds : 0);
  }

  setTimeOfDay(t) { this._timeOfDay = t; this._tuneSkyForBiome(this._biome); }

  dispose() {
    this._hdri?.dispose();
    this._skyMesh?.dispose();
    this._skyMat?.dispose();
  }
}
