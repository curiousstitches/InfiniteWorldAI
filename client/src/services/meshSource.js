// client/src/services/meshSource.js
// Abstracts character mesh generation behind a single interface so the engine
// stays decoupled from the upstream provider.  Q2 = Meshy realistic with RPM as a
// future plug-in (B-as-future-option).
//
// Each source returns { taskId, poll(): { progress, status, modelUrl } } so the
// CharacterCreator hook can drive a progress bar uniformly.

export const MESH_SOURCES = {
  meshy_realistic: {
    id: 'meshy_realistic',
    label: 'Meshy · Realistic + Auto-rig',
    available: true,
    style: 'realistic',
    autoRig: true,
    estimatedSeconds: 75,
    description: 'Photoreal humanoid with full skeleton. ~60-90s.'
  },
  meshy_stylized: {
    id: 'meshy_stylized',
    label: 'Meshy · Stylized',
    available: true,
    style: 'cartoon',
    autoRig: true,
    estimatedSeconds: 60,
    description: 'Stylized aesthetic. ~45-70s.'
  },
  rpm: {
    id: 'rpm',
    label: 'Ready Player Me',
    available: false,
    style: 'realistic',
    autoRig: true,
    estimatedSeconds: 8,
    description: 'Future option — instant photoreal humanoid via RPM API.'
  },
  primitive: {
    id: 'primitive',
    label: 'Primitive (no API)',
    available: true,
    style: 'primitive',
    autoRig: false,
    estimatedSeconds: 0,
    description: 'Procedural capsule + glowing eyes. Offline.'
  }
};

const API = '/api';

// ── Meshy (realistic + auto-rig) ────────────────────────────────────
async function meshyCreate({ description, source }) {
  const res = await fetch(`${API}/characters/mesh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: description,
      style: source.style,
      enable_auto_rig: source.autoRig,
      art_style: source.style === 'realistic' ? 'realistic' : 'cartoon',
      negative_prompt: 'low quality, deformed, blurry, two heads, missing limbs, extra limbs'
    })
  });
  if (!res.ok) throw new Error(`mesh-create-${res.status}`);
  return res.json();   // { taskId }
}

async function meshyPoll(taskId) {
  const res = await fetch(`${API}/characters/mesh/${taskId}`);
  if (!res.ok) throw new Error(`mesh-poll-${res.status}`);
  return res.json();   // { status, progress, modelUrl? }
}

// ── RPM stub (B as future option) ───────────────────────────────────
async function rpmCreate() { throw new Error('rpm-not-yet-configured'); }
async function rpmPoll()   { throw new Error('rpm-not-yet-configured'); }

// ── Primitive (no API roundtrip) ────────────────────────────────────
async function primitiveCreate() {
  return { taskId: 'primitive', modelUrl: null };
}
async function primitivePoll() {
  return { status: 'ready', progress: 100, modelUrl: null };
}

// ── Public dispatch ─────────────────────────────────────────────────
export async function generateCompanionMesh({ sourceId, description }) {
  const source = MESH_SOURCES[sourceId] || MESH_SOURCES.meshy_realistic;
  if (!source.available) throw new Error(`source-disabled:${sourceId}`);
  if (sourceId === 'primitive')                     return primitiveCreate();
  if (sourceId === 'rpm')                           return rpmCreate();
  return meshyCreate({ description, source });
}

export async function pollCompanionMesh({ sourceId, taskId }) {
  if (sourceId === 'primitive') return primitivePoll();
  if (sourceId === 'rpm')       return rpmPoll();
  return meshyPoll(taskId);
}

export const DEFAULT_SOURCE = 'meshy_realistic';
