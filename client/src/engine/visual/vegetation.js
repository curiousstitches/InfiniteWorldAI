// client/src/engine/visual/vegetation.js
// Wind-animated vegetation instanced into the world. Density driven by tier preset.
// Avoids GLB asset dependencies — uses parametric meshes so the engine self-contains.

import { MeshBuilder, PBRMaterial, Color3, Vector3, Matrix, TransformNode } from '@babylonjs/core';

const BIOME_VEG = {
  forest:          { count: 240, kinds: ['tree_pine', 'grass_clump', 'fern']  },
  mushroom_forest: { count: 180, kinds: ['mushroom_glow', 'fern']             },
  desert:          { count:  60, kinds: ['cactus', 'rock']                    },
  tundra:          { count: 120, kinds: ['tree_pine', 'rock']                 },
  volcanic:        { count:  80, kinds: ['rock', 'crystal']                   },
  ocean:           { count:  60, kinds: ['kelp']                              },
  cosmic:          { count:  40, kinds: ['crystal']                           },
  ethereal:        { count: 160, kinds: ['mushroom_glow', 'crystal']          },
  cave:            { count: 100, kinds: ['mushroom_glow', 'rock', 'crystal']  },
  microorganism:   { count: 200, kinds: ['kelp', 'crystal']                   },
  storm:           { count:  90, kinds: ['rock', 'grass_clump']               },
  ancient_ruins:   { count:  90, kinds: ['rock', 'fern', 'grass_clump']       },
  void:            { count:   0, kinds: []                                    },
  crystalline:     { count: 120, kinds: ['crystal']                           }
};

const PBR = (scene, hex, opts = {}) => {
  const m = new PBRMaterial(`veg_${hex}_${Math.random()}`, scene);
  m.albedoColor = Color3.FromHexString(hex);
  m.metallic = opts.metallic ?? 0.0;
  m.roughness = opts.roughness ?? 0.7;
  if (opts.emissive) m.emissiveColor = Color3.FromHexString(hex).scale(opts.emissive);
  return m;
};

function buildPrototype(kind, scene) {
  switch (kind) {
    case 'tree_pine': {
      const root = new TransformNode('proto_tree', scene);
      const trunk = MeshBuilder.CreateCylinder('trunk', { height: 2.4, diameterTop: 0.15, diameterBottom: 0.28 }, scene);
      trunk.parent = root; trunk.position.y = 1.2;
      trunk.material = PBR(scene, '#3a2814', { roughness: 0.95 });
      for (let i = 0; i < 4; i++) {
        const layer = MeshBuilder.CreateCylinder(`leaves${i}`, { height: 1.2, diameterTop: 0.05, diameterBottom: 1.3 - i*0.15 }, scene);
        layer.parent = root; layer.position.y = 1.8 + i * 0.6;
        layer.material = PBR(scene, '#1a4028', { roughness: 0.85 });
      }
      return root;
    }
    case 'mushroom_glow': {
      const root = new TransformNode('proto_mush', scene);
      const stem = MeshBuilder.CreateCylinder('stem', { height: 0.6, diameterTop: 0.1, diameterBottom: 0.15 }, scene);
      stem.parent = root; stem.position.y = 0.3;
      stem.material = PBR(scene, '#5a4a6a', { roughness: 0.7 });
      const cap = MeshBuilder.CreateSphere('cap', { diameter: 0.5, segments: 12 }, scene);
      cap.parent = root; cap.position.y = 0.65; cap.scaling.y = 0.6;
      cap.material = PBR(scene, '#cc88ff', { emissive: 0.6, roughness: 0.4 });
      return root;
    }
    case 'grass_clump': {
      const root = new TransformNode('proto_grass', scene);
      for (let i = 0; i < 5; i++) {
        const blade = MeshBuilder.CreateBox(`blade${i}`, { width: 0.05, height: 0.4 + Math.random()*0.2, depth: 0.05 }, scene);
        blade.parent = root;
        const a = Math.random() * Math.PI * 2;
        blade.position = new Vector3(Math.cos(a) * 0.1, 0.25, Math.sin(a) * 0.1);
        blade.rotation.x = (Math.random() - 0.5) * 0.4;
        blade.material = PBR(scene, '#88a878', { roughness: 0.9 });
      }
      return root;
    }
    case 'fern': {
      const root = new TransformNode('proto_fern', scene);
      for (let i = 0; i < 6; i++) {
        const frond = MeshBuilder.CreateBox(`frond${i}`, { width: 0.4, height: 0.05, depth: 0.05 }, scene);
        frond.parent = root;
        const a = (i / 6) * Math.PI * 2;
        frond.rotation.y = a; frond.rotation.z = -0.4;
        frond.position = new Vector3(Math.cos(a) * 0.2, 0.4, Math.sin(a) * 0.2);
        frond.material = PBR(scene, '#447a44', { roughness: 0.85 });
      }
      return root;
    }
    case 'cactus': {
      const root = new TransformNode('proto_cactus', scene);
      const stem = MeshBuilder.CreateCylinder('s', { height: 1.4, diameterTop: 0.25, diameterBottom: 0.3, tessellation: 8 }, scene);
      stem.parent = root; stem.position.y = 0.7;
      stem.material = PBR(scene, '#5a8a4a', { roughness: 0.8 });
      return root;
    }
    case 'rock': {
      const root = new TransformNode('proto_rock', scene);
      const r = MeshBuilder.CreatePolyhedron('r', { type: 1, size: 0.6 + Math.random()*0.4 }, scene);
      r.parent = root; r.rotation.y = Math.random() * Math.PI;
      r.material = PBR(scene, '#5a544a', { roughness: 0.95 });
      return root;
    }
    case 'crystal': {
      const root = new TransformNode('proto_crystal', scene);
      const c = MeshBuilder.CreatePolyhedron('c', { type: 2, size: 0.4 }, scene);
      c.parent = root; c.position.y = 0.4; c.rotation.y = Math.random() * Math.PI;
      c.material = PBR(scene, '#88ddff', { emissive: 0.7, roughness: 0.1 });
      return root;
    }
    case 'kelp': {
      const root = new TransformNode('proto_kelp', scene);
      const s = MeshBuilder.CreateCylinder('s', { height: 2 + Math.random(), diameterTop: 0.04, diameterBottom: 0.08, tessellation: 6 }, scene);
      s.parent = root; s.position.y = 1;
      s.material = PBR(scene, '#447a44', { emissive: 0.2, roughness: 0.6 });
      return root;
    }
    default: return new TransformNode('proto_empty', scene);
  }
}

export class Vegetation {
  constructor(scene, tier) {
    this.scene = scene;
    this.tier = tier;
    this.parent = new TransformNode('veg_root', scene);
    this._instances = [];
    this._t0 = performance.now();

    if (tier.vegetationWind) {
      this._windObs = scene.onBeforeRenderObservable.add(() => this._applyWind());
    }
  }

  populate({ biome, terrain, seed = 1 }) {
    this.clear();
    const cfg = BIOME_VEG[biome] || BIOME_VEG.forest;
    const total = Math.floor(cfg.count * this.tier.vegetationDensity);
    if (total === 0 || cfg.kinds.length === 0) return;

    // Build one prototype per kind, then clone many instances.
    const protos = Object.fromEntries(cfg.kinds.map(k => [k, buildPrototype(k, this.scene)]));
    Object.values(protos).forEach(p => p.setEnabled(false));    // hide prototypes

    let i = 0;
    while (i < total) {
      const kind = cfg.kinds[i % cfg.kinds.length];
      const proto = protos[kind];
      const x = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;
      const y = terrain?.getHeightAt ? terrain.getHeightAt(x, z) : 0;
      const inst = proto.clone(`veg_${kind}_${i}`, this.parent);
      inst.setEnabled(true);
      inst.position = new Vector3(x, y, z);
      inst.scaling.scaleInPlace(0.7 + Math.random() * 0.7);
      inst.rotation.y = Math.random() * Math.PI * 2;
      this._instances.push({ node: inst, kind, phase: Math.random() * Math.PI * 2 });
      i++;
    }
  }

  // Cheap "wind" — sway prototypes mildly via root rotation. Cheaper than vertex shader,
  // perfectly fine at the densities we use.
  _applyWind() {
    const t = (performance.now() - this._t0) * 0.0008;
    for (const inst of this._instances) {
      if (inst.kind === 'rock' || inst.kind === 'crystal') continue;
      const s = Math.sin(t + inst.phase) * 0.04;
      inst.node.rotation.x = s;
      inst.node.rotation.z = s * 0.5;
    }
  }

  clear() {
    this._instances.forEach(({ node }) => node.dispose());
    this._instances.length = 0;
  }
  dispose() {
    if (this._windObs) this.scene.onBeforeRenderObservable.remove(this._windObs);
    this.clear();
    this.parent.dispose();
  }
}
