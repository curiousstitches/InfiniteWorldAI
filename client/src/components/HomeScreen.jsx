import { useState, useEffect } from 'react';
import { useWorldStore, useGameStore } from '../store/worldStore.js';

const API = '/api';

export default function HomeScreen({ onOpenSettings }) {
  const [worlds, setWorlds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const { setWorld } = useWorldStore();
  const { setPhase } = useGameStore();

  useEffect(() => {
    fetch(`${API}/worlds`).then(r => r.json()).then(setWorlds).catch(() => {});
  }, []);

  const createWorld = async () => {
    setCreating(true);
    const res = await fetch(`${API}/worlds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || `World ${Date.now()}` }),
    });
    const world = await res.json();
    setWorld(world);
    setPhase('character_creation');
    setCreating(false);
  };

  const loadWorld = async (w) => {
    const res = await fetch(`${API}/worlds/${w.id}`);
    const data = await res.json();
    setWorld(data.world);
    useWorldStore.getState().setCharacter(data.character);
    useWorldStore.getState().setInteractables(data.interactables);
    useWorldStore.getState().setActiveTasks(data.activeTasks);
    setPhase('playing');
  };

  return (
    <div style={s.overlay}>
      <button style={s.gear} onClick={onOpenSettings} aria-label="Settings" title="Settings">⚙</button>
      <div style={s.container}>
        <div style={s.logo}>INFINITEWORLDS</div>
        <div style={s.tagline}>Every word reshapes reality</div>

        <div style={s.newWorld}>
          <input
            style={s.input}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createWorld()}
            placeholder="Name your world..."
          />
          <button style={s.createBtn} onClick={createWorld} disabled={creating}>
            {creating ? '...' : 'BEGIN'}
          </button>
        </div>

        {worlds.length > 0 && (
          <div style={s.worldList}>
            <div style={s.listLabel}>EXISTING WORLDS</div>
            {worlds.map(w => (
              <div key={w.id} style={s.worldCard} onClick={() => loadWorld(w)}>
                <span style={s.worldName}>{w.name}</span>
                <span style={s.worldMeta}>{w.biome} · {w.scale}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse at 50% 60%, #0d0520 0%, #000 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Crimson Pro', serif",
  },
  container: { width: '88vw', maxWidth: 420, textAlign: 'center' },
  logo: {
    fontFamily: "'Cinzel Decorative', serif", fontSize: 22, letterSpacing: 6,
    color: '#cc88ff', marginBottom: 8,
    textShadow: '0 0 40px rgba(180,80,255,0.5)',
  },
  tagline: { color: 'rgba(200,170,255,0.45)', fontSize: 13, letterSpacing: 3, marginBottom: 36, fontStyle: 'italic' },
  newWorld: { display: 'flex', gap: 8, marginBottom: 28 },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(160,80,255,0.3)',
    borderRadius: 8, padding: '11px 14px', color: '#e0c8ff', fontSize: 15,
    outline: 'none', fontFamily: "'Crimson Pro', serif",
  },
  createBtn: {
    background: 'rgba(100,30,200,0.7)', border: '1px solid rgba(160,80,255,0.5)',
    color: '#e0c8ff', borderRadius: 8, padding: '11px 20px',
    fontFamily: "'Cinzel Decorative', serif", fontSize: 12, letterSpacing: 2, cursor: 'pointer',
  },
  worldList: { textAlign: 'left' },
  listLabel: { color: 'rgba(180,150,255,0.3)', fontSize: 10, letterSpacing: 3, marginBottom: 10, textAlign: 'center' },
  worldCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
    background: 'rgba(40,20,80,0.3)', border: '1px solid rgba(120,60,200,0.2)',
    borderRadius: 8, transition: 'all 0.2s',
  },
  worldName: { color: 'rgba(220,200,255,0.8)', fontSize: 15 },
  worldMeta: { color: 'rgba(160,130,200,0.45)', fontSize: 12, fontStyle: 'italic' },
  gear: {
    position: 'fixed', top: 16, right: 16, width: 40, height: 40,
    background: 'rgba(40,20,80,0.5)', border: '1px solid rgba(160,80,255,0.4)',
    borderRadius: '50%', color: '#cc88ff', fontSize: 18, cursor: 'pointer',
    backdropFilter: 'blur(8px)', zIndex: 10,
  },
};
