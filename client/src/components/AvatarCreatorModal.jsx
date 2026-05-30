// client/src/components/AvatarCreatorModal.jsx
// The RPM "demo" iframe subdomain is dead (Netflix acquisition). Instead we offer a
// curated set of rigged avatars (Realistic + Stylized) backed by a resilient URL chain
// (RPM primary + guaranteed CC0 fallback). Picking one returns its URL chain.

import { REALISTIC_PRESETS, STYLIZED_PRESETS, VRM_PRESETS } from '../engine/visual/characterSources.js';

export default function AvatarCreatorModal({ onExported, onSkip }) {
  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <button style={S.skipTop} onClick={onSkip}>Skip ✕</button>
        <div style={S.title}>Choose your companion's body</div>
        <div style={S.note}>Pick a look — you can imagine the rest. Or skip for a simple figure.</div>

        <div style={S.sectionLabel}>✦ Realistic</div>
        <div style={S.row}>
          {REALISTIC_PRESETS.map(a => (
            <button key={a.id} style={S.avatarBtn} onClick={() => onExported(a.urls[0], a.urls)}>
              <span style={S.avatarEmoji}>🧑</span>{a.label}
            </button>
          ))}
        </div>

        <div style={S.sectionLabel}>✦ Anime / VRM</div>
        <div style={S.row}>
          {VRM_PRESETS.map(a => (
            <button key={a.id} style={S.avatarBtn} onClick={() => onExported(a.urls[0], a.urls)}>
              <span style={S.avatarEmoji}>🌸</span>{a.label}
            </button>
          ))}
        </div>

        <div style={S.sectionLabel}>✦ Stylized</div>
        <div style={S.row}>
          {STYLIZED_PRESETS.map(a => (
            <button key={a.id} style={S.avatarBtn} onClick={() => onExported(a.urls[0], a.urls)}>
              <span style={S.avatarEmoji}>🎨</span>{a.label}
            </button>
          ))}
        </div>

        <button style={S.skipBig} onClick={onSkip}>Skip — use a simple procedural figure</button>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(5,2,15,0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, overflowY: 'auto',
    fontFamily: 'system-ui, sans-serif' },
  card: { position: 'relative', width: '100%', maxWidth: 420, maxHeight: '88vh', overflowY: 'auto',
    background: 'linear-gradient(160deg,#1a0a38 0%,#0a0418 100%)',
    border: '1px solid rgba(204,136,255,0.3)', borderRadius: 16, padding: 22,
    paddingBottom: 'calc(22px + env(safe-area-inset-bottom, 16px))' },
  title: { color: '#fff', fontSize: 19, fontWeight: 800, marginBottom: 4 },
  note: { color: 'rgba(200,170,255,0.7)', fontSize: 13, marginBottom: 16 },
  sectionLabel: { color: '#cc88ff', fontSize: 13, fontWeight: 700, margin: '12px 0 8px', letterSpacing: 1 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  avatarBtn: { flex: '1 1 28%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    background: 'rgba(120,40,200,0.18)', border: '1px solid rgba(160,80,255,0.35)',
    color: '#e8d8ff', borderRadius: 12, padding: '12px 6px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  avatarEmoji: { fontSize: 26 },
  skipTop: { position: 'absolute', top: 10, right: 12, background: 'rgba(10,5,20,0.8)',
    border: '1px solid rgba(204,136,255,0.4)', color: '#cc88ff', borderRadius: 20,
    padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  skipBig: { width: '100%', marginTop: 18, background: 'transparent',
    border: '1px solid rgba(204,136,255,0.3)', color: 'rgba(204,136,255,0.85)',
    borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
