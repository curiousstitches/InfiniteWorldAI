// client/src/components/MiniGameModal.jsx
// Three self-contained mini-games that reward companion stats on win:
//  - ispy:   find the named emoji among a grid (observation → trust)
//  - memory: flip-and-match pairs (focus → trust + affection)
//  - quick:  tap the target before time runs out (reflex → happiness)

import { useState, useEffect, useRef } from 'react';

const EMOJIS = ['🦋','🍄','🌿','🐞','🌸','🪨','🐚','⭐','🍇','🔮','🌙','🪶'];

export default function MiniGameModal({ game, onClose, onWin }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e => e.stopPropagation()}>
        <button style={S.close} onClick={onClose}>×</button>
        {game === 'ispy'   && <ISpy onWin={onWin} />}
        {game === 'memory' && <Memory onWin={onWin} />}
        {game === 'quick'  && <QuickTap onWin={onWin} />}
      </div>
    </div>
  );
}

// ── I-Spy: find the target emoji in a scattered grid ──
function ISpy({ onWin }) {
  const [target] = useState(() => EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [grid] = useState(() => {
    const items = [target];
    while (items.length < 16) {
      const e = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      items.push(e);
    }
    return items.sort(() => Math.random() - 0.5);
  });
  const [msg, setMsg] = useState('');
  return (
    <div>
      <div style={S.title}>🔍 I-Spy</div>
      <div style={S.prompt}>Find: <span style={{ fontSize: 26 }}>{target}</span></div>
      <div style={S.ispyGrid}>
        {grid.map((e, i) => (
          <button key={i} style={S.ispyCell}
            onClick={() => e === target ? onWin() : setMsg('Not quite — keep looking!')}>{e}</button>
        ))}
      </div>
      {msg && <div style={S.msg}>{msg}</div>}
    </div>
  );
}

// ── Memory: match all pairs ──
function Memory({ onWin }) {
  const [cards] = useState(() => {
    const picks = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, 6);
    return [...picks, ...picks].sort(() => Math.random() - 0.5).map((e, i) => ({ id: i, e }));
  });
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const lock = useRef(false);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      const t = setTimeout(onWin, 500); return () => clearTimeout(t);
    }
  }, [matched, cards.length, onWin]);

  const flip = (card) => {
    if (lock.current || flipped.includes(card.id) || matched.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length === 2) {
      lock.current = true;
      const [a, b] = next.map(id => cards.find(c => c.id === id));
      if (a.e === b.e) { setMatched(m => [...m, a.id, b.id]); setFlipped([]); lock.current = false; }
      else setTimeout(() => { setFlipped([]); lock.current = false; }, 800);
    }
  };

  return (
    <div>
      <div style={S.title}>🧠 Memory Match</div>
      <div style={S.prompt}>Match all the pairs</div>
      <div style={S.memGrid}>
        {cards.map(c => {
          const show = flipped.includes(c.id) || matched.includes(c.id);
          return (
            <button key={c.id} style={{ ...S.memCell, opacity: matched.includes(c.id) ? 0.45 : 1 }}
              onClick={() => flip(c)}>{show ? c.e : '❓'}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick Tap: tap the moving target before the timer ends ──
function QuickTap({ onWin }) {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hits, setHits] = useState(0);
  const [time, setTime] = useState(8);
  const NEED = 5;

  useEffect(() => {
    if (time <= 0) return;
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  useEffect(() => { if (hits >= NEED) onWin(); }, [hits, onWin]);

  const tap = () => {
    setHits(h => h + 1);
    setPos({ x: 12 + Math.random() * 72, y: 12 + Math.random() * 64 });
  };

  return (
    <div>
      <div style={S.title}>⚡ Quick Tap</div>
      <div style={S.prompt}>Tap the orb {NEED}× — {hits}/{NEED} · {time}s</div>
      <div style={S.quickArena}>
        {time > 0 ? (
          <button style={{ ...S.quickTarget, left: `${pos.x}%`, top: `${pos.y}%` }} onClick={tap} />
        ) : (
          <div style={S.msg}>{hits >= NEED ? 'You won!' : 'Out of time — try again!'}</div>
        )}
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(5,2,15,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    fontFamily: 'system-ui, sans-serif' },
  card: { position: 'relative', width: '100%', maxWidth: 360,
    background: 'linear-gradient(160deg,#1e0a42,#0a0418)', border: '1px solid rgba(204,136,255,0.4)',
    borderRadius: 18, padding: 20, boxShadow: '0 0 60px rgba(120,40,200,0.4)' },
  close: { position: 'absolute', top: 10, right: 14, background: 'none', border: 'none',
    color: '#cc88ff', fontSize: 24, cursor: 'pointer' },
  title: { color: '#fff', fontSize: 19, fontWeight: 800, marginBottom: 6, textAlign: 'center' },
  prompt: { color: 'rgba(220,200,255,0.85)', fontSize: 14, textAlign: 'center', marginBottom: 14 },
  ispyGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 },
  ispyCell: { aspectRatio: '1', fontSize: 26, borderRadius: 10, cursor: 'pointer',
    background: 'rgba(120,40,200,0.18)', border: '1px solid rgba(204,136,255,0.3)' },
  memGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 },
  memCell: { aspectRatio: '1', fontSize: 24, borderRadius: 10, cursor: 'pointer',
    background: 'rgba(120,40,200,0.22)', border: '1px solid rgba(204,136,255,0.35)' },
  quickArena: { position: 'relative', width: '100%', height: 240, borderRadius: 12,
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(204,136,255,0.25)', overflow: 'hidden' },
  quickTarget: { position: 'absolute', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
    background: 'radial-gradient(circle at 30% 30%,#e8c0ff,#cc88ff 45%,#7a3acc)', border: 'none',
    boxShadow: '0 0 18px rgba(204,136,255,0.8)', transform: 'translate(-50%,-50%)' },
  msg: { color: '#88ddff', fontSize: 15, fontWeight: 700, textAlign: 'center', paddingTop: 100 },
};
