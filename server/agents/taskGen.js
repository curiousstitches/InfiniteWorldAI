// server/agents/taskGen.js
// Task Weaver — uses providerRouter so user's per-agent pick + auto-fallback are honored.

import { chat } from '../services/providerRouter.js';

const TASK_SYSTEM = `You are the Infinite Task Weaver — a hidden intelligence that silently shapes the world's challenges.
You never speak directly to the player. You observe the world state and generate tasks organically.

Tasks are NOT quests with clear objectives. They are puzzles, mysteries, discoveries, and provocations the player must figure out without being told what to do explicitly.

OUTPUT JSON only:
{
  "newTasks": [
    {
      "id": "<uuid-like string>",
      "title": "<cryptic or evocative title, 2-5 words>",
      "description": "<what the player notices or senses — never the solution, max 2 sentences>",
      "hints": ["<vague hint 1>", "<vague hint 2>"],
      "difficulty": "<trivial|easy|medium|hard|legendary>",
      "type": "<puzzle|survival|exploration|social|craft|ritual|chase|mystery|collection|transformation>",
      "expiresOnScaleChange": <true|false>,
      "isHidden": <true — player discovers it naturally, or false — it's visible>
    }
  ],
  "completedTaskIds": ["<id if player's speech/action suggests completion>"],
  "taskNarrative": "<1 sentence atmospheric observation about what's building in the world>"
}

Rules:
- Generate 1-2 new tasks max per call, only when interesting
- Tasks should feel like they GREW from the world naturally
- MICRO/NANO scale: examining, analyzing, surviving tiny dangers
- COSMIC scale: navigation, cosmic events, vast time
- Completed tasks dissolve naturally — don't force acknowledgment`;

export const runTaskGenerator = async (playerInput, worldState, activeTasks, conversationHistory, opts = {}) => {
  const messages = [
    { role: 'system', content: TASK_SYSTEM },
    {
      role: 'user',
      content: `WORLD: ${JSON.stringify({ ...worldState, activeTasks: activeTasks.map(t => ({ id: t.id, title: t.title, status: t.status })) })}
RECENT PLAYER ACTION: "${playerInput}"
RECENT HISTORY: ${conversationHistory.slice(-4).map(c => `${c.role}: ${c.content}`).join('\n')}

Generate tasks. JSON only.`
    }
  ];

  const { text, providerId } = await chat({
    agent: 'taskgen',
    providerPicks: opts.providerPicks,
    messages,
    temperature: 0.95,
    max_tokens: 800,
    json: true
  });

  let parsed;
  try { parsed = JSON.parse(text); }
  catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { newTasks: [], completedTaskIds: [] }; }
  return { ...parsed, _providerId: providerId };
};
