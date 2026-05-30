import { useState, useEffect } from 'react';
import { useWorldStore, useGameStore } from '../store/worldStore.js';
import { checkUsage } from '../services/usageLimiter.js';
import { surpriseStart } from '../services/surpriseStart.js';
import LoadingBar from './LoadingBar.jsx';
import CreditsModal from './CreditsModal.jsx';
import { loadSession, lastPlayedLabel, clearSession } from '../services/sessionPersist.js';
import LoginModal from './LoginModal.jsx';
import { isLoggedIn, getEmail, logout } from '../services/authClient.js';

const API = '/api';

export default function HomeScreen({ onOpenSettings }) {
  const [worlds, setWorlds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [showCredits, setShowCredits] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());
  const [savedSession] = useState(() => loadSession());

  const continueSession = () => {
    const s = loadSession();
    if (!s?.world) return;
    setWorld(s.world);
    if (s.character) useWorldStore.getState().setCharacter(s.character);
    useGameStore.getState().setStartMode('continue'); setPhase('playing');
  };
  const [usage, setUsage] = useState({ remaining: 100, cap: 100 });
  const { setWorld } = useWorldStore();
  const { setPhase } = useGameStore();

  useEffect(() => {
    fetch(`${API}/worlds`).then(r => r.json()).then(setWorlds).catch(() => {});
    setUsage(checkUsage());
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

  const [surprising, setSurprising] = useState(false);
  const doSurprise = async () => {
    setSurprising(true);
    try {
      const { world, character, intro } = await surpriseStart();
      setWorld(world);
      useWorldStore.getState().setCharacter(character);
      useGameStore.getState().setStartMode('amnesia'); setPhase('playing');
      // Seed the amnesia opener as the companion's first line.
      setTimeout(() => useGameStore.getState().setSubtitles(intro), 600);
    } catch (e) {
      console.warn('[surprise failed]', e);
      setSurprising(false);
    }
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
      {(surprising || creating) && (
        <LoadingBar
          message={surprising ? 'Waking you somewhere strange…' : 'Forging your world…'}
          subMessage={surprising ? 'Random world, random companion, zero memory.' : 'Shaping reality from your words.'}
        />
      )}
      <button style={s.gear} onClick={onOpenSettings} aria-label="Settings" title="Settings">⚙</button>
      <div style={s.container}>
        <div className="iw-rainbow" style={s.logo}>INFINITEWORLDS</div>
        <div style={s.tagline}>Every word reshapes reality</div>

        {savedSession && (
          <button className="iw-rainbow" style={s.continueBtn} onClick={continueSession}>
            ⟳ Continue — {lastPlayedLabel()}
          </button>
        )}

        <div style={s.newWorld}>
          <input
            style={s.input}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createWorld()}
            placeholder="Name your world..."
          />
          <button className="iw-rainbow" style={s.createBtn} onClick={createWorld} disabled={creating}>
            {creating ? '...' : 'BEGIN'}
          </button>
        </div>

        <div style={s.surpriseWrap}>
          <div style={s.surpriseOr}>— or —</div>
          <button className="iw-rainbow" style={s.surpriseBtn} onClick={doSurprise} disabled={surprising}>
            {surprising ? 'Waking you somewhere strange…' : '🎲 Surprise Me — wake up with amnesia'}
          </button>
          <div style={s.surpriseHint}>Random world, random companion, zero memory. Good luck.</div>
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

        <div style={s.footer}>
          <span style={s.usageBadge} title="Free daily AI messages on this device">
            {usage.remaining}/{usage.cap} free messages today
          </span>
          <button style={s.nineRouterLink} onClick={() => setShowCredits(true)}>
            ✦ Credits &amp; Contributors
          </button>
          <button style={s.nineRouterLink} onClick={() => loggedIn ? (logout(), setLoggedIn(false)) : setShowLogin(true)}>
            {loggedIn ? `👤 ${getEmail()} · Log out` : '👤 Sign in (sync across devices)'}
          </button>
        </div>
      </div>

      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
      {showLogin && <LoginModal onDone={() => { setLoggedIn(true); setShowLogin(false); }} onSkip={() => setShowLogin(false)} />}
    </div>
  );
}

const s = {
  surpriseWrap: { marginTop: 16, textAlign: 'center' },
  surpriseOr: { color: 'rgba(200,170,255,0.4)', fontSize: 12, letterSpacing: 2, marginBottom: 10 },
  surpriseBtn: { width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
    background: 'linear-gradient(135deg,#ff9a3c 0%,#cc3a8a 100%)', border: 'none',
    color: '#fff', fontSize: 14.5, fontWeight: 800 },
  surpriseHint: { color: 'rgba(255,154,60,0.7)', fontSize: 11.5, marginTop: 8, fontStyle: 'italic' },
  footer: {
    marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(204,136,255,0.15)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  usageBadge: {
    fontSize: 11, color: 'rgba(136,221,255,0.85)', fontWeight: 600,
    background: 'rgba(136,221,255,0.08)', border: '1px solid rgba(136,221,255,0.2)',
    borderRadius: 12, padding: '4px 12px',
  },
  nineRouterLink: {
    background: 'transparent', border: '1px solid rgba(204,136,255,0.3)',
    color: '#cc88ff', fontSize: 12, fontWeight: 700, borderRadius: 20,
    padding: '6px 16px', cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse at 50% 30%, #1e0a42 0%, #0d0520 55%, #000 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Crimson Pro', serif",
  },
  container: { width: '90vw', maxWidth: 430, textAlign: 'center' },
  logo: {
    fontFamily: "'Cinzel Decorative', serif", fontSize: 30, letterSpacing: 6, fontWeight: 700,
    background: 'linear-gradient(90deg,#ff9a3c,#cc3a8a,#cc88ff,#88ddff)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    marginBottom: 10,
    textShadow: '0 0 50px rgba(180,80,255,0.4)',
  },
  tagline: { color: 'rgba(220,190,255,0.7)', fontSize: 15, letterSpacing: 2, marginBottom: 36, fontStyle: 'italic' },
  continueBtn: { width: '100%', marginBottom: 20, padding: '15px', borderRadius: 14, cursor: 'pointer',
    background: 'linear-gradient(135deg,#3ad17a 0%,#2a9ed8 100%)', border: 'none',
    color: '#04140a', fontSize: 15.5, fontWeight: 800, boxShadow: '0 4px 24px rgba(58,209,122,0.35)' },
  newWorld: { display: 'flex', gap: 10, marginBottom: 8 },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(204,136,255,0.45)',
    borderRadius: 12, padding: '15px 16px', color: '#f0e0ff', fontSize: 17,
    outline: 'none', fontFamily: "'Crimson Pro', serif",
  },
  createBtn: {
    background: 'linear-gradient(135deg,#7a3acc,#cc3a8a)', border: 'none',
    color: '#fff', borderRadius: 12, padding: '15px 22px',
    fontFamily: "'Cinzel Decorative', serif", fontSize: 14, letterSpacing: 2, cursor: 'pointer', fontWeight: 700,
    boxShadow: '0 4px 20px rgba(160,40,160,0.4)',
  },
  worldList: { textAlign: 'left', marginTop: 8 },
  listLabel: { color: 'rgba(204,136,255,0.6)', fontSize: 11, letterSpacing: 3, marginBottom: 10, textAlign: 'center' },
  worldCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '13px 16px', marginBottom: 8, cursor: 'pointer',
    background: 'linear-gradient(135deg,rgba(80,30,140,0.4),rgba(40,20,80,0.3))',
    border: '1px solid rgba(160,80,255,0.35)',
    borderRadius: 12, transition: 'all 0.2s',
  },
  worldName: { color: '#e8d0ff', fontSize: 17, fontWeight: 600 },
  worldMeta: { color: 'rgba(180,150,230,0.6)', fontSize: 13, fontStyle: 'italic' },
  gear: {
    position: 'fixed', top: 16, right: 16, width: 40, height: 40,
    background: 'rgba(40,20,80,0.5)', border: '1px solid rgba(160,80,255,0.4)',
    borderRadius: '50%', color: '#cc88ff', fontSize: 18, cursor: 'pointer',
    backdropFilter: 'blur(8px)', zIndex: 10,
  },
};
