import {
  MeshBuilder, PBRMaterial, StandardMaterial, Color3, Vector3,
  ActionManager, ExecuteCodeAction, Animation, GlowLayer,
  HighlightLayer
} from '@babylonjs/core';
import { getTerrainHeightAt } from './terrain.js';

const MESH_BUILDERS = {
  box:     (s) => MeshBuilder.CreateBox(s.id, { size: s.scale || 1 }, s.scene),
  sphere:  (s) => MeshBuilder.CreateSphere(s.id, { diameter: s.scale || 1, segments: 12 }, s.scene),
  cylinder:(s) => MeshBuilder.CreateCylinder(s.id, { height: (s.scale||1)*2, diameter: s.scale||1 }, s.scene),
  crystal: (s) => MeshBuilder.CreateCylinder(s.id, { height: (s.scale||1)*2.5, diameterTop: 0, diameterBottom: s.scale||0.6, tessellation: 6 }, s.scene),
  tree:    (s) => MeshBuilder.CreateCylinder(s.id, { height: (s.scale||1)*3, diameter: s.scale||0.4, tessellation: 6 }, s.scene),
  rock:    (s) => MeshBuilder.CreatePolyhedron(s.id, { type: 1, size: s.scale || 0.8 }, s.scene),
  portal:  (s) => MeshBuilder.CreateTorus(s.id, { diameter: (s.scale||1)*2, thickness: 0.2, tessellation: 32 }, s.scene),
  ruins:   (s) => MeshBuilder.CreateBox(s.id, { width: s.scale||1.5, height: (s.scale||1)*1.2, depth: 0.3 }, s.scene),
};

export class InteractableManager {
  constructor(scene, glowLayer, onInteract) {
    this.scene = scene;
    this.glow = glowLayer;
    this.highlight = new HighlightLayer('hl', scene);
    this.highlight.innerGlow = false;
    this.meshMap = new Map(); // id → mesh
    this.onInteract = onInteract;
  }

  spawn(obj, terrainData) {
    if (this.meshMap.has(obj.id)) return;

    const meshType = obj.mesh_type || obj.meshType || 'sphere';
    const scale = obj.metadata?.scale || this._scaleFromType(obj.type);
    const builder = MESH_BUILDERS[meshType] || MESH_BUILDERS.sphere;

    const mesh = builder({ id: obj.id, scene: this.scene, scale });

    const terrainY = getTerrainHeightAt(obj.position_x || 0, obj.position_z || 0, terrainData);
    mesh.position = new Vector3(
      obj.position_x || (Math.random() - 0.5) * 40,
      terrainY + (obj.position_y || scale / 2),
      obj.position_z || (Math.random() - 0.5) * 40
    );

    const mat = new PBRMaterial(`mat_${obj.id}`, this.scene);
    const hex = obj.color || '#888888';
    mat.albedoColor = Color3.FromHexString(hex);
    mat.metallic = 0.1;
    mat.roughness = 0.7;
    mesh.material = mat;

    const glowHex = (obj.metadata && JSON.parse(typeof obj.metadata === 'string' ? obj.metadata : '{}').glowColor) || null;
    if (glowHex && this.glow) {
      this.glow.addIncludedOnlyMesh(mesh);
      mat.emissiveColor = Color3.FromHexString(glowHex).scale(0.4);
    }

    // Idle float animation
    const anim = new Animation(`float_${obj.id}`, 'position.y', 30,
      Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    const base = mesh.position.y;
    anim.setKeys([
      { frame: 0, value: base },
      { frame: 60, value: base + scale * 0.08 },
      { frame: 120, value: base },
    ]);
    mesh.animations = [anim];
    this.scene.beginAnimation(mesh, 0, 120, true, 0.5 + Math.random() * 0.5);

    // Interaction
    mesh.actionManager = new ActionManager(this.scene);
    mesh.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPointerOverTrigger,
      () => this.highlight.addMesh(mesh, Color3.FromHexString(hex))
    ));
    mesh.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPointerOutTrigger,
      () => this.highlight.removeMesh(mesh)
    ));
    mesh.actionManager.registerAction(new ExecuteCodeAction(
      ActionManager.OnPickTrigger,
      () => this.onInteract({ id: obj.id, type: obj.type, label: obj.label, description: obj.description })
    ));

    mesh.metadata = { interactableId: obj.id, label: obj.label, type: obj.type };
    this.meshMap.set(obj.id, mesh);
  }

  remove(id) {
    const mesh = this.meshMap.get(id);
    if (mesh) { mesh.dispose(); this.meshMap.delete(id); }
  }

  syncWithServer(serverObjects, terrainData) {
    const serverIds = new Set(serverObjects.map(o => o.id));
    for (const [id] of this.meshMap) {
      if (!serverIds.has(id)) this.remove(id);
    }
    for (const obj of serverObjects) {
      if (!this.meshMap.has(obj.id)) this.spawn(obj, terrainData);
    }
  }

  dispose() {
    for (const [, mesh] of this.meshMap) mesh.dispose();
    this.meshMap.clear();
    this.highlight.dispose();
  }

  _scaleFromType(type) {
    const scales = { creature: 1.2, artifact: 0.5, portal: 2, structure: 3, plant: 1.8, relic: 0.4 };
    return scales[type] || 0.8;
  }
}
