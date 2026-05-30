// client/src/engine/cameras.js
// Three camera modes + a controller that swaps between them with smooth lerping.
//
// FIRST_PERSON   — pointer-locked WASD (exploration default)
// OVER_SHOULDER  — cinematic, companion in frame (auto-engages during voice conversations)
// FREE_ORBIT     — pinch/drag/scroll around companion
//
// The controller listens to game state (isListening || isSpeaking) and auto-pushes into
// OVER_SHOULDER during voice exchanges, then returns to the prior mode when idle.

import {
  UniversalCamera, ArcRotateCamera, Vector3, Quaternion,
  Matrix, TmpVectors, Animation, EasingFunction, CircleEase
} from '@babylonjs/core';

export const MODE = { FIRST_PERSON: 'first', OVER_SHOULDER: 'over', FREE_ORBIT: 'orbit' };

const LERP_FRAMES = 28;       // ~0.45s @ 60fps for the cinematic transition

function makeFirstPersonCamera(scene, canvas) {
  // Start well above any reasonable terrain height (amp max is ~12), facing the world.
  const cam = new UniversalCamera('cam_first', new Vector3(0, 5, -3), scene);
  cam.setTarget(new Vector3(2, 1.5, 4));
  cam.minZ = 0.05; cam.maxZ = 3000;
  cam.fov = 1.05;
  cam.speed = 0.6;
  cam.angularSensibility = 1800;
  cam.keysUp    = [87]; cam.keysDown  = [83];
  cam.keysLeft  = [65]; cam.keysRight = [68];
  cam.inertia = 0.6;
  cam.applyGravity = false;
  cam.checkCollisions = false;
  cam.attachControl(canvas, true);
  return cam;
}

function makeOrbitCamera(scene, canvas, target = new Vector3(0, 1.5, 0)) {
  const cam = new ArcRotateCamera('cam_orbit', Math.PI / 2, Math.PI / 2.4, 4.5, target, scene);
  cam.minZ = 0.05; cam.maxZ = 3000;
  cam.fov = 0.9;
  cam.lowerRadiusLimit = 1.8;
  cam.upperRadiusLimit = 8;
  cam.upperBetaLimit = Math.PI / 2 + 0.1;
  cam.wheelDeltaPercentage = 0.04;
  cam.panningSensibility = 0;          // disable panning — only orbit
  cam.useBouncingBehavior = false;
  cam.attachControl(canvas, true);
  return cam;
}

// Manual "over-shoulder" rig: a UniversalCamera parented to a transform whose pose
// is recomputed each frame from the companion's world matrix.
function makeOverShoulderCamera(scene) {
  const cam = new UniversalCamera('cam_over', new Vector3(0, 1.7, -1.6), scene);
  cam.minZ = 0.05; cam.maxZ = 3000;
  cam.fov = 0.7;                       // tighter for cinematic intimacy
  cam.detachControl();                 // no user input — driven by code
  return cam;
}

export class CameraController {
  constructor({ scene, canvas, getCompanionNode, getPlayerNode }) {
    this.scene = scene;
    this.canvas = canvas;
    this.getCompanionNode = getCompanionNode;        // () => TransformNode | null
    this.getPlayerNode    = getPlayerNode;            // () => Vector3 (current player position)
    this.mode = MODE.FIRST_PERSON;
    this.prevMode = MODE.FIRST_PERSON;
    this.transitioning = false;
    this._t = 0;

    this.firstPerson  = makeFirstPersonCamera(scene, canvas);
    this.overShoulder = makeOverShoulderCamera(scene);
    this.orbit        = makeOrbitCamera(scene, canvas);

    scene.activeCamera = this.firstPerson;

    // Over-shoulder pose updates every frame.
    this._beforeRender = () => this._updateOverShoulder();
    scene.onBeforeRenderObservable.add(this._beforeRender);
  }

  // Drive the over-shoulder camera from the companion's transform every frame.
  _updateOverShoulder() {
    const comp = this.getCompanionNode?.();
    if (!comp) return;

    const target = comp.absolutePosition.add(new Vector3(0, 1.55, 0));
    // Offset = behind+side of the companion, biased toward whoever they're facing (the player).
    const playerPos = this.getPlayerNode?.() || new Vector3(0, 1.5, 0);
    const forward = target.subtract(playerPos); forward.y = 0;
    if (forward.lengthSquared() < 0.001) forward.set(0, 0, -1);
    forward.normalize();
    // Position camera 1.6m behind+0.8m side+1.65m up from the player, looking at companion's head.
    const sideways = new Vector3(-forward.z, 0, forward.x);
    const desired = playerPos.add(forward.scale(-0.4)).add(sideways.scale(0.5)).add(new Vector3(0, 1.65, 0));
    this.overShoulder.position = Vector3.Lerp(this.overShoulder.position, desired, 0.12);
    this.overShoulder.setTarget(target);
  }

  // Public — switch with cinematic lerp. Returns when transition is animation-complete.
  async setMode(next) {
    if (next === this.mode) return;
    this.prevMode = this.mode;
    this.mode = next;

    // Map mode → camera instance
    const target = next === MODE.FIRST_PERSON ? this.firstPerson
                 : next === MODE.OVER_SHOULDER ? this.overShoulder
                 : this.orbit;

    // For instant swaps (cheap), just hot-swap activeCamera.
    // For cinematic feel, we copy current pose onto target then swap, then animate to target's intended pose.
    const current = this.scene.activeCamera;
    if (current && current !== target) {
      // Seed the new camera with the current camera's pose for a seamless cut.
      target.position = current.position.clone();
      try { target.setTarget(current.target || current.position.add(current.getDirection(Vector3.Forward()))); } catch {}
    }
    // Re-attach controls where applicable.
    this.firstPerson.detachControl(); this.orbit.detachControl();
    if (next === MODE.FIRST_PERSON) this.firstPerson.attachControl(this.canvas, true);
    if (next === MODE.FREE_ORBIT)   this.orbit.attachControl(this.canvas, true);

    this.scene.activeCamera = target;
  }

  // Auto-mode driver — called from React when voice state changes.
  // If a conversation is happening, go OVER_SHOULDER; else return to previous non-dialogue mode.
  setVoiceActive(active, baseMode = MODE.FIRST_PERSON) {
    if (active && this.mode !== MODE.OVER_SHOULDER) {
      this._returnTo = this.mode === MODE.OVER_SHOULDER ? baseMode : this.mode;
      this.setMode(MODE.OVER_SHOULDER);
    } else if (!active && this.mode === MODE.OVER_SHOULDER) {
      this.setMode(this._returnTo || baseMode);
    }
  }

  dispose() {
    this.scene.onBeforeRenderObservable.removeCallback(this._beforeRender);
    this.firstPerson?.dispose();
    this.overShoulder?.dispose();
    this.orbit?.dispose();
  }
}
