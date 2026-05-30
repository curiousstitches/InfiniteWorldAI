// client/src/components/LifeSimPanel.jsx
// The life-sim UI: a collapsible panel showing companion needs + bond, player resources,
// care actions (feed/play/rest/toy), a gather button, and a mini-game launcher.
// Opens from a paw button so it never blocks the 3D view.

import { useState, useEffect } from 'react';
import { useLifeSim } from '../store/lifeSimStore.js';
import MiniGameModal from './MiniGameModal.jsx';

const Bar = ({ label, value, color }) => (
  <div style={S.barRow}>
    <span style={S.barLabel}>{label}</span>
    <div style={S.barTrack}>
      <div style={{ ...S.barFill, width: `${Math.round(value)}%`, background: color }} />
    </div>
    <span style={S.barVal}>{Math.round(value)}</span>
  </div>
);

export default function LifeSimPanel() {
  const s = useLifeSim();
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState(null);
  const [tab, setTab] = useState('care'); // 'care' | 'games' | 'stats'

  // Decay tick — runs while mounted so needs drop over time.
  useEffect(() => {
    s.tickDecay();
    const id = setInterval(() => s.tickDecay(), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* Paw toggle button */}
      <button style={S.pawBtn} onClick={() => setOpen(o => !o)} aria-label="Companion care">
        🐾
        <span style={S.bondPip}>Lv{s.bond}</span>
      </button>

      {open && (
        <div style={S.panel}>
          <div style={S.header}>
            <span style={S.title}>Companion · Bond Lv {s.bond}</span>
            <button style={S.close} onClick={() => setOpen(false)}>×</button>
          </div>

          {/* Tabs */}
          <div style={S.tabRow}>
            {[['care','🍓 Care'],['games','🎮 Games'],['stats','📊 Stats']].map(([k,label]) => (
              <button key={k} style={tab === k ? S.tabActive : S.tab} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>

          {/* Bond XP bar (always visible) */}
          <div style={S.xpTrack}>
            <div style={{ ...S.xpFill, width: `${Math.round((s.bondXp / (s.bond * 100)) * 100)}%` }} />
          </div>

          {tab === 'stats' && (<>
            <Bar label="🍓 Fed"   value={s.hunger}    color="linear-gradient(90deg,#ff9a3c,#ffcc66)" />
            <Bar label="⚡ Energy" value={s.energy}    color="linear-gradient(90deg,#3ad17a,#88ddff)" />
            <Bar label="😊 Happy" value={s.happiness} color="linear-gradient(90deg,#cc88ff,#ff6ec7)" />
            <Bar label="💗 Affection" value={s.affection} color="linear-gradient(90deg,#ff6ec7,#ff3a8a)" />
            <Bar label="🛡 Trust" value={s.trust}     color="linear-gradient(90deg,#88ddff,#4a9ed8)" />
            <div style={S.resRow}>
              <span style={S.res}>🍓 {s.berries}</span>
              <span style={S.res}>💎 {s.crystals}</span>
              <span style={S.res}>🧸 {s.toys}</span>
            </div>
          </>)}

          {tab === 'care' && (<>
            <div style={S.resRow}>
              <span style={S.res}>🍓 {s.berries}</span>
              <span style={S.res}>💎 {s.crystals}</span>
              <span style={S.res}>🧸 {s.toys}</span>
            </div>
            <div style={S.actionGrid}>
              <button style={S.action} onClick={s.feed} disabled={s.berries <= 0}>🍓 Feed</button>
              <button style={S.action} onClick={s.play} disabled={s.energy < 10}>🎾 Play</button>
              <button style={S.action} onClick={s.rest}>💤 Rest</button>
              <button style={S.action} onClick={s.giveToy} disabled={s.toys <= 0}>🧸 Gift</button>
            </div>
            <button style={S.gather} onClick={() => s.gather('berries')}>🌿 Forage (find a berry)</button>
          </>)}

          {tab === 'games' && (<>
            <div style={S.gamesLabel}>Play to build trust &amp; happiness</div>
            <div style={S.actionGrid}>
              <button style={S.game} onClick={() => setGame('ispy')}>🔍 I-Spy</button>
              <button style={S.game} onClick={() => setGame('memory')}>🧠 Memory</button>
              <button style={S.game} onClick={() => setGame('quick')}>⚡ Quick Tap</button>
            </div>
          </>)}
        </div>
      )}

      {game && (
        <MiniGameModal
          game={game}
          onClose={() => setGame(null)}
          onWin={() => { s.rewardWin(game); setGame(null); }}
        />
      )}
    </>
  );
}

const S = {
  pawBtn: { position: 'fixed', bottom: 150, left: 14, zIndex: 70, width: 54, height: 54,
    borderRadius: '50%', border: '1.5px solid rgba(204,136,255,0.5)', cursor: 'pointer',
    background: 'linear-gradient(135deg,rgba(40,18,80,0.95),rgba(20,10,45,0.95))',
    color: '#fff', fontSize: 22, backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 16px rgba(204,136,255,0.4)' },
  bondPip: { position: 'absolute', bottom: -4, right: -4, fontSize: 9, fontWeight: 800,
    background: 'linear-gradient(135deg,#cc88ff,#7a3acc)', color: '#0a0218',
    borderRadius: 8, padding: '1px 5px' },
  panel: { position: 'fixed', bottom: 214, left: 14, zIndex: 70, width: 300, maxWidth: '88vw',
    background: 'linear-gradient(160deg,rgba(26,10,56,0.98),rgba(10,4,24,0.98))',
    border: '1px solid rgba(204,136,255,0.4)', borderRadius: 16, padding: 14,
    backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    fontFamily: 'system-ui, sans-serif', maxHeight: '70vh', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#f0e0ff', fontSize: 14, fontWeight: 800 },
  close: { background: 'none', border: 'none', color: '#cc88ff', fontSize: 22, cursor: 'pointer', lineHeight: 1 },
  xpTrack: { height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', marginBottom: 12, overflow: 'hidden' },
  tabRow: { display: 'flex', gap: 6, marginBottom: 12 },
  tab: { flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(204,136,255,0.25)',
    background: 'rgba(120,40,200,0.12)', color: 'rgba(220,200,255,0.7)', fontSize: 12, fontWeight: 700 },
  tabActive: { flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(204,136,255,0.6)',
    background: 'linear-gradient(135deg,#cc88ff,#7a3acc)', color: '#0a0218', fontSize: 12, fontWeight: 800 },
  xpFill: { height: '100%', background: 'linear-gradient(90deg,#cc88ff,#88ddff)', borderRadius: 3 },
  barRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 },
  barLabel: { color: 'rgba(224,208,255,0.9)', fontSize: 12, width: 78, flexShrink: 0 },
  barTrack: { flex: 1, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, transition: 'width 0.4s ease' },
  barVal: { color: 'rgba(200,180,255,0.7)', fontSize: 11, width: 24, textAlign: 'right' },
  resRow: { display: 'flex', justifyContent: 'space-around', margin: '12px 0',
    padding: '8px', background: 'rgba(0,0,0,0.25)', borderRadius: 10 },
  res: { color: '#f0e0ff', fontSize: 14, fontWeight: 700 },
  actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 },
  action: { padding: '11px 6px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(204,136,255,0.35)',
    background: 'rgba(120,40,200,0.22)', color: '#f0e0ff', fontSize: 13, fontWeight: 700 },
  gather: { width: '100%', padding: '11px', borderRadius: 10, cursor: 'pointer', border: 'none',
    background: 'linear-gradient(135deg,#3ad17a,#2a9ed8)', color: '#04140a', fontSize: 13, fontWeight: 800, marginBottom: 10 },
  gamesLabel: { color: '#cc88ff', fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: '4px 0 8px' },
  game: { padding: '11px 6px', borderRadius: 10, cursor: 'pointer', border: 'none',
    background: 'linear-gradient(135deg,#cc88ff,#7a3acc)', color: '#0a0218', fontSize: 13, fontWeight: 800 },
};
