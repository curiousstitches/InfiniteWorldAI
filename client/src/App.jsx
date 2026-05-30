import { useEffect, useRef, useState } from 'react';
import { useWorldStore, useGameStore } from './store/worldStore.js';
import { useSettingsStore } from './store/settingsStore.js';
import HomeScreen from './components/HomeScreen.jsx';
import CharacterCreator from './components/CharacterCreator.jsx';
import BabylonEngine from './engine/BabylonEngine.jsx';
import VoiceInterface from './components/VoiceInterface.jsx';
import { TaskPanel, WorldHUD, LegacyEchoModal } from './components/HUD.jsx';
import LifeSimPanel from './components/LifeSimPanel.jsx';
import WakingOverlay from './components/WakingOverlay.jsx';
import Settings from './components/Settings.jsx';
import AiStatusPanel from './components/AiStatusPanel.jsx';
import ProviderGate from './components/ProviderGate.jsx';
import { shouldShowGate } from './services/providerGate.js';
import { saveSession, loadSession, clearSession } from './services/sessionPersist.js';
import { isLoggedIn, saveSlot } from './services/authClient.js';

const WS_URL = import.meta.env.DEMO_MODE === true
  ? null
  : `ws://${window.location.host.replace(/:\d+$/, ':3001')}`;
const API = '/api';

export default function App() {
  const [showGate, setShowGate] = useState(() => shouldShowGate());
  const [showWaking, setShowWaking] = useState(false);
  const { phase, setPhase, setWsConnection, setCharacterModelUrl, setModelStatus, wsConnection } = useGameStore();
  const avatarFallback = useGameStore(s => s.avatarFallback);
  const { worldId, world, character, interactables, applyInteractUpdate, reset } = useWorldStore();
  const interactRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hideAllHud = useSettingsStore(s => s.ui.hideAllHud);

  // Restore a saved session on first mount so a refresh/close resumes in-world.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const s = loadSession();
    if (s && s.world) {
      const ws = useWorldStore.getState();
      ws.setWorld(s.world);
      if (s.character) ws.setCharacter(s.character);
      if (s.character?.model_url) setCharacterModelUrl(s.character.model_url);
      setPhase('playing');     // jump straight back in
      setShowGate(false);      // already chose a provider previously
    }
  }, [setPhase, setCharacterModelUrl]);

  // Auto-save the session whenever the world/character/phase changes while playing.
  useEffect(() => {
    if (phase === 'playing' && world) {
      saveSession({ world, character, phase });
      // If logged in, also sync to the cloud slot so it follows across devices.
      try {
        if (isLoggedIn()) {
          const mem = (() => { try { return JSON.parse(localStorage.getItem('iw_companion_memory_v1') || '{}'); } catch { return {}; } })();
          const life = (() => { try { return JSON.parse(localStorage.getItem('iw_lifesim_v1') || '{}'); } catch { return {}; } })();
          const slot = Number(localStorage.getItem('iw_active_slot') || 0);
          saveSlot(slot, world?.name || 'World', { world, character, memory: mem, lifesim: life }).catch(() => {});
        }
      } catch {}
    }
  }, [phase, world, character]);

  // Show the waking-up intro each time we enter a world.
  useEffect(() => {
    if (phase === 'playing') setShowWaking(true);
  }, [phase]);

  // WebSocket lifecycle — skipped when no WS_URL is configured (e.g. GitHub Pages demo)
  useEffect(() => {
    if (!worldId || phase !== 'playing') return;
    if (!WS_URL || !WS_URL.startsWith('ws')) return;     // demo mode safeguard

    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.warn('[ws] connect failed, continuing without realtime updates', e);
      return;
    }

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify({ type: 'subscribe', worldId }));
        if (character?.model_status === 'processing') {
          const meta = JSON.parse(character.metadata || '{}');
          if (meta.meshyTaskId) {
            ws.send(JSON.stringify({ type: 'poll_model', taskId: meta.meshyTaskId, characterId: character.id }));
          }
        }
      } catch {}
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'model_ready') {
          setCharacterModelUrl(msg.modelUrl);
          setModelStatus('ready');
        }
        if (msg.type === 'model_fallback') setModelStatus('fallback');
        if (msg.type === 'model_progress') setModelStatus('processing');
      } catch {}
    };

    ws.onerror = () => { /* swallow — engine renders fine without WS */ };

    setWsConnection(ws);
    return () => { try { ws.close(); } catch {} };
  }, [worldId, phase]); // eslint-disable-line

  // Handle interactable click → inject into voice pipeline
  const handleInteract = (obj) => {
    const { sendTextInput } = interactRef.current || {};
    if (sendTextInput) {
      sendTextInput(`I'm examining the ${obj.label}. ${obj.description}`);
    }
  };

  const handleDeleteWorld = async (keepLegacy) => {
    await fetch(`${API}/worlds/${worldId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepLegacy }),
    });
    reset();
    setPhase('home');
  };

  if (phase === 'home') return <>
    {showGate && <ProviderGate onComplete={() => setShowGate(false)} />}
    <HomeScreen onOpenSettings={() => setSettingsOpen(true)} />
    {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
  </>;
  if (phase === 'character_creation') return <>
    <CharacterCreator worldId={worldId} />
    {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
  </>;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0418' }}>
      {/* 3D World */}
      <BabylonEngine
        worldState={world}
        interactables={interactables}
        onInteract={handleInteract}
        characterModelUrl={useGameStore.getState().characterModelUrl}
        character={useWorldStore.getState().character}
      />

      {/* Loading overlay — fades when engine is up (1-3s on mobile) */}
      <EngineBootOverlay />

      {/* Waking-up intro — eyelid + blur fade with a ghostly cursive phrase */}
      {showWaking && (
        <WakingOverlay
          mode={useGameStore.getState().startMode}
          onDone={() => setShowWaking(false)}
        />
      )}

      {/* Avatar fallback notice — brief, dismissible, with a fix tip */}
      {avatarFallback && !showWaking && (
        <div style={{
          position: 'fixed', top: 92, left: '50%', transform: 'translateX(-50%)', zIndex: 55,
          maxWidth: '90vw', background: 'rgba(26,10,56,0.96)', border: '1px solid rgba(255,204,102,0.5)',
          borderRadius: 12, padding: '10px 14px', color: 'rgba(255,225,160,0.95)', fontSize: 12.5,
          fontFamily: 'system-ui', lineHeight: 1.5, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }} onClick={() => useGameStore.getState().setAvatarFallback(false)}>
          ⚠ Using a simple body — the detailed avatar couldn't load (often a slow network or the
          avatar host being down). Try reloading on Wi-Fi, or pick a different body in character
          setup. <span style={{ opacity: 0.7 }}>(tap to dismiss)</span>
        </div>
      )}

      {/* HUD overlays — hidden if user chose fullscreen-feel toggle */}
      {!hideAllHud && (
        <>
          <WorldHUD />
          <TaskPanel />
          <LifeSimPanel />
        </>
      )}

      {/* Voice interface — always rendered so audio still flows, but its UI respects hideAllHud */}
      <VoiceInterfaceWithRef ref={interactRef} />

      {/* Floating AI status panel — its own visibility logic in UiTab */}
      <AiStatusPanel onOpenSettings={() => setSettingsOpen(true)} />

      {/* Menu button — hidden when HUD is hidden */}
      {!hideAllHud && (
        <button style={styles.menuBtn} onClick={() => setPhase('deletion_modal')}>◈</button>
      )}

      {/* Deletion modal */}
      {phase === 'deletion_modal' && (
        <LegacyEchoModal onConfirm={handleDeleteWorld} onCancel={() => setPhase('playing')} />
      )}

      {/* Settings overlay */}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

// Forward ref wrapper so App can call sendTextInput from interactables
import { forwardRef, useImperativeHandle } from 'react';
import { useVoice } from './hooks/useVoice.js';

const VoiceInterfaceWithRef = forwardRef((_, ref) => {
  const voice = useVoice();
  useImperativeHandle(ref, () => ({ sendTextInput: voice.sendTextInput }));
  return <VoiceInterface />;
});
VoiceInterfaceWithRef.displayName = 'VoiceInterfaceWithRef';

// Loading overlay — fades out once Babylon's canvas paints its first frame.
function EngineBootOverlay() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const start = Date.now();
    const check = () => {
      const canvas = document.querySelector('canvas');
      const ready = canvas && (Date.now() - start) > 800;
      if (ready) setHidden(true);
      else setTimeout(check, 200);
    };
    check();
    // Hard timeout — never block UI for longer than 8s
    const t = setTimeout(() => setHidden(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      background: 'radial-gradient(ellipse at center, #1a0a3a 0%, #000 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
      opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto',
      transition: 'opacity 600ms ease',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: '3px solid rgba(204,136,255,0.2)',
        borderTopColor: '#cc88ff',
        animation: 'iwSpin 0.9s linear infinite',
      }} />
      <div style={{
        color: '#cc88ff', fontSize: 13, fontWeight: 700, letterSpacing: 3,
        fontFamily: 'system-ui, sans-serif',
      }}>WAKING THE WORLD</div>
      <style>{`@keyframes iwSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  menuBtn: {
    position: 'fixed', top: 12, right: 12, width: 36, height: 36,
    background: 'rgba(10,5,30,0.7)', border: '1px solid rgba(160,80,255,0.3)',
    borderRadius: '50%', color: 'rgba(180,140,255,0.7)', fontSize: 16,
    cursor: 'pointer', zIndex: 20, backdropFilter: 'blur(8px)',
  },
};
