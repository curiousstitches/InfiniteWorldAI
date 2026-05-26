// client/src/components/Settings.jsx
import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import ApiTab from './settings/ApiTab';
import GraphicsTab from './settings/GraphicsTab';
import PersonalityTab from './settings/PersonalityTab';
import UiTab from './settings/UiTab';

const TABS = [
  { key: 'api',         label: 'API',        icon: '🔑' },
  { key: 'graphics',    label: 'Graphics',   icon: '🎬' },
  { key: 'personality', label: 'Personality', icon: '🧠' },
  { key: 'ui',          label: 'Interface',  icon: '✨' }
];

const S = {
  shell:  { position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 30%, #1a0a2e 0%, #050008 100%)', color: '#f0e8ff', zIndex: 100, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(204,136,255,0.25)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' },
  title:  { fontSize: 16, fontWeight: 700, letterSpacing: 1, color: '#cc88ff' },
  close:  { background: 'transparent', border: '1px solid rgba(204,136,255,0.4)', color: '#f0e8ff', borderRadius: 999, width: 36, height: 36, fontSize: 18, cursor: 'pointer' },
  tabs:   { display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid rgba(204,136,255,0.15)', overflowX: 'auto' },
  tab:    (active) => ({ flex: 1, minWidth: 110, padding: '10px 14px', border: 'none', borderRadius: 10, background: active ? 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)' : 'rgba(204,136,255,0.08)', color: active ? '#0a0218' : '#f0e8ff', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, cursor: 'pointer', transition: 'all 0.2s' }),
  body:   { flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }
};

export default function Settings({ onClose }) {
  const [tab, setTab] = useState('api');
  const setServerKeyFlags = useSettingsStore(s => s.setServerKeyFlags);

  // On mount, ask the server which paid keys it already has in .env (so we know which UI to hide).
  useEffect(() => {
    fetch('/api/settings/status').then(r => r.ok ? r.json() : null).then(d => d && setServerKeyFlags(d.keys || {})).catch(() => {});
  }, [setServerKeyFlags]);

  return (
    <div style={S.shell}>
      <div style={S.header}>
        <div style={S.title}>SETTINGS</div>
        <button style={S.close} onClick={onClose} aria-label="Close settings">×</button>
      </div>
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
            <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <div style={S.body}>
        {tab === 'api'         && <ApiTab />}
        {tab === 'graphics'    && <GraphicsTab />}
        {tab === 'personality' && <PersonalityTab />}
        {tab === 'ui'          && <UiTab />}
      </div>
    </div>
  );
}
