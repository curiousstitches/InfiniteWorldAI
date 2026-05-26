import { useEffect, useRef, useState } from 'react';
import { useWorldStore, useGameStore } from './store/worldStore.js';
import { useSettingsStore } from './store/settingsStore.js';
import HomeScreen from './components/HomeScreen.jsx';
import CharacterCreator from './components/CharacterCreator.jsx';
import BabylonEngine from './engine/BabylonEngine.jsx';
import VoiceInterface from './components/VoiceInterface.jsx';
import { TaskPanel, WorldHUD, LegacyEchoModal } from './components/HUD.jsx';
import Settings from './components/Settings.jsx';
import AiStatusPanel from './components/AiStatusPanel.jsx';

const WS_URL = `ws://${window.location.host.replace(/:\d+$/, ':3001')}`;
const API = '/api';

export default function App() {
  const { phase, setPhase, setWsConnection, setCharacterModelUrl, setModelStatus, wsConnection } = useGameStore();
  const { worldId, world, character, interactables, applyInteractUpdate, reset } = useWorldStore();
  const interactRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hideAllHud = useSettingsStore(s => s.ui.hideAllHud);

  // WebSocket lifecycle
  useEffect(() => {
    if (!worldId || phase !== 'playing') return;
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', worldId }));
      // If character model is processing, poll it
      if (character?.model_status === 'processing') {
        const meta = JSON.parse(character.metadata || '{}');
        if (meta.meshyTaskId) {
          ws.send(JSON.stringify({ type: 'poll_model', taskId: meta.meshyTaskId, characterId: character.id }));
        }
      }
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'model_ready') {
        setCharacterModelUrl(msg.modelUrl);
        setModelStatus('ready');
      }
      if (msg.type === 'model_fallback') setModelStatus('fallback');
      if (msg.type === 'model_progress') setModelStatus('processing');
    };

    setWsConnection(ws);
    return () => ws.close();
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
    <HomeScreen onOpenSettings={() => setSettingsOpen(true)} />
    {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
  </>;
  if (phase === 'character_creation') return <>
    <CharacterCreator worldId={worldId} />
    {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
  </>;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      {/* 3D World */}
      <BabylonEngine
        worldState={world}
        interactables={interactables}
        onInteract={handleInteract}
        characterModelUrl={useGameStore.getState().characterModelUrl}
      />

      {/* HUD overlays — hidden if user chose fullscreen-feel toggle */}
      {!hideAllHud && (
        <>
          <WorldHUD />
          <TaskPanel />
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

const styles = {
  menuBtn: {
    position: 'fixed', top: 12, right: 12, width: 36, height: 36,
    background: 'rgba(10,5,30,0.7)', border: '1px solid rgba(160,80,255,0.3)',
    borderRadius: '50%', color: 'rgba(180,140,255,0.7)', fontSize: 16,
    cursor: 'pointer', zIndex: 20, backdropFilter: 'blur(8px)',
  },
};
