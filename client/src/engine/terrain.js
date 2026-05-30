import {
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Texture,
  DynamicTexture, VertexBuffer
} from '@babylonjs/core';
import { createNoise2D } from 'simplex-noise';
import { getBiome, getScale } from './biomes.js';

const TERRAIN_SUBDIVISIONS = 180;

// Seedable PRNG (mulberry32) — simplex-noise expects 0-1 generator
const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const generateHeightMap = (noise, size, heightMult, octaves = 6, roughness = 0.65) => {
  const count = TERRAIN_SUBDIVISIONS + 1;
  const heights = new Float32Array(count * count);
  const scale = 1.5 / size;

  for (let z = 0; z < count; z++) {
    for (let x = 0; x < count; x++) {
      const wx = (x - count / 2) * scale;
      const wz = (z - count / 2) * scale;
      let h = 0, amp = 1, freq = 1, max = 0;
      for (let o = 0; o < octaves; o++) {
        h += noise(wx * freq, wz * freq) * amp;
        max += amp;
        amp *= roughness;
        freq *= 2.1;
      }
      heights[z * count + x] = (h / max) * heightMult;
    }
  }
  return heights;
};

const buildTerrainTexture = (scene, biomeData, size) => {
  const tex = new DynamicTexture('terrainTex', { width: 512, height: 512 }, scene);
  const ctx = tex.getContext();
  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  const colors = biomeData.groundColors;
  grd.addColorStop(0, colors[0]);
  grd.addColorStop(0.5, colors[1]);
  grd.addColorStop(1, colors[2]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);

  // Add noise texture overlay
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const a = Math.random() * 0.15;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${a})`;
    ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }
  tex.update();
  return tex;
};

export const buildTerrain = (scene, biome, scale, noiseSeed = 42) => {
  const b = getBiome(biome);
  const s = getScale(scale);
  const noise = createNoise2D(mulberry32(noiseSeed));

  const ground = MeshBuilder.CreateGround('terrain', {
    width: s.terrainSize,
    height: s.terrainSize,
    subdivisions: TERRAIN_SUBDIVISIONS,
    updatable: true,
  }, scene);

  const heights = generateHeightMap(noise, s.terrainSize, s.heightMultiplier, b.octaves, b.roughness);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);

  for (let i = 0; i < heights.length; i++) {
    positions[i * 3 + 1] = heights[i];
  }

  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.createNormals(true);

  const mat = new PBRMaterial('terrainMat', scene);
  mat.albedoTexture = buildTerrainTexture(scene, b, s.terrainSize);
  mat.albedoTexture.uScale = 30;
  mat.albedoTexture.vScale = 30;
  mat.metallic = 0;
  mat.roughness = 0.95;
  mat.ambientColor = Color3.FromHexString(b.ambientColor || '#888888');
  mat.enableSpecularAntiAliasing = true;
  ground.material = mat;
  ground.receiveShadows = true;

  return { ground, heights, terrainSize: s.terrainSize, subdivisions: TERRAIN_SUBDIVISIONS };
};

export const getTerrainHeightAt = (x, z, terrainData) => {
  if (!terrainData) return 0;
  const { heights, terrainSize, subdivisions } = terrainData;
  const count = subdivisions + 1;
  const halfSize = terrainSize / 2;
  const gx = Math.floor(((x + halfSize) / terrainSize) * subdivisions);
  const gz = Math.floor(((z + halfSize) / terrainSize) * subdivisions);
  const cx = Math.max(0, Math.min(count - 1, gx));
  const cz = Math.max(0, Math.min(count - 1, gz));
  return heights[cz * count + cx] || 0;
};

export const morphTerrain = (ground, biome, scale, noiseSeed = 42) => {
  const b = getBiome(biome);
  const s = getScale(scale);
  const noise = createNoise2D(mulberry32(noiseSeed));
  const heights = generateHeightMap(noise, s.terrainSize, s.heightMultiplier, b.octaves, b.roughness);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  for (let i = 0; i < heights.length; i++) positions[i * 3 + 1] = heights[i];
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.createNormals(true);
  return heights;
};
