import {
  ParticleSystem, Texture, Color4, Vector3, Color3
} from '@babylonjs/core';

const BASE_URL = '/particles/';

const PARTICLE_CONFIGS = {
  spores: {
    capacity: 800, emitRate: 40, minSize: 0.02, maxSize: 0.08,
    minLifetime: 8, maxLifetime: 15,
    minEmitPower: 0.1, maxEmitPower: 0.4,
    color1: new Color4(0.8, 1.0, 0.6, 0.6), color2: new Color4(0.6, 0.9, 0.4, 0.3),
    gravity: new Vector3(0, 0.005, 0),
    blendMode: ParticleSystem.BLENDMODE_ADD,
  },
  embers: {
    capacity: 600, emitRate: 80, minSize: 0.02, maxSize: 0.06,
    minLifetime: 2, maxLifetime: 5,
    minEmitPower: 0.5, maxEmitPower: 2.0,
    color1: new Color4(1.0, 0.6, 0.1, 0.9), color2: new Color4(1.0, 0.1, 0.0, 0.0),
    gravity: new Vector3(0, 0.5, 0),
    blendMode: ParticleSystem.BLENDMODE_ADD,
  },
  stars: {
    capacity: 3000, emitRate: 5, minSize: 0.5, maxSize: 3.0,
    minLifetime: 60, maxLifetime: 120,
    minEmitPower: 0.01, maxEmitPower: 0.05,
    color1: new Color4(1.0, 1.0, 1.0, 0.8), color2: new Color4(0.8, 0.8, 1.0, 0.4),
    gravity: new Vector3(0, 0, 0),
    blendMode: ParticleSystem.BLENDMODE_ADD,
  },
  snow: {
    capacity: 1000, emitRate: 60, minSize: 0.05, maxSize: 0.15,
    minLifetime: 10, maxLifetime: 20,
    minEmitPower: 0.1, maxEmitPower: 0.3,
    color1: new Color4(1.0, 1.0, 1.0, 0.8), color2: new Color4(0.9, 0.95, 1.0, 0.4),
    gravity: new Vector3(0.02, -0.1, 0.01),
    blendMode: ParticleSystem.BLENDMODE_STANDARD,
  },
  bubbles: {
    capacity: 400, emitRate: 30, minSize: 0.05, maxSize: 0.3,
    minLifetime: 5, maxLifetime: 12,
    minEmitPower: 0.2, maxEmitPower: 0.8,
    color1: new Color4(0.5, 0.8, 1.0, 0.6), color2: new Color4(0.3, 0.6, 0.9, 0.0),
    gravity: new Vector3(0, 0.15, 0),
    blendMode: ParticleSystem.BLENDMODE_ADD,
  },
  wisps: {
    capacity: 200, emitRate: 15, minSize: 0.1, maxSize: 0.6,
    minLifetime: 8, maxLifetime: 20,
    minEmitPower: 0.05, maxEmitPower: 0.2,
    color1: new Color4(0.7, 0.3, 1.0, 0.8), color2: new Color4(0.4, 0.1, 0.8, 0.0),
    gravity: new Vector3(0, 0.02, 0),
    blendMode: ParticleSystem.BLENDMODE_ADD,
  },
  sandstorm: {
    capacity: 2000, emitRate: 200, minSize: 0.03, maxSize: 0.12,
    minLifetime: 3, maxLifetime: 8,
    minEmitPower: 1.0, maxEmitPower: 3.0,
    color1: new Color4(0.85, 0.7, 0.4, 0.5), color2: new Color4(0.7, 0.55, 0.3, 0.0),
    gravity: new Vector3(0.5, -0.05, 0),
    blendMode: ParticleSystem.BLENDMODE_STANDARD,
  },
  microparticles: {
    capacity: 2000, emitRate: 150, minSize: 0.001, maxSize: 0.01,
    minLifetime: 4, maxLifetime: 10,
    minEmitPower: 0.02, maxEmitPower: 0.1,
    color1: new Color4(0.2, 1.0, 0.4, 0.9), color2: new Color4(0.0, 0.8, 0.2, 0.0),
    gravity: new Vector3(0, 0, 0),
    blendMode: ParticleSystem.BLENDMODE_ADD,
  },
};

export const createParticleSystem = (scene, type, emitterPosition) => {
  const cfg = PARTICLE_CONFIGS[type] || PARTICLE_CONFIGS.spores;

  const ps = new ParticleSystem(`ps_${type}`, cfg.capacity, scene);
  ps.particleTexture = new Texture('https://assets.babylonjs.com/particles/flare.png', scene);

  ps.emitter = emitterPosition || Vector3.Zero();
  ps.minEmitBox = new Vector3(-150, 5, -150);
  ps.maxEmitBox = new Vector3(150, 30, 150);

  if (type === 'stars') {
    ps.minEmitBox = new Vector3(-2000, 100, -2000);
    ps.maxEmitBox = new Vector3(2000, 800, 2000);
  }

  ps.color1 = cfg.color1;
  ps.color2 = cfg.color2;
  ps.colorDead = new Color4(0, 0, 0, 0);

  ps.minSize = cfg.minSize;
  ps.maxSize = cfg.maxSize;
  ps.minLifeTime = cfg.minLifetime;
  ps.maxLifeTime = cfg.maxLifetime;
  ps.emitRate = cfg.emitRate;
  ps.blendMode = cfg.blendMode;
  ps.gravity = cfg.gravity;
  ps.direction1 = new Vector3(-1, 1, -1);
  ps.direction2 = new Vector3(1, 1, 1);
  ps.minEmitPower = cfg.minEmitPower;
  ps.maxEmitPower = cfg.maxEmitPower;
  ps.updateSpeed = 0.016;
  ps.start();

  return ps;
};

export const switchParticleSystem = (scene, currentPs, newType, emitter) => {
  if (currentPs) currentPs.dispose();
  return createParticleSystem(scene, newType, emitter);
};
