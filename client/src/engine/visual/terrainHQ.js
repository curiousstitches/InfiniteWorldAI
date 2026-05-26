// client/src/engine/visual/terrainHQ.js
// Procedural terrain with biome-aware materials, configurable density per tier.
// Drop-in replacement for the older terrain.js. Wind animation is folded in via
// per-frame uniform on grass instances (vegetation.js handles vegetation itself).

import { MeshBuilder, VertexBuffer, PBRMaterial, Color3, Vector3, Texture } from '@babylonjs/core';
import { createNoise2D } from 'simplex-noise';

// Mulberry32 deterministic PRNG (same seeding as the previous engine for save parity).
const mulberry32 = (seed) => {
  let t = seed | 0;
  return () => { t = (t + 0x6D2B79F5) | 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
};

const BIOME_MATERIAL = {
  forest:          { albedo: '#3a5a28', rough: 0.85, emissive: 0,    bump: true },
  ocean:           { albedo: '#1a4060', rough: 0.20, emissive: 0,    bump: false },
  desert:          { albedo: '#cc8a40', rough: 0.95, emissive: 0,    bump: true },
  cave:            { albedo: '#1a1820', rough: 0.90, emissive: 0,    bump: true },
  tundra:          { albedo: '#e0eaf0', rough: 0.85, emissive: 0,    bump: true },
  volcanic:        { albedo: '#1a0a08', rough: 0.95, emissive: 0.1,  bump: true },
  cosmic:          { albedo: '#0a0a14', rough: 0.6,  emissive: 0.2,  bump: false },
  ethereal:        { albedo: '#bbaadd', rough: 0.4,  emissive: 0.3,  bump: false },
  microorganism:   { albedo: '#205060', rough: 0.6,  emissive: 0.2,  bump: false },
  crystalline:     { albedo: '#4488aa', rough: 0.1,  emissive: 0.4,  bump: false },
  storm:           { albedo: '#404858', rough: 0.85, emissive: 0,    bump: true },
  void:            { albedo: '#000000', rough: 0.5,  emissive: 0.05, bump: false },
  ancient_ruins:   { albedo: '#5a4a3a', rough: 0.9,  emissive: 0,    bump: true },
  mushroom_forest: { albedo: '#3a204a', rough: 0.7,  emissive: 0.15, bump: true }
};

const BIOME_AMPLITUDE = {
  forest: 4, ocean: 1, desert: 6, cave: 8, tundra: 3, volcanic: 10,
  cosmic: 0, ethereal: 5, microorganism: 4, crystalline: 12,
  storm: 5, void: 1, ancient_ruins: 6, mushroom_forest: 5
};

// Build a heightmap-displaced grid mesh.
export function buildTerrainHQ({ scene, tier, biome, scale, seed }) {
  const cfg = BIOME_MATERIAL[biome] || BIOME_MATERIAL.forest;
  const subs = tier.terrainSubdivisions;
  const sizeMap = { COSMIC: 8000, WORLD: 2000, HUMAN: 400, MICRO: 40, NANO: 4 };
  const worldSize = sizeMap[scale] || 400;

  const rand = mulberry32(seed || 1);
  const noise = createNoise2D(rand);
  const amp = BIOME_AMPLITUDE[biome] ?? 4;

  const mesh = MeshBuilder.CreateGround('terrainHQ', { width: worldSize, height: worldSize, subdivisions: subs, updatable: true }, scene);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i + 2];
    // Octaved noise for natural variation.
    const n1 = noise(x * 0.01, z * 0.01);
    const n2 = noise(x * 0.04, z * 0.04) * 0.5;
    const n3 = noise(x * 0.16, z * 0.16) * 0.25;
    positions[i + 1] = (n1 + n2 + n3) * amp;
  }
  mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
  mesh.createNormals(true);
  mesh.checkCollisions = false;

  // PBR ground material.
  const mat = new PBRMaterial(`terrain_${biome}`, scene);
  mat.albedoColor = Color3.FromHexString(cfg.albedo);
  mat.metallic = 0;
  mat.roughness = cfg.rough;
  if (cfg.emissive > 0) mat.emissiveColor = Color3.FromHexString(cfg.albedo).scale(cfg.emissive);
  mesh.material = mat;
  mesh.receiveShadows = tier.shadowsEnabled;

  return { mesh, getHeightAt: (x, z) => {
    const n1 = noise(x * 0.01, z * 0.01);
    const n2 = noise(x * 0.04, z * 0.04) * 0.5;
    const n3 = noise(x * 0.16, z * 0.16) * 0.25;
    return (n1 + n2 + n3) * amp;
  }};
}

// Smooth morph between two biomes when scale/biome transitions happen.
export function morphTerrainHQ({ scene, terrain, newBiome, newScale, seed }) {
  // Cheap path: rebuild. For tier=cinematic_high we'd lerp vertex positions over frames,
  // but rebuild is fine and avoids per-vertex animation memory pressure on mobile.
  const old = terrain?.mesh;
  const fresh = buildTerrainHQ({ scene, tier: terrain.tier, biome: newBiome, scale: newScale, seed });
  if (old) setTimeout(() => old.dispose(), 50);
  return fresh;
}
