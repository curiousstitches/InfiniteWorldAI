import { useState } from 'react';
import { useWorldStore } from '../store/worldStore.js';

// ── Task Panel ────────────────────────────────────────────────────────────────
export function TaskPanel() {
  const { activeTasks } = useWorldStore();
  const [expanded, setExpanded] = useState(false);
  const visible = activeTasks.filter(t => t.status === 'active');

  if (!visible.length) return null;

  return (
    <div style={tp.container}>
      <div style={tp.header} onClick={() => setExpanded(e => !e)}>
        <span style={tp.icon}>◈</span>
        <span style={tp.count}>{visible.length} active</span>
        <span style={tp.chevron}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={tp.list}>
          {visible.map(task => (
            <div key={task.id} style={tp.task}>
              <div style={tp.taskTitle}>{task.title}</div>
              <div style={tp.taskDesc}>{task.description}</div>
              <div style={tp.diffBadge(task.difficulty)}>{task.difficulty}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const diff = { trivial: '#44ff88', easy: '#88ff44', medium: '#ffaa44', hard: '#ff6644', legendary: '#ff44aa' };
const tp = {
  container: {
    position: 'fixed', top: 60, right: 12,
    background: 'rgba(5,2,18,0.85)', backdropFilter: 'blur(16px)',
    border: '1px solid rgba(100,50,200,0.3)', borderRadius: 10,
    padding: '8px 12px', fontFamily: "'Crimson Pro', serif",
    minWidth: 160, maxWidth: 220, zIndex: 10,
  },
  header: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  icon: { color: '#aa66ff', fontSize: 14 },
  count: { color: 'rgba(200,170,255,0.7)', fontSize: 12, flex: 1 },
  chevron: { color: 'rgba(180,140,255,0.5)', fontSize: 10 },
  list: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 },
  task: { borderTop: '1px solid rgba(100,50,200,0.2)', paddingTop: 8 },
  taskTitle: { color: '#cc88ff', fontSize: 13, fontStyle: 'italic', marginBottom: 3 },
  taskDesc: { color: 'rgba(200,180,255,0.65)', fontSize: 12, lineHeight: 1.4 },
  diffBadge: (d) => ({
    display: 'inline-block', marginTop: 4, padding: '1px 8px',
    borderRadius: 10, fontSize: 10, color: diff[d] || '#888',
    border: `1px solid ${diff[d] || '#888'}22`,
    background: `${diff[d] || '#888'}11`,
  }),
};

// ── World HUD ─────────────────────────────────────────────────────────────────
export function WorldHUD() {
  const { world, character, environmentNarrative } = useWorldStore();
  if (!world) return null;

  const SCALE_SYMBOLS = { COSMIC: '✦', WORLD: '◉', HUMAN: '◎', MICRO: '·', NANO: '∙' };

  return (
    <div style={hud.container}>
      <div style={hud.top}>
        <div style={hud.location}>{world.location_name || 'The Unknown'}</div>
        <div style={hud.meta}>
          <span style={hud.badge}>{SCALE_SYMBOLS[world.scale]} {world.scale}</span>
          <span style={hud.badge}>{world.biome?.replace(/_/g, ' ')}</span>
          <span style={hud.badge}>{world.weather}</span>
        </div>
      </div>
      {environmentNarrative && (
        <div style={hud.narrative}>{environmentNarrative}</div>
      )}
    </div>
  );
}

const hud = {
  container: {
    position: 'fixed', top: 0, left: 0, right: 0,
    padding: '10px 70px 10px 16px',  // right pad clears the AI status circle
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
    pointerEvents: 'none', fontFamily: "'Crimson Pro', serif", zIndex: 10,
  },
  top: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  location: { color: 'rgba(230,210,255,0.95)', fontSize: 15, fontStyle: 'italic', flex: 1, minWidth: 90 },
  meta: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  badge: {
    color: 'rgba(220,190,255,0.85)', fontSize: 11, letterSpacing: 1,
    background: 'rgba(40,18,80,0.7)', padding: '4px 10px', borderRadius: 12,
    border: '1px solid rgba(160,80,255,0.4)', textTransform: 'uppercase',
  },
  narrative: {
    marginTop: 8, color: 'rgba(200,185,255,0.55)', fontSize: 13,
    fontStyle: 'italic', maxWidth: 500, lineHeight: 1.5,
  },
};

// ── Legacy Echo Modal ─────────────────────────────────────────────────────────
export function LegacyEchoModal({ onConfirm, onCancel }) {
  const [choice, setChoice] = useState(null);

  return (
    <div style={le.overlay}>
      <div style={le.box}>
        <div style={le.title}>END THIS WORLD</div>
        <div style={le.body}>
          Every world that ends leaves something behind — or nothing at all.
          What should remain?
        </div>
        <div style={le.options}>
          {[
            { key: 'wipe', label: 'Erase Everything', sub: 'Total amnesia. The world never existed.' },
            { key: 'echo', label: 'Let the Legends Persist', sub: 'Ghost fragments bleed into future worlds.' },
          ].map(opt => (
            <div key={opt.key}
              style={{ ...le.option, ...(choice === opt.key ? le.selected : {}) }}
              onClick={() => setChoice(opt.key)}
            >
              <div style={le.optLabel}>{opt.label}</div>
              <div style={le.optSub}>{opt.sub}</div>
            </div>
          ))}
        </div>
        <div style={le.actions}>
          <button style={le.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={le.confirmBtn} disabled={!choice}
            onClick={() => choice && onConfirm(choice === 'echo')}>
            End World
          </button>
        </div>
      </div>
    </div>
  );
}

const le = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    backdropFilter: 'blur(8px)', fontFamily: "'Crimson Pro', serif",
  },
  box: {
    width: '90vw', maxWidth: 400, background: 'rgba(8,3,20,0.98)',
    border: '1px solid rgba(200,80,80,0.3)', borderRadius: 12,
    padding: '2rem 1.5rem', boxShadow: '0 0 60px rgba(200,40,40,0.3)',
  },
  title: {
    fontFamily: "'Cinzel Decorative', serif", color: '#ff6666',
    fontSize: 16, letterSpacing: 4, textAlign: 'center', marginBottom: 12,
  },
  body: { color: 'rgba(220,200,220,0.7)', fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },
  options: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  option: {
    padding: '12px 14px', border: '1px solid rgba(180,80,80,0.2)',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
    background: 'rgba(40,10,10,0.4)',
  },
  selected: { border: '1px solid rgba(200,80,80,0.6)', background: 'rgba(80,20,20,0.5)' },
  optLabel: { color: '#ffaaaa', fontSize: 15, marginBottom: 3 },
  optSub: { color: 'rgba(200,170,170,0.55)', fontSize: 12, fontStyle: 'italic' },
  actions: { display: 'flex', gap: 10 },
  cancelBtn: {
    flex: 1, padding: '10px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    color: 'rgba(200,200,200,0.5)', cursor: 'pointer', fontFamily: "'Crimson Pro', serif", fontSize: 15,
  },
  confirmBtn: {
    flex: 1, padding: '10px', background: 'rgba(180,30,30,0.7)',
    border: '1px solid rgba(220,60,60,0.5)', borderRadius: 8,
    color: '#ffaaaa', cursor: 'pointer', fontFamily: "'Crimson Pro', serif", fontSize: 15,
  },
};
