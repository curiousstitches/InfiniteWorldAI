// server/routes/interact.js
// Game-loop tick. Accepts the new request shape:
//   { playerInput, providerPicks, personality, skipCompanion, skipAudio }
// When skipCompanion=true (default, Q1-A), the client runs the Companion via Puter.
// Server always runs World GM + TaskGen in parallel and persists state.

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, run, get } from '../db/client.js';
import { runWorldGM } from '../agents/worldGM.js';
import { runCompanion } from '../agents/companion.js';
import { runTaskGenerator } from '../agents/taskGen.js';
import { streamSpeechToResponse, VOICE_PRESETS } from '../services/elevenlabs.js';

const router = Router();

router.post('/:worldId', async (req, res) => {
  const { worldId } = req.params;
  const {
    playerInput,
    audioMode = false,
    skipCompanion = false,   // Q1-A: client runs Companion via Puter by default
    skipAudio = false,       // Q3-C: client plays TTS via Puter / Web Speech
    providerPicks = {},
    personality = null
  } = req.body || {};

  if (!playerInput?.trim()) return res.status(400).json({ error: 'No input' });

  const world = get('SELECT * FROM worlds WHERE id = ?', [worldId]);
  if (!world) return res.status(404).json({ error: 'World not found' });

  const character = get('SELECT * FROM characters WHERE world_id = ?', [worldId]);
  if (!character) return res.status(404).json({ error: 'No character' });

  const history = query(
    'SELECT role, content, emotion FROM conversations WHERE world_id = ? ORDER BY timestamp DESC LIMIT 20',
    [worldId]
  ).reverse();

  const worldState = {
    biome: world.biome,
    scale: world.scale,
    weather: world.weather,
    timeOfDay: world.time_of_day,
    locationName: world.location_name,
    mood: world.mood
  };

  const activeTasks = query("SELECT * FROM tasks WHERE world_id = ? AND status = 'active'", [worldId]);

  // Persist player input.
  run('INSERT INTO conversations(world_id, role, content) VALUES(?,?,?)', [worldId, 'player', playerInput]);

  // Build the parallel agent set. Companion is omitted when client handles it (default).
  const tasks = [
    runWorldGM(playerInput, worldState, history, { providerPicks }),
    runTaskGenerator(playerInput, worldState, activeTasks, history, { providerPicks }),
    skipCompanion
      ? Promise.resolve(null)
      : runCompanion(playerInput, character, worldState, history, { providerPicks, personality })
  ];

  const [gmResult, taskResult, companionResult] = await Promise.allSettled(tasks);

  const gm        = gmResult.status === 'fulfilled' ? gmResult.value : null;
  const tasksOut  = taskResult.status === 'fulfilled' ? taskResult.value : { newTasks: [], completedTaskIds: [] };
  const companion = (companionResult?.status === 'fulfilled' && companionResult.value) || null;

  // Apply world state changes.
  if (gm?.worldState) {
    const ws = gm.worldState;
    run(`UPDATE worlds SET biome=?, scale=?, weather=?, time_of_day=?, location_name=?, mood=?, updated_at=unixepoch() WHERE id=?`,
      [ws.biome || world.biome, ws.scale || world.scale, ws.weather || world.weather,
       ws.timeOfDay ?? world.time_of_day, ws.locationName || world.location_name,
       ws.mood || world.mood, worldId]);
  }

  // Apply interactables.
  if (gm?.sceneChanges?.newInteractables?.length) {
    for (const obj of gm.sceneChanges.newInteractables) {
      run(`INSERT OR REPLACE INTO interactables(id,world_id,type,label,description,position_x,position_y,position_z,mesh_type,color,is_active,metadata)
           VALUES(?,?,?,?,?,?,?,?,?,?,1,?)`,
        [obj.id || uuidv4(), worldId, obj.type, obj.label, obj.description,
         obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0,
         obj.meshType || 'sphere', obj.color || '#888888',
         JSON.stringify({ glowColor: obj.glowColor, isTaskRelated: obj.isTaskRelated })]);
    }
  }
  if (gm?.sceneChanges?.removeInteractableIds?.length) {
    for (const id of gm.sceneChanges.removeInteractableIds)
      run('UPDATE interactables SET is_active=0 WHERE id=? AND world_id=?', [id, worldId]);
  }

  // Apply tasks.
  if (tasksOut.newTasks?.length) {
    for (const t of tasksOut.newTasks) {
      run(`INSERT OR IGNORE INTO tasks(id,world_id,title,description,hints,difficulty,type,status)
           VALUES(?,?,?,?,?,?,?,?)`,
        [t.id || uuidv4(), worldId, t.title, t.description,
         JSON.stringify(t.hints || []), t.difficulty || 'medium',
         t.type || 'exploration', t.isHidden ? 'hidden' : 'active']);
    }
  }
  if (tasksOut.completedTaskIds?.length) {
    for (const id of tasksOut.completedTaskIds)
      run(`UPDATE tasks SET status='completed', completed_at=unixepoch() WHERE id=? AND world_id=?`, [id, worldId]);
  }

  // Persist companion line if the server ran it.
  if (companion?.dialogue) {
    run('INSERT INTO conversations(world_id,role,content,emotion) VALUES(?,?,?,?)',
        [worldId, 'companion', companion.dialogue, companion.emotion]);
  }

  const updatedInteractables = query("SELECT * FROM interactables WHERE world_id=? AND is_active=1", [worldId]);
  const updatedTasks         = query("SELECT * FROM tasks WHERE world_id=? AND status='active'", [worldId]);

  const payload = {
    worldState: gm?.worldState || worldState,
    sceneChanges: gm?.sceneChanges || {},
    companion: companion || null,             // null when client handles Companion (skipCompanion=true)
    tasks: { new: tasksOut.newTasks || [], completed: tasksOut.completedTaskIds || [] },
    interactables: updatedInteractables,
    activeTasks: updatedTasks,
    environmentNarrative: gm?.sceneChanges?.environmentNarrative || '',
    providerIds: {
      gm: gm?._providerId || null,
      taskgen: tasksOut?._providerId || null,
      companion: companion?._providerId || null
    }
  };

  // Streaming audio mode is server-driven (paid ElevenLabs path). Skipped when client plays TTS.
  if (!skipAudio && audioMode && process.env.ELEVENLABS_API_KEY && companion?.dialogue) {
    const voiceId = character.voice_id || VOICE_PRESETS.mystical_female;
    res.setHeader('X-World-Update', JSON.stringify(payload));
    return streamSpeechToResponse(companion.dialogue, voiceId, companion.emotion, res);
  }

  res.json(payload);
});

export default router;
